import assert from "node:assert/strict";
import test from "node:test";
import { BotPool } from "../src/virtualUsers/botPool.js";
import { ConversationStore } from "../src/virtualUsers/conversationStore.js";
import { HybridResponseEngine } from "../src/virtualUsers/hybridResponseEngine.js";
import { RuleEngine, voicePromptResponses } from "../src/virtualUsers/ruleEngine.js";
import { estimateEnglishFallbackVariants } from "../src/virtualUsers/commonEnglishPhraseBank.js";
import { buildCommonEnglishSituationResponse, estimateCommonEnglishSituationCount, estimateCommonEnglishSituationInputs } from "../src/virtualUsers/commonEnglishSituations.js";
import { buildLLMMessages, CloudflareWorkersAIProvider } from "../src/virtualUsers/llmProvider.js";
import { validateBotResponse } from "../src/virtualUsers/responseValidator.js";
import { VIRTUAL_USER_IDS, type ConversationContext, type LLMProvider, type LLMUsageCoordinator, type VirtualUserProfile } from "../src/virtualUsers/virtualUserTypes.js";
import { addUserToRoom, createRoom, getRoomHumanCount, getRoomMessages, getRoomVirtualUser, removeUser } from "../src/rooms/roomStore.js";

const makeProfile = (id: string, enabled = true): VirtualUserProfile => ({
  id, name: id, avatarUrl: null, englishLevel: "B1", personality: "Friendly",
  interests: ["travel"], speakingStyle: "Casual", replyProbability: 1, proactiveMessageProbability: 0.5, enabled,
  updatedAt: new Date(0).toISOString()
});

const makeContext = (roomId = "room-a", botId = "bot-01"): ConversationContext => ({
  roomId, botId, userFacts: {}, recentMessages: []
});

const makeMessage = (roomId: string, text: string, index = 0) => ({
  id: `message-${roomId}-${index}`, roomId, socketId: `human-${roomId}`, senderId: `human-${roomId}`,
  senderType: "human" as const, nickname: "Human", avatar: "🙂", text, timestamp: index + 1
});

test("defines exactly 15 immutable virtual user identities", () => {
  assert.equal(VIRTUAL_USER_IDS.length, 15);
  assert.deepEqual(VIRTUAL_USER_IDS, Array.from({ length: 15 }, (_, index) => `bot-${String(index + 1).padStart(2, "0")}`));
});

test("bot pool assigns atomically, never puts one bot in two rooms, and releases it", () => {
  const pool = new BotPool();
  pool.replaceProfiles([makeProfile("bot-01")]);
  assert.equal(pool.assign("room-a")?.id, "bot-01");
  assert.equal(pool.assign("room-b"), null);
  assert.equal(pool.getRuntime("bot-01")?.roomId, "room-a");
  assert.equal(pool.releaseRoom("room-a")?.id, "bot-01");
  assert.equal(pool.getRuntime("bot-01")?.status, "AVAILABLE");
  assert.equal(pool.assign("room-b")?.id, "bot-01");
});

test("bot pool selects an available bot randomly instead of always taking the first", () => {
  const pool = new BotPool();
  pool.replaceProfiles(VIRTUAL_USER_IDS.slice(0, 3).map((id) => makeProfile(id)));
  assert.equal(pool.assign("room-random", () => 0.99)?.id, "bot-03");
  assert.equal(pool.assign("room-next", () => 0.99)?.id, "bot-02");
});

test("disabled bots are never assigned", () => {
  const pool = new BotPool();
  pool.replaceProfiles([makeProfile("bot-01", false)]);
  assert.equal(pool.assign("room-a"), null);
});

test("a pool with 15 identities cannot satisfy a sixteenth room", () => {
  const pool = new BotPool();
  pool.replaceProfiles(VIRTUAL_USER_IDS.map((id) => makeProfile(id)));
  const assignments = Array.from({ length: 16 }, (_, index) => pool.assign(`room-${index}`));
  assert.equal(assignments.filter(Boolean).length, 15);
  assert.equal(assignments[15], null);
  assert.equal(new Set(assignments.filter(Boolean).map((profile) => profile!.id)).size, 15);
});

test("rule routing answers simple messages without calling the LLM", async () => {
  let llmCalls = 0;
  const provider: LLMProvider = { async generateResponse() { llmCalls += 1; return { text: "unused", usage: { provider: "test", model: "test", inputTokens: 1, outputTokens: 1, totalTokens: 2 } }; } };
  const engine = new HybridResponseEngine(provider, new RuleEngine());
  const response = await engine.respond(makeProfile("bot-01"), makeContext(), "Hello");
  assert.ok(response);
  assert.equal(llmCalls, 0);
});

test("an uncertain rule decision is escalated to the LLM", async () => {
  let llmCalls = 0;
  const provider: LLMProvider = { async generateResponse() { llmCalls += 1; return { text: "Contextual response", usage: { provider: "test", model: "test", inputTokens: 1, outputTokens: 1, totalTokens: 2 } }; } };
  class UncertainRules extends RuleEngine {
    override route() { return { route: "RULE" as const, confidence: 0.4, response: "uncertain" }; }
  }
  const engine = new HybridResponseEngine(provider, new UncertainRules());
  const response = await engine.respond(makeProfile("bot-01"), makeContext(), "ambiguous");
  assert.equal(response, "Contextual response");
  assert.equal(llmCalls, 1);
});

test("complex routing falls back when the LLM is unavailable", async () => {
  const provider: LLMProvider = { async generateResponse() { throw new Error("offline"); } };
  const engine = new HybridResponseEngine(provider);
  const response = await engine.respond(makeProfile("bot-01"), makeContext(), "What do you think about learning English?");
  assert.ok(response);
  assert.ok(response.length <= 300);
  assert.doesNotMatch(response, /^(?:That's a good question|Tell me a little more|That sounds interesting)/i);
});

test("token budget coordinator can stop a request before the provider is called", async () => {
  let llmCalls = 0;
  const provider: LLMProvider = { async generateResponse() { llmCalls += 1; throw new Error("must not run"); } };
  const usage: LLMUsageCoordinator = { async generate() { return null; } };
  const engine = new HybridResponseEngine(provider, new RuleEngine(), usage, 0);
  const response = await engine.respond(makeProfile("bot-01"), makeContext(), "What do you enjoy about travel?");
  assert.ok(response);
  assert.equal(llmCalls, 0);
});

test("completed LLM usage is tracked even when response validation rejects the text", async () => {
  let trackedTokens = 0;
  const provider: LLMProvider = {
    async generateResponse() {
      return { text: "As an AI assistant, I can help.", usage: { provider: "test", model: "small", inputTokens: 7, outputTokens: 3, totalTokens: 10 } };
    }
  };
  const usage: LLMUsageCoordinator = {
    async generate(_botId, _roomId, _limit, generation) {
      const result = await generation();
      trackedTokens += result.usage.totalTokens;
      return result;
    }
  };
  const engine = new HybridResponseEngine(provider, new RuleEngine(), usage);
  const response = await engine.respond(makeProfile("bot-01"), makeContext(), "What do you enjoy about travel?");
  assert.ok(response);
  assert.equal(trackedTokens, 10);
  assert.notEqual(response, "As an AI assistant, I can help.");
});

test("LLM messages inject profile, topic, summary, user facts, recent context, and current message", () => {
  const profile = { ...makeProfile("bot-01"), name: "Emma", personality: "Curious", speakingStyle: "Short and casual" };
  const context = makeContext();
  context.topic = "Travel English";
  context.summary = "The user is planning a trip.";
  context.userFacts = { location: "Vietnam" };
  context.recentMessages = [makeMessage("room-a", "I want to visit Japan.")];
  const messages = buildLLMMessages(profile, context, "What should I see in Tokyo?");
  const content = messages.map((message) => message.content).join("\n");
  assert.match(content, /Emma/);
  assert.match(content, /Curious/);
  assert.match(content, /Travel English/);
  assert.match(content, /planning a trip/);
  assert.match(content, /Vietnam/);
  assert.match(content, /I want to visit Japan/);
  assert.match(content, /Reply directly to the latest user message/);
  assert.match(content, /Avoid bland phrases/);
  assert.match(content, /Use English only/);
  assert.equal(messages.at(-1)?.content, "What should I see in Tokyo?");
});

test("Cloudflare provider sends chat context and uses returned token counts", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  let requestBody: { messages?: Array<{ content: string }>; max_tokens?: number } = {};
  globalThis.fetch = (async (input, init) => {
    requestedUrl = String(input);
    requestBody = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({
      success: true,
      result: { response: "I loved Kyoto in spring.", usage: { prompt_tokens: 21, completion_tokens: 7, total_tokens: 28 } }
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  try {
    const provider = new CloudflareWorkersAIProvider("account-id", "secret-token", "@cf/meta/llama-3.1-8b-instruct-fast");
    const result = await provider.generateResponse(makeProfile("bot-01"), makeContext(), "Where did you travel?");
    assert.match(requestedUrl, /accounts\/account-id\/ai\/run\/@cf\/meta\/llama-3\.1-8b-instruct-fast$/);
    assert.equal(requestBody.max_tokens, 120);
    assert.equal(requestBody.messages?.at(-1)?.content, "Where did you travel?");
    assert.deepEqual(result.usage, { provider: "cloudflare", model: "@cf/meta/llama-3.1-8b-instruct-fast", inputTokens: 21, outputTokens: 7, totalTokens: 28 });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("common English fallback bank provides at least one million variants", () => {
  assert.ok(estimateEnglishFallbackVariants() >= 1_000_000);
});

test("common English situations cover one hundred situations and at least five thousand input patterns", () => {
  assert.equal(estimateCommonEnglishSituationCount(), 100);
  assert.ok(estimateCommonEnglishSituationInputs() >= 5_000);
});

test("common English situations answer and ask relevant follow-up questions", () => {
  const samples = [
    "I am stressed about my deadline",
    "I want to practice English speaking",
    "I am hungry and want street food",
    "I don't understand this word"
  ];
  for (const sample of samples) {
    const response = buildCommonEnglishSituationResponse(sample);
    assert.ok(response);
    assert.match(response, /\?/);
    assert.ok(response.length <= 300);
  }
});

test("voice prompt bank provides at least fifteen variants", () => {
  assert.ok(voicePromptResponses.length >= 15);
});

test("rule fallback uses profile and message intent instead of bland filler", () => {
  const profile = { ...makeProfile("bot-01"), name: "Emma", interests: ["travel", "movies"] };
  const engine = new RuleEngine();
  const response = engine.fallback("Do you like music?", makeContext(), profile);
  assert.ok(response);
  assert.doesNotMatch(response, /\b(?:That's interesting|Tell me more|Good question|What do you think)\b/i);
  assert.match(response, /\?/);
  assert.match(response, /\b(?:music|song|mood|lyrics)\b/i);
});

test("rule fallback answers non-English messages in English with an uncertainty note", () => {
  const engine = new RuleEngine();
  const response = engine.fallback("mình không hiểu bot đang trả lời gì", makeContext(), makeProfile("bot-01"));
  assert.match(response, /\b(?:don't understand|not sure I understand|only follow English|write it in English|write that in English|use English|send it in English|switch to English|English would work better|try it in English)\b/i);
  assert.doesNotMatch(response, /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i);
});

test("response validation rejects empty, oversized, duplicate, malformed, assistant, and bot-identifying output", () => {
  const context = makeContext();
  context.recentMessages.push({ ...makeMessage("room-a", "Same answer"), senderType: "virtual_user", senderId: "bot-01", socketId: "virtual:bot-01" });
  const profile = { ...makeProfile("bot-01"), speakingStyle: "Short and concise" };
  assert.equal(validateBotResponse("", context, profile), null);
  assert.equal(validateBotResponse("x".repeat(301), context, profile), null);
  assert.equal(validateBotResponse("Same answer", context, profile), null);
  assert.equal(validateBotResponse("As an AI assistant, I can help.", context, profile), null);
  assert.equal(validateBotResponse("How can I assist you today?", context, profile), null);
  assert.equal(validateBotResponse("```json {} ```", context, profile), null);
  assert.equal(validateBotResponse("One. Two. Three. Four. Five.", context, profile), null);
  assert.equal(validateBotResponse("That sounds fun!", context, profile), "That sounds fun!");
});

test("conversation contexts are isolated per room and destroyed on release", () => {
  const store = new ConversationStore();
  const first = store.get("room-a", "bot-01");
  const second = store.get("room-b", "bot-01");
  first.userFacts.name = "Alice";
  assert.equal(second.userFacts.name, undefined);
  assert.equal(store.count(), 2);
  store.destroy("room-a", "bot-01");
  assert.equal(store.count(), 1);
  assert.notEqual(store.get("room-a", "bot-01"), first);
});

test("conversation storage extracts facts and compacts history to ten recent messages", () => {
  const store = new ConversationStore();
  const context = store.get("room-a", "bot-01");
  store.remember(context, makeMessage("room-a", "My name is Alice. I'm from Vietnam and I love cooking.", 0));
  for (let index = 1; index < 14; index += 1) store.remember(context, makeMessage("room-a", `message ${index}`, index));
  assert.equal(context.userFacts.name, "Alice");
  assert.equal(context.userFacts.location, "Vietnam");
  assert.equal(context.userFacts.interest, "cooking");
  assert.equal(context.recentMessages.length, 10);
  assert.ok(context.summary);
});

test("room lifecycle assigns at one human and releases at the two-human threshold", async () => {
  process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/test";
  process.env.GOOGLE_CLIENT_ID ||= "test.apps.googleusercontent.com";
  process.env.JWT_SECRET ||= "test-secret-that-is-long-enough";
  const { reconcileVirtualUserForRoom, virtualUserInternals } = await import("../src/virtualUsers/virtualUserService.js");
  virtualUserInternals.pool.replaceProfiles([makeProfile("bot-01")]);
  const io = { to: () => ({ emit: () => undefined }), emit: () => undefined } as never;
  const human = (socketId: string) => ({ socketId, nickname: socketId, avatar: "🙂", role: "unverified" as const, micEnabled: false, cameraEnabled: false, screenSharing: false, screenTrackId: null, senderType: "human" as const });

  assert.equal(addUserToRoom("room-18", human("human-a")).ok, true);
  reconcileVirtualUserForRoom(io, "room-18");
  assert.equal(getRoomHumanCount("room-18"), 1);
  assert.equal(getRoomVirtualUser("room-18")?.virtualUserId, "bot-01");
  assert.equal(getRoomVirtualUser("room-18")?.role, "verified");

  assert.equal(addUserToRoom("room-18", human("human-b")).ok, true);
  reconcileVirtualUserForRoom(io, "room-18");
  assert.equal(getRoomHumanCount("room-18"), 2);
  assert.equal(getRoomVirtualUser("room-18"), undefined);
  assert.notEqual(virtualUserInternals.pool.getRuntime("bot-01")?.roomId, "room-18");
  removeUser("human-a"); removeUser("human-b");
});

test("low activity distributes five distinct random bots across five empty system rooms", async () => {
  process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/test";
  process.env.GOOGLE_CLIENT_ID ||= "test.apps.googleusercontent.com";
  process.env.JWT_SECRET ||= "test-secret-that-is-long-enough";
  const { getWaitingBotTarget, rebalanceWaitingVirtualUsers, releaseVirtualUser, virtualUserInternals } = await import("../src/virtualUsers/virtualUserService.js");
  const io = { to: () => ({ emit: () => undefined }), emit: () => undefined } as never;
  for (const item of virtualUserInternals.pool.list()) {
    if (item.runtime.roomId) releaseVirtualUser(io, item.runtime.roomId);
  }
  virtualUserInternals.pool.replaceProfiles(VIRTUAL_USER_IDS.map((id) => makeProfile(id)));
  rebalanceWaitingVirtualUsers(io, () => 0.99);
  const waiting = Array.from({ length: 18 }, (_, index) => {
    const roomId = `room-${index + 1}`;
    return { roomId, user: getRoomVirtualUser(roomId) };
  }).filter((item) => item.user);
  assert.equal(waiting.length, 5);
  assert.equal(new Set(waiting.map((item) => item.user!.virtualUserId)).size, 5);
  assert.equal(waiting.every((item) => getRoomHumanCount(item.roomId) === 0), true);
  assert.equal(getWaitingBotTarget(5), 5);
  assert.equal(getWaitingBotTarget(6), 0);
  for (const item of virtualUserInternals.pool.list()) {
    if (item.runtime.roomId) releaseVirtualUser(io, item.runtime.roomId);
  }
});

test("low activity keeps a waiting bot in a random empty system room and typing delays follow response-size ranges", async () => {
  process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/test";
  process.env.GOOGLE_CLIENT_ID ||= "test.apps.googleusercontent.com";
  process.env.JWT_SECRET ||= "test-secret-that-is-long-enough";
  const { getTypingDelayRange, reconcileVirtualUserForRoom, releaseVirtualUser, shouldAttemptProactiveMessage, virtualUserInternals } = await import("../src/virtualUsers/virtualUserService.js");
  virtualUserInternals.pool.replaceProfiles([makeProfile("bot-01")]);
  const io = { to: () => ({ emit: () => undefined }), emit: () => undefined } as never;
  reconcileVirtualUserForRoom(io, "room-16");
  const waitingBots = Array.from({ length: 18 }, (_, index) => getRoomVirtualUser(`room-${index + 1}`)).filter(Boolean);
  assert.equal(waitingBots.length, 1);
  assert.deepEqual(getTypingDelayRange("short"), [500, 1_200]);
  assert.deepEqual(getTypingDelayRange("x".repeat(29)), [500, 1_200]);
  assert.deepEqual(getTypingDelayRange("x".repeat(30)), [15_000, 30_000]);
  assert.deepEqual(getTypingDelayRange("x".repeat(180)), [15_000, 30_000]);

  const context = makeContext();
  context.recentMessages = [{ ...makeMessage("room-a", "Still here?", 1), senderType: "virtual_user", senderId: "bot-01", socketId: "virtual:bot-01", timestamp: 1_000 }];
  assert.equal(shouldAttemptProactiveMessage(makeProfile("bot-01"), context, false, 180_999, () => 0), false);
  assert.equal(shouldAttemptProactiveMessage(makeProfile("bot-01"), context, false, 181_000, () => 0.49), true);
  assert.equal(shouldAttemptProactiveMessage(makeProfile("bot-01"), context, true, 181_000, () => 0), false);
  assert.equal(shouldAttemptProactiveMessage({ ...makeProfile("bot-01"), proactiveMessageProbability: 0 }, context, false, 181_000, () => 0), false);
  context.recentMessages = [makeMessage("room-a", "Your turn", 2)];
  assert.equal(shouldAttemptProactiveMessage(makeProfile("bot-01"), context, false, 500_000, () => 0), false);
  for (const item of virtualUserInternals.pool.list()) {
    if (item.runtime.roomId) releaseVirtualUser(io, item.runtime.roomId);
  }
});

test("rapid human messages are batched into one pending interaction", async () => {
  process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/test";
  process.env.GOOGLE_CLIENT_ID ||= "test.apps.googleusercontent.com";
  process.env.JWT_SECRET ||= "test-secret-that-is-long-enough";
  const { handleHumanChatMessage, reconcileVirtualUserForRoom, releaseVirtualUser, virtualUserInternals } = await import("../src/virtualUsers/virtualUserService.js");
  virtualUserInternals.pool.replaceProfiles([makeProfile("bot-01")]);
  const io = { to: () => ({ emit: () => undefined }), emit: () => undefined } as never;
  const human = { socketId: "human-batch", nickname: "Human", avatar: "🙂", role: "unverified" as const, micEnabled: false, cameraEnabled: false, screenSharing: false, screenTrackId: null, senderType: "human" as const };
  assert.equal(addUserToRoom("room-15", human).ok, true);
  reconcileVirtualUserForRoom(io, "room-15");
  handleHumanChatMessage(io, makeMessage("room-15", "Hi", 1));
  handleHumanChatMessage(io, makeMessage("room-15", "How are you?", 2));
  assert.equal(virtualUserInternals.pendingMessages.get("room-15")?.messages.length, 2);
  releaseVirtualUser(io, "room-15");
  assert.equal(virtualUserInternals.pendingMessages.has("room-15"), false);
  removeUser("human-batch");
});

test("the same human message id cannot trigger duplicate bot processing", async () => {
  process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/test";
  process.env.GOOGLE_CLIENT_ID ||= "test.apps.googleusercontent.com";
  process.env.JWT_SECRET ||= "test-secret-that-is-long-enough";
  const { handleHumanChatMessage, reconcileVirtualUserForRoom, releaseVirtualUser, virtualUserInternals } = await import("../src/virtualUsers/virtualUserService.js");
  virtualUserInternals.pool.replaceProfiles([makeProfile("bot-01")]);
  const io = { to: () => ({ emit: () => undefined }), emit: () => undefined } as never;
  const human = { socketId: "human-dedup", nickname: "Human", avatar: "🙂", role: "unverified" as const, micEnabled: false, cameraEnabled: false, screenSharing: false, screenTrackId: null, senderType: "human" as const };
  const room = createRoom("Dedupe Test", "en", "any", null, "00000000-0000-0000-0000-000000000000", 4);
  assert.equal(addUserToRoom(room.id, human).ok, true);
  reconcileVirtualUserForRoom(io, room.id);
  const message = makeMessage(room.id, "Could we talk about movies?", 1);
  handleHumanChatMessage(io, message);
  handleHumanChatMessage(io, message);
  assert.equal(virtualUserInternals.pendingMessages.get(room.id)?.messages.length, 1);
  releaseVirtualUser(io, room.id);
  assert.equal(virtualUserInternals.processedHumanMessages.has(room.id), false);
  removeUser("human-dedup");
});

test("voice attempts in a bot room get a text-only bot prompt", async () => {
  process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/test";
  process.env.GOOGLE_CLIENT_ID ||= "test.apps.googleusercontent.com";
  process.env.JWT_SECRET ||= "test-secret-that-is-long-enough";
  const { handleHumanVoiceAttempt, reconcileVirtualUserForRoom, releaseVirtualUser, virtualUserInternals } = await import("../src/virtualUsers/virtualUserService.js");
  virtualUserInternals.pool.replaceProfiles([makeProfile("bot-01")]);
  const room = createRoom("Voice Test", "en", "any", null, "00000000-0000-0000-0000-000000000000", 4);
  const events: unknown[] = [];
  const io = { to: () => ({ emit: (...args: unknown[]) => events.push(args) }), emit: (...args: unknown[]) => events.push(args) } as never;
  const human = { socketId: "human-voice", nickname: "Human", avatar: "🙂", role: "unverified" as const, micEnabled: false, cameraEnabled: false, screenSharing: false, screenTrackId: null, senderType: "human" as const };
  assert.equal(addUserToRoom(room.id, human).ok, true);
  reconcileVirtualUserForRoom(io, room.id);
  const botId = getRoomVirtualUser(room.id)?.virtualUserId;
  assert.ok(botId);
  const promptKey = `${room.id}:${botId}:human-voice`;
  handleHumanVoiceAttempt(io, room.id, "human-voice");
  const botMessage = getRoomMessages(room.id).find((message) => message.senderType === "virtual_user" && message.id.includes("voice"));
  assert.ok(botMessage);
  assert.match(botMessage.text, /\b(?:mic|camera|voice|hear|text|chat)\b/i);
  assert.match(botMessage.text, /\b(?:type|text|chat|message)\b/i);
  virtualUserInternals.lastVoicePromptAt.set(promptKey, 0);
  handleHumanVoiceAttempt(io, room.id, "human-voice");
  virtualUserInternals.lastVoicePromptAt.set(promptKey, 0);
  handleHumanVoiceAttempt(io, room.id, "human-voice");
  virtualUserInternals.lastVoicePromptAt.set(promptKey, 0);
  handleHumanVoiceAttempt(io, room.id, "human-voice");
  assert.equal(getRoomMessages(room.id).filter((message) => message.senderType === "virtual_user" && message.id.includes("voice")).length, 3);
  assert.equal(virtualUserInternals.voicePromptCounts.get(promptKey), 3);
  releaseVirtualUser(io, room.id);
  removeUser("human-voice");
});

test("disabling an active bot releases it, while active profile edits are applied safely", async () => {
  process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/test";
  process.env.GOOGLE_CLIENT_ID ||= "test.apps.googleusercontent.com";
  process.env.JWT_SECRET ||= "test-secret-that-is-long-enough";
  const { applyVirtualUserProfile, reconcileVirtualUserForRoom, virtualUserInternals } = await import("../src/virtualUsers/virtualUserService.js");
  const events: unknown[] = [];
  const io = { to: () => ({ emit: (...args: unknown[]) => events.push(args) }), emit: (...args: unknown[]) => events.push(args) } as never;
  const human = { socketId: "human-profile", nickname: "Human", avatar: "🙂", role: "unverified" as const, micEnabled: false, cameraEnabled: false, screenSharing: false, screenTrackId: null, senderType: "human" as const };
  virtualUserInternals.pool.replaceProfiles([makeProfile("bot-01")]);
  assert.equal(addUserToRoom("room-17", human).ok, true);
  reconcileVirtualUserForRoom(io, "room-17");
  applyVirtualUserProfile(io, { ...makeProfile("bot-01"), name: "Updated Emma" });
  assert.equal(getRoomVirtualUser("room-17")?.nickname, "Updated Emma");
  applyVirtualUserProfile(io, makeProfile("bot-01", false));
  assert.equal(getRoomVirtualUser("room-17"), undefined);
  assert.equal(virtualUserInternals.pool.getRuntime("bot-01")?.status, "AVAILABLE");
  assert.ok(events.length > 0);
  removeUser("human-profile");
});

test("admin middleware rejects unauthenticated virtual-user access", async () => {
  process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/test";
  process.env.GOOGLE_CLIENT_ID ||= "test.apps.googleusercontent.com";
  process.env.JWT_SECRET ||= "test-secret-that-is-long-enough";
  const { requireAdmin } = await import("../src/admin/adminAuth.js");
  let received: unknown;
  await requireAdmin({ header: () => undefined } as never, {} as never, ((error?: unknown) => { received = error; }) as never);
  assert.equal((received as { statusCode?: number }).statusCode, 401);
});

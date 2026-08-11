import assert from "node:assert/strict";
import test from "node:test";
import { BotPool } from "../src/virtualUsers/botPool.js";
import { ConversationStore } from "../src/virtualUsers/conversationStore.js";
import { HybridResponseEngine } from "../src/virtualUsers/hybridResponseEngine.js";
import { RuleEngine } from "../src/virtualUsers/ruleEngine.js";
import { buildOllamaMessages } from "../src/virtualUsers/llmProvider.js";
import { validateBotResponse } from "../src/virtualUsers/responseValidator.js";
import { VIRTUAL_USER_IDS, type ConversationContext, type LLMProvider, type VirtualUserProfile } from "../src/virtualUsers/virtualUserTypes.js";
import { addUserToRoom, getRoomHumanCount, getRoomVirtualUser, removeUser } from "../src/rooms/roomStore.js";

const makeProfile = (id: string, enabled = true): VirtualUserProfile => ({
  id, name: id, avatarUrl: null, englishLevel: "B1", personality: "Friendly",
  interests: ["travel"], speakingStyle: "Casual", replyProbability: 1, enabled,
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
  const provider: LLMProvider = { async generateResponse() { llmCalls += 1; return "unused"; } };
  const engine = new HybridResponseEngine(provider, new RuleEngine());
  const response = await engine.respond(makeProfile("bot-01"), makeContext(), "Hello");
  assert.ok(response);
  assert.equal(llmCalls, 0);
});

test("an uncertain rule decision is escalated to the LLM", async () => {
  let llmCalls = 0;
  const provider: LLMProvider = { async generateResponse() { llmCalls += 1; return "Contextual response"; } };
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
});

test("LLM messages inject profile, topic, summary, user facts, recent context, and current message", () => {
  const profile = { ...makeProfile("bot-01"), name: "Emma", personality: "Curious", speakingStyle: "Short and casual" };
  const context = makeContext();
  context.topic = "Travel English";
  context.summary = "The user is planning a trip.";
  context.userFacts = { location: "Vietnam" };
  context.recentMessages = [makeMessage("room-a", "I want to visit Japan.")];
  const messages = buildOllamaMessages(profile, context, "What should I see in Tokyo?");
  const content = messages.map((message) => message.content).join("\n");
  assert.match(content, /Emma/);
  assert.match(content, /Curious/);
  assert.match(content, /Travel English/);
  assert.match(content, /planning a trip/);
  assert.match(content, /Vietnam/);
  assert.match(content, /I want to visit Japan/);
  assert.equal(messages.at(-1)?.content, "What should I see in Tokyo?");
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

  assert.equal(addUserToRoom("room-18", human("human-b")).ok, true);
  reconcileVirtualUserForRoom(io, "room-18");
  assert.equal(getRoomHumanCount("room-18"), 2);
  assert.equal(getRoomVirtualUser("room-18"), undefined);
  assert.equal(virtualUserInternals.pool.getRuntime("bot-01")?.status, "AVAILABLE");
  removeUser("human-a"); removeUser("human-b");
});

test("empty rooms stay idle and typing delays follow response-size ranges", async () => {
  process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/test";
  process.env.GOOGLE_CLIENT_ID ||= "test.apps.googleusercontent.com";
  process.env.JWT_SECRET ||= "test-secret-that-is-long-enough";
  const { getTypingDelayRange, reconcileVirtualUserForRoom, virtualUserInternals } = await import("../src/virtualUsers/virtualUserService.js");
  virtualUserInternals.pool.replaceProfiles([makeProfile("bot-01")]);
  const io = { to: () => ({ emit: () => undefined }), emit: () => undefined } as never;
  reconcileVirtualUserForRoom(io, "room-16");
  assert.equal(getRoomVirtualUser("room-16"), undefined);
  assert.deepEqual(getTypingDelayRange("short"), [500, 1_200]);
  assert.deepEqual(getTypingDelayRange("x".repeat(80)), [1_000, 2_500]);
  assert.deepEqual(getTypingDelayRange("x".repeat(180)), [1_500, 3_500]);
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

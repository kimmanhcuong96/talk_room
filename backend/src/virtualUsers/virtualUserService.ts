import {
  addRoomMessage,
  addVirtualUserToRoom,
  getPublicRoomUsers,
  getRoomHumanCount,
  getRoomSummary,
  getRoomSummaries,
  getSystemRoomIds,
  getRoomVirtualUser,
  removeVirtualUserByBotId,
  updateVirtualUserProfileInRoom
} from "../rooms/roomStore.js";
import type { AppServer, ChatMessage } from "../types/socket.js";
import { env } from "../config/env.js";
import { BotPool } from "./botPool.js";
import { HybridResponseEngine } from "./hybridResponseEngine.js";
import { CloudflareWorkersAIProvider, OllamaProvider, UnavailableLLMProvider } from "./llmProvider.js";
import { getVoicePromptResponse } from "./ruleEngine.js";
import { listVirtualUserProfiles } from "./virtualUserRepository.js";
import { VIRTUAL_USER_IDS, type VirtualUserProfile } from "./virtualUserTypes.js";
import { ConversationStore } from "./conversationStore.js";
import { llmUsageCoordinator } from "../usage/llmUsage.js";
import { recordVirtualUserResponse } from "../usage/responseUsage.js";
import { getVirtualUserAvatar } from "./virtualUserAvatar.js";
import { classifyHumanMessage, getRejectionResponse, getToxicityDepartureMessage, isUserRejectingBot } from "./toxicity.js";
import { assessEnglishMessage, nonEnglishReminders } from "./languageDetection.js";
import { selectSentenceCount, validateBotResponse } from "./responseValidator.js";

const BATCH_DELAY_MS = 650;
const RESPONSE_COOLDOWN_MS = 1_200;
const VOICE_PROMPT_COOLDOWN_MS = 45_000;
const PROACTIVE_IDLE_MS = 3 * 60_000;
const PROACTIVE_CHECK_INTERVAL_MS = 30_000;
const PROCESSED_MESSAGE_TTL_MS = 5 * 60_000;
const MAX_PROCESSED_MESSAGES_PER_ROOM = 200;
const LOW_ACTIVITY_ROOM_THRESHOLD = 5;
const WAITING_BOT_TARGET = 5;
const pool = new BotPool();
const conversations = new ConversationStore();
const pendingMessages = new Map<string, { messages: ChatMessage[]; timer: ReturnType<typeof setTimeout> }>();
const processingRooms = new Set<string>();
const roomGenerations = new Map<string, number>();
const lastVoicePromptAt = new Map<string, number>();
const voicePromptCounts = new Map<string, number>();
const processedHumanMessages = new Map<string, Map<string, number>>();
const proactiveSentRooms = new Set<string>();
const toxicMessageWindows = new Map<string, number[]>();
const withdrawnRooms = new Map<string, number>();
const withdrawalTimers = new Map<string, ReturnType<typeof setTimeout>>();
const lastDepartureMessageByBot = new Map<string, string>();
const TOXICITY_WINDOW_MS = 10 * 60_000;
const WITHDRAWAL_COOLDOWN_MS = 5 * 60_000;
type LeaveReason = "rude" | "rejected" | "second_user";
const pendingLeaveTimers = new Map<string, { botId: string; reason: LeaveReason; timer: ReturnType<typeof setTimeout> }>();
const lastNonEnglishReminderAt = new Map<string, number>();
const humanMessagePipelines = new Map<string, Promise<void>>();
let proactiveCheckTimer: ReturnType<typeof setInterval> | null = null;

function createLLMProvider() {
  if (env.llmProvider === "cloudflare") {
    if (!env.cloudflareAccountId || !env.cloudflareAiApiToken || !env.llmModel) {
      throw new Error("LLM_PROVIDER=cloudflare requires CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_AI_API_TOKEN, and LLM_MODEL.");
    }
    return new CloudflareWorkersAIProvider(env.cloudflareAccountId, env.cloudflareAiApiToken, env.llmModel);
  }
  if (env.llmProvider === "ollama") {
    if (!env.llmModel) throw new Error("LLM_PROVIDER=ollama requires LLM_MODEL.");
    return new OllamaProvider(env.ollamaBaseUrl, env.llmModel);
  }
  if (!env.llmProvider && env.ollamaModel) {
    return new OllamaProvider(env.ollamaBaseUrl, env.ollamaModel);
  }
  if (!env.llmProvider) return new UnavailableLLMProvider();
  throw new Error(`Unsupported LLM_PROVIDER: ${env.llmProvider}`);
}

const llmProvider = createLLMProvider();
const responseEngine = new HybridResponseEngine(llmProvider, undefined, llmUsageCoordinator, env.llmMaxTokens);

export function getTypingDelayRange(text: string, profile?: Pick<VirtualUserProfile, "longResponseDelayMinSeconds" | "longResponseDelayMaxSeconds">): readonly [number, number] {
  if (text.length < 30) return [500, 1_200];
  return [
    (profile?.longResponseDelayMinSeconds ?? 5) * 1_000,
    (profile?.longResponseDelayMaxSeconds ?? 15) * 1_000
  ];
}

function typingDelay(text: string, profile?: Pick<VirtualUserProfile, "longResponseDelayMinSeconds" | "longResponseDelayMaxSeconds">) {
  const [minimum, maximum] = getTypingDelayRange(text, profile);
  return minimum + Math.floor(Math.random() * (maximum - minimum + 1));
}

function remainingTypingDelay(text: string, responseWindowStartedAt: number, profile?: Pick<VirtualUserProfile, "longResponseDelayMinSeconds" | "longResponseDelayMaxSeconds">) {
  return Math.max(0, typingDelay(text, profile) - (Date.now() - responseWindowStartedAt));
}

export function shouldAttemptProactiveMessage(
  profile: VirtualUserProfile,
  context: ReturnType<ConversationStore["get"]>,
  alreadySent: boolean,
  now = Date.now(),
  random = Math.random
) {
  const lastMessage = context.recentMessages.at(-1);
  return profile.enabled
    && !alreadySent
    && lastMessage?.senderType === "virtual_user"
    && now - lastMessage.timestamp >= PROACTIVE_IDLE_MS
    && random() < profile.proactiveMessageProbability;
}

function emitPresence(io: AppServer, roomId: string, event: "joined" | "left", socketId: string) {
  if (event === "left") io.to(roomId).emit("user-left", { socketId });
  io.to(roomId).emit("room-users", getPublicRoomUsers(roomId));
  io.emit("room-list", getRoomSummaries());
}

function shuffled<T>(items: readonly T[], random = Math.random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.min(index, Math.max(0, Math.floor(random() * (index + 1))));
    [result[index], result[swapIndex]] = [result[swapIndex]!, result[index]!];
  }
  return result;
}

function assignVirtualUser(io: AppServer, roomId: string, random = Math.random) {
  if ((withdrawnRooms.get(roomId) ?? 0) > Date.now()) return null;
  const profile = pool.assign(roomId, random);
  if (!profile) return null;
  const user = addVirtualUserToRoom(roomId, profile);
  if (!user) {
    pool.releaseRoom(roomId);
    return null;
  }
  roomGenerations.set(roomId, (roomGenerations.get(roomId) ?? 0) + 1);
  io.to(roomId).emit("user-joined", user);
  emitPresence(io, roomId, "joined", user.socketId);
  return user;
}

export function getWaitingBotTarget(humanOccupiedRoomCount: number) {
  return humanOccupiedRoomCount <= LOW_ACTIVITY_ROOM_THRESHOLD ? WAITING_BOT_TARGET : 0;
}

export function rebalanceWaitingVirtualUsers(io: AppServer, random = Math.random) {
  const systemRoomIds = getSystemRoomIds();

  // Repair pool assignments if an empty-room reset removed the corresponding room participant.
  for (const item of pool.list()) {
    const roomId = item.runtime.roomId;
    if (roomId && !getRoomVirtualUser(roomId)) pool.releaseRoom(roomId);
  }

  const humanOccupiedRoomCount = getRoomSummaries().filter((room) => getRoomHumanCount(room.id) > 0).length;
  const target = getWaitingBotTarget(humanOccupiedRoomCount);
  const waitingRoomIds = systemRoomIds.filter((roomId) => getRoomHumanCount(roomId) === 0 && getRoomVirtualUser(roomId));

  if (waitingRoomIds.length > target) {
    for (const roomId of shuffled(waitingRoomIds, random).slice(target)) releaseVirtualUser(io, roomId);
  }

  const currentWaitingCount = systemRoomIds.filter((roomId) => getRoomHumanCount(roomId) === 0 && getRoomVirtualUser(roomId)).length;
  const eligibleRoomIds = shuffled(
    systemRoomIds.filter((roomId) => getRoomHumanCount(roomId) === 0 && !getRoomVirtualUser(roomId)),
    random
  );
  for (const roomId of eligibleRoomIds.slice(0, Math.max(0, target - currentWaitingCount))) {
    assignVirtualUser(io, roomId, random);
  }
}

function getVoicePromptKey(roomId: string, botId: string, humanSocketId: string) {
  return `${roomId}:${botId}:${humanSocketId}`;
}

function clearVoicePromptStateForRoom(roomId: string) {
  for (const key of lastVoicePromptAt.keys()) {
    if (key.startsWith(`${roomId}:`)) lastVoicePromptAt.delete(key);
  }
  for (const key of voicePromptCounts.keys()) {
    if (key.startsWith(`${roomId}:`)) voicePromptCounts.delete(key);
  }
}

function clearUserScopedStateForRoom(roomId: string) {
  for (const key of lastNonEnglishReminderAt.keys()) {
    if (key.startsWith(`${roomId}:`)) lastNonEnglishReminderAt.delete(key);
  }
}

function rememberHumanMessage(message: ChatMessage) {
  const now = Date.now();
  const roomMessages = processedHumanMessages.get(message.roomId) ?? new Map<string, number>();
  for (const [id, seenAt] of roomMessages) {
    if (now - seenAt > PROCESSED_MESSAGE_TTL_MS) roomMessages.delete(id);
  }
  if (roomMessages.has(message.id)) return false;
  roomMessages.set(message.id, now);
  while (roomMessages.size > MAX_PROCESSED_MESSAGES_PER_ROOM) {
    const oldest = roomMessages.keys().next().value as string | undefined;
    if (!oldest) break;
    roomMessages.delete(oldest);
  }
  processedHumanMessages.set(message.roomId, roomMessages);
  return true;
}

export function releaseVirtualUser(io: AppServer, roomId: string) {
  const profile = pool.releaseRoom(roomId);
  const roomBot = getRoomVirtualUser(roomId);
  const botId = profile?.id ?? roomBot?.virtualUserId;
  const pendingLeave = pendingLeaveTimers.get(roomId);
  if (pendingLeave) clearTimeout(pendingLeave.timer);
  pendingLeaveTimers.delete(roomId);
  if (!botId) return;
  roomGenerations.set(roomId, (roomGenerations.get(roomId) ?? 0) + 1);

  const pending = pendingMessages.get(roomId);
  if (pending) clearTimeout(pending.timer);
  pendingMessages.delete(roomId);
  if (profile) io.to(roomId).emit("typing", { senderId: profile.id, nickname: profile.name, active: false });
  conversations.destroy(roomId, botId);
  clearVoicePromptStateForRoom(roomId);
  clearUserScopedStateForRoom(roomId);
  processedHumanMessages.delete(roomId);
  toxicMessageWindows.delete(roomId);
  proactiveSentRooms.delete(roomId);
  const removed = removeVirtualUserByBotId(roomId, botId);
  if (removed) emitPresence(io, roomId, "left", removed.socketId);
}

function randomDelay(minimumMs: number, maximumMs: number, random = Math.random) {
  return minimumMs + Math.floor(random() * (maximumMs - minimumMs + 1));
}

export function scheduleVirtualUserLeave(
  io: AppServer,
  roomId: string,
  reason: LeaveReason,
  minimumMs: number,
  maximumMs: number,
  random = Math.random
) {
  const bot = getRoomVirtualUser(roomId);
  if (!bot?.virtualUserId || pendingLeaveTimers.has(roomId)) return false;
  const botId = bot.virtualUserId;
  const timer = setTimeout(() => {
    pendingLeaveTimers.delete(roomId);
    if (getRoomVirtualUser(roomId)?.virtualUserId !== botId) return;
    if (reason === "second_user" && getRoomHumanCount(roomId) < 2) return;
    releaseVirtualUser(io, roomId);
    rebalanceWaitingVirtualUsers(io);
  }, randomDelay(minimumMs, maximumMs, random));
  timer.unref();
  pendingLeaveTimers.set(roomId, { botId, reason, timer });
  return true;
}

function cancelSecondUserLeave(roomId: string) {
  const pending = pendingLeaveTimers.get(roomId);
  if (pending?.reason !== "second_user") return;
  clearTimeout(pending.timer);
  pendingLeaveTimers.delete(roomId);
}

function scheduleWithdrawalExpiry(io: AppServer, roomId: string, expiresAt: number) {
  const previousTimer = withdrawalTimers.get(roomId);
  if (previousTimer) clearTimeout(previousTimer);
  const timer = setTimeout(() => {
    withdrawalTimers.delete(roomId);
    if ((withdrawnRooms.get(roomId) ?? 0) <= Date.now()) {
      withdrawnRooms.delete(roomId);
      reconcileVirtualUserForRoom(io, roomId);
    }
  }, Math.max(0, expiresAt - Date.now()));
  timer.unref();
  withdrawalTimers.set(roomId, timer);
}

export function reconcileVirtualUserForRoom(io: AppServer, roomId: string, previousHumanCount?: number) {
  if ((withdrawnRooms.get(roomId) ?? 0) <= Date.now()) withdrawnRooms.delete(roomId);
  const humanCount = getRoomHumanCount(roomId);
  const existing = getRoomVirtualUser(roomId);
  if (humanCount >= 2) {
    if (existing && (previousHumanCount ?? humanCount - 1) === 1) {
      scheduleVirtualUserLeave(io, roomId, "second_user", 10_000, 60_000);
    }
  } else if (humanCount === 1 && !existing) {
    cancelSecondUserLeave(roomId);
    assignVirtualUser(io, roomId);
  } else if (humanCount === 0 && !existing && pool.list().some((item) => item.runtime.roomId === roomId)) {
    cancelSecondUserLeave(roomId);
    pool.releaseRoom(roomId);
  } else if (humanCount <= 1) {
    cancelSecondUserLeave(roomId);
  }
  rebalanceWaitingVirtualUsers(io);
}

async function flushMessages(io: AppServer, roomId: string) {
  const pending = pendingMessages.get(roomId);
  if (processingRooms.has(roomId)) {
    if (pending) {
      clearTimeout(pending.timer);
      const timer = setTimeout(() => void flushMessages(io, roomId), BATCH_DELAY_MS);
      timer.unref();
      pendingMessages.set(roomId, { messages: pending.messages, timer });
    }
    return;
  }
  pendingMessages.delete(roomId);
  if (!pending?.messages.length || getRoomHumanCount(roomId) !== 1) return;
  const roomBot = getRoomVirtualUser(roomId);
  if (!roomBot?.virtualUserId) return;
  const profile = pool.getProfile(roomBot.virtualUserId);
  if (!profile?.enabled) return;
  const generation = roomGenerations.get(roomId) ?? 0;
  const isActiveConversation = () => roomGenerations.get(roomId) === generation
    && getRoomHumanCount(roomId) === 1
    && getRoomVirtualUser(roomId)?.virtualUserId === profile.id;

  processingRooms.add(roomId);
  try {
    const context = conversations.get(roomId, profile.id);
    const room = getRoomSummary(roomId);
    context.topic = room?.topic?.description || room?.name;
    const combined = pending.messages.map((message) => message.text).join("\n").slice(0, 1_000);
    const responseWindowStartedAt = pending.messages.at(-1)?.timestamp ?? Date.now();
    const responseContext = { ...context, userFacts: { ...context.userFacts }, recentMessages: [...context.recentMessages] };
    const decision = responseEngine.decide(profile, responseContext, combined);
    const directQuestion = combined.includes("?");
    const botAsked = responseContext.recentMessages.filter((item) => item.senderType === "virtual_user").at(-1)?.text.includes("?") ?? false;
    pending.messages.forEach((message) => conversations.remember(context, message));

    if (!directQuestion && !botAsked && decision.route !== "IGNORE" && Math.random() > profile.replyProbability) return;
    if (decision.route === "IGNORE") return;

    const cooldown = Math.max(0, RESPONSE_COOLDOWN_MS - (Date.now() - (context.lastBotMessageAt ?? 0)));
    if (cooldown) await new Promise((resolve) => setTimeout(resolve, cooldown));
    if (!isActiveConversation()) return;

    io.to(roomId).emit("typing", { senderId: profile.id, nickname: profile.name, active: true });
    const response = await responseEngine.respondDetailed(profile, responseContext, combined, decision);
    if (!response || !isActiveConversation()) return;
    await new Promise((resolve) => setTimeout(resolve, remainingTypingDelay(response.text, responseWindowStartedAt, profile)));
    if (!isActiveConversation()) return;

    const message: ChatMessage = {
      id: `${profile.id}-${Date.now()}`,
      roomId,
      socketId: `virtual:${profile.id}`,
      senderId: profile.id,
      senderType: "virtual_user",
      nickname: profile.name,
      avatar: getVirtualUserAvatar(profile),
      text: response.text,
      timestamp: Date.now()
    };
    if (addRoomMessage(message)) {
      conversations.remember(context, message);
      io.to(roomId).emit("receive-message", message);
      void recordVirtualUserResponse(profile.id, roomId, response.source).catch((error) => {
        console.warn(`[VirtualUser] Unable to record ${response.source} response.`, error instanceof Error ? error.message : error);
      });
    }
  } catch (error) {
    console.error(`[VirtualUser] Unable to process chat in ${roomId}.`, error);
  } finally {
    if (roomGenerations.get(roomId) === generation) {
      io.to(roomId).emit("typing", { senderId: profile.id, nickname: profile.name, active: false });
    }
    processingRooms.delete(roomId);
  }
}

function interruptPendingResponse(io: AppServer, roomId: string, botId: string, nickname: string) {
  const pending = pendingMessages.get(roomId);
  if (pending) clearTimeout(pending.timer);
  pendingMessages.delete(roomId);
  if (processingRooms.has(roomId)) {
    roomGenerations.set(roomId, (roomGenerations.get(roomId) ?? 0) + 1);
    io.to(roomId).emit("typing", { senderId: botId, nickname, active: false });
  }
}

function sendImmediateRuleResponse(io: AppServer, roomId: string, profile: VirtualUserProfile, text: string, suffix: string) {
  const context = conversations.get(roomId, profile.id);
  const sentenceCount = selectSentenceCount(profile);
  const response = validateBotResponse(text, context, profile, sentenceCount);
  if (!response) return false;
  const now = Date.now();
  const botMessage: ChatMessage = {
    id: `${profile.id}-${suffix}-${now}`,
    roomId,
    socketId: `virtual:${profile.id}`,
    senderId: profile.id,
    senderType: "virtual_user",
    nickname: profile.name,
    avatar: getVirtualUserAvatar(profile),
    text: response,
    timestamp: now
  };
  if (!addRoomMessage(botMessage)) return false;
  conversations.remember(context, botMessage);
  io.to(roomId).emit("receive-message", botMessage);
  void recordVirtualUserResponse(profile.id, roomId, "rule").catch((error) => {
    console.warn(`[VirtualUser] Unable to record ${suffix} response.`, error instanceof Error ? error.message : error);
  });
  return true;
}

export async function handleHumanChatMessage(io: AppServer, message: ChatMessage) {
  if (message.senderType !== "human" || !message.text.trim()) return;
  const bot = getRoomVirtualUser(message.roomId);
  if (!bot?.virtualUserId || getRoomHumanCount(message.roomId) !== 1) return;
  if (!rememberHumanMessage(message)) return;
  const profile = pool.getProfile(bot.virtualUserId);
  if (!profile?.enabled) return;

  const language = assessEnglishMessage(message.text);
  if (language.needsClassification) {
    const reminderKey = `${message.roomId}:${message.senderId}`;
    const reminderCooldownMs = profile.nonEnglishReminderCooldownSeconds * 1_000;
    const context = conversations.get(message.roomId, profile.id);
    const isEnglish = await responseEngine.classifyEnglish(profile, context, message.text);
    if (getRoomHumanCount(message.roomId) !== 1 || getRoomVirtualUser(message.roomId)?.virtualUserId !== profile.id) return;
    if (isEnglish !== true) {
      interruptPendingResponse(io, message.roomId, profile.id, profile.name);
      if (isEnglish === null) return;
      const now = Date.now();
      if (now - (lastNonEnglishReminderAt.get(reminderKey) ?? 0) >= reminderCooldownMs) {
        const start = Math.floor(Math.random() * nonEnglishReminders.length);
        for (let offset = 0; offset < nonEnglishReminders.length; offset += 1) {
          const reminder = nonEnglishReminders[(start + offset) % nonEnglishReminders.length]!;
          if (sendImmediateRuleResponse(io, message.roomId, profile, reminder, "language")) {
            lastNonEnglishReminderAt.set(reminderKey, now);
            break;
          }
        }
      }
      return;
    }
  }

  if (isUserRejectingBot(message.text)) {
    interruptPendingResponse(io, message.roomId, profile.id, profile.name);
    if (Math.random() * 100 < profile.leaveWhenRejectedProbability) {
      const now = Date.now();
      const expiresAt = now + WITHDRAWAL_COOLDOWN_MS;
      withdrawnRooms.set(message.roomId, expiresAt);
      scheduleWithdrawalExpiry(io, message.roomId, expiresAt);
      sendImmediateRuleResponse(io, message.roomId, profile, getRejectionResponse(), "rejected");
      scheduleVirtualUserLeave(io, message.roomId, "rejected", 3_000, 10_000);
    } else {
      sendImmediateRuleResponse(io, message.roomId, profile, "I think I'll stay a little longer.", "rejected");
    }
    return;
  }

  const toxicity = classifyHumanMessage(message.text);
  const now = Date.now();
  const recentToxicMessages = (toxicMessageWindows.get(message.roomId) ?? []).filter((timestamp) => now - timestamp <= TOXICITY_WINDOW_MS);
  if (toxicity !== "none") recentToxicMessages.push(now);
  toxicMessageWindows.set(message.roomId, recentToxicMessages);
  if (toxicity === "severe" || recentToxicMessages.length >= 2) {
    interruptPendingResponse(io, message.roomId, profile.id, profile.name);
    const expiresAt = now + WITHDRAWAL_COOLDOWN_MS;
    withdrawnRooms.set(message.roomId, expiresAt);
    scheduleWithdrawalExpiry(io, message.roomId, expiresAt);
    const departureText = getToxicityDepartureMessage(lastDepartureMessageByBot.get(profile.id));
    lastDepartureMessageByBot.set(profile.id, departureText);
    sendImmediateRuleResponse(io, message.roomId, profile, departureText, "moderation");
    scheduleVirtualUserLeave(io, message.roomId, "rude", 3_000, 8_000);
    return;
  }
  proactiveSentRooms.delete(message.roomId);
  if (processingRooms.has(message.roomId)) interruptPendingResponse(io, message.roomId, profile.id, profile.name);
  const current = pendingMessages.get(message.roomId);
  if (current) {
    clearTimeout(current.timer);
    current.messages.push(message);
    if (current.messages.length > 20) current.messages.splice(0, current.messages.length - 20);
  }
  const messages = current?.messages ?? [message];
  const timer = setTimeout(() => void flushMessages(io, message.roomId), BATCH_DELAY_MS);
  timer.unref();
  pendingMessages.set(message.roomId, { messages, timer });
}

export function enqueueHumanChatMessage(io: AppServer, message: ChatMessage) {
  const previous = humanMessagePipelines.get(message.roomId) ?? Promise.resolve();
  const current = previous
    .catch(() => undefined)
    .then(() => handleHumanChatMessage(io, message));
  humanMessagePipelines.set(message.roomId, current);
  const cleanup = () => {
    if (humanMessagePipelines.get(message.roomId) === current) humanMessagePipelines.delete(message.roomId);
  };
  void current.then(cleanup, cleanup);
  return current;
}

export async function checkProactiveMessages(io: AppServer, now = Date.now(), random = Math.random) {
  await Promise.all(pool.list().map(async (item) => {
    const roomId = item.runtime.roomId;
    if (item.runtime.status !== "ACTIVE" || !roomId || processingRooms.has(roomId)) return;
    if (getRoomHumanCount(roomId) !== 1 || getRoomVirtualUser(roomId)?.virtualUserId !== item.profile.id) return;
    const context = conversations.get(roomId, item.profile.id);
    if (!shouldAttemptProactiveMessage(item.profile, context, proactiveSentRooms.has(roomId), now, random)) return;

    const generation = roomGenerations.get(roomId) ?? 0;
    const isActiveConversation = () => roomGenerations.get(roomId) === generation
      && getRoomHumanCount(roomId) === 1
      && getRoomVirtualUser(roomId)?.virtualUserId === item.profile.id;
    processingRooms.add(roomId);
    try {
      const responseWindowStartedAt = Date.now();
      const responseContext = { ...context, userFacts: { ...context.userFacts }, recentMessages: [...context.recentMessages] };
      io.to(roomId).emit("typing", { senderId: item.profile.id, nickname: item.profile.name, active: true });
      const response = await responseEngine.respondProactively(item.profile, responseContext);
      if (!isActiveConversation()) return;
      await new Promise((resolve) => setTimeout(resolve, remainingTypingDelay(response.text, responseWindowStartedAt, item.profile)));
      if (!isActiveConversation()) return;

      const message: ChatMessage = {
        id: `${item.profile.id}-proactive-${Date.now()}`,
        roomId,
        socketId: `virtual:${item.profile.id}`,
        senderId: item.profile.id,
        senderType: "virtual_user",
        nickname: item.profile.name,
        avatar: getVirtualUserAvatar(item.profile),
        text: response.text,
        timestamp: Date.now()
      };
      if (addRoomMessage(message)) {
        conversations.remember(context, message);
        proactiveSentRooms.add(roomId);
        io.to(roomId).emit("receive-message", message);
        void recordVirtualUserResponse(item.profile.id, roomId, response.source).catch((error) => {
          console.warn(`[VirtualUser] Unable to record proactive ${response.source} response.`, error instanceof Error ? error.message : error);
        });
      }
    } catch (error) {
      console.error(`[VirtualUser] Unable to send proactive chat in ${roomId}.`, error);
    } finally {
      if (roomGenerations.get(roomId) === generation) {
        io.to(roomId).emit("typing", { senderId: item.profile.id, nickname: item.profile.name, active: false });
      }
      processingRooms.delete(roomId);
    }
  }));
}

export function handleHumanVoiceAttempt(io: AppServer, roomId: string, humanSocketId: string) {
  if (getRoomHumanCount(roomId) !== 1) return;
  const roomBot = getRoomVirtualUser(roomId);
  if (!roomBot?.virtualUserId) return;
  const profile = pool.getProfile(roomBot.virtualUserId);
  if (!profile?.enabled) return;

  const now = Date.now();
  const promptKey = getVoicePromptKey(roomId, profile.id, humanSocketId);
  if ((voicePromptCounts.get(promptKey) ?? 0) >= 3) return;
  if (now - (lastVoicePromptAt.get(promptKey) ?? 0) < VOICE_PROMPT_COOLDOWN_MS) return;
  lastVoicePromptAt.set(promptKey, now);
  voicePromptCounts.set(promptKey, (voicePromptCounts.get(promptKey) ?? 0) + 1);

  const context = conversations.get(roomId, profile.id);
  const sentenceCount = selectSentenceCount(profile);
  const voicePrompt = getVoicePromptResponse(sentenceCount);
  const response = validateBotResponse(voicePrompt, context, profile, sentenceCount)
    ?? (sentenceCount === 1
      ? "Please type your message here."
      : sentenceCount === 2
        ? "I cannot use the mic here. Please type your message."
        : "I cannot use the mic here. I cannot use the camera either. Please type your message.");
  const message: ChatMessage = {
    id: `${profile.id}-voice-${now}`,
    roomId,
    socketId: `virtual:${profile.id}`,
    senderId: profile.id,
    senderType: "virtual_user",
    nickname: profile.name,
    avatar: getVirtualUserAvatar(profile),
    text: response,
    timestamp: now
  };
  if (addRoomMessage(message)) {
    conversations.remember(context, message);
    io.to(roomId).emit("receive-message", message);
    void recordVirtualUserResponse(profile.id, roomId, "rule").catch((error) => {
      console.warn("[VirtualUser] Unable to record rule voice response.", error instanceof Error ? error.message : error);
    });
  }
}

export function getVirtualUsersForAdmin() {
  return pool.list();
}

export function applyVirtualUserProfile(io: AppServer, profile: VirtualUserProfile) {
  pool.updateProfile(profile);
  const runtime = pool.getRuntime(profile.id);
  if (!profile.enabled && runtime?.roomId) releaseVirtualUser(io, runtime.roomId);
  else if (runtime?.roomId && updateVirtualUserProfileInRoom(runtime.roomId, profile.id, profile)) {
    io.to(runtime.roomId).emit("room-users", getPublicRoomUsers(runtime.roomId));
    io.emit("room-list", getRoomSummaries());
  }
  for (const room of getRoomSummaries()) {
    if (getRoomHumanCount(room.id) === 1 && !getRoomVirtualUser(room.id)) assignVirtualUser(io, room.id);
  }
  rebalanceWaitingVirtualUsers(io);
}

export async function initializeVirtualUserService(io: AppServer) {
  const profiles = await listVirtualUserProfiles();
  const ids = profiles.map((profile) => profile.id).sort();
  if (profiles.length !== VIRTUAL_USER_IDS.length || ids.some((id, index) => id !== VIRTUAL_USER_IDS[index])) {
    throw new Error("Virtual User profiles are incomplete. Run migration 005_create_virtual_users.sql.");
  }
  pool.replaceProfiles(profiles);
  for (const room of getRoomSummaries()) {
    if (getRoomHumanCount(room.id) === 1 && !getRoomVirtualUser(room.id)) assignVirtualUser(io, room.id);
  }
  rebalanceWaitingVirtualUsers(io);
  if (!proactiveCheckTimer) {
    proactiveCheckTimer = setInterval(() => void checkProactiveMessages(io), PROACTIVE_CHECK_INTERVAL_MS);
    proactiveCheckTimer.unref();
  }
}

export const virtualUserInternals = {
  pool,
  conversations,
  processingRooms,
  roomGenerations,
  pendingMessages,
  lastVoicePromptAt,
  voicePromptCounts,
  processedHumanMessages,
  proactiveSentRooms,
  toxicMessageWindows,
  withdrawnRooms,
  withdrawalTimers,
  lastDepartureMessageByBot,
  pendingLeaveTimers,
  lastNonEnglishReminderAt,
  humanMessagePipelines,
  responseEngine,
};

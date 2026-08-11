import {
  addRoomMessage,
  addVirtualUserToRoom,
  getPublicRoomUsers,
  getRoomHumanCount,
  getRoomSummary,
  getRoomSummaries,
  getRoomVirtualUser,
  removeVirtualUserByBotId,
  updateVirtualUserProfileInRoom
} from "../rooms/roomStore.js";
import type { AppServer, ChatMessage } from "../types/socket.js";
import { env } from "../config/env.js";
import { BotPool } from "./botPool.js";
import { HybridResponseEngine } from "./hybridResponseEngine.js";
import { OllamaProvider, UnavailableLLMProvider } from "./llmProvider.js";
import { listVirtualUserProfiles } from "./virtualUserRepository.js";
import { VIRTUAL_USER_IDS, type VirtualUserProfile } from "./virtualUserTypes.js";
import { ConversationStore } from "./conversationStore.js";

const BATCH_DELAY_MS = 650;
const RESPONSE_COOLDOWN_MS = 1_200;
const pool = new BotPool();
const conversations = new ConversationStore();
const pendingMessages = new Map<string, { messages: ChatMessage[]; timer: ReturnType<typeof setTimeout> }>();
const processingRooms = new Set<string>();
const roomGenerations = new Map<string, number>();
const llmProvider = env.ollamaModel
  ? new OllamaProvider(env.ollamaBaseUrl, env.ollamaModel)
  : new UnavailableLLMProvider();
const responseEngine = new HybridResponseEngine(llmProvider);

export function getTypingDelayRange(text: string): readonly [number, number] {
  return text.length < 45 ? [500, 1_200] : text.length < 140 ? [1_000, 2_500] : [1_500, 3_500];
}

function typingDelay(text: string) {
  const [minimum, maximum] = getTypingDelayRange(text);
  return minimum + Math.floor(Math.random() * (maximum - minimum + 1));
}

function emitPresence(io: AppServer, roomId: string, event: "joined" | "left", socketId: string) {
  if (event === "left") io.to(roomId).emit("user-left", { socketId });
  io.to(roomId).emit("room-users", getPublicRoomUsers(roomId));
  io.emit("room-list", getRoomSummaries());
}

export function releaseVirtualUser(io: AppServer, roomId: string) {
  const profile = pool.releaseRoom(roomId);
  const roomBot = getRoomVirtualUser(roomId);
  const botId = profile?.id ?? roomBot?.virtualUserId;
  if (!botId) return;
  roomGenerations.set(roomId, (roomGenerations.get(roomId) ?? 0) + 1);

  const pending = pendingMessages.get(roomId);
  if (pending) clearTimeout(pending.timer);
  pendingMessages.delete(roomId);
  if (profile) io.to(roomId).emit("typing", { senderId: profile.id, nickname: profile.name, active: false });
  conversations.destroy(roomId, botId);
  const removed = removeVirtualUserByBotId(roomId, botId);
  if (removed) emitPresence(io, roomId, "left", removed.socketId);
}

export function reconcileVirtualUserForRoom(io: AppServer, roomId: string) {
  const humanCount = getRoomHumanCount(roomId);
  const existing = getRoomVirtualUser(roomId);
  if (humanCount !== 1) {
    if (existing || pool.list().some((item) => item.runtime.roomId === roomId)) releaseVirtualUser(io, roomId);
    return;
  }
  if (existing) return;

  // Assignment and room insertion are synchronous, so two room events cannot claim the same runtime.
  const profile = pool.assign(roomId);
  if (!profile) return;
  const user = addVirtualUserToRoom(roomId, profile);
  if (!user) {
    pool.releaseRoom(roomId);
    return;
  }
  roomGenerations.set(roomId, (roomGenerations.get(roomId) ?? 0) + 1);
  io.to(roomId).emit("user-joined", user);
  emitPresence(io, roomId, "joined", user.socketId);
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
    const response = await responseEngine.respond(profile, responseContext, combined, decision);
    if (!response || !isActiveConversation()) return;
    await new Promise((resolve) => setTimeout(resolve, typingDelay(response)));
    if (!isActiveConversation()) return;

    const message: ChatMessage = {
      id: `${profile.id}-${Date.now()}`,
      roomId,
      socketId: `virtual:${profile.id}`,
      senderId: profile.id,
      senderType: "virtual_user",
      nickname: profile.name,
      avatar: profile.avatarUrl?.trim() || "🤖",
      text: response,
      timestamp: Date.now()
    };
    if (addRoomMessage(message)) {
      conversations.remember(context, message);
      io.to(roomId).emit("receive-message", message);
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

export function handleHumanChatMessage(io: AppServer, message: ChatMessage) {
  if (message.senderType !== "human") return;
  const bot = getRoomVirtualUser(message.roomId);
  if (!bot?.virtualUserId || getRoomHumanCount(message.roomId) !== 1) return;
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
  for (const room of getRoomSummaries()) reconcileVirtualUserForRoom(io, room.id);
}

export async function initializeVirtualUserService(io: AppServer) {
  const profiles = await listVirtualUserProfiles();
  const ids = profiles.map((profile) => profile.id).sort();
  if (profiles.length !== VIRTUAL_USER_IDS.length || ids.some((id, index) => id !== VIRTUAL_USER_IDS[index])) {
    throw new Error("Virtual User profiles are incomplete. Run migration 006_create_virtual_user_profiles.sql.");
  }
  pool.replaceProfiles(profiles);
  for (const room of getRoomSummaries()) reconcileVirtualUserForRoom(io, room.id);
}

export const virtualUserInternals = { pool, conversations, processingRooms, roomGenerations, pendingMessages };

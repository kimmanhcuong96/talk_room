import { randomUUID } from "node:crypto";
import {
  addVirtualRoomMessage,
  applyVirtualUserDistribution,
  getRoomSummaries,
  getVirtualChatRoom,
  getVirtualChatRoomIds
} from "../rooms/roomStore.js";
import type { AppServer } from "../types/socket.js";
import { getVirtualUserSettings, type VirtualUserSettings } from "./virtualUserRepository.js";
import { getRandomVirtualChatMessage } from "./virtualChatContent.js";

const MIN_CHAT_DELAY_MS = 30_000;
const MAX_CHAT_DELAY_MS = 180_000;
const chatTimers = new Map<string, ReturnType<typeof setTimeout>>();
const previousMessages = new Map<string, string>();
const previousSenders = new Map<string, string>();

let activeSettings: VirtualUserSettings = {
  enabled: false,
  virtualUserCount: 6,
  targetRoomCount: 6,
  updatedAt: new Date(0).toISOString()
};

function randomChatDelay() {
  return MIN_CHAT_DELAY_MS + Math.floor(Math.random() * (MAX_CHAT_DELAY_MS - MIN_CHAT_DELAY_MS + 1));
}

function cancelChatSchedule(roomId: string) {
  const timer = chatTimers.get(roomId);
  if (timer) clearTimeout(timer);
  chatTimers.delete(roomId);
  previousMessages.delete(roomId);
  previousSenders.delete(roomId);
}

function scheduleNextVirtualMessage(io: AppServer, roomId: string) {
  if (chatTimers.has(roomId) || !getVirtualChatRoom(roomId)) return;

  const timer = setTimeout(() => {
    chatTimers.delete(roomId);
    const room = getVirtualChatRoom(roomId);
    if (!room) {
      cancelChatSchedule(roomId);
      return;
    }

    const previousSender = previousSenders.get(roomId);
    const senderCandidates = room.users.filter((user) => user.socketId !== previousSender);
    const senderPool = senderCandidates.length > 0 ? senderCandidates : room.users;
    const sender = senderPool[Math.floor(Math.random() * senderPool.length)]!;
    const text = getRandomVirtualChatMessage(room.primaryLanguage, previousMessages.get(roomId));
    const message = addVirtualRoomMessage({
      id: `virtual-chat-${randomUUID()}`,
      roomId,
      socketId: sender.socketId,
      nickname: sender.nickname,
      avatar: sender.avatar,
      text,
      timestamp: Date.now()
    });

    if (message) {
      previousMessages.set(roomId, text);
      previousSenders.set(roomId, sender.socketId);
      io.to(roomId).emit("receive-message", message);
      scheduleNextVirtualMessage(io, roomId);
    } else {
      cancelChatSchedule(roomId);
    }
  }, randomChatDelay());
  timer.unref();
  chatTimers.set(roomId, timer);
}

function syncVirtualChatSchedules(io: AppServer) {
  const eligibleRoomIds = new Set(getVirtualChatRoomIds());
  for (const roomId of chatTimers.keys()) {
    if (!eligibleRoomIds.has(roomId)) cancelChatSchedule(roomId);
  }
  for (const roomId of eligibleRoomIds) scheduleNextVirtualMessage(io, roomId);
}

export function applyVirtualUserSettings(io: AppServer, settings: VirtualUserSettings) {
  activeSettings = settings;
  applyVirtualUserDistribution(settings);
  syncVirtualChatSchedules(io);
  io.emit("room-list", getRoomSummaries());
}

export function rebalanceVirtualUsers(io: AppServer) {
  applyVirtualUserDistribution(activeSettings);
  syncVirtualChatSchedules(io);
  io.emit("room-list", getRoomSummaries());
}

export async function initializeVirtualUserService(io: AppServer) {
  const settings = await getVirtualUserSettings();
  if (settings) applyVirtualUserSettings(io, settings);
}

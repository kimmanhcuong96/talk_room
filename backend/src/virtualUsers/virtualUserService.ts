import {
  addVirtualRoomMessage,
  applyVirtualUserDistribution,
  getRoomSummary,
  getRoomSummaries,
  getRoomUsers,
  getPublicRoomUsers,
  removeVirtualUserFromRoom,
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
const departureTimers = new Map<string, Set<ReturnType<typeof setTimeout>>>();

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
      id: `${sender.socketId}-${Date.now()}`,
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

function cancelVirtualDepartures(roomId: string) {
  const timers = departureTimers.get(roomId);
  if (timers) timers.forEach((timer) => clearTimeout(timer));
  departureTimers.delete(roomId);
}

function syncVirtualDepartureSchedules() {
  for (const roomId of departureTimers.keys()) {
    const users = getRoomUsers(roomId);
    const hasRealUser = users.some((user) => !user.isVirtual);
    const hasVirtualUser = users.some((user) => user.isVirtual);
    if (!hasRealUser || !hasVirtualUser) cancelVirtualDepartures(roomId);
  }
}

export function scheduleVirtualUserDepartures(io: AppServer, roomId: string) {
  cancelVirtualDepartures(roomId);
  const users = getRoomUsers(roomId);
  if (!users.some((user) => !user.isVirtual)) return;
  const virtualUsers = users.filter((user) => user.isVirtual);
  if (virtualUsers.length === 0) return;

  const timers = new Set<ReturnType<typeof setTimeout>>();
  departureTimers.set(roomId, timers);
  const segmentDuration = 30_000 / virtualUsers.length;

  virtualUsers.forEach((user, index) => {
    const delay = Math.max(1_000, Math.floor(index * segmentDuration + Math.random() * segmentDuration));
    const timer = setTimeout(() => {
      timers.delete(timer);
      if (timers.size === 0) departureTimers.delete(roomId);

      const result = removeVirtualUserFromRoom(roomId, user.socketId);
      if (!result) return;
      io.to(roomId).emit("user-left", { socketId: user.socketId });
      io.to(roomId).emit("room-users", getPublicRoomUsers(roomId));
      const summary = getRoomSummary(roomId);
      if (result.topicRestored && summary) {
        io.to(roomId).emit("room-topic-updated", { roomId, topic: summary.topic });
      }
      io.emit("room-list", getRoomSummaries());

      if (!getRoomUsers(roomId).some((candidate) => candidate.isVirtual)) {
        rebalanceVirtualUsers(io);
      }
    }, delay);
    timer.unref();
    timers.add(timer);
  });
}

export function applyVirtualUserSettings(io: AppServer, settings: VirtualUserSettings) {
  activeSettings = settings;
  applyVirtualUserDistribution(settings);
  syncVirtualDepartureSchedules();
  syncVirtualChatSchedules(io);
  io.emit("room-list", getRoomSummaries());
}

export function rebalanceVirtualUsers(io: AppServer) {
  applyVirtualUserDistribution(activeSettings);
  syncVirtualDepartureSchedules();
  syncVirtualChatSchedules(io);
  io.emit("room-list", getRoomSummaries());
}

export async function initializeVirtualUserService(io: AppServer) {
  const settings = await getVirtualUserSettings();
  if (settings) applyVirtualUserSettings(io, settings);
}

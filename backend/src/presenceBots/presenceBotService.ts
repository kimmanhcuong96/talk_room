import {
  addPresenceBotToRoom,
  getPublicRoomUsers,
  getRoomSummary,
  getRoomSummaries,
  getRoomUsers,
  hasPresenceBot,
  removePresenceBotFromRoom
} from "../rooms/roomStore.js";
import { getTotalPresenceBots } from "../settings/appSettings.js";
import type { AppServer, RoomUser } from "../types/socket.js";

const STAY_DURATION_MS = { min: 20 * 60_000, max: 40 * 60_000 } as const;
const RECONCILE_INTERVAL_MS = 30_000;

type PresenceBotRuntime = {
  botId: string;
  roomId: string;
  user: RoomUser;
  leaveTimer: ReturnType<typeof setTimeout>;
};

const activeBots = new Map<string, PresenceBotRuntime>();
let configuredTotal = 0;
let reconcileTimer: ReturnType<typeof setInterval> | null = null;
let server: AppServer | null = null;

function randomDuration(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function shuffle<T>(values: T[]) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function emitMembership(io: AppServer, roomId: string, user: RoomUser, joined: boolean) {
  if (joined) io.to(roomId).emit("user-joined", user);
  else io.to(roomId).emit("user-left", { socketId: user.socketId });
  io.to(roomId).emit("room-users", getPublicRoomUsers(roomId));
  io.emit("room-list", getRoomSummaries());
}

function releaseBot(io: AppServer, botId: string) {
  const runtime = activeBots.get(botId);
  if (!runtime) return;
  activeBots.delete(botId);
  clearTimeout(runtime.leaveTimer);
  const removed = removePresenceBotFromRoom(runtime.roomId, botId);
  if (removed) emitMembership(io, runtime.roomId, removed, false);
}

function trimPresenceBotsToRoomCapacity(io: AppServer, roomId: string) {
  const room = getRoomSummary(roomId);
  if (!room) return 0;
  const excess = Math.max(0, room.users - room.capacity);
  if (excess === 0) return 0;

  const candidates = shuffle(getRoomUsers(roomId).filter((user) => user.senderType === "presence_bot"));
  let released = 0;
  for (const user of candidates.slice(0, excess)) {
    const botId = user.socketId.startsWith("presence:") ? user.socketId.slice("presence:".length) : "";
    const runtime = activeBots.get(botId);
    if (runtime?.roomId === roomId) {
      releaseBot(io, botId);
      released += 1;
      continue;
    }
    const removed = botId ? removePresenceBotFromRoom(roomId, botId) : null;
    if (removed) {
      emitMembership(io, roomId, removed, false);
      released += 1;
    }
  }
  return released;
}

function eligibleRoomIds() {
  const eligible = getRoomSummaries()
    .filter((room) => room.users < room.capacity
      && room.participants.every((member) => member.senderType === "presence_bot"));
  const partiallyFilled = eligible.filter((room) => room.users > 0);
  return shuffle((partiallyFilled.length ? partiallyFilled : eligible).map((room) => room.id));
}

function allocateBot(io: AppServer, botId: string) {
  for (const roomId of eligibleRoomIds()) {
    // This function synchronously re-checks real users, Virtual Users and capacity.
    const user = addPresenceBotToRoom(roomId, botId);
    if (!user) continue;
    const leaveTimer = setTimeout(() => {
      releaseBot(io, botId);
      void reconcilePresenceBots(io);
    }, randomDuration(STAY_DURATION_MS.min, STAY_DURATION_MS.max));
    leaveTimer.unref();
    activeBots.set(botId, { botId, roomId, user, leaveTimer });
    emitMembership(io, roomId, user, true);
    return true;
  }
  return false;
}

export async function reconcilePresenceBots(io: AppServer) {
  configuredTotal = await getTotalPresenceBots();

  for (const room of getRoomSummaries()) trimPresenceBotsToRoomCapacity(io, room.id);

  for (const [botId, runtime] of activeBots) {
    const ordinal = Number(botId.slice("presence-".length));
    if (ordinal > configuredTotal || !hasPresenceBot(runtime.roomId, botId)) releaseBot(io, botId);
  }

  const availableSlots = getRoomSummaries()
    .filter((room) => room.participants.every((member) => member.senderType === "presence_bot"))
    .reduce((total, room) => total + Math.max(0, room.capacity - room.users), 0);
  const targetActive = Math.min(configuredTotal, activeBots.size + availableSlots);
  for (let ordinal = 1; activeBots.size < targetActive && ordinal <= targetActive; ordinal += 1) {
    const botId = `presence-${ordinal}`;
    if (!activeBots.has(botId)) allocateBot(io, botId);
  }
}

export function getPresenceBotStatus() {
  return {
    totalPresenceBots: configuredTotal,
    activePresenceBots: activeBots.size
  };
}

export async function initializePresenceBotService(io: AppServer) {
  server = io;
  await reconcilePresenceBots(io);
  reconcileTimer ??= setInterval(() => {
    if (server) void reconcilePresenceBots(server);
  }, RECONCILE_INTERVAL_MS);
  reconcileTimer.unref();
}

export function refreshPresenceBots() {
  return server ? reconcilePresenceBots(server) : Promise.resolve();
}

export const presenceBotInternals = { activeBots, STAY_DURATION_MS };

import type { ChatMessage, RoomSummary, RoomTopic, RoomUser, RoomYouTubeVideo } from "../types/socket.js";
import { randomUUID } from "node:crypto";
import type { RoomLanguage, RoomLanguageLevel } from "./roomLanguages.js";
import { getVirtualUserAvatar } from "../virtualUsers/virtualUserAvatar.js";

const ROOM_CAPACITY = 4;

const roomNames = [
  "English Beginner",
  "English Intermediate",
  "Daily Conversation",
  "IELTS Speaking",
  "Business English",
  "Travel English",
  "Pronunciation Practice",
  "Free Talk",
  "Movie Discussion",
  "Book Club",
  "Technology",
  "Gaming",
  "Culture Exchange",
  "Debate",
  "Vocabulary Practice",
  "Grammar Practice",
  "Interview English",
  "Coffee Chat"
] as const;

type Room = {
  id: string;
  name: string;
  primaryLanguage: RoomLanguage;
  primaryLanguageLevel: RoomLanguageLevel;
  secondaryLanguage: RoomLanguage | null;
  creatorUserId: string | null;
  source: "system" | "user";
  defaults: {
    primaryLanguage: RoomLanguage;
    primaryLanguageLevel: RoomLanguageLevel;
    secondaryLanguage: RoomLanguage | null;
    topic: RoomTopic | null;
  };
  capacity: number;
  topic: RoomTopic | null;
  youtubeVideo: RoomYouTubeVideo | null;
  users: RoomUser[];
  messages: ChatMessage[];
  blockedUserIds: Set<string>;
  blockedIpHashes: Map<string, number>;
};

const rooms = new Map<string, Room>(
  roomNames.map((name, index) => {
    const id = `room-${index + 1}`;
    const primaryLanguageLevel: RoomLanguageLevel = index === 0 ? "a1" : index === 1 ? "b1" : "any";
    return [id, { id, name, primaryLanguage: "en", primaryLanguageLevel, secondaryLanguage: null, creatorUserId: null, source: "system", defaults: { primaryLanguage: "en", primaryLanguageLevel, secondaryLanguage: null, topic: null }, capacity: ROOM_CAPACITY, topic: null, youtubeVideo: null, users: [], messages: [], blockedUserIds: new Set(), blockedIpHashes: new Map() }];
  })
);

function getYouTubeVideoSnapshot(room: Room): RoomYouTubeVideo | null {
  if (!room.youtubeVideo) return null;
  const now = Date.now();
  const elapsedSeconds = room.youtubeVideo.playback === "playing" ? (now - room.youtubeVideo.updatedAt) / 1000 : 0;
  return {
    ...room.youtubeVideo,
    positionSeconds: Math.max(0, room.youtubeVideo.positionSeconds + elapsedSeconds),
    updatedAt: now
  };
}

export function getRoomSummaries(): RoomSummary[] {
  return [...rooms.values()].map((room) => {
    const realUserCount = room.users.filter((user) => user.senderType === "human").length;
    return ({
    id: room.id,
    name: room.name,
    primaryLanguage: room.primaryLanguage,
    primaryLanguageLevel: room.primaryLanguageLevel,
    secondaryLanguage: room.secondaryLanguage,
    users: room.users.length,
    capacity: room.capacity,
    canJoin: realUserCount < room.capacity,
    suggestedGuestNumber: realUserCount + 1,
    topic: room.topic,
    youtubeVideo: getYouTubeVideoSnapshot(room),
    participants: room.users.map(({ nickname, avatar, role, senderType }) => ({ nickname, avatar, role, senderType }))
    });
  });
}

export function getSystemRoomIds() {
  return [...rooms.values()].filter((room) => room.source === "system").map((room) => room.id);
}

export function getRoomSummary(roomId: string): RoomSummary | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;
  const realUserCount = room.users.filter((user) => user.senderType === "human").length;

  return {
    id: room.id,
    name: room.name,
    primaryLanguage: room.primaryLanguage,
    primaryLanguageLevel: room.primaryLanguageLevel,
    secondaryLanguage: room.secondaryLanguage,
    users: room.users.length,
    capacity: room.capacity,
    canJoin: realUserCount < room.capacity,
    suggestedGuestNumber: realUserCount + 1,
    topic: room.topic,
    youtubeVideo: getYouTubeVideoSnapshot(room),
    participants: room.users.map(({ nickname, avatar, role, senderType }) => ({ nickname, avatar, role, senderType }))
  };
}

export function createRoom(
  name: string,
  primaryLanguage: RoomLanguage,
  primaryLanguageLevel: RoomLanguageLevel,
  secondaryLanguage: RoomLanguage | null,
  creatorUserId: string,
  capacity: number
): RoomSummary {
  const room: Room = {
    id: `room-${randomUUID()}`,
    name,
    primaryLanguage,
    primaryLanguageLevel,
    secondaryLanguage,
    creatorUserId,
    source: "user",
    defaults: { primaryLanguage, primaryLanguageLevel, secondaryLanguage, topic: null },
    capacity,
    topic: null,
    youtubeVideo: null,
    users: [],
    messages: [],
    blockedUserIds: new Set(),
    blockedIpHashes: new Map()
  };

  rooms.set(room.id, room);
  return {
    id: room.id,
    name: room.name,
    primaryLanguage: room.primaryLanguage,
    primaryLanguageLevel: room.primaryLanguageLevel,
    secondaryLanguage: room.secondaryLanguage,
    users: 0,
    capacity: room.capacity,
    canJoin: true,
    suggestedGuestNumber: 1,
    topic: room.topic,
    youtubeVideo: getYouTubeVideoSnapshot(room),
    participants: []
  };
}

export function canManageRoomLanguages(roomId: string, socketId: string, userId: string | undefined) {
  const room = rooms.get(roomId);
  if (!room) return false;

  if (room.source === "user") {
    return Boolean(userId && userId === room.creatorUserId);
  }

  return room.users.find((user) => user.senderType === "human")?.socketId === socketId;
}

export function canBlockUsersInRoom(roomId: string, userId: string | undefined) {
  const room = rooms.get(roomId);
  return Boolean(room?.source === "user" && userId && room.creatorUserId === userId);
}

export function canManageRoomTopic(roomId: string, socketId: string, userId: string | undefined) {
  return canManageRoomLanguages(roomId, socketId, userId);
}

export function updateRoomTopic(roomId: string, topic: RoomTopic | null) {
  const room = rooms.get(roomId);
  if (!room) return undefined;
  room.topic = topic;
  return topic;
}

export function updateRoomYouTubeVideo(roomId: string, video: RoomYouTubeVideo | null) {
  const room = rooms.get(roomId);
  if (!room) return undefined;
  room.youtubeVideo = video;
  return video;
}

export function resetRoomSessionIfEmpty(roomId: string) {
  const room = rooms.get(roomId);
  if (!room || room.users.some((user) => user.senderType === "human")) return false;

  room.primaryLanguage = room.defaults.primaryLanguage;
  room.primaryLanguageLevel = room.defaults.primaryLanguageLevel;
  room.secondaryLanguage = room.defaults.secondaryLanguage;
  room.topic = room.defaults.topic;
  room.youtubeVideo = null;
  room.messages = [];
  room.users = [];
  return true;
}

export function blockUserFromRoom(roomId: string, targetUserId: string | undefined, targetIpHash: string) {
  const room = rooms.get(roomId);
  if (!room || room.source !== "user") return null;

  if (targetUserId) {
    room.blockedUserIds.add(targetUserId);
    return { expiresAt: null };
  }

  const expiresAt = Date.now() + 3 * 24 * 60 * 60 * 1000;
  room.blockedIpHashes.set(targetIpHash, expiresAt);
  return { expiresAt: new Date(expiresAt).toISOString() };
}

export function isBlockedFromRoom(roomId: string, userId: string | null, ipHash: string) {
  const room = rooms.get(roomId);
  if (!room) return { blocked: false, expiresAt: null };
  if (userId) return { blocked: room.blockedUserIds.has(userId), expiresAt: null };

  const expiresAt = room.blockedIpHashes.get(ipHash);
  if (!expiresAt) return { blocked: false, expiresAt: null };
  if (expiresAt <= Date.now()) {
    room.blockedIpHashes.delete(ipHash);
    return { blocked: false, expiresAt: null };
  }
  return { blocked: true, expiresAt: new Date(expiresAt).toISOString() };
}

export function updateRoomLanguages(
  roomId: string,
  primaryLanguage: RoomLanguage,
  primaryLanguageLevel: RoomLanguageLevel,
  secondaryLanguage: RoomLanguage | null
): RoomSummary | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;
  const realUserCount = room.users.filter((user) => user.senderType === "human").length;

  room.primaryLanguage = primaryLanguage;
  room.primaryLanguageLevel = primaryLanguageLevel;
  room.secondaryLanguage = secondaryLanguage;
  return {
    id: room.id,
    name: room.name,
    primaryLanguage: room.primaryLanguage,
    primaryLanguageLevel: room.primaryLanguageLevel,
    secondaryLanguage: room.secondaryLanguage,
    users: room.users.length,
    capacity: room.capacity,
    canJoin: realUserCount < room.capacity,
    suggestedGuestNumber: realUserCount + 1,
    topic: room.topic,
    youtubeVideo: getYouTubeVideoSnapshot(room),
    participants: room.users.map(({ nickname, avatar, role, senderType }) => ({ nickname, avatar, role, senderType }))
  };
}

export function deleteUserCreatedRoomIfEmpty(roomId: string) {
  const room = rooms.get(roomId);
  if (!room || room.source !== "user" || room.users.length > 0) {
    return false;
  }
  return rooms.delete(roomId);
}

export function isUserCreatedRoomEmpty(roomId: string) {
  const room = rooms.get(roomId);
  return Boolean(room && room.source === "user" && room.users.length === 0);
}

export function getRoomUsers(roomId: string): RoomUser[] {
  return rooms.get(roomId)?.users ?? [];
}

export function getPublicRoomUsers(roomId: string) {
  return getRoomUsers(roomId).map((user) => ({ ...user }));
}

export function getRoomHumanCount(roomId: string) {
  return getRoomUsers(roomId).filter((user) => user.senderType === "human").length;
}

export function getRoomVirtualUser(roomId: string) {
  return getRoomUsers(roomId).find((user) => user.senderType === "virtual_user");
}

export function addVirtualUserToRoom(roomId: string, profile: { id: string; name: string; avatarUrl: string | null }) {
  const room = rooms.get(roomId);
  if (!room || getRoomHumanCount(roomId) > 1 || room.users.some((user) => user.senderType === "virtual_user")) return null;
  const user: RoomUser = {
    socketId: `virtual:${profile.id}`,
    nickname: profile.name,
    avatar: getVirtualUserAvatar(profile),
    role: "unverified",
    micEnabled: false,
    cameraEnabled: false,
    screenSharing: false,
    screenTrackId: null,
    senderType: "virtual_user",
    virtualUserId: profile.id
  };
  room.users.push(user);
  return user;
}

export function removeVirtualUserByBotId(roomId: string, botId: string) {
  const room = rooms.get(roomId);
  if (!room) return null;
  const index = room.users.findIndex((user) => user.senderType === "virtual_user" && user.virtualUserId === botId);
  if (index < 0) return null;
  return room.users.splice(index, 1)[0] ?? null;
}

export function updateVirtualUserProfileInRoom(roomId: string, botId: string, profile: { name: string; avatarUrl: string | null }) {
  const user = rooms.get(roomId)?.users.find((candidate) => candidate.senderType === "virtual_user" && candidate.virtualUserId === botId);
  if (!user) return null;
  user.nickname = profile.name;
  user.avatar = getVirtualUserAvatar({ id: botId, avatarUrl: profile.avatarUrl });
  return user;
}

export function getRoomMessages(roomId: string): ChatMessage[] {
  return rooms.get(roomId)?.messages ?? [];
}

export function addRoomMessage(message: ChatMessage): ChatMessage | undefined {
  const room = rooms.get(message.roomId);

  if (!room) {
    return undefined;
  }

  room.messages.push(message);
  return message;
}

export function addUserToRoom(roomId: string, user: RoomUser): { ok: true; users: RoomUser[] } | { ok: false; reason: string } {
  const room = rooms.get(roomId);

  if (!room) {
    return { ok: false, reason: "Room does not exist." };
  }

  const realUserCount = room.users.filter((candidate) => candidate.senderType === "human").length;
  if (user.senderType === "human" && realUserCount >= room.capacity) {
    return { ok: false, reason: "Room is full." };
  }

  removeUser(user.socketId);
  room.users.push(user);
  return { ok: true, users: room.users };
}

export function removeUser(socketId: string): { roomId: string; user?: RoomUser } | undefined {
  for (const room of rooms.values()) {
    const userIndex = room.users.findIndex((user) => user.socketId === socketId);

    if (userIndex !== -1) {
      const [user] = room.users.splice(userIndex, 1);
      return { roomId: room.id, user };
    }
  }

  return undefined;
}

export function updateUserMedia(socketId: string, media: Pick<RoomUser, "micEnabled" | "cameraEnabled" | "screenSharing" | "screenTrackId">): RoomUser | undefined {
  for (const room of rooms.values()) {
    const user = room.users.find((candidate) => candidate.socketId === socketId);

    if (user) {
      user.micEnabled = media.micEnabled;
      user.cameraEnabled = media.cameraEnabled;
      user.screenSharing = media.screenSharing;
      user.screenTrackId = media.screenSharing ? media.screenTrackId : null;
      return user;
    }
  }

  return undefined;
}

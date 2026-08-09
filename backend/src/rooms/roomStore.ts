import type { ChatMessage, RoomSummary, RoomTopic, RoomUser, RoomYouTubeVideo } from "../types/socket.js";
import { randomBytes, randomUUID } from "node:crypto";
import type { RoomLanguage, RoomLanguageLevel } from "./roomLanguages.js";

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
  capacity: number;
  topic: RoomTopic | null;
  youtubeVideo: RoomYouTubeVideo | null;
  virtualTopicBackup: RoomTopic | null;
  virtualTopicActive: boolean;
  users: RoomUser[];
  messages: ChatMessage[];
  virtualMessageIds: Set<string>;
  blockedUserIds: Set<string>;
  blockedIpHashes: Map<string, number>;
};

const rooms = new Map<string, Room>(
  roomNames.map((name, index) => {
    const id = `room-${index + 1}`;
    const primaryLanguageLevel: RoomLanguageLevel = index === 0 ? "a1" : index === 1 ? "b1" : "any";
    return [id, { id, name, primaryLanguage: "en", primaryLanguageLevel, secondaryLanguage: null, creatorUserId: null, source: "system", capacity: ROOM_CAPACITY, topic: null, youtubeVideo: null, virtualTopicBackup: null, virtualTopicActive: false, users: [], messages: [], virtualMessageIds: new Set(), blockedUserIds: new Set(), blockedIpHashes: new Map() }];
  })
);

const virtualRoomTopics = [
  "Quiet room — keep silence and focus on your own learning.",
  "Listening practice room — listen carefully and learn at your own pace.",
  "Self-study room — set a goal, stay focused, and study independently.",
  "Silent reading room — read, reflect, and build your language skills.",
  "Shadowing practice — listen and repeat quietly to improve pronunciation.",
  "Vocabulary review room — revise useful words and phrases independently.",
  "Focus room — a calm space for individual language practice.",
  "No active conversation — use this room for quiet learning and reflection."
] as const;

const virtualFirstNames = ["Alex", "Mia", "Sam", "Emma", "Leo", "Lina", "Noah", "Sofia", "Kai", "Anna", "Min", "Hana"] as const;
const virtualLastNames = ["Morgan", "Lee", "Taylor", "Kim", "Martin", "Chen", "Brown", "Garcia", "Wilson", "Nguyen", "Park", "Davis"] as const;
const virtualAvatars = ["🐣", "🐼", "🐰", "🦊", "🐨", "🐥", "🐧", "🐸", "🦄", "🐙", "🐢", "🐹"] as const;

function shuffle<T>(items: T[]) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex]!, items[index]!];
  }
  return items;
}

function deactivateVirtualRoom(room: Room) {
  const hadVirtualUsers = room.users.some((user) => user.isVirtual);
  room.users = room.users.filter((user) => !user.isVirtual);
  if (room.virtualTopicActive) {
    room.topic = room.virtualTopicBackup;
    room.virtualTopicBackup = null;
    room.virtualTopicActive = false;
  }
  return hadVirtualUsers;
}

function activateVirtualTopic(room: Room, index: number) {
  if (room.virtualTopicActive) return;
  room.virtualTopicBackup = room.topic;
  room.topic = {
    description: virtualRoomTopics[index % virtualRoomTopics.length]!,
    background: index % 3 === 0 ? "slate" : index % 3 === 1 ? "blue" : "mint",
    font: "sans",
    icon: "none"
  };
  room.virtualTopicActive = true;
}

function restoreVirtualTopicWhenEmpty(room: Room) {
  if (room.users.some((user) => user.isVirtual) || !room.virtualTopicActive) return false;
  room.topic = room.virtualTopicBackup;
  room.virtualTopicBackup = null;
  room.virtualTopicActive = false;
  return true;
}

export function prepareVirtualUsersForRealJoin(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return { removed: [] as RoomUser[], topicRestored: false };
  const realUserCount = room.users.filter((user) => !user.isVirtual).length;
  const virtualUsers = room.users.filter((user) => user.isVirtual);
  const availableVirtualSlots = Math.max(0, room.capacity - realUserCount - 1);
  const removeCount = Math.max(0, virtualUsers.length - availableVirtualSlots);
  const removed = shuffle([...virtualUsers]).slice(0, removeCount);
  const removedIds = new Set(removed.map((user) => user.socketId));
  room.users = room.users.filter((user) => !removedIds.has(user.socketId));
  return { removed, topicRestored: restoreVirtualTopicWhenEmpty(room) };
}

export function removeVirtualUserFromRoom(roomId: string, socketId: string) {
  const room = rooms.get(roomId);
  if (!room || !room.users.some((user) => !user.isVirtual)) return null;
  const userIndex = room.users.findIndex((user) => user.isVirtual && user.socketId === socketId);
  if (userIndex < 0) return null;
  const [user] = room.users.splice(userIndex, 1);
  return { user: user!, topicRestored: restoreVirtualTopicWhenEmpty(room) };
}

export function applyVirtualUserDistribution(settings: { enabled: boolean; virtualUserCount: number; targetRoomCount: number }) {
  const systemRooms = [...rooms.values()].filter((room) => room.source === "system");
  if (!settings.enabled) {
    systemRooms.filter((room) => room.users.every((user) => user.isVirtual)).forEach(deactivateVirtualRoom);
    return;
  }

  const eligibleRooms = systemRooms.filter((room) => !room.users.some((user) => !user.isVirtual));
  const desiredRoomCount = Math.min(settings.targetRoomCount, settings.virtualUserCount, eligibleRooms.length);
  const activeRooms = eligibleRooms.filter((room) => room.virtualTopicActive);
  const selectedRooms = activeRooms.slice(0, desiredRoomCount);
  if (selectedRooms.length < desiredRoomCount) {
    const candidates = shuffle(eligibleRooms.filter((room) => !room.virtualTopicActive));
    selectedRooms.push(...candidates.slice(0, desiredRoomCount - selectedRooms.length));
  }
  const selectedIds = new Set(selectedRooms.map((room) => room.id));
  systemRooms
    .filter((room) => room.virtualTopicActive && !selectedIds.has(room.id) && room.users.every((user) => user.isVirtual))
    .forEach(deactivateVirtualRoom);

  selectedRooms.forEach((room, index) => {
    room.users = room.users.filter((user) => !user.isVirtual);
    activateVirtualTopic(room, index);
  });

  let remainingUsers = Math.min(settings.virtualUserCount, selectedRooms.reduce((sum, room) => sum + room.capacity, 0));
  selectedRooms.forEach((room, index) => {
    const remainingRooms = selectedRooms.length - index;
    const count = Math.min(room.capacity, Math.max(1, Math.floor(remainingUsers / remainingRooms)));
    for (let userIndex = 0; userIndex < count; userIndex += 1) {
      const sequence = settings.virtualUserCount - remainingUsers + userIndex;
      room.users.push({
        socketId: randomBytes(15).toString("base64url"),
        nickname: `${virtualFirstNames[sequence % virtualFirstNames.length]} ${virtualLastNames[Math.floor(sequence / virtualFirstNames.length) % virtualLastNames.length]}`,
        avatar: virtualAvatars[sequence % virtualAvatars.length]!,
        role: "unverified",
        micEnabled: false,
        cameraEnabled: false,
        screenSharing: false,
        screenTrackId: null,
        isVirtual: true
      });
    }
    remainingUsers -= count;
  });
}

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
    const realUserCount = room.users.filter((user) => !user.isVirtual).length;
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
    participants: room.users.map(({ nickname, avatar, role }) => ({ nickname, avatar, role }))
    });
  });
}

export function getRoomSummary(roomId: string): RoomSummary | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;
  const realUserCount = room.users.filter((user) => !user.isVirtual).length;

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
    participants: room.users.map(({ nickname, avatar, role }) => ({ nickname, avatar, role }))
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
    capacity,
    topic: null,
    youtubeVideo: null,
    virtualTopicBackup: null,
    virtualTopicActive: false,
    users: [],
    messages: [],
    virtualMessageIds: new Set(),
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

  return room.users.find((user) => !user.isVirtual)?.socketId === socketId;
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
  const realUserCount = room.users.filter((user) => !user.isVirtual).length;

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
    participants: room.users.map(({ nickname, avatar, role }) => ({ nickname, avatar, role }))
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
  return getRoomUsers(roomId).map(({ isVirtual: _isVirtual, ...user }) => user);
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

export function getVirtualChatRoom(roomId: string) {
  const room = rooms.get(roomId);
  if (!room || room.users.some((user) => !user.isVirtual)) return null;
  const virtualUsers = room.users.filter((user) => user.isVirtual);
  if (virtualUsers.length < 2) return null;
  return { roomId: room.id, primaryLanguage: room.primaryLanguage, users: virtualUsers };
}

export function getVirtualChatRoomIds() {
  return [...rooms.values()]
    .filter((room) => room.users.length >= 2 && room.users.every((user) => user.isVirtual))
    .map((room) => room.id);
}

export function addVirtualRoomMessage(message: ChatMessage): ChatMessage | undefined {
  const room = rooms.get(message.roomId);
  const senderIsActive = room?.users.some((user) => user.isVirtual && user.socketId === message.socketId);
  if (!room || !senderIsActive || room.users.some((user) => !user.isVirtual)) return undefined;

  room.messages.push(message);
  room.virtualMessageIds.add(message.id);
  while (room.virtualMessageIds.size > 60) {
    const oldestId = room.virtualMessageIds.values().next().value as string | undefined;
    if (!oldestId) break;
    room.virtualMessageIds.delete(oldestId);
    const messageIndex = room.messages.findIndex((item) => item.id === oldestId);
    if (messageIndex >= 0) room.messages.splice(messageIndex, 1);
  }
  return message;
}

export function addUserToRoom(roomId: string, user: RoomUser): { ok: true; users: RoomUser[] } | { ok: false; reason: string } {
  const room = rooms.get(roomId);

  if (!room) {
    return { ok: false, reason: "Room does not exist." };
  }

  const realUserCount = room.users.filter((candidate) => !candidate.isVirtual).length;
  if (!user.isVirtual && realUserCount >= room.capacity) {
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

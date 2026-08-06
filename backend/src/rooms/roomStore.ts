import type { ChatMessage, RoomSummary, RoomUser } from "../types/socket.js";
import { randomUUID } from "node:crypto";
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
  "Coffee Chat",
  "Weekend Talk",
  "Random Talk"
] as const;

type Room = {
  id: string;
  name: string;
  primaryLanguage: RoomLanguage;
  primaryLanguageLevel: RoomLanguageLevel;
  secondaryLanguage: RoomLanguage | null;
  creatorUserId: string | null;
  source: "system" | "user";
  users: RoomUser[];
  messages: ChatMessage[];
};

const rooms = new Map<string, Room>(
  roomNames.map((name, index) => {
    const id = `room-${index + 1}`;
    const primaryLanguageLevel: RoomLanguageLevel = index === 0 ? "a1" : index === 1 ? "b1" : "any";
    return [id, { id, name, primaryLanguage: "en", primaryLanguageLevel, secondaryLanguage: null, creatorUserId: null, source: "system", users: [], messages: [] }];
  })
);

export function getRoomSummaries(): RoomSummary[] {
  return [...rooms.values()].map((room) => ({
    id: room.id,
    name: room.name,
    primaryLanguage: room.primaryLanguage,
    primaryLanguageLevel: room.primaryLanguageLevel,
    secondaryLanguage: room.secondaryLanguage,
    users: room.users.length,
    capacity: ROOM_CAPACITY,
    participants: room.users.map(({ nickname, avatar, role }) => ({ nickname, avatar, role }))
  }));
}

export function getRoomSummary(roomId: string): RoomSummary | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;

  return {
    id: room.id,
    name: room.name,
    primaryLanguage: room.primaryLanguage,
    primaryLanguageLevel: room.primaryLanguageLevel,
    secondaryLanguage: room.secondaryLanguage,
    users: room.users.length,
    capacity: ROOM_CAPACITY,
    participants: room.users.map(({ nickname, avatar, role }) => ({ nickname, avatar, role }))
  };
}

export function createRoom(
  name: string,
  primaryLanguage: RoomLanguage,
  primaryLanguageLevel: RoomLanguageLevel,
  secondaryLanguage: RoomLanguage | null,
  creatorUserId: string
): RoomSummary {
  const room: Room = {
    id: `room-${randomUUID()}`,
    name,
    primaryLanguage,
    primaryLanguageLevel,
    secondaryLanguage,
    creatorUserId,
    source: "user",
    users: [],
    messages: []
  };

  rooms.set(room.id, room);
  return {
    id: room.id,
    name: room.name,
    primaryLanguage: room.primaryLanguage,
    primaryLanguageLevel: room.primaryLanguageLevel,
    secondaryLanguage: room.secondaryLanguage,
    users: 0,
    capacity: ROOM_CAPACITY,
    participants: []
  };
}

export function canManageRoomLanguages(roomId: string, socketId: string, userId: string | undefined) {
  const room = rooms.get(roomId);
  if (!room) return false;

  if (room.source === "user") {
    return Boolean(userId && userId === room.creatorUserId);
  }

  return room.users[0]?.socketId === socketId;
}

export function updateRoomLanguages(
  roomId: string,
  primaryLanguage: RoomLanguage,
  primaryLanguageLevel: RoomLanguageLevel,
  secondaryLanguage: RoomLanguage | null
): RoomSummary | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;

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
    capacity: ROOM_CAPACITY,
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

  if (room.users.length >= ROOM_CAPACITY) {
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

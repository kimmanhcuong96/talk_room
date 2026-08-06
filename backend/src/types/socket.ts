import type { Server, Socket } from "socket.io";
import type { UserRole } from "../users/userRepository.js";
import type { RoomLanguage, RoomLanguageLevel } from "../rooms/roomLanguages.js";

export type RoomUser = {
  socketId: string;
  nickname: string;
  avatar: string;
  role: UserRole;
  micEnabled: boolean;
  cameraEnabled: boolean;
  screenSharing: boolean;
  screenTrackId: string | null;
};

export type RoomSummary = {
  id: string;
  name: string;
  primaryLanguage: RoomLanguage;
  primaryLanguageLevel: RoomLanguageLevel;
  secondaryLanguage: RoomLanguage | null;
  users: number;
  capacity: number;
};

export type ChatMessage = {
  id: string;
  roomId: string;
  socketId: string;
  nickname: string;
  avatar: string;
  text: string;
  timestamp: number;
};

export type ClientToServerEvents = {
  "join-room": (payload: { roomId: string; nickname: string; guestId?: string; authToken?: string }) => void;
  "create-room": (payload: { name: string; primaryLanguage: RoomLanguage; primaryLanguageLevel: RoomLanguageLevel; secondaryLanguage?: RoomLanguage | null; authToken?: string }) => void;
  "update-room-languages": (payload: { roomId: string; primaryLanguage: RoomLanguage; primaryLanguageLevel: RoomLanguageLevel; secondaryLanguage?: RoomLanguage | null }) => void;
  "request-room-language-permission": (payload: { roomId: string }) => void;
  "leave-room": () => void;
  "send-message": (payload: { text: string }) => void;
  "media-status": (payload: { micEnabled: boolean; cameraEnabled: boolean; screenSharing: boolean; screenTrackId: string | null }) => void;
  offer: (payload: { to: string; description: RTCSessionDescriptionInit }) => void;
  answer: (payload: { to: string; description: RTCSessionDescriptionInit }) => void;
  "ice-candidate": (payload: { to: string; candidate: RTCIceCandidateInit | null }) => void;
  "webrtc-transport": (payload: {
    peerId: string;
    transport: "direct" | "stun" | "turn" | "unknown";
    localCandidateType: RTCIceCandidateType | "unknown";
    remoteCandidateType: RTCIceCandidateType | "unknown";
    protocol: string | null;
    relayProtocol: string | null;
  }) => void;
};

export type ServerToClientEvents = {
  "room-list": (rooms: RoomSummary[]) => void;
  "room-users": (users: RoomUser[]) => void;
  "chat-history": (messages: ChatMessage[]) => void;
  "room-full": () => void;
  "join-error": (message: string) => void;
  "room-session-replaced": (payload: { roomId: string }) => void;
  "create-room-error": (message: string) => void;
  "room-created": (room: RoomSummary) => void;
  "room-languages-updated": (room: RoomSummary) => void;
  "room-language-permission": (payload: { roomId: string; canManage: boolean }) => void;
  "room-language-error": (message: string) => void;
  "room-removed": (payload: { roomId: string }) => void;
  "camera-denied": () => void;
  "user-joined": (user: RoomUser) => void;
  "user-left": (payload: { socketId: string }) => void;
  "user-media-status": (payload: { socketId: string; micEnabled: boolean; cameraEnabled: boolean; screenSharing: boolean; screenTrackId: string | null }) => void;
  "screen-share-denied": () => void;
  "receive-message": (message: ChatMessage) => void;
  offer: (payload: { from: string; description: RTCSessionDescriptionInit }) => void;
  answer: (payload: { from: string; description: RTCSessionDescriptionInit }) => void;
  "ice-candidate": (payload: { from: string; candidate: RTCIceCandidateInit | null }) => void;
};

export type InterServerEvents = Record<string, never>;
export type SocketData = {
  roomId?: string;
  nickname?: string;
  avatar?: string;
  role?: UserRole;
  userId?: string;
  identityKey?: string;
};

export type AppServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
export type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

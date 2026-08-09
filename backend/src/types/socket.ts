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
  isVirtual?: boolean;
};

export type PublicRoomUser = Omit<RoomUser, "isVirtual">;

export type RoomTopic = {
  description: string;
  background: "slate" | "mint" | "blue" | "coral" | "violet" | "amber";
  font: "sans" | "serif" | "mono" | "display";
  icon: "none" | "message" | "sparkles" | "book" | "globe" | "coffee" | "game";
};

export type RoomYouTubeVideo = {
  videoId: string;
  playback: "playing" | "paused";
  positionSeconds: number;
  updatedAt: number;
};

export type YouTubeRecommendation = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
};

export type RoomSummary = {
  id: string;
  name: string;
  primaryLanguage: RoomLanguage;
  primaryLanguageLevel: RoomLanguageLevel;
  secondaryLanguage: RoomLanguage | null;
  users: number;
  capacity: number;
  canJoin: boolean;
  suggestedGuestNumber: number;
  topic: RoomTopic | null;
  youtubeVideo: RoomYouTubeVideo | null;
  participants: RoomParticipantSummary[];
};

export type RoomParticipantSummary = Pick<RoomUser, "nickname" | "avatar" | "role">;

export type ChatMessage = {
  id: string;
  roomId: string;
  socketId: string;
  nickname: string;
  avatar: string;
  text: string;
  timestamp: number;
};

export type ReportReason = "harassment" | "hate_speech" | "sexual_content" | "spam" | "impersonation" | "other";

export type ClientToServerEvents = {
  "join-room": (payload: { roomId: string; nickname: string; guestId?: string; authToken?: string }) => void;
  "create-room": (payload: { name: string; primaryLanguage: RoomLanguage; primaryLanguageLevel: RoomLanguageLevel; secondaryLanguage?: RoomLanguage | null; capacity: number; authToken?: string }) => void;
  "update-room-languages": (payload: { roomId: string; primaryLanguage: RoomLanguage; primaryLanguageLevel: RoomLanguageLevel; secondaryLanguage?: RoomLanguage | null }) => void;
  "request-room-language-permission": (payload: { roomId: string }) => void;
  "request-room-topic-permission": (payload: { roomId: string }) => void;
  "update-room-topic": (payload: { roomId: string; topic: RoomTopic | null }, respond?: (result: { ok: true; topic: RoomTopic | null } | { ok: false; error: string }) => void) => void;
  "request-room-youtube-permission": (payload: { roomId: string }) => void;
  "request-room-youtube-recommendations": (
    payload: { roomId: string },
    respond?: (result: { ok: true; videos: YouTubeRecommendation[] } | { ok: false; error: string }) => void
  ) => void;
  "share-room-youtube": (payload: { roomId: string; url: string }, respond?: (result: { ok: true } | { ok: false; error: string }) => void) => void;
  "remove-room-youtube": (payload: { roomId: string }, respond?: (result: { ok: true } | { ok: false; error: string }) => void) => void;
  "update-room-youtube-playback": (payload: { roomId: string; playback: "playing" | "paused"; positionSeconds: number }) => void;
  "set-room-youtube-playback": (payload: { roomId: string; playback: "playing" | "paused" }) => void;
  "request-room-moderation-permission": (payload: { roomId: string }) => void;
  "block-room-user": (payload: { targetSocketId: string }) => void;
  "report-user": (payload: { targetSocketId: string; reason: ReportReason; details?: string }) => void;
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
  "room-users": (users: PublicRoomUser[]) => void;
  "chat-history": (messages: ChatMessage[]) => void;
  "room-full": () => void;
  "join-error": (message: string) => void;
  "room-session-replaced": (payload: { roomId: string }) => void;
  "create-room-error": (message: string) => void;
  "room-created": (room: RoomSummary) => void;
  "room-languages-updated": (room: RoomSummary) => void;
  "room-language-permission": (payload: { roomId: string; canManage: boolean }) => void;
  "room-language-error": (message: string) => void;
  "room-topic-permission": (payload: { roomId: string; canManage: boolean }) => void;
  "room-topic-updated": (payload: { roomId: string; topic: RoomTopic | null }) => void;
  "room-topic-error": (message: string) => void;
  "room-youtube-permission": (payload: { roomId: string; canManage: boolean }) => void;
  "room-youtube-updated": (payload: { roomId: string; video: RoomYouTubeVideo | null; reason: "shared" | "removed" | "playback" }) => void;
  "room-youtube-error": (message: string) => void;
  "room-moderation-permission": (payload: { roomId: string; canBlock: boolean }) => void;
  "moderation-success": (payload: { action: "block" | "report"; targetSocketId?: string }) => void;
  "moderation-error": (message: string) => void;
  "access-blocked": (payload: { scope: "room" | "global"; expiresAt: string | null }) => void;
  "room-removed": (payload: { roomId: string }) => void;
  "camera-denied": () => void;
  "user-joined": (user: PublicRoomUser) => void;
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
  ipHash?: string;
};

export type AppServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
export type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

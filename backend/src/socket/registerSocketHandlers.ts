import type { AppServer, AppSocket, RoomTopic, RoomYouTubeVideo } from "../types/socket.js";
import {
  addRoomMessage,
  addUserToRoom,
  blockUserFromRoom,
  canBlockUsersInRoom,
  canManageRoomLanguages,
  canManageRoomTopic,
  createRoom,
  deleteUserCreatedRoomIfEmpty,
  getRoomMessages,
  getPublicRoomUsers,
  getRoomSummary,
  getRoomSummaries,
  getRoomUsers,
  isUserCreatedRoomEmpty,
  isBlockedFromRoom,
  prepareVirtualUsersForRealJoin,
  removeUser,
  updateRoomLanguages,
  updateRoomTopic,
  updateRoomYouTubeVideo,
  updateUserMedia
} from "../rooms/roomStore.js";
import { verifyAppJwt } from "../auth/jwt.js";
import { findUserById, type UserProfile } from "../users/userRepository.js";
import { hasPermission } from "../users/userPermissions.js";
import { isRoomLanguage, isRoomLanguageLevel } from "../rooms/roomLanguages.js";
import { getSocketIpHash } from "../moderation/ipIdentity.js";
import {
  createModerationReport,
  findActiveGlobalBlock,
  reportReasons
} from "../moderation/moderationRepository.js";
import { rebalanceVirtualUsers, scheduleVirtualUserDepartures } from "../virtualUsers/virtualUserService.js";
import { getYouTubeRecommendations } from "../youtube/youtubeRecommendationService.js";

const avatars = ["🐣", "🐼", "🐰", "🦊", "🐨", "🐥", "🐧", "🐸", "🦄", "🐙", "🐢", "🐹"];

function createRandomAvatar() {
  return avatars[Math.floor(Math.random() * avatars.length)] ?? "🐣";
}

function emitRoomList(io: AppServer) {
  io.emit("room-list", getRoomSummaries());
}

const USER_CREATED_ROOM_EMPTY_TTL_MS = 60_000;
const emptyRoomDeletionTimers = new Map<string, ReturnType<typeof setTimeout>>();

function cancelEmptyRoomDeletion(roomId: string) {
  const timer = emptyRoomDeletionTimers.get(roomId);
  if (timer) clearTimeout(timer);
  emptyRoomDeletionTimers.delete(roomId);
}

function scheduleEmptyRoomDeletion(io: AppServer, roomId: string) {
  cancelEmptyRoomDeletion(roomId);
  if (!isUserCreatedRoomEmpty(roomId)) return;

  const timer = setTimeout(() => {
    emptyRoomDeletionTimers.delete(roomId);
    if (!deleteUserCreatedRoomIfEmpty(roomId)) return;
    io.emit("room-removed", { roomId });
    emitRoomList(io);
  }, USER_CREATED_ROOM_EMPTY_TTL_MS);
  timer.unref();
  emptyRoomDeletionTimers.set(roomId, timer);
}

function emitRoomLanguagePermissions(io: AppServer, roomId: string) {
  for (const user of getRoomUsers(roomId)) {
    const connectedSocket = io.sockets.sockets.get(user.socketId);
    io.to(user.socketId).emit("room-language-permission", {
      roomId,
      canManage: canManageRoomLanguages(roomId, user.socketId, connectedSocket?.data.userId)
    });
  }
}

function emitRoomModerationPermissions(io: AppServer, roomId: string) {
  for (const user of getRoomUsers(roomId)) {
    const connectedSocket = io.sockets.sockets.get(user.socketId);
    io.to(user.socketId).emit("room-moderation-permission", {
      roomId,
      canBlock: canBlockUsersInRoom(roomId, connectedSocket?.data.userId)
    });
  }
}

function emitRoomTopicPermissions(io: AppServer, roomId: string) {
  for (const user of getRoomUsers(roomId)) {
    const connectedSocket = io.sockets.sockets.get(user.socketId);
    io.to(user.socketId).emit("room-topic-permission", {
      roomId,
      canManage: canManageRoomTopic(roomId, user.socketId, connectedSocket?.data.userId)
    });
  }
}

function emitRoomYouTubePermissions(io: AppServer, roomId: string) {
  for (const user of getRoomUsers(roomId)) {
    const connectedSocket = io.sockets.sockets.get(user.socketId);
    io.to(user.socketId).emit("room-youtube-permission", {
      roomId,
      canManage: canManageRoomTopic(roomId, user.socketId, connectedSocket?.data.userId)
    });
  }
}

const topicBackgrounds = new Set<RoomTopic["background"]>(["slate", "mint", "blue", "coral", "violet", "amber"]);
const topicFonts = new Set<RoomTopic["font"]>(["sans", "serif", "mono", "display"]);
const topicIcons = new Set<RoomTopic["icon"]>(["none", "message", "sparkles", "book", "globe", "coffee", "game"]);

function extractYouTubeVideoId(value: unknown) {
  const input = typeof value === "string" ? value.trim().slice(0, 500) : "";
  const idPattern = /^[A-Za-z0-9_-]{11}$/;
  if (idPattern.test(input)) return input;
  try {
    const url = new URL(input);
    const hostname = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");
    let candidate = "";
    if (hostname === "youtu.be") candidate = url.pathname.split("/").filter(Boolean)[0] ?? "";
    if (hostname === "youtube.com" || hostname === "youtube-nocookie.com") {
      candidate = url.searchParams.get("v") ?? url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1] ?? "";
    }
    return idPattern.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

function resolveIdentityKey(authenticatedUser: UserProfile | null, guestId: unknown, socketId: string) {
  if (authenticatedUser) return `user:${authenticatedUser.id}`;

  const cleanGuestId = typeof guestId === "string" ? guestId.trim() : "";
  if (/^guest-[a-z0-9-]{20,80}$/i.test(cleanGuestId)) return `guest:${cleanGuestId}`;

  return `socket:${socketId}`;
}

function getOtherIdentitySockets(io: AppServer, socket: AppSocket, identityKey: string) {
  return [...io.sockets.sockets.values()].filter(
    (candidate) => candidate.id !== socket.id && candidate.data.identityKey === identityKey && candidate.data.roomId
  );
}

async function getAuthenticatedUser(authToken: string | undefined): Promise<UserProfile | null> {
  if (!authToken) {
    return null;
  }

  try {
    const { userId } = verifyAppJwt(authToken);
    return await findUserById(userId);
  } catch {
    return null;
  }
}

const loggedWebRtcTransports = new Map<string, string>();

function formatWebRtcLogUser(nickname: string | undefined, socketId: string) {
  const safeNickname = (nickname ?? "Guest").replace(/[|\r\n\t]/g, " ").slice(0, 32);
  return `${safeNickname}[${socketId.slice(0, 8)}]`;
}

function clearWebRtcTransportLogs(socketId: string) {
  for (const key of loggedWebRtcTransports.keys()) {
    if (key.split(":").includes(socketId)) {
      loggedWebRtcTransports.delete(key);
    }
  }
}

function leaveCurrentRoom(io: AppServer, socket: AppSocket) {
  const previousRoomId = socket.data.roomId;
  const removed = removeUser(socket.id);

  if (!removed || !previousRoomId) {
    return;
  }

  socket.leave(previousRoomId);
  socket.to(previousRoomId).emit("user-left", { socketId: socket.id });
  socket.to(previousRoomId).emit("room-users", getPublicRoomUsers(previousRoomId));
  socket.data.roomId = undefined;
  socket.data.nickname = undefined;
  socket.data.avatar = undefined;
  socket.data.role = undefined;
  socket.data.userId = undefined;
  socket.data.identityKey = undefined;
  clearWebRtcTransportLogs(socket.id);
  emitRoomList(io);
  emitRoomLanguagePermissions(io, previousRoomId);
  emitRoomModerationPermissions(io, previousRoomId);
  emitRoomTopicPermissions(io, previousRoomId);
  emitRoomYouTubePermissions(io, previousRoomId);
  scheduleEmptyRoomDeletion(io, previousRoomId);
  rebalanceVirtualUsers(io);
}

export function evictGloballyBlockedUsers(
  io: AppServer,
  block: { targetUserId: string | null; targetIpHash: string | null; expiresAt: string | null }
) {
  for (const connectedSocket of io.sockets.sockets.values()) {
    const matches = block.targetUserId
      ? connectedSocket.data.userId === block.targetUserId
      : !connectedSocket.data.userId && connectedSocket.data.ipHash === block.targetIpHash;
    if (!matches) continue;
    leaveCurrentRoom(io, connectedSocket);
    connectedSocket.emit("access-blocked", { scope: "global", expiresAt: block.expiresAt });
  }
}

export function registerSocketHandlers(io: AppServer) {
  io.on("connection", (socket) => {
    socket.data.ipHash = getSocketIpHash(socket);
    let lastYouTubePlaybackRequestAt = 0;
    socket.emit("room-list", getRoomSummaries());

    socket.on("create-room", async ({ name, primaryLanguage, primaryLanguageLevel, secondaryLanguage, capacity, authToken }) => {
      const user = await getAuthenticatedUser(authToken);
      const cleanName = typeof name === "string" ? name.trim().replace(/\s+/g, " ").slice(0, 60) : "";
      const cleanCapacity = capacity ?? 2;

      if (!user || !hasPermission(user.role, "create_room")) {
        socket.emit("create-room-error", "CREATE_ROOM_PERMISSION_DENIED");
        return;
      }

      if (cleanName.length < 3) {
        socket.emit("create-room-error", "ROOM_NAME_TOO_SHORT");
        return;
      }

      if (!isRoomLanguage(primaryLanguage)) {
        socket.emit("create-room-error", "ROOM_PRIMARY_LANGUAGE_REQUIRED");
        return;
      }

      if (!isRoomLanguageLevel(primaryLanguageLevel)) {
        socket.emit("create-room-error", "ROOM_LANGUAGE_LEVEL_INVALID");
        return;
      }

      const cleanSecondaryLanguage = secondaryLanguage == null ? null : secondaryLanguage;
      if (cleanSecondaryLanguage !== null && !isRoomLanguage(cleanSecondaryLanguage)) {
        socket.emit("create-room-error", "ROOM_LANGUAGE_INVALID");
        return;
      }

      if (cleanSecondaryLanguage === primaryLanguage) {
        socket.emit("create-room-error", "ROOM_LANGUAGES_MUST_DIFFER");
        return;
      }

      if (!Number.isInteger(cleanCapacity) || cleanCapacity < 1 || cleanCapacity > 4) {
        socket.emit("create-room-error", "ROOM_CAPACITY_INVALID");
        return;
      }

      const room = createRoom(cleanName, primaryLanguage, primaryLanguageLevel, cleanSecondaryLanguage, user.id, cleanCapacity);
      socket.emit("room-created", room);
      emitRoomList(io);
      scheduleEmptyRoomDeletion(io, room.id);
    });

    socket.on("join-room", async ({ roomId, nickname, guestId, authToken }) => {
      const cleanNickname = nickname.trim().slice(0, 32);
      const authenticatedUser = await getAuthenticatedUser(authToken);
      const role = authenticatedUser?.role ?? "unverified";
      const identityKey = resolveIdentityKey(authenticatedUser, guestId, socket.id);
      const ipHash = socket.data.ipHash ?? getSocketIpHash(socket);

      if (!cleanNickname) {
        socket.emit("join-error", "Nickname is required.");
        return;
      }

      const targetRoom = getRoomSummary(roomId);
      if (!targetRoom) {
        socket.emit("join-error", "Room does not exist.");
        return;
      }

      try {
        const globalBlock = await findActiveGlobalBlock(authenticatedUser?.id ?? null, ipHash);
        if (globalBlock) {
          socket.emit("access-blocked", { scope: "global", expiresAt: globalBlock.expires_at?.toISOString() ?? null });
          return;
        }
      } catch (error) {
        console.error("Unable to check global moderation status", error);
        socket.emit("join-error", "Moderation service is temporarily unavailable.");
        return;
      }

      const roomBlock = isBlockedFromRoom(roomId, authenticatedUser?.id ?? null, ipHash);
      if (roomBlock.blocked) {
        socket.emit("access-blocked", { scope: "room", expiresAt: roomBlock.expiresAt });
        return;
      }

      const otherIdentitySockets = getOtherIdentitySockets(io, socket, identityKey);
      const replacementInTargetRoom = otherIdentitySockets.some((candidate) => candidate.data.roomId === roomId);
      const alreadyInTargetRoom = socket.data.roomId === roomId;
      if (!targetRoom.canJoin && !replacementInTargetRoom && !alreadyInTargetRoom) {
        socket.emit("room-full");
        return;
      }

      if (socket.data.roomId && !alreadyInTargetRoom) {
        leaveCurrentRoom(io, socket);
      }

      for (const previousSocket of otherIdentitySockets) {
        const previousRoomId = previousSocket.data.roomId;
        if (!previousRoomId) continue;
        leaveCurrentRoom(io, previousSocket);
        previousSocket.emit("room-session-replaced", { roomId: previousRoomId });
      }

      if (alreadyInTargetRoom) {
        socket.emit("room-users", getPublicRoomUsers(roomId));
        socket.emit("chat-history", getRoomMessages(roomId));
        emitRoomLanguagePermissions(io, roomId);
        emitRoomModerationPermissions(io, roomId);
        emitRoomTopicPermissions(io, roomId);
        emitRoomYouTubePermissions(io, roomId);
        return;
      }

      const preparedRoom = prepareVirtualUsersForRealJoin(roomId);
      for (const removedUser of preparedRoom.removed) {
        io.to(roomId).emit("user-left", { socketId: removedUser.socketId });
      }
      if (preparedRoom.removed.length > 0) {
        io.to(roomId).emit("room-users", getPublicRoomUsers(roomId));
        emitRoomList(io);
      }
      if (preparedRoom.topicRestored) {
        io.to(roomId).emit("room-topic-updated", { roomId, topic: getRoomSummary(roomId)?.topic ?? null });
      }

      const result = addUserToRoom(roomId, {
        socketId: socket.id,
        nickname: cleanNickname,
        avatar: authenticatedUser?.avatarUrl?.trim() || createRandomAvatar(),
        role,
        micEnabled: false,
        cameraEnabled: false,
        screenSharing: false,
        screenTrackId: null
      });

      if (!result.ok) {
        socket.emit(result.reason === "Room is full." ? "room-full" : "join-error", result.reason);
        emitRoomList(io);
        return;
      }

      socket.data.roomId = roomId;
      socket.data.nickname = cleanNickname;
      socket.data.avatar = result.users.find((user) => user.socketId === socket.id)?.avatar;
      socket.data.role = role;
      socket.data.userId = authenticatedUser?.id;
      socket.data.identityKey = identityKey;
      cancelEmptyRoomDeletion(roomId);
      socket.join(roomId);

      const currentUser = result.users.find((user) => user.socketId === socket.id);
      socket.emit("room-users", getPublicRoomUsers(roomId));
      socket.emit("chat-history", getRoomMessages(roomId));

      if (currentUser) {
        socket.to(roomId).emit("user-joined", currentUser);
        socket.to(roomId).emit("room-users", getPublicRoomUsers(roomId));
      }

      emitRoomList(io);
      emitRoomLanguagePermissions(io, roomId);
      emitRoomModerationPermissions(io, roomId);
      emitRoomTopicPermissions(io, roomId);
      emitRoomYouTubePermissions(io, roomId);
      scheduleVirtualUserDepartures(io, roomId);
    });

    socket.on("update-room-languages", ({ roomId, primaryLanguage, primaryLanguageLevel, secondaryLanguage }) => {
      if (socket.data.roomId !== roomId || !canManageRoomLanguages(roomId, socket.id, socket.data.userId)) {
        socket.emit("room-language-error", "ROOM_LANGUAGE_PERMISSION_DENIED");
        return;
      }

      if (!isRoomLanguage(primaryLanguage)) {
        socket.emit("room-language-error", "ROOM_PRIMARY_LANGUAGE_REQUIRED");
        return;
      }

      if (!isRoomLanguageLevel(primaryLanguageLevel)) {
        socket.emit("room-language-error", "ROOM_LANGUAGE_LEVEL_INVALID");
        return;
      }

      const cleanSecondaryLanguage = secondaryLanguage == null ? null : secondaryLanguage;
      if (cleanSecondaryLanguage !== null && !isRoomLanguage(cleanSecondaryLanguage)) {
        socket.emit("room-language-error", "ROOM_LANGUAGE_INVALID");
        return;
      }

      if (cleanSecondaryLanguage === primaryLanguage) {
        socket.emit("room-language-error", "ROOM_LANGUAGES_MUST_DIFFER");
        return;
      }

      const updatedRoom = updateRoomLanguages(roomId, primaryLanguage, primaryLanguageLevel, cleanSecondaryLanguage);
      if (!updatedRoom) {
        socket.emit("room-language-error", "ROOM_NOT_FOUND");
        return;
      }

      io.to(roomId).emit("room-languages-updated", updatedRoom);
      emitRoomList(io);
    });

    socket.on("request-room-language-permission", ({ roomId }) => {
      if (socket.data.roomId !== roomId) return;
      socket.emit("room-language-permission", {
        roomId,
        canManage: canManageRoomLanguages(roomId, socket.id, socket.data.userId)
      });
    });

    socket.on("request-room-topic-permission", ({ roomId }) => {
      if (socket.data.roomId !== roomId) return;
      socket.emit("room-topic-permission", {
        roomId,
        canManage: canManageRoomTopic(roomId, socket.id, socket.data.userId)
      });
    });

    socket.on("update-room-topic", ({ roomId, topic }, respond) => {
      if (socket.data.roomId !== roomId || !canManageRoomTopic(roomId, socket.id, socket.data.userId)) {
        socket.emit("room-topic-error", "ROOM_TOPIC_PERMISSION_DENIED");
        respond?.({ ok: false, error: "ROOM_TOPIC_PERMISSION_DENIED" });
        return;
      }

      let cleanTopic: RoomTopic | null = null;
      if (topic !== null) {
        const description = typeof topic.description === "string" ? topic.description.trim().slice(0, 500) : "";
        if (!description || !topicBackgrounds.has(topic.background) || !topicFonts.has(topic.font) || !topicIcons.has(topic.icon)) {
          socket.emit("room-topic-error", "ROOM_TOPIC_INVALID");
          respond?.({ ok: false, error: "ROOM_TOPIC_INVALID" });
          return;
        }
        cleanTopic = { description, background: topic.background, font: topic.font, icon: topic.icon };
      }

      const updatedTopic = updateRoomTopic(roomId, cleanTopic);
      if (updatedTopic === undefined) {
        socket.emit("room-topic-error", "ROOM_NOT_FOUND");
        respond?.({ ok: false, error: "ROOM_NOT_FOUND" });
        return;
      }
      io.to(roomId).emit("room-topic-updated", { roomId, topic: updatedTopic });
      respond?.({ ok: true, topic: updatedTopic });
      emitRoomList(io);
    });

    socket.on("request-room-youtube-permission", ({ roomId }) => {
      if (socket.data.roomId !== roomId) return;
      socket.emit("room-youtube-permission", {
        roomId,
        canManage: canManageRoomTopic(roomId, socket.id, socket.data.userId)
      });
    });

    socket.on("request-room-youtube-recommendations", async ({ roomId }, respond) => {
      if (socket.data.roomId !== roomId || !canManageRoomTopic(roomId, socket.id, socket.data.userId)) {
        respond?.({ ok: false, error: "ROOM_YOUTUBE_PERMISSION_DENIED" });
        return;
      }
      const room = getRoomSummary(roomId);
      if (!room) {
        respond?.({ ok: false, error: "ROOM_NOT_FOUND" });
        return;
      }
      try {
        const videos = await getYouTubeRecommendations({
          roomName: room.name,
          primaryLanguage: room.primaryLanguage,
          currentVideoId: room.youtubeVideo?.videoId ?? null
        });
        respond?.({ ok: true, videos });
      } catch (error) {
        console.error("Unable to load YouTube recommendations", error);
        respond?.({ ok: false, error: "YOUTUBE_RECOMMENDATIONS_UNAVAILABLE" });
      }
    });

    socket.on("share-room-youtube", ({ roomId, url }, respond) => {
      if (socket.data.roomId !== roomId || !canManageRoomTopic(roomId, socket.id, socket.data.userId)) {
        socket.emit("room-youtube-error", "ROOM_YOUTUBE_PERMISSION_DENIED");
        respond?.({ ok: false, error: "ROOM_YOUTUBE_PERMISSION_DENIED" });
        return;
      }
      const videoId = extractYouTubeVideoId(url);
      if (!videoId) {
        socket.emit("room-youtube-error", "ROOM_YOUTUBE_URL_INVALID");
        respond?.({ ok: false, error: "ROOM_YOUTUBE_URL_INVALID" });
        return;
      }
      const video: RoomYouTubeVideo = { videoId, playback: "paused", positionSeconds: 0, updatedAt: Date.now() };
      if (updateRoomYouTubeVideo(roomId, video) === undefined) {
        socket.emit("room-youtube-error", "ROOM_NOT_FOUND");
        respond?.({ ok: false, error: "ROOM_NOT_FOUND" });
        return;
      }
      io.to(roomId).emit("room-youtube-updated", { roomId, video, reason: "shared" });
      respond?.({ ok: true });
      emitRoomList(io);
    });

    socket.on("remove-room-youtube", ({ roomId }, respond) => {
      if (socket.data.roomId !== roomId || !canManageRoomTopic(roomId, socket.id, socket.data.userId)) {
        socket.emit("room-youtube-error", "ROOM_YOUTUBE_PERMISSION_DENIED");
        respond?.({ ok: false, error: "ROOM_YOUTUBE_PERMISSION_DENIED" });
        return;
      }
      if (updateRoomYouTubeVideo(roomId, null) === undefined) {
        socket.emit("room-youtube-error", "ROOM_NOT_FOUND");
        respond?.({ ok: false, error: "ROOM_NOT_FOUND" });
        return;
      }
      io.to(roomId).emit("room-youtube-updated", { roomId, video: null, reason: "removed" });
      respond?.({ ok: true });
      emitRoomList(io);
    });

    socket.on("update-room-youtube-playback", ({ roomId, playback, positionSeconds }) => {
      if (socket.data.roomId !== roomId || !canManageRoomTopic(roomId, socket.id, socket.data.userId)) return;
      const room = getRoomSummary(roomId);
      if (!room?.youtubeVideo || !["playing", "paused"].includes(playback) || !Number.isFinite(positionSeconds)) return;
      const video: RoomYouTubeVideo = {
        ...room.youtubeVideo,
        playback,
        positionSeconds: Math.min(604_800, Math.max(0, positionSeconds)),
        updatedAt: Date.now()
      };
      updateRoomYouTubeVideo(roomId, video);
      io.to(roomId).emit("room-youtube-updated", { roomId, video, reason: "playback" });
    });

    socket.on("set-room-youtube-playback", ({ roomId, playback }) => {
      if (socket.data.roomId !== roomId || !["playing", "paused"].includes(playback)) return;
      const now = Date.now();
      if (now - lastYouTubePlaybackRequestAt < 300) return;
      lastYouTubePlaybackRequestAt = now;
      const room = getRoomSummary(roomId);
      if (!room?.youtubeVideo) return;
      const elapsedSeconds = room.youtubeVideo.playback === "playing" ? (Date.now() - room.youtubeVideo.updatedAt) / 1000 : 0;
      const video: RoomYouTubeVideo = {
        ...room.youtubeVideo,
        playback,
        positionSeconds: Math.min(604_800, Math.max(0, room.youtubeVideo.positionSeconds + elapsedSeconds)),
        updatedAt: Date.now()
      };
      updateRoomYouTubeVideo(roomId, video);
      io.to(roomId).emit("room-youtube-updated", { roomId, video, reason: "playback" });
    });

    socket.on("request-room-moderation-permission", ({ roomId }) => {
      if (socket.data.roomId !== roomId) return;
      socket.emit("room-moderation-permission", {
        roomId,
        canBlock: canBlockUsersInRoom(roomId, socket.data.userId)
      });
    });

    socket.on("report-user", async ({ targetSocketId, reason, details }) => {
      const roomId = socket.data.roomId;
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (!roomId || !targetSocket || targetSocket.data.roomId !== roomId || targetSocketId === socket.id) {
        socket.emit("moderation-error", "INVALID_MODERATION_TARGET");
        return;
      }
      if (!reportReasons.includes(reason)) {
        socket.emit("moderation-error", "INVALID_REPORT_REASON");
        return;
      }

      const room = getRoomSummary(roomId);
      const targetUser = getRoomUsers(roomId).find((user) => user.socketId === targetSocketId);
      if (!room || !targetUser || !socket.data.nickname) {
        socket.emit("moderation-error", "INVALID_MODERATION_TARGET");
        return;
      }

      try {
        const reporterIpHash = socket.data.ipHash ?? getSocketIpHash(socket);
        const targetIpHash = targetSocket.data.ipHash ?? getSocketIpHash(targetSocket);
        await createModerationReport({
          reporterUserId: socket.data.userId ?? null,
          reporterIpHash,
          reporterDisplayName: socket.data.nickname,
          targetUserId: targetSocket.data.userId ?? null,
          targetIpHash,
          targetDisplayName: targetUser.nickname,
          roomId,
          roomName: room.name,
          reason,
          details: typeof details === "string" ? details.trim().slice(0, 500) : ""
        });
        socket.emit("moderation-success", { action: "report", targetSocketId });
      } catch (error) {
        console.error("Unable to create moderation report", error);
        socket.emit("moderation-error", "REPORT_FAILED");
      }
    });

    socket.on("block-room-user", ({ targetSocketId }) => {
      const roomId = socket.data.roomId;
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (!roomId || !targetSocket || targetSocket.data.roomId !== roomId || targetSocketId === socket.id) {
        socket.emit("moderation-error", "INVALID_MODERATION_TARGET");
        return;
      }
      if (!canBlockUsersInRoom(roomId, socket.data.userId)) {
        socket.emit("moderation-error", "ROOM_BLOCK_PERMISSION_DENIED");
        return;
      }

      const targetIpHash = targetSocket.data.ipHash ?? getSocketIpHash(targetSocket);
      const result = blockUserFromRoom(roomId, targetSocket.data.userId, targetIpHash);
      if (!result) {
        socket.emit("moderation-error", "ROOM_BLOCK_FAILED");
        return;
      }
      leaveCurrentRoom(io, targetSocket);
      targetSocket.emit("access-blocked", { scope: "room", expiresAt: result.expiresAt });
      socket.emit("moderation-success", { action: "block", targetSocketId });
    });

    socket.on("leave-room", () => {
      leaveCurrentRoom(io, socket);
    });

    socket.on("send-message", ({ text }) => {
      const roomId = socket.data.roomId;
      const nickname = socket.data.nickname;
      const avatar = socket.data.avatar;
      const cleanText = text.trim().slice(0, 500);

      if (!roomId || !nickname || !avatar || !cleanText) {
        return;
      }

      const message = addRoomMessage({
        id: `${socket.id}-${Date.now()}`,
        roomId,
        socketId: socket.id,
        nickname,
        avatar,
        text: cleanText,
        timestamp: Date.now()
      });

      if (message) {
        io.to(roomId).emit("receive-message", message);
      }
    });

    socket.on("media-status", (payload) => {
      const roomId = socket.data.roomId;
      const canUseCamera = hasPermission(socket.data.role ?? "unverified", "use_camera");

      if (payload.cameraEnabled && !canUseCamera) {
        socket.emit("camera-denied");
      }
      const anotherScreenSharer = roomId
        ? getRoomUsers(roomId).some((user) => user.socketId !== socket.id && user.screenSharing)
        : false;

      if (payload.screenSharing && anotherScreenSharer) {
        socket.emit("screen-share-denied");
        return;
      }

      const user = updateUserMedia(socket.id, {
        ...payload,
        cameraEnabled: canUseCamera && payload.cameraEnabled
      });

      if (roomId && user) {
        socket.to(roomId).emit("user-media-status", {
          socketId: socket.id,
          micEnabled: user.micEnabled,
          cameraEnabled: user.cameraEnabled,
          screenSharing: user.screenSharing,
          screenTrackId: user.screenTrackId
        });
        io.to(roomId).emit("room-users", getPublicRoomUsers(roomId));
      }
    });

    socket.on("offer", ({ to, description }) => {
      socket.to(to).emit("offer", { from: socket.id, description });
    });

    socket.on("answer", ({ to, description }) => {
      socket.to(to).emit("answer", { from: socket.id, description });
    });

    socket.on("ice-candidate", ({ to, candidate }) => {
      socket.to(to).emit("ice-candidate", { from: socket.id, candidate });
    });

    socket.on("webrtc-transport", (payload) => {
      const roomId = socket.data.roomId;
      const peerUser = roomId
        ? getRoomUsers(roomId).find((user) => user.socketId === payload?.peerId)
        : undefined;
      if (!payload || typeof payload.peerId !== "string" || !roomId || !peerUser) {
        return;
      }

      const validTransports = new Set(["direct", "stun", "turn", "unknown"]);
      const validCandidateTypes = new Set(["host", "srflx", "prflx", "relay", "unknown"]);
      if (!validTransports.has(payload.transport)
        || !validCandidateTypes.has(payload.localCandidateType)
        || !validCandidateTypes.has(payload.remoteCandidateType)) {
        return;
      }

      const connectionId = [socket.id, payload.peerId].sort().join(":");
      if (loggedWebRtcTransports.get(connectionId) === payload.transport) {
        return;
      }

      loggedWebRtcTransports.set(connectionId, payload.transport);
      const protocol = typeof payload.protocol === "string" ? payload.protocol.slice(0, 16) : null;
      const relayProtocol = typeof payload.relayProtocol === "string" ? payload.relayProtocol.slice(0, 16) : null;
      const transportLabel = {
        direct: "DIRECT/P2P",
        stun: "STUN/P2P",
        turn: "TURN/RELAY",
        unknown: "UNKNOWN"
      }[payload.transport];
      const reporter = formatWebRtcLogUser(socket.data.nickname, socket.id);
      const peer = formatWebRtcLogUser(peerUser.nickname, payload.peerId);
      const candidateRoute = `${payload.localCandidateType}<->${payload.remoteCandidateType}`;
      const networkProtocol = relayProtocol ? `${protocol ?? "unknown"}/${relayProtocol}` : protocol ?? "unknown";

      console.log(
        `[WEBRTC_TRANSPORT] ${transportLabel} | room=${roomId} | users=${reporter}<->${peer}`
        + ` | candidates=${candidateRoute} | protocol=${networkProtocol} | at=${new Date().toISOString()}`
      );
    });

    socket.on("disconnect", () => {
      leaveCurrentRoom(io, socket);
    });
  });
}

import type { AppServer, AppSocket } from "../types/socket.js";
import {
  addRoomMessage,
  addUserToRoom,
  canManageRoomLanguages,
  createRoom,
  deleteUserCreatedRoomIfEmpty,
  getRoomMessages,
  getRoomSummary,
  getRoomSummaries,
  getRoomUsers,
  isUserCreatedRoomEmpty,
  removeUser,
  updateRoomLanguages,
  updateUserMedia
} from "../rooms/roomStore.js";
import { verifyAppJwt } from "../auth/jwt.js";
import { findUserById, type UserProfile } from "../users/userRepository.js";
import { hasPermission } from "../users/userPermissions.js";
import { isRoomLanguage, isRoomLanguageLevel } from "../rooms/roomLanguages.js";

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
  socket.to(previousRoomId).emit("room-users", getRoomUsers(previousRoomId));
  socket.data.roomId = undefined;
  socket.data.nickname = undefined;
  socket.data.avatar = undefined;
  socket.data.role = undefined;
  socket.data.userId = undefined;
  socket.data.identityKey = undefined;
  clearWebRtcTransportLogs(socket.id);
  emitRoomList(io);
  emitRoomLanguagePermissions(io, previousRoomId);
  scheduleEmptyRoomDeletion(io, previousRoomId);
}

export function registerSocketHandlers(io: AppServer) {
  io.on("connection", (socket) => {
    socket.emit("room-list", getRoomSummaries());

    socket.on("create-room", async ({ name, primaryLanguage, primaryLanguageLevel, secondaryLanguage, authToken }) => {
      const user = await getAuthenticatedUser(authToken);
      const cleanName = typeof name === "string" ? name.trim().replace(/\s+/g, " ").slice(0, 60) : "";

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

      const room = createRoom(cleanName, primaryLanguage, primaryLanguageLevel, cleanSecondaryLanguage, user.id);
      socket.emit("room-created", room);
      emitRoomList(io);
      scheduleEmptyRoomDeletion(io, room.id);
    });

    socket.on("join-room", async ({ roomId, nickname, guestId, authToken }) => {
      const cleanNickname = nickname.trim().slice(0, 32);
      const authenticatedUser = await getAuthenticatedUser(authToken);
      const role = authenticatedUser?.role ?? "unverified";
      const identityKey = resolveIdentityKey(authenticatedUser, guestId, socket.id);

      if (!cleanNickname) {
        socket.emit("join-error", "Nickname is required.");
        return;
      }

      const targetRoom = getRoomSummary(roomId);
      if (!targetRoom) {
        socket.emit("join-error", "Room does not exist.");
        return;
      }

      const otherIdentitySockets = getOtherIdentitySockets(io, socket, identityKey);
      const replacementInTargetRoom = otherIdentitySockets.some((candidate) => candidate.data.roomId === roomId);
      const alreadyInTargetRoom = socket.data.roomId === roomId;
      if (targetRoom.users >= targetRoom.capacity && !replacementInTargetRoom && !alreadyInTargetRoom) {
        socket.emit("room-full");
        return;
      }

      if (socket.data.roomId && !alreadyInTargetRoom) {
        leaveCurrentRoom(io, socket);
      }

      for (const previousSocket of otherIdentitySockets) {
        leaveCurrentRoom(io, previousSocket);
        previousSocket.emit("room-session-replaced");
      }

      if (alreadyInTargetRoom) {
        socket.emit("room-users", getRoomUsers(roomId));
        socket.emit("chat-history", getRoomMessages(roomId));
        emitRoomLanguagePermissions(io, roomId);
        return;
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
      socket.emit("room-users", result.users);
      socket.emit("chat-history", getRoomMessages(roomId));

      if (currentUser) {
        socket.to(roomId).emit("user-joined", currentUser);
        socket.to(roomId).emit("room-users", result.users);
      }

      emitRoomList(io);
      emitRoomLanguagePermissions(io, roomId);
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
        io.to(roomId).emit("room-users", getRoomUsers(roomId));
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

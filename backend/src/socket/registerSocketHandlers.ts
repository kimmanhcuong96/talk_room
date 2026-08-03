import type { AppServer, AppSocket } from "../types/socket.js";
import {
  addRoomMessage,
  addUserToRoom,
  getRoomMessages,
  getRoomSummaries,
  getRoomUsers,
  removeUser,
  updateUserMedia
} from "../rooms/roomStore.js";

const avatars = ["🐣", "🐼", "🐰", "🦊", "🐨", "🐥", "🐧", "🐸", "🦄", "🐙", "🐢", "🐹"];

function createRandomAvatar() {
  return avatars[Math.floor(Math.random() * avatars.length)] ?? "🐣";
}

function emitRoomList(io: AppServer) {
  io.emit("room-list", getRoomSummaries());
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
  clearWebRtcTransportLogs(socket.id);
  emitRoomList(io);
}

export function registerSocketHandlers(io: AppServer) {
  io.on("connection", (socket) => {
    socket.emit("room-list", getRoomSummaries());

    socket.on("join-room", ({ roomId, nickname }) => {
      const cleanNickname = nickname.trim().slice(0, 32);

      if (!cleanNickname) {
        socket.emit("join-error", "Nickname is required.");
        return;
      }

      const result = addUserToRoom(roomId, {
        socketId: socket.id,
        nickname: cleanNickname,
        avatar: createRandomAvatar(),
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
      socket.join(roomId);

      const currentUser = result.users.find((user) => user.socketId === socket.id);
      socket.emit("room-users", result.users);
      socket.emit("chat-history", getRoomMessages(roomId));

      if (currentUser) {
        socket.to(roomId).emit("user-joined", currentUser);
        socket.to(roomId).emit("room-users", result.users);
      }

      emitRoomList(io);
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
      const anotherScreenSharer = roomId
        ? getRoomUsers(roomId).some((user) => user.socketId !== socket.id && user.screenSharing)
        : false;

      if (payload.screenSharing && anotherScreenSharer) {
        socket.emit("screen-share-denied");
        return;
      }

      const user = updateUserMedia(socket.id, payload);

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

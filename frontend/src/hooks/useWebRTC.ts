import { useCallback, useEffect, useRef, useState } from "react";
import type { AppSocket } from "../lib/socket";
import type { RoomUser } from "../types/realtime";

type RemotePeer = RoomUser & {
  stream: MediaStream | null;
};

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

export function useWebRTC(socket: AppSocket, localStream: MediaStream | null) {
  const peersRef = useRef(new Map<string, RTCPeerConnection>());
  const makingOfferRef = useRef(new Map<string, boolean>());
  const localStreamRef = useRef<MediaStream | null>(null);
  const usersRef = useRef<RoomUser[]>([]);
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  useEffect(() => {
    localStreamRef.current = localStream;

    peersRef.current.forEach((connection) => {
      const nextTrackIds = new Set(localStream?.getTracks().map((track) => track.id) ?? []);

      connection.getSenders().forEach((sender) => {
        if (sender.track && !nextTrackIds.has(sender.track.id)) {
          connection.removeTrack(sender);
        }
      });

      const existingTrackIds = new Set(connection.getSenders().map((sender) => sender.track?.id));
      localStream?.getTracks().forEach((track) => {
        if (!existingTrackIds.has(track.id)) {
          connection.addTrack(track, localStream);
        }
      });
    });
  }, [localStream]);

  const closePeer = useCallback((socketId: string) => {
    peersRef.current.get(socketId)?.close();
    peersRef.current.delete(socketId);
    makingOfferRef.current.delete(socketId);
    setRemotePeers((current) => current.map((peer) => (peer.socketId === socketId ? { ...peer, stream: null } : peer)));
  }, []);

  const createAndSendOffer = useCallback(
    async (peerId: string) => {
      const connection = peersRef.current.get(peerId);
      if (!connection || connection.signalingState !== "stable" || makingOfferRef.current.get(peerId)) {
        return;
      }

      try {
        makingOfferRef.current.set(peerId, true);
        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        socket.emit("offer", { to: peerId, description: offer });
      } finally {
        makingOfferRef.current.set(peerId, false);
      }
    },
    [socket]
  );

  const ensurePeerConnection = useCallback(
    (peerId: string) => {
      if (typeof RTCPeerConnection === "undefined") {
        return null;
      }

      const existingConnection = peersRef.current.get(peerId);
      if (existingConnection) {
        return existingConnection;
      }

      const connection = new RTCPeerConnection(rtcConfig);
      const remoteStream = new MediaStream();

      localStreamRef.current?.getTracks().forEach((track) => {
        connection.addTrack(track, localStreamRef.current!);
      });

      connection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", { to: peerId, candidate: event.candidate.toJSON() });
        }
      };

      connection.onnegotiationneeded = () => {
        void createAndSendOffer(peerId);
      };

      connection.ontrack = (event) => {
        const incomingTracks = event.streams[0]?.getTracks() ?? [event.track];

        incomingTracks.forEach((track) => {
          if (!remoteStream.getTracks().some((existingTrack) => existingTrack.id === track.id)) {
            remoteStream.addTrack(track);
          }

          track.addEventListener("ended", () => {
            remoteStream.removeTrack(track);
          });
        });

        setRemotePeers((current) => {
          const existingPeer = current.find((peer) => peer.socketId === peerId);
          if (existingPeer) {
            return current.map((peer) => (peer.socketId === peerId ? { ...peer, stream: remoteStream } : peer));
          }

          const knownUser = usersRef.current.find((user) => user.socketId === peerId);
          return [
            ...current,
            {
              socketId: peerId,
              nickname: knownUser?.nickname ?? "Guest",
              avatar: knownUser?.avatar ?? "🐣",
              micEnabled: knownUser?.micEnabled ?? true,
              cameraEnabled: knownUser?.cameraEnabled ?? true,
              screenSharing: knownUser?.screenSharing ?? false,
              screenTrackId: knownUser?.screenTrackId ?? null,
              stream: remoteStream
            }
          ];
        });
      };

      connection.onconnectionstatechange = () => {
        if (["closed", "failed", "disconnected"].includes(connection.connectionState)) {
          closePeer(peerId);
        }
      };

      peersRef.current.set(peerId, connection);
      return connection;
    },
    [closePeer, createAndSendOffer, socket]
  );

  useEffect(() => {
    setRemotePeers((current) =>
      users
        .filter((user) => user.socketId !== socket.id)
        .map((user) => {
          const existingPeer = current.find((peer) => peer.socketId === user.socketId);
          return { ...user, stream: existingPeer?.stream ?? null };
        })
    );
  }, [socket.id, users]);

  useEffect(() => {
    const handleRoomUsers = (roomUsers: RoomUser[]) => {
      setUsers(roomUsers);
    };

    const handleUserJoined = async (user: RoomUser) => {
      setUsers((current) => {
        if (current.some((candidate) => candidate.socketId === user.socketId)) {
          return current;
        }
        return [...current, user];
      });

      const connection = ensurePeerConnection(user.socketId);
      if (!connection) {
        return;
      }

      await createAndSendOffer(user.socketId);
    };

    const handleUserLeft = ({ socketId }: { socketId: string }) => {
      setUsers((current) => current.filter((user) => user.socketId !== socketId));
      closePeer(socketId);
    };

    const handleMediaStatus = (payload: { socketId: string; micEnabled: boolean; cameraEnabled: boolean; screenSharing: boolean; screenTrackId: string | null }) => {
      setUsers((current) =>
        current.map((user) => (user.socketId === payload.socketId ? { ...user, ...payload } : user))
      );
      setRemotePeers((current) =>
        current.map((peer) => (peer.socketId === payload.socketId ? { ...peer, ...payload } : peer))
      );
    };

    const handleOffer = async ({ from, description }: { from: string; description: RTCSessionDescriptionInit }) => {
      const connection = ensurePeerConnection(from);
      if (!connection) {
        return;
      }

      if (connection.signalingState !== "stable") {
        await connection.setLocalDescription({ type: "rollback" });
      }

      await connection.setRemoteDescription(description);
      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);
      socket.emit("answer", { to: from, description: answer });
    };

    const handleAnswer = async ({ from, description }: { from: string; description: RTCSessionDescriptionInit }) => {
      const connection = peersRef.current.get(from);
      if (connection && connection.signalingState !== "stable") {
        await connection.setRemoteDescription(description);
      }
    };

    const handleIceCandidate = async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      const connection = ensurePeerConnection(from);
      if (!connection) {
        return;
      }

      await connection.addIceCandidate(candidate);
    };

    socket.on("room-users", handleRoomUsers);
    socket.on("user-joined", handleUserJoined);
    socket.on("user-left", handleUserLeft);
    socket.on("user-media-status", handleMediaStatus);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);

    return () => {
      socket.off("room-users", handleRoomUsers);
      socket.off("user-joined", handleUserJoined);
      socket.off("user-left", handleUserLeft);
      socket.off("user-media-status", handleMediaStatus);
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIceCandidate);
      peersRef.current.forEach((connection) => connection.close());
      peersRef.current.clear();
      makingOfferRef.current.clear();
      setRemotePeers([]);
      setUsers([]);
    };
  }, [closePeer, createAndSendOffer, ensurePeerConnection, socket]);

  return { users, remotePeers };
}

import { useCallback, useEffect, useRef, useState } from "react";
import type { AppSocket } from "../lib/socket";
import { fallbackRtcConfig, fetchRtcConfig } from "../lib/webrtc";
import type { RoomUser } from "../types/realtime";

type RemotePeer = RoomUser & {
  stream: MediaStream | null;
};

type IceCandidateStats = RTCStats & {
  candidateType?: RTCIceCandidateType;
  protocol?: string;
  relayProtocol?: string;
};

type CandidatePairStats = RTCStats & {
  state?: string;
  nominated?: boolean;
  selected?: boolean;
  localCandidateId?: string;
  remoteCandidateId?: string;
};

type TransportStats = RTCStats & {
  selectedCandidatePairId?: string;
};

export function useWebRTC(socket: AppSocket, localStream: MediaStream | null) {
  const peersRef = useRef(new Map<string, RTCPeerConnection>());
  const peerCreationRef = useRef(new Map<string, Promise<RTCPeerConnection | null>>());
  const peerGenerationRef = useRef(new Map<string, number>());
  const makingOfferRef = useRef(new Map<string, boolean>());
  const pendingIceCandidatesRef = useRef(new Map<string, RTCIceCandidateInit[]>());
  const disconnectTimersRef = useRef(new Map<string, number>());
  const transportReportTimersRef = useRef(new Map<string, number>());
  const reportedTransportsRef = useRef(new Map<string, string>());
  const rtcConfigRef = useRef<RTCConfiguration>(fallbackRtcConfig);
  const rtcConfigPromiseRef = useRef<Promise<RTCConfiguration> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const usersRef = useRef<RoomUser[]>([]);
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  const getRtcConfig = useCallback(async () => {
    if (!rtcConfigPromiseRef.current) {
      rtcConfigPromiseRef.current = fetchRtcConfig()
        .then((config) => {
          rtcConfigRef.current = config;
          console.log("[WebRTC] loaded ICE servers:", config.iceServers);
          return config;
        })
        .catch((error) => {
          console.warn("[WebRTC] using fallback ICE servers:", error);
          rtcConfigPromiseRef.current = null;
          return rtcConfigRef.current;
        });
    }

    return rtcConfigPromiseRef.current;
  }, []);

  const closePeer = useCallback((socketId: string) => {
    peerGenerationRef.current.set(socketId, (peerGenerationRef.current.get(socketId) ?? 0) + 1);
    const disconnectTimer = disconnectTimersRef.current.get(socketId);
    if (disconnectTimer) {
      window.clearTimeout(disconnectTimer);
      disconnectTimersRef.current.delete(socketId);
    }

    const transportReportTimer = transportReportTimersRef.current.get(socketId);
    if (transportReportTimer) {
      window.clearTimeout(transportReportTimer);
      transportReportTimersRef.current.delete(socketId);
    }

    peersRef.current.get(socketId)?.close();
    peersRef.current.delete(socketId);
    peerCreationRef.current.delete(socketId);
    makingOfferRef.current.delete(socketId);
    pendingIceCandidatesRef.current.delete(socketId);
    reportedTransportsRef.current.delete(socketId);
    setRemotePeers((current) => current.map((peer) => (peer.socketId === socketId ? { ...peer, stream: null } : peer)));
  }, []);

  const flushPendingIceCandidates = useCallback(async (peerId: string, connection: RTCPeerConnection) => {
    const pendingCandidates = pendingIceCandidatesRef.current.get(peerId) ?? [];
    if (!pendingCandidates.length || !connection.remoteDescription) {
      return;
    }

    pendingIceCandidatesRef.current.delete(peerId);

    for (const candidate of pendingCandidates) {
      await connection.addIceCandidate(candidate);
    }
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

  useEffect(() => {
    localStreamRef.current = localStream;

    peersRef.current.forEach((connection, peerId) => {
      let tracksChanged = false;
      const nextTrackIds = new Set(localStream?.getTracks().map((track) => track.id) ?? []);

      connection.getSenders().forEach((sender) => {
        if (sender.track && !nextTrackIds.has(sender.track.id)) {
          connection.removeTrack(sender);
          tracksChanged = true;
        }
      });

      const existingTrackIds = new Set(connection.getSenders().map((sender) => sender.track?.id));
      localStream?.getTracks().forEach((track) => {
        if (!existingTrackIds.has(track.id)) {
          connection.addTrack(track, localStream);
          tracksChanged = true;
        }
      });

      if (tracksChanged && connection.signalingState === "stable") {
        // ICE connectivity is independent from signaling. Waiting for
        // connectionState=connected can permanently strand a newly-added
        // microphone/camera track because no later event is guaranteed to
        // trigger another offer.
        void createAndSendOffer(peerId);
      }
    });
  }, [createAndSendOffer, localStream]);

  const ensurePeerConnection = useCallback(
    async (peerId: string) => {
      if (typeof RTCPeerConnection === "undefined") {
        return null;
      }

      const existingConnection = peersRef.current.get(peerId);
      if (existingConnection) {
        return existingConnection;
      }

      const pendingConnection = peerCreationRef.current.get(peerId);
      if (pendingConnection) {
        return pendingConnection;
      }

      const generation = peerGenerationRef.current.get(peerId) ?? 0;
      const creation = (async () => {
        const connectionConfig = await getRtcConfig();
        if ((peerGenerationRef.current.get(peerId) ?? 0) !== generation) {
          return null;
        }

        const currentConnection = peersRef.current.get(peerId);
        if (currentConnection) {
          return currentConnection;
        }

      const connection = new RTCPeerConnection(connectionConfig);
      const remoteStream = new MediaStream();
      const logPeerState = (label: string, value: string) => {
        console.log(`[WebRTC][${peerId}] ${label}:`, value);
      };
      const reportSelectedTransport = async (attempt = 0) => {
        const stats = await connection.getStats();
        const candidates = new Map<string, IceCandidateStats>();
        const candidatePairs = new Map<string, CandidatePairStats>();
        let selectedCandidatePairId: string | undefined;

        stats.forEach((report) => {
          if (report.type === "local-candidate" || report.type === "remote-candidate") {
            candidates.set(report.id, report as IceCandidateStats);
          } else if (report.type === "candidate-pair") {
            candidatePairs.set(report.id, report as CandidatePairStats);
          } else if (report.type === "transport") {
            selectedCandidatePairId ||= (report as TransportStats).selectedCandidatePairId;
          }
        });

        const pair = (selectedCandidatePairId ? candidatePairs.get(selectedCandidatePairId) : undefined)
          ?? [...candidatePairs.values()].find((candidatePair) =>
            candidatePair.selected || (candidatePair.nominated && candidatePair.state === "succeeded")
          );

        if (!pair) {
          if (attempt < 3 && connection.connectionState === "connected") {
            const timerId = window.setTimeout(() => void reportSelectedTransport(attempt + 1), 1000);
            transportReportTimersRef.current.set(peerId, timerId);
          }
          return;
        }

        transportReportTimersRef.current.delete(peerId);
        const localCandidate = candidates.get(pair.localCandidateId ?? "");
        const remoteCandidate = candidates.get(pair.remoteCandidateId ?? "");
        const localCandidateType = localCandidate?.candidateType ?? "unknown";
        const remoteCandidateType = remoteCandidate?.candidateType ?? "unknown";
        const usesTurn = localCandidateType === "relay" || remoteCandidateType === "relay";
        const usesStun = localCandidateType === "srflx" || localCandidateType === "prflx"
          || remoteCandidateType === "srflx" || remoteCandidateType === "prflx";
        const usesDirect = localCandidateType === "host" && remoteCandidateType === "host";
        const transport = usesTurn ? "turn" : usesStun ? "stun" : usesDirect ? "direct" : "unknown";
        const protocol = localCandidate?.protocol ?? remoteCandidate?.protocol ?? null;
        const relayProtocol = localCandidate?.relayProtocol ?? remoteCandidate?.relayProtocol ?? null;
        const signature = [transport, localCandidateType, remoteCandidateType, protocol, relayProtocol].join(":");

        if (reportedTransportsRef.current.get(peerId) === signature) {
          return;
        }

        reportedTransportsRef.current.set(peerId, signature);
        console.log(`[WebRTC][${peerId}] selected transport:`, {
          transport,
          localCandidateType,
          remoteCandidateType,
          protocol,
          relayProtocol
        });
        socket.emit("webrtc-transport", {
          peerId,
          transport,
          localCandidateType,
          remoteCandidateType,
          protocol,
          relayProtocol
        });
      };

      localStreamRef.current?.getTracks().forEach((track) => {
        connection.addTrack(track, localStreamRef.current!);
      });

      connection.onsignalingstatechange = () => {
        logPeerState("signalingState", connection.signalingState);
      };

      connection.onicegatheringstatechange = () => {
        logPeerState("iceGatheringState", connection.iceGatheringState);
      };

      connection.oniceconnectionstatechange = () => {
        logPeerState("iceConnectionState", connection.iceConnectionState);
        if (connection.iceConnectionState === "connected" || connection.iceConnectionState === "completed") {
          void reportSelectedTransport();
        }
      };

      connection.onicecandidateerror = (event) => {
        console.warn(`[WebRTC][${peerId}] ICE candidate error:`, {
          address: event.address,
          port: event.port,
          url: event.url,
          errorCode: event.errorCode,
          errorText: event.errorText
        });
      };

      connection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`[WebRTC][${peerId}] local ICE candidate:`, {
            type: event.candidate.type,
            protocol: event.candidate.protocol,
            address: event.candidate.address,
            port: event.candidate.port,
            candidateType: event.candidate.candidate
          });
        } else {
          console.log(`[WebRTC][${peerId}] local ICE candidate: end-of-candidates`);
        }

        socket.emit("ice-candidate", {
          to: peerId,
          candidate: event.candidate ? event.candidate.toJSON() : null
        });
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
              role: knownUser?.role ?? "unverified",
              senderType: knownUser?.senderType ?? "human",
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
        logPeerState("connectionState", connection.connectionState);

        if (connection.connectionState === "connected") {
          void reportSelectedTransport();
          const disconnectTimer = disconnectTimersRef.current.get(peerId);
          if (disconnectTimer) {
            window.clearTimeout(disconnectTimer);
            disconnectTimersRef.current.delete(peerId);
          }
          return;
        }

        if (connection.connectionState === "failed" || connection.connectionState === "closed") {
          closePeer(peerId);
          return;
        }

        if (connection.connectionState === "disconnected" && !disconnectTimersRef.current.has(peerId)) {
          const disconnectTimer = window.setTimeout(() => closePeer(peerId), 10000);
          disconnectTimersRef.current.set(peerId, disconnectTimer);
        }
      };

      peersRef.current.set(peerId, connection);
      return connection;
      })();

      peerCreationRef.current.set(peerId, creation);
      try {
        return await creation;
      } finally {
        if (peerCreationRef.current.get(peerId) === creation) {
          peerCreationRef.current.delete(peerId);
        }
      }
    },
    [closePeer, createAndSendOffer, getRtcConfig, socket]
  );

  useEffect(() => {
    void getRtcConfig();
  }, [getRtcConfig]);

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

      if (user.senderType === "virtual_user") return;

      const connection = await ensurePeerConnection(user.socketId);
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
      console.log(`[WebRTC][${from}] received offer:`, {
        signalingState: peersRef.current.get(from)?.signalingState ?? "new",
        hasSdp: Boolean(description.sdp)
      });
      const connection = await ensurePeerConnection(from);
      if (!connection) {
        return;
      }

      if (connection.signalingState !== "stable") {
        await connection.setLocalDescription({ type: "rollback" });
      }

      await connection.setRemoteDescription(description);
      await flushPendingIceCandidates(from, connection);
      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);
      console.log(`[WebRTC][${from}] sending answer:`, {
        signalingState: connection.signalingState,
        hasSdp: Boolean(answer.sdp)
      });
      socket.emit("answer", { to: from, description: answer });
    };

    const handleAnswer = async ({ from, description }: { from: string; description: RTCSessionDescriptionInit }) => {
      const connection = peersRef.current.get(from);
      if (connection && connection.signalingState !== "stable") {
        console.log(`[WebRTC][${from}] received answer:`, {
          signalingState: connection.signalingState,
          hasSdp: Boolean(description.sdp)
        });
        await connection.setRemoteDescription(description);
        await flushPendingIceCandidates(from, connection);
      }
    };

    const handleIceCandidate = async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit | null }) => {
      console.log(`[WebRTC][${from}] received ICE candidate:`, candidate ? candidate.candidate : "end-of-candidates");
      const connection = await ensurePeerConnection(from);
      if (!connection) {
        return;
      }

      try {
        if (!candidate) {
          if (connection.remoteDescription) {
            await connection.addIceCandidate();
          } else {
            console.log(`[WebRTC][${from}] queued end-of-candidates before remoteDescription`);
          }
          return;
        }

        if (!connection.remoteDescription) {
          const pendingCandidates = pendingIceCandidatesRef.current.get(from) ?? [];
          pendingCandidates.push(candidate);
          pendingIceCandidatesRef.current.set(from, pendingCandidates);
          console.log(`[WebRTC][${from}] queued ICE candidate before remoteDescription:`, pendingCandidates.length);
          return;
        }

        await connection.addIceCandidate(candidate);
      } catch (error) {
        console.warn(`[WebRTC][${from}] addIceCandidate failed:`, error, candidate);
      }
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
      disconnectTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      transportReportTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      peersRef.current.clear();
      peerCreationRef.current.clear();
      peerGenerationRef.current.forEach((generation, peerId) => {
        peerGenerationRef.current.set(peerId, generation + 1);
      });
      makingOfferRef.current.clear();
      pendingIceCandidatesRef.current.clear();
      disconnectTimersRef.current.clear();
      transportReportTimersRef.current.clear();
      reportedTransportsRef.current.clear();
      setRemotePeers([]);
      setUsers([]);
    };
  }, [closePeer, createAndSendOffer, ensurePeerConnection, flushPendingIceCandidates, socket]);

  return { users, remotePeers };
}

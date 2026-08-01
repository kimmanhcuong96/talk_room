import { useCallback, useEffect, useMemo, useState } from "react";
import { HomePage } from "./components/HomePage";
import { RoomAccessPage } from "./components/RoomAccessPage";
import { RoomPage } from "./components/RoomPage";
import { useRooms } from "./hooks/useRooms";
import { useSocket } from "./hooks/useSocket";
import { getRoomIdFromPath, roomPath } from "./lib/routes";

const NICKNAME_STORAGE_KEY = "english-talk-rooms:nickname";

type ActiveRoom = {
  roomId: string;
  nickname: string;
};

export function App() {
  const { socket, isConnected, connectionError } = useSocket();
  const rooms = useRooms(socket);
  const [nickname, setNickname] = useState(() => localStorage.getItem(NICKNAME_STORAGE_KEY) ?? "");
  const [routeRoomId, setRouteRoomId] = useState(() => getRoomIdFromPath());
  const [activeRoom, setActiveRoom] = useState<ActiveRoom | null>(null);
  const [pendingJoin, setPendingJoin] = useState<ActiveRoom | null>(null);
  const [error, setError] = useState<string | null>(null);

  const routeRoom = useMemo(() => (routeRoomId ? rooms.find((room) => room.id === routeRoomId) : undefined), [rooms, routeRoomId]);
  const selectedRoom = useMemo(() => (activeRoom ? rooms.find((room) => room.id === activeRoom.roomId) : undefined), [activeRoom, rooms]);

  useEffect(() => {
    const handlePopState = () => {
      const nextRoomId = getRoomIdFromPath();
      setRouteRoomId(nextRoomId);
      setActiveRoom(null);
      setPendingJoin(null);
      socket.emit("leave-room");
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [socket]);

  const joinRoom = useCallback(
    (roomId: string, cleanNickname: string) => {
      localStorage.setItem(NICKNAME_STORAGE_KEY, cleanNickname);
      setPendingJoin(null);
      setError(null);
      setActiveRoom({ roomId, nickname: cleanNickname });
      socket.emit("join-room", { roomId, nickname: cleanNickname });
    },
    [socket]
  );

  useEffect(() => {
    if (isConnected && pendingJoin) {
      joinRoom(pendingJoin.roomId, pendingJoin.nickname);
    }
  }, [isConnected, joinRoom, pendingJoin]);

  useEffect(() => {
    const handleRoomFull = () => {
      setPendingJoin(null);
      setActiveRoom(null);
      setRouteRoomId(null);
      window.history.pushState({}, "", "/");
      setError("That room is full. Please choose another room.");
    };

    const handleJoinError = (message: string) => {
      setPendingJoin(null);
      setActiveRoom(null);
      setRouteRoomId(null);
      window.history.pushState({}, "", "/");
      setError(message);
    };

    socket.on("room-full", handleRoomFull);
    socket.on("join-error", handleJoinError);

    return () => {
      socket.off("room-full", handleRoomFull);
      socket.off("join-error", handleJoinError);
    };
  }, [socket]);

  const handleJoin = (roomId: string) => {
    const cleanNickname = nickname.trim();
    if (!cleanNickname) {
      setError("Please enter a nickname.");
      return;
    }

    localStorage.setItem(NICKNAME_STORAGE_KEY, cleanNickname);
    setError(null);
    setActiveRoom(null);
    setPendingJoin(null);
    setRouteRoomId(roomId);
    window.history.pushState({}, "", roomPath(roomId));
  };

  const handleReadyAccess = () => {
    if (!routeRoomId) {
      return;
    }

    const cleanNickname = nickname.trim();
    if (!cleanNickname) {
      setError("Please enter a nickname.");
      return;
    }

    if (!isConnected) {
      localStorage.setItem(NICKNAME_STORAGE_KEY, cleanNickname);
      setPendingJoin({ roomId: routeRoomId, nickname: cleanNickname });
      setError("Connecting to the server...");
      socket.connect();
      return;
    }

    joinRoom(routeRoomId, cleanNickname);
  };

  const handleNicknameChange = (nextNickname: string) => {
    setNickname(nextNickname);
    localStorage.setItem(NICKNAME_STORAGE_KEY, nextNickname);
  };

  const handleLeave = () => {
    socket.emit("leave-room");
    setActiveRoom(null);
    setPendingJoin(null);
    setRouteRoomId(null);
    window.history.pushState({}, "", "/");
  };

  if (activeRoom && selectedRoom) {
    return (
      <RoomPage
        socket={socket}
        room={selectedRoom}
        nickname={activeRoom.nickname}
        isConnected={isConnected}
        connectionError={connectionError}
        onLeave={handleLeave}
      />
    );
  }

  if (routeRoomId && routeRoom) {
    return (
      <RoomAccessPage
        room={routeRoom}
        nickname={nickname}
        isConnected={isConnected}
        error={error ?? connectionError}
        onNicknameChange={handleNicknameChange}
        onReady={handleReadyAccess}
        onBack={handleLeave}
      />
    );
  }

  return (
    <HomePage
      rooms={rooms}
      nickname={nickname}
      isConnected={isConnected}
      error={error ?? connectionError}
      onNicknameChange={handleNicknameChange}
      onJoin={handleJoin}
    />
  );
}

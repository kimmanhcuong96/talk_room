import { useCallback, useEffect, useMemo, useState } from "react";
import { HomePage } from "./components/HomePage";
import { RoomAccessPage } from "./components/RoomAccessPage";
import { RoomPage } from "./components/RoomPage";
import { useRooms } from "./hooks/useRooms";
import { useSocket } from "./hooks/useSocket";
import { clearStoredSession, getCurrentUser, loginWithGoogleIdToken, readStoredToken, storeSession, type AuthSession } from "./lib/auth";
import { type Language, isLanguage, translate } from "./lib/i18n";
import { getRoomIdFromPath, homePath, roomPath } from "./lib/routes";

const NICKNAME_STORAGE_KEY = "english-talk-rooms:nickname";
const LANGUAGE_STORAGE_KEY = "english-talk-rooms:language";

type ActiveRoom = {
  roomId: string;
  nickname: string;
};

export function App() {
  const { socket, isConnected, connectionError } = useSocket();
  const rooms = useRooms(socket);
  const [nickname, setNickname] = useState(() => localStorage.getItem(NICKNAME_STORAGE_KEY) ?? "");
  const [language, setLanguage] = useState<Language>(() => {
    const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(storedLanguage) ? storedLanguage : "en";
  });
  const [routeRoomId, setRouteRoomId] = useState(() => getRoomIdFromPath());
  const [activeRoom, setActiveRoom] = useState<ActiveRoom | null>(null);
  const [pendingJoin, setPendingJoin] = useState<ActiveRoom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(() => Boolean(readStoredToken()));
  const [isSigningIn, setIsSigningIn] = useState(false);

  const routeRoom = useMemo(() => (routeRoomId ? rooms.find((room) => room.id === routeRoomId) : undefined), [rooms, routeRoomId]);
  const selectedRoom = useMemo(() => (activeRoom ? rooms.find((room) => room.id === activeRoom.roomId) : undefined), [activeRoom, rooms]);
  const authenticatedNickname = authSession?.user.displayName.trim() || "";

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
      window.history.pushState({}, "", homePath());
      setError(translate(language, "roomFullError"));
    };

    const handleJoinError = (message: string) => {
      setPendingJoin(null);
      setActiveRoom(null);
      setRouteRoomId(null);
      window.history.pushState({}, "", homePath());
      setError(message);
    };

    socket.on("room-full", handleRoomFull);
    socket.on("join-error", handleJoinError);

    return () => {
      socket.off("room-full", handleRoomFull);
      socket.off("join-error", handleJoinError);
    };
  }, [language, socket]);

  const handleJoin = (roomId: string) => {
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

    const cleanNickname = authenticatedNickname || nickname.trim();
    if (!cleanNickname) {
      setError(translate(language, "nicknameRequired"));
      return;
    }

    if (!authenticatedNickname) {
      localStorage.setItem(NICKNAME_STORAGE_KEY, cleanNickname);
    }

    if (!isConnected) {
      setPendingJoin({ roomId: routeRoomId, nickname: cleanNickname });
      setError(`${translate(language, "connectingServer")}...`);
      socket.connect();
      return;
    }

    joinRoom(routeRoomId, cleanNickname);
  };

  const handleNicknameChange = (nextNickname: string) => {
    setNickname(nextNickname);
    localStorage.setItem(NICKNAME_STORAGE_KEY, nextNickname);
  };

  const handleLanguageChange = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  };

  useEffect(() => {
    const token = readStoredToken();

    if (!token) {
      setIsAuthLoading(false);
      return;
    }

    let cancelled = false;
    setIsAuthLoading(true);

    getCurrentUser(token)
      .then((user) => {
        if (!cancelled) {
          setAuthSession({ token, user });
          setAuthError(null);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          clearStoredSession();
          setAuthSession(null);
          setAuthError(
            loadError instanceof Error && loadError.message !== "LOAD_USER_PROFILE_FAILED"
              ? loadError.message
              : translate(language, "loadUserProfileFailed")
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsAuthLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleGoogleCredential = useCallback(
    async (idToken: string) => {
      setIsSigningIn(true);
      setAuthError(null);

      try {
        const session = await loginWithGoogleIdToken(idToken);
        storeSession(session);
        setAuthSession(session);
      } catch (signInError) {
        setAuthError(
          signInError instanceof Error && signInError.message !== "GOOGLE_SIGN_IN_FAILED"
            ? signInError.message
            : translate(language, "googleSignInFailed")
        );
      } finally {
        setIsSigningIn(false);
      }
    },
    [language]
  );

  const handleSignOut = () => {
    clearStoredSession();
    setAuthSession(null);
    setAuthError(null);
  };

  const handleLeave = () => {
    socket.emit("leave-room");
    setActiveRoom(null);
    setPendingJoin(null);
    setRouteRoomId(null);
    window.history.pushState({}, "", homePath());
  };

  useEffect(() => {
    if (!activeRoom) {
      return;
    }

    const leaveRoomBeforePageExit = () => {
      socket.emit("leave-room");
    };

    window.addEventListener("pagehide", leaveRoomBeforePageExit);
    window.addEventListener("beforeunload", leaveRoomBeforePageExit);

    return () => {
      window.removeEventListener("pagehide", leaveRoomBeforePageExit);
      window.removeEventListener("beforeunload", leaveRoomBeforePageExit);
    };
  }, [activeRoom, socket]);

  if (activeRoom && selectedRoom) {
    return (
      <RoomPage
        socket={socket}
        room={selectedRoom}
        nickname={activeRoom.nickname}
        isConnected={isConnected}
        connectionError={connectionError}
        language={language}
        onLeave={handleLeave}
      />
    );
  }

  if (routeRoomId && routeRoom) {
    return (
      <RoomAccessPage
        room={routeRoom}
        nickname={nickname}
        authenticatedNickname={authenticatedNickname}
        isConnected={isConnected}
        error={error ?? connectionError}
        language={language}
        onNicknameChange={handleNicknameChange}
        onReady={handleReadyAccess}
        onBack={handleLeave}
      />
    );
  }

  return (
    <HomePage
      rooms={rooms}
      isConnected={isConnected}
      error={error ?? connectionError}
      language={language}
      onLanguageChange={handleLanguageChange}
      user={authSession?.user ?? null}
      authError={authError}
      isAuthLoading={isAuthLoading}
      isSigningIn={isSigningIn}
      onGoogleCredential={handleGoogleCredential}
      onSignOut={handleSignOut}
      onJoin={handleJoin}
    />
  );
}

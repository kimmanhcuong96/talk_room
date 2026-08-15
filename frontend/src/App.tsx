import { useCallback, useEffect, useMemo, useState } from "react";
import { HomePage } from "./components/HomePage";
import { RoomAccessPage } from "./components/RoomAccessPage";
import { RoomPage } from "./components/RoomPage";
import { InfoPage } from "./components/InfoPage";
import { useRooms } from "./hooks/useRooms";
import { useSocket } from "./hooks/useSocket";
import { clearStoredSession, getCurrentUser, isInvalidAuthSessionError, loginWithGoogleIdToken, readStoredSession, readStoredToken, storeSession, type AuthSession } from "./lib/auth";
import { type Language, isLanguage, translate } from "./lib/i18n";
import { getInfoPageFromPath, getRoomIdFromPath, homePath, infoPagePath, roomPath, type InfoPage as InfoPageName } from "./lib/routes";
import { isGeneratedNickname, resolveGuestNickname } from "./lib/nickname";
import { Seo } from "./components/Seo";
import type { RoomLanguage, RoomLanguageLevel } from "./lib/roomLanguages";
import { getOrCreateGuestId } from "./lib/guestIdentity";
import { moderationTranslate } from "./lib/moderationI18n";
import { VerificationRequestDialog } from "./components/VerificationRequestDialog";

const NICKNAME_STORAGE_KEY = "me2talk:nickname";
const LANGUAGE_STORAGE_KEY = "me2talk:language";
const LEGACY_NICKNAME_STORAGE_KEY = "english-talk-rooms:nickname";
const LEGACY_LANGUAGE_STORAGE_KEY = "english-talk-rooms:language";

function readMigratedLocalStorage(primaryKey: string, legacyKey: string) {
  const storedValue = localStorage.getItem(primaryKey);
  if (storedValue !== null) return storedValue;

  const legacyValue = localStorage.getItem(legacyKey);
  if (legacyValue !== null) {
    localStorage.setItem(primaryKey, legacyValue);
  }
  return legacyValue;
}

function detectDefaultLanguage(): Language {
  const localeValues = [navigator.language, ...Array.from(navigator.languages ?? [])].filter(Boolean);
  const locales = localeValues.map((locale) => locale.toLowerCase());
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (locales.some((locale) => locale.startsWith("vi")) || timeZone === "Asia/Ho_Chi_Minh" || timeZone === "Asia/Saigon") {
    return "vi";
  }

  if (locales.some((locale) => locale.startsWith("zh")) || ["Asia/Shanghai", "Asia/Chongqing", "Asia/Harbin", "Asia/Urumqi"].includes(timeZone)) {
    return "zh";
  }

  if (locales.some((locale) => locale.startsWith("ja")) || timeZone === "Asia/Tokyo") {
    return "ja";
  }

  return "en";
}

type ActiveRoom = {
  roomId: string;
  nickname: string;
};

export function App() {
  const { socket, isConnected, connectionError } = useSocket();
  const rooms = useRooms(socket);
  const [guestId] = useState(getOrCreateGuestId);
  const [nickname, setNickname] = useState(() => readMigratedLocalStorage(NICKNAME_STORAGE_KEY, LEGACY_NICKNAME_STORAGE_KEY) ?? "");
  const [language, setLanguage] = useState<Language>(() => {
    const storedLanguage = readMigratedLocalStorage(LANGUAGE_STORAGE_KEY, LEGACY_LANGUAGE_STORAGE_KEY);
    if (isLanguage(storedLanguage)) {
      return storedLanguage;
    }

    const detectedLanguage = detectDefaultLanguage();
    localStorage.setItem(LANGUAGE_STORAGE_KEY, detectedLanguage);
    return detectedLanguage;
  });
  const [routeRoomId, setRouteRoomId] = useState(() => getRoomIdFromPath());
  const [routeInfoPage, setRouteInfoPage] = useState<InfoPageName | null>(() => getInfoPageFromPath());
  const [activeRoom, setActiveRoom] = useState<ActiveRoom | null>(null);
  const [pendingJoin, setPendingJoin] = useState<ActiveRoom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authSession, setAuthSession] = useState<AuthSession | null>(readStoredSession);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(() => Boolean(readStoredToken()));
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [createRoomError, setCreateRoomError] = useState<string | null>(null);
  const [verificationRequestOpen, setVerificationRequestOpen] = useState(false);

  const routeRoom = useMemo(() => (routeRoomId ? rooms.find((room) => room.id === routeRoomId) : undefined), [rooms, routeRoomId]);
  const selectedRoom = useMemo(() => (activeRoom ? rooms.find((room) => room.id === activeRoom.roomId) : undefined), [activeRoom, rooms]);
  const authenticatedNickname = authSession?.user.displayName.trim() || "";
  useEffect(() => {
    const handlePopState = () => {
      const nextRoomId = getRoomIdFromPath();
      setRouteInfoPage(getInfoPageFromPath());
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
    },
    []
  );

  useEffect(() => {
    const handleRoomCreated = (room: (typeof rooms)[number]) => {
      setCreateRoomError(null);
      setError(null);
      setActiveRoom(null);
      setPendingJoin(null);
      setRouteRoomId(room.id);
      setRouteInfoPage(null);
      window.history.pushState({}, "", roomPath(room.id));
    };
    const handleCreateRoomError = (message: string) => {
      if (message === "ROOM_LANGUAGE_LEVEL_INVALID") {
        setCreateRoomError("Please select a valid primary language level.");
        return;
      }
      const errorKey = message === "ROOM_NAME_TOO_SHORT"
        ? "createRoomNameTooShort"
        : message === "ROOM_CAPACITY_INVALID"
          ? "roomCapacityInvalid"
          : message === "ROOM_PRIMARY_LANGUAGE_REQUIRED"
            ? "roomPrimaryLanguageRequired"
            : message === "ROOM_LANGUAGE_INVALID"
              ? "roomLanguageInvalid"
              : message === "ROOM_LANGUAGES_MUST_DIFFER"
                ? "roomLanguagesMustDiffer"
                : "createRoomVerifiedOnly";
      setCreateRoomError(translate(language, errorKey));
    };

    socket.on("room-created", handleRoomCreated);
    socket.on("create-room-error", handleCreateRoomError);
    return () => {
      socket.off("room-created", handleRoomCreated);
      socket.off("create-room-error", handleCreateRoomError);
    };
  }, [language, socket]);

  useEffect(() => {
    const handleAccessBlocked = ({ scope }: { scope: "room" | "global"; expiresAt: string | null }) => {
      setPendingJoin(null);
      setActiveRoom(null);
      setRouteRoomId(null);
      setRouteInfoPage(null);
      window.history.replaceState({}, "", homePath());
      setError(moderationTranslate(language, scope === "global" ? "globalBlocked" : "roomBlocked"));
    };
    socket.on("access-blocked", handleAccessBlocked);
    return () => { socket.off("access-blocked", handleAccessBlocked); };
  }, [language, socket]);

  useEffect(() => {
    const handleRoomRemoved = ({ roomId }: { roomId: string }) => {
      if (roomId !== routeRoomId) return;
      setActiveRoom(null);
      setPendingJoin(null);
      setRouteRoomId(null);
      window.history.replaceState({}, "", homePath());
      setError(translate(language, "roomExpired"));
    };

    socket.on("room-removed", handleRoomRemoved);
    return () => {
      socket.off("room-removed", handleRoomRemoved);
    };
  }, [language, routeRoomId, socket]);

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

  useEffect(() => {
    const handleRoomSessionReplaced = ({ roomId }: { roomId: string }) => {
      setActiveRoom(null);
      setPendingJoin(null);
      setRouteRoomId(roomId);
      setRouteInfoPage(null);
      window.history.replaceState({}, "", roomPath(roomId));
      setError(translate(language, "roomSessionReplaced"));
    };

    socket.on("room-session-replaced", handleRoomSessionReplaced);
    return () => {
      socket.off("room-session-replaced", handleRoomSessionReplaced);
    };
  }, [language, socket]);

  const handleJoin = (roomId: string) => {
    setError(null);
    setActiveRoom(null);
    setPendingJoin(null);
    if (!authenticatedNickname && (!nickname.trim() || isGeneratedNickname(nickname))) {
      setNickname("");
      localStorage.removeItem(NICKNAME_STORAGE_KEY);
      localStorage.removeItem(LEGACY_NICKNAME_STORAGE_KEY);
    }
    setRouteRoomId(roomId);
    setRouteInfoPage(null);
    window.history.pushState({}, "", roomPath(roomId));
  };

  const handleReadyAccess = () => {
    if (!routeRoomId) {
      return;
    }

    const suggestedNickname = `Talking User ${routeRoom?.suggestedGuestNumber ?? 1}`;
    const cleanNickname = authenticatedNickname || resolveGuestNickname(nickname, suggestedNickname);

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
    const cachedSession = readStoredSession();

    if (!token) {
      setIsAuthLoading(false);
      return;
    }

    let cancelled = false;
    setIsAuthLoading(true);

    getCurrentUser(token)
      .then((refreshedSession) => {
        if (!cancelled) {
          storeSession(refreshedSession);
          setAuthSession(refreshedSession);
          setAuthError(null);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          if (isInvalidAuthSessionError(loadError)) {
            clearStoredSession();
            setAuthSession(null);
            setAuthError(translate(language, "loadUserProfileFailed"));
          } else {
            setAuthSession((currentSession) => currentSession ?? cachedSession);
            if (!cachedSession) {
              setAuthError(
                loadError instanceof Error && loadError.message !== "LOAD_USER_PROFILE_FAILED"
                  ? loadError.message
                  : translate(language, "loadUserProfileFailed")
              );
            }
          }
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

  const openVerificationRequest = useCallback(() => setVerificationRequestOpen(true), []);

  const handleCreateRoom = (
    name: string,
    primaryLanguage: RoomLanguage,
    primaryLanguageLevel: RoomLanguageLevel,
    secondaryLanguage: RoomLanguage | null,
    capacity: number
  ) => {
    setCreateRoomError(null);
    socket.emit("create-room", { name, primaryLanguage, primaryLanguageLevel, secondaryLanguage, capacity, authToken: authSession?.token });
  };

  const handleLeave = () => {
    socket.emit("leave-room");
    setActiveRoom(null);
    setPendingJoin(null);
    setRouteRoomId(null);
    setRouteInfoPage(null);
    window.history.pushState({}, "", homePath());
  };

  const handleOpenInfoPage = (page: InfoPageName) => {
    setError(null);
    setRouteRoomId(null);
    setRouteInfoPage(page);
    window.history.pushState({}, "", infoPagePath(page));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCloseInfoPage = () => {
    setRouteInfoPage(null);
    window.history.pushState({}, "", homePath());
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      <><Seo language={language} page="room" roomName={selectedRoom.name} /><RoomPage
        socket={socket}
        room={selectedRoom}
        nickname={activeRoom.nickname}
        guestId={guestId}
        authToken={authSession?.token}
        avatarUrl={authSession?.user.avatarUrl ?? null}
        isConnected={isConnected}
        connectionError={connectionError}
        language={language}
        role={authSession?.user.role ?? "unverified"}
        onLeave={handleLeave}
        onOpenVerificationRequest={openVerificationRequest}
      /><VerificationRequestDialog open={verificationRequestOpen} token={authSession?.token} language={language} onClose={() => setVerificationRequestOpen(false)} onSubmitted={() => undefined} /></>
    );
  }

  if (routeRoomId && routeRoom) {
    return (
      <><Seo language={language} page="room" roomName={routeRoom.name} /><RoomAccessPage
        room={routeRoom}
        nickname={nickname}
        authenticatedNickname={authenticatedNickname}
        suggestedNickname={`Talking User ${routeRoom.suggestedGuestNumber}`}
        isConnected={isConnected}
        error={error ?? connectionError}
        language={language}
        onNicknameChange={handleNicknameChange}
        onReady={handleReadyAccess}
        onBack={handleLeave}
      /></>
    );
  }

  if (routeInfoPage) {
    return <><Seo language={language} page={routeInfoPage} /><InfoPage page={routeInfoPage} language={language} onBack={handleCloseInfoPage} /></>;
  }

  return (
    <><Seo language={language} page="home" /><HomePage
      rooms={rooms}
      isConnected={isConnected}
      error={error ?? connectionError}
      language={language}
      onLanguageChange={handleLanguageChange}
      user={authSession?.user ?? null}
      authToken={authSession?.token}
      authError={authError}
      isAuthLoading={isAuthLoading}
      isSigningIn={isSigningIn}
      onGoogleCredential={handleGoogleCredential}
      onSignOut={handleSignOut}
      onJoin={handleJoin}
      onCreateRoom={handleCreateRoom}
      createRoomError={createRoomError}
      onOpenInfoPage={handleOpenInfoPage}
      onOpenVerificationRequest={openVerificationRequest}
    /><VerificationRequestDialog open={verificationRequestOpen} token={authSession?.token} language={language} onClose={() => setVerificationRequestOpen(false)} onSubmitted={() => undefined} /></>
  );
}

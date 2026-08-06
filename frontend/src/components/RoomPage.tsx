import { Home, Languages, MessageSquare } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useChat } from "../hooks/useChat";
import { useLocalMedia } from "../hooks/useLocalMedia";
import { useScreenShare } from "../hooks/useScreenShare";
import { useWebRTC } from "../hooks/useWebRTC";
import { getFallbackAvatar } from "../lib/avatar";
import { type Language, translate } from "../lib/i18n";
import type { UserRole } from "../lib/auth";
import { hasPermission } from "../lib/permissions";
import type { AppSocket } from "../lib/socket";
import type { RoomSummary } from "../types/realtime";
import { ChatPanel } from "./ChatPanel";
import { Toolbar } from "./Toolbar";
import { VideoGrid } from "./VideoGrid";
import { RoomLanguageEditor } from "./RoomLanguageEditor";
import type { RoomLanguage, RoomLanguageLevel } from "../lib/roomLanguages";

type RoomPageProps = {
  socket: AppSocket;
  room: RoomSummary;
  nickname: string;
  avatarUrl: string | null;
  isConnected: boolean;
  connectionError: string | null;
  language: Language;
  role: UserRole;
  onLeave: () => void;
};

export function RoomPage({ socket, room, nickname, avatarUrl, isConnected, connectionError, language, role, onLeave }: RoomPageProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const [roomConnectionError, setRoomConnectionError] = useState<string | null>(null);
  const [mediaNotice, setMediaNotice] = useState<string | null>(null);
  const [screenShareBlocked, setScreenShareBlocked] = useState(false);
  const [canManageLanguages, setCanManageLanguages] = useState(false);
  const [languageEditorOpen, setLanguageEditorOpen] = useState(false);
  const [languageEditorError, setLanguageEditorError] = useState<string | null>(null);
  const canUseCamera = hasPermission(role, "use_camera");
  const { stream, error, micEnabled, cameraEnabled, hasMicrophone, hasCamera, toggleMic, toggleCamera } = useLocalMedia(canUseCamera);
  const {
    stream: screenStream,
    errorKey: screenShareErrorKey,
    isScreenSharing,
    canShareScreen,
    toggleScreenShare,
    stopScreenShare
  } = useScreenShare();
  const presentationStream = useMemo(() => {
    if (!isScreenSharing || !screenStream) {
      return stream;
    }

    return new MediaStream([
      ...(stream?.getAudioTracks() ?? []),
      ...screenStream.getAudioTracks(),
      ...(stream?.getVideoTracks() ?? []),
      ...screenStream.getVideoTracks()
    ]);
  }, [isScreenSharing, screenStream, stream]);
  const { users, remotePeers } = useWebRTC(socket, presentationStream);
  const { messages, sendMessage } = useChat(socket, true);
  const serverLocalUser = users.find((user) => user.socketId === socket.id);
  const screenShareOwner = users.find((user) => user.screenSharing);
  const screenTrackId = isScreenSharing ? screenStream?.getVideoTracks()[0]?.id ?? null : null;
  const screenShareSupported = canShareScreen && !screenShareBlocked;
  const canToggleScreenShare = !screenShareBlocked && (!screenShareOwner || screenShareOwner.socketId === socket.id);
  const hasJoinedRoom = users.some((user) => user.socketId === socket.id);
  const t = (key: Parameters<typeof translate>[1], values?: Parameters<typeof translate>[2]) => translate(language, key, values);
  const screenShareError = screenShareErrorKey ? t(screenShareErrorKey) : null;
  const handleToggleScreenShare = async () => {
    if (!canToggleScreenShare) {
      setMediaNotice(t("screenShareDenied"));
      return;
    }

    setMediaNotice(null);
    await toggleScreenShare();
  };

  useEffect(() => {
    const handlePermission = ({ roomId, canManage }: { roomId: string; canManage: boolean }) => {
      if (roomId !== room.id) return;
      setCanManageLanguages(canManage);
      if (!canManage) setLanguageEditorOpen(false);
    };
    const handleLanguagesUpdated = (updatedRoom: RoomSummary) => {
      if (updatedRoom.id !== room.id) return;
      setLanguageEditorError(null);
      setLanguageEditorOpen(false);
      setMediaNotice(translate(language, "roomLanguagesUpdated"));
    };
    const handleLanguageError = (message: string) => {
      if (message === "ROOM_LANGUAGE_LEVEL_INVALID") {
        setLanguageEditorError("Please select a valid primary language level.");
        return;
      }
      const errorKey = message === "ROOM_PRIMARY_LANGUAGE_REQUIRED"
        ? "roomPrimaryLanguageRequired"
        : message === "ROOM_LANGUAGE_INVALID"
          ? "roomLanguageInvalid"
          : message === "ROOM_LANGUAGES_MUST_DIFFER"
            ? "roomLanguagesMustDiffer"
            : "roomLanguagePermissionDenied";
      setLanguageEditorError(translate(language, errorKey));
    };

    setCanManageLanguages(false);
    socket.on("room-language-permission", handlePermission);
    socket.on("room-languages-updated", handleLanguagesUpdated);
    socket.on("room-language-error", handleLanguageError);
    socket.emit("request-room-language-permission", { roomId: room.id });

    return () => {
      socket.off("room-language-permission", handlePermission);
      socket.off("room-languages-updated", handleLanguagesUpdated);
      socket.off("room-language-error", handleLanguageError);
    };
  }, [language, room.id, socket]);

  useEffect(() => {
    const handleCameraDenied = () => {
      setMediaNotice(t("cameraSupporterOnly"));
    };

    socket.on("camera-denied", handleCameraDenied);
    return () => {
      socket.off("camera-denied", handleCameraDenied);
    };
  }, [socket, t]);

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyHeight = document.body.style.height;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.height = "100dvh";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.height = previousBodyHeight;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, []);

  useEffect(() => {
    socket.emit("media-status", { micEnabled, cameraEnabled, screenSharing: isScreenSharing, screenTrackId });
  }, [cameraEnabled, isScreenSharing, micEnabled, screenTrackId, socket]);

  useEffect(() => {
    const handleScreenShareDenied = () => {
      stopScreenShare();
      setMediaNotice(t("screenShareDenied"));
    };

    socket.on("screen-share-denied", handleScreenShareDenied);

    return () => {
      socket.off("screen-share-denied", handleScreenShareDenied);
    };
  }, [socket, stopScreenShare, t]);

  useEffect(() => {
    if (screenShareError) {
      setMediaNotice(screenShareError);
    }
  }, [screenShareError]);

  useEffect(() => {
    if (screenShareErrorKey === "screenShareUnavailable") {
      setScreenShareBlocked(true);
    }
  }, [screenShareErrorKey]);

  useEffect(() => {
    if (!mediaNotice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setMediaNotice(null);
    }, 3500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [mediaNotice]);

  useEffect(() => {
    if (!isConnected) {
      setRoomConnectionError(connectionError ?? t("roomConnectionLost"));
      return;
    }

    if (hasJoinedRoom) {
      setRoomConnectionError(null);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRoomConnectionError(t("roomJoinTimeout"));
    }, 7000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [connectionError, hasJoinedRoom, isConnected, t]);

  const localUser = useMemo(
    () => ({
      nickname,
      avatar: serverLocalUser?.avatar ?? avatarUrl ?? getFallbackAvatar(nickname),
      micEnabled,
      cameraEnabled,
      screenSharing: isScreenSharing,
      screenTrackId
    }),
    [avatarUrl, cameraEnabled, isScreenSharing, micEnabled, nickname, screenTrackId, serverLocalUser?.avatar]
  );

  return (
    <main className="fixed inset-0 flex h-[100dvh] max-h-[100dvh] overflow-hidden bg-ink text-white">
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-3 sm:h-16 sm:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold sm:text-lg">{room.name}</h1>
            <p className="text-xs text-white/50 sm:text-sm">{t("speakers", { count: remotePeers.length + 1 })}</p>
          </div>
          <div className="flex items-center gap-2">
            {canManageLanguages ? (
              <button
                type="button"
                title={t("editRoomLanguages")}
                aria-label={t("editRoomLanguages")}
                onClick={() => { setLanguageEditorError(null); setLanguageEditorOpen(true); }}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-mint/25 bg-mint/10 px-2.5 text-mint transition hover:bg-mint/15 sm:px-3"
              >
                <Languages size={18} />
                <span className="hidden text-sm font-medium sm:inline">{t("editRoomLanguages")}</span>
              </button>
            ) : null}
            <button
              aria-label="Open chat"
              title="Open chat"
              type="button"
              onClick={() => setChatOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-md border border-white/10 bg-white/5 text-white/80 lg:hidden"
            >
              <MessageSquare size={19} />
            </button>
          </div>
        </header>

        <div className="relative min-h-0 flex-1 overflow-hidden p-2 sm:p-4">
          {error || mediaNotice ? (
            <div className="absolute inset-x-2 top-2 z-20 rounded-md border border-coral/40 bg-coral/20 px-3 py-2 text-xs text-coral shadow-lg shadow-black/20 backdrop-blur sm:inset-x-4 sm:top-4 sm:text-sm">
              {error ?? mediaNotice}
            </div>
          ) : null}
          <VideoGrid localStream={presentationStream} localCameraStream={stream} localUser={localUser} language={language} remotePeers={remotePeers} />
        </div>

        <Toolbar
          micEnabled={micEnabled}
          cameraEnabled={cameraEnabled}
          canToggleMic={hasMicrophone}
          canToggleCamera={canUseCamera && hasCamera}
          cameraRestricted={!canUseCamera}
          language={language}
          onToggleMic={toggleMic}
          onToggleCamera={toggleCamera}
          onLeave={onLeave}
        />
      </section>

      <ChatPanel messages={messages} open={chatOpen} language={language} onClose={() => setChatOpen(false)} onSend={sendMessage} />

      {languageEditorOpen && canManageLanguages ? (
        <RoomLanguageEditor
          language={language}
          primaryLanguage={room.primaryLanguage}
          primaryLanguageLevel={room.primaryLanguageLevel}
          secondaryLanguage={room.secondaryLanguage}
          error={languageEditorError}
          onClose={() => { setLanguageEditorOpen(false); setLanguageEditorError(null); }}
          onSave={(primaryLanguage: RoomLanguage, primaryLanguageLevel: RoomLanguageLevel, secondaryLanguage: RoomLanguage | null) => {
            setLanguageEditorError(null);
            socket.emit("update-room-languages", { roomId: room.id, primaryLanguage, primaryLanguageLevel, secondaryLanguage });
          }}
        />
      ) : null}

      {roomConnectionError ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-coral/40 bg-panel p-5 shadow-2xl shadow-black/40">
            <h2 className="text-lg font-semibold text-white">{t("roomConnectionFailed")}</h2>
            <p className="mt-2 text-sm leading-6 text-white/70">{roomConnectionError}</p>
            <button
              type="button"
              onClick={onLeave}
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-md bg-mint px-4 text-sm font-semibold text-ink transition hover:bg-mint/90"
            >
              <Home size={18} />
              {t("backToRooms")}
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

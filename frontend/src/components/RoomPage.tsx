import { AlertTriangle, CheckCircle2, Home, Languages, MessageSquare, Palette, ShieldAlert, X, Youtube } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { RoomModerationPanel } from "./RoomModerationPanel";
import { moderationTranslate } from "../lib/moderationI18n";
import type { ReportReason, RoomYouTubeVideo, YouTubeRecommendation } from "../types/realtime";
import { RoomTopicEditor, RoomTopicSlide } from "./RoomTopic";
import { roomTopicTranslate } from "../lib/roomTopicI18n";
import { YouTubeVideoDock, YouTubeVideoStage } from "./RoomYouTube";
import { YouTubeSettings } from "./RoomYouTubeSettings";
import { youtubeTranslate } from "../lib/youtubeI18n";
import { ThemeToggle } from "./ThemeToggle";

type RoomPageProps = {
  socket: AppSocket;
  room: RoomSummary;
  nickname: string;
  guestId: string;
  authToken?: string;
  avatarUrl: string | null;
  isConnected: boolean;
  connectionError: string | null;
  language: Language;
  role: UserRole;
  onLeave: () => void;
  onOpenVerificationRequest: () => void;
};

function getYouTubeErrorMessage(language: Language, error: string) {
  if (error === "ROOM_YOUTUBE_PERMISSION_DENIED") return youtubeTranslate(language, "denied");
  if (error === "ROOM_YOUTUBE_URL_INVALID") return youtubeTranslate(language, "invalid");
  if (error === "ROOM_YOUTUBE_EMBEDDING_DISABLED") return youtubeTranslate(language, "embeddingDisabled");
  if (error === "ROOM_YOUTUBE_VIDEO_UNAVAILABLE") return youtubeTranslate(language, "videoUnavailable");
  return youtubeTranslate(language, "failed");
}

export function RoomPage({ socket, room, nickname, guestId, authToken, avatarUrl, isConnected, connectionError, language, role, onLeave, onOpenVerificationRequest }: RoomPageProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const [roomConnectionError, setRoomConnectionError] = useState<string | null>(null);
  const [mediaNotice, setMediaNotice] = useState<string | null>(null);
  const [mediaDeviceToast, setMediaDeviceToast] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [favoritedUserIds, setFavoritedUserIds] = useState<Set<string>>(() => new Set());
  const pendingFavoriteUserIds = useRef(new Set<string>());
  const [screenShareBlocked, setScreenShareBlocked] = useState(false);
  const [canManageLanguages, setCanManageLanguages] = useState(false);
  const [languageEditorOpen, setLanguageEditorOpen] = useState(false);
  const [languageEditorError, setLanguageEditorError] = useState<string | null>(null);
  const [moderationOpen, setModerationOpen] = useState(false);
  const [canBlockUsers, setCanBlockUsers] = useState(false);
  const [currentTopic, setCurrentTopic] = useState(room.topic);
  const [canManageTopic, setCanManageTopic] = useState(false);
  const [topicEditorOpen, setTopicEditorOpen] = useState(false);
  const [topicEditorError, setTopicEditorError] = useState<string | null>(null);
  const [topicSaving, setTopicSaving] = useState(false);
  const canEditTopic = canManageTopic || canManageLanguages;
  const [youtubeVideo, setYoutubeVideo] = useState<RoomYouTubeVideo | null>(() => room.youtubeVideo ? { ...room.youtubeVideo, updatedAt: Date.now() } : null);
  const [canManageYoutube, setCanManageYoutube] = useState(false);
  const [youtubeSettingsOpen, setYoutubeSettingsOpen] = useState(false);
  const [youtubeSettingsError, setYoutubeSettingsError] = useState<string | null>(null);
  const [youtubeSaving, setYoutubeSaving] = useState(false);
  const [youtubeOnStage, setYoutubeOnStage] = useState(() => Boolean(room.youtubeVideo));
  const [youtubeRecommendations, setYoutubeRecommendations] = useState<YouTubeRecommendation[]>([]);
  const [youtubeRecommendationsLoading, setYoutubeRecommendationsLoading] = useState(false);
  const [youtubeRecommendationsError, setYoutubeRecommendationsError] = useState<string | null>(null);
  const canEditYoutube = canManageYoutube || canManageLanguages;
  const canUseCamera = hasPermission(role, "use_camera");
  const { stream, error: localMediaError, micEnabled, cameraEnabled, hasMicrophone, hasCamera, toggleMic, toggleCamera } = useLocalMedia(canUseCamera);
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
  const { messages, typingNames, sendMessage } = useChat(socket, true);
  const serverLocalUser = users.find((user) => user.socketId === socket.id);
  const screenShareOwner = users.find((user) => user.screenSharing);
  const screenTrackId = isScreenSharing ? screenStream?.getVideoTracks()[0]?.id ?? null : null;
  const screenShareSupported = canShareScreen && !screenShareBlocked;
  const canToggleScreenShare = !screenShareBlocked && (!screenShareOwner || screenShareOwner.socketId === socket.id);
  const hasJoinedRoom = users.some((user) => user.socketId === socket.id);
  const roomUserSignature = users.map((user) => user.socketId).sort().join("|");
  const t = (key: Parameters<typeof translate>[1], values?: Parameters<typeof translate>[2]) => translate(language, key, values);
  const screenShareError = screenShareErrorKey ? t(screenShareErrorKey) : null;

  useEffect(() => {
    if (!authToken || !hasPermission(role, "favorite_user") || !hasJoinedRoom) return;
    let cancelled = false;
    socket.emit("request-room-favorites", (result) => {
      if (!cancelled && result.ok) setFavoritedUserIds(new Set(result.targetSocketIds));
    });
    return () => { cancelled = true; };
  }, [authToken, hasJoinedRoom, role, roomUserSignature, socket]);

  const handleToggleFavorite = useCallback((targetSocketId: string) => {
    if (!authToken) {
      setMediaNotice(t("favoriteAuthRequired"));
      return;
    }
    if (!hasPermission(role, "favorite_user")) {
      setMediaNotice(t("favoritePermissionDenied"));
      return;
    }
    if (pendingFavoriteUserIds.current.has(targetSocketId)) return;
    const targetName = users.find((user) => user.socketId === targetSocketId)?.nickname ?? "";
    pendingFavoriteUserIds.current.add(targetSocketId);
    const releasePending = window.setTimeout(() => pendingFavoriteUserIds.current.delete(targetSocketId), 8_000);
    socket.emit("toggle-favorite-user", { targetSocketId }, (result) => {
      window.clearTimeout(releasePending);
      pendingFavoriteUserIds.current.delete(targetSocketId);
      if (!result.ok) {
        setMediaNotice(result.error === "AUTH_REQUIRED" ? t("favoriteAuthRequired") : result.error === "FAVORITE_PERMISSION_DENIED" ? t("favoritePermissionDenied") : t("favoriteFailed"));
        return;
      }
      setFavoritedUserIds((current) => {
        const next = new Set(current);
        if (result.favorited) next.add(targetSocketId);
        else next.delete(targetSocketId);
        return next;
      });
      setSuccessNotice(t(result.favorited ? "favoriteAdded" : "favoriteRemoved", { name: targetName }));
    });
  }, [authToken, role, socket, t, users]);

  useEffect(() => {
    if (!isConnected) return;
    socket.emit("join-room", { roomId: room.id, nickname, guestId, authToken });
  }, [authToken, guestId, isConnected, nickname, room.id, socket]);
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
      if (message === "ROOM_LANGUAGE_PERMISSION_DENIED" && role === "unverified") setMediaNotice(translate(language, "roomLanguagePermissionDenied"));
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
  }, [language, role, room.id, socket]);

  useEffect(() => setYoutubeVideo(room.youtubeVideo ? { ...room.youtubeVideo, updatedAt: Date.now() } : null), [room.youtubeVideo]);

  useEffect(() => {
    const handlePermission = ({ roomId, canManage }: { roomId: string; canManage: boolean }) => {
      if (roomId !== room.id) return;
      setCanManageYoutube(canManage);
      if (!canManage) setYoutubeSettingsOpen(false);
    };
    const handleUpdated = ({ roomId, video, reason }: { roomId: string; video: RoomYouTubeVideo | null; reason: "shared" | "removed" | "playback" }) => {
      if (roomId !== room.id) return;
      setYoutubeVideo(video ? { ...video, updatedAt: Date.now() } : null);
      if (!video) setYoutubeOnStage(false);
      else if (reason === "shared") setYoutubeOnStage(true);
      if (reason !== "playback" && canEditYoutube) {
        setYoutubeSaving(false);
        setYoutubeSettingsOpen(false);
        setYoutubeSettingsError(null);
        setMediaNotice(null);
        setSuccessNotice(youtubeTranslate(language, reason === "shared" ? "shared" : "removed"));
      }
    };
    const handleError = (message: string) => {
      setYoutubeSaving(false);
      setYoutubeSettingsError(getYouTubeErrorMessage(language, message));
      if (message === "ROOM_YOUTUBE_PERMISSION_DENIED" && role === "unverified") setMediaNotice(translate(language, "roomLanguagePermissionDenied"));
    };
    socket.on("room-youtube-permission", handlePermission);
    socket.on("room-youtube-updated", handleUpdated);
    socket.on("room-youtube-error", handleError);
    socket.emit("request-room-youtube-permission", { roomId: room.id });
    return () => {
      socket.off("room-youtube-permission", handlePermission);
      socket.off("room-youtube-updated", handleUpdated);
      socket.off("room-youtube-error", handleError);
    };
  }, [canEditYoutube, language, role, room.id, socket]);

  useEffect(() => {
    if (!youtubeSaving) return;
    const timeoutId = window.setTimeout(() => { setYoutubeSaving(false); setYoutubeSettingsError(youtubeTranslate(language, "failed")); }, 7000);
    return () => window.clearTimeout(timeoutId);
  }, [language, youtubeSaving]);

  const handleOwnerYouTubePlayback = useCallback((playback: "playing" | "paused", positionSeconds: number) => {
    socket.emit("update-room-youtube-playback", { roomId: room.id, playback, positionSeconds });
  }, [room.id, socket]);

  const handleViewerYouTubePlayback = useCallback((playback: "playing" | "paused") => {
    socket.emit("set-room-youtube-playback", { roomId: room.id, playback });
  }, [room.id, socket]);

  const openYoutubeSettings = useCallback(() => {
    setYoutubeSettingsError(null);
    setYoutubeRecommendations([]);
    setYoutubeRecommendationsError(null);
    setYoutubeRecommendationsLoading(true);
    setYoutubeSettingsOpen(true);

    let completed = false;
    const timeoutId = window.setTimeout(() => {
      if (completed) return;
      completed = true;
      setYoutubeRecommendationsLoading(false);
      setYoutubeRecommendationsError("YOUTUBE_RECOMMENDATIONS_UNAVAILABLE");
    }, 8_000);
    socket.emit("request-room-youtube-recommendations", { roomId: room.id }, (result) => {
      if (completed) return;
      completed = true;
      window.clearTimeout(timeoutId);
      setYoutubeRecommendationsLoading(false);
      if (!result.ok) {
        setYoutubeRecommendationsError(result.error);
        return;
      }
      setYoutubeRecommendations(result.videos);
      setYoutubeRecommendationsError(result.videos.length === 0 ? "YOUTUBE_RECOMMENDATIONS_UNAVAILABLE" : null);
    });
  }, [room.id, socket]);

  useEffect(() => setCurrentTopic(room.topic), [room.topic]);

  useEffect(() => {
    const handlePermission = ({ roomId, canManage }: { roomId: string; canManage: boolean }) => {
      if (roomId !== room.id) return;
      setCanManageTopic(canManage);
      if (!canManage) setTopicEditorOpen(false);
    };
    const handleUpdated = ({ roomId, topic }: { roomId: string; topic: RoomSummary["topic"] }) => {
      if (roomId !== room.id) return;
      setCurrentTopic(topic);
      setTopicEditorError(null);
      setTopicSaving(false);
      setTopicEditorOpen(false);
      setMediaNotice(null);
      setSuccessNotice(roomTopicTranslate(language, "updated"));
    };
    const handleError = (message: string) => {
      setTopicSaving(false);
      setTopicEditorError(roomTopicTranslate(language, message === "ROOM_TOPIC_PERMISSION_DENIED" ? "denied" : "invalid"));
      if (message === "ROOM_TOPIC_PERMISSION_DENIED" && role === "unverified") setMediaNotice(translate(language, "roomLanguagePermissionDenied"));
    };
    socket.on("room-topic-permission", handlePermission);
    socket.on("room-topic-updated", handleUpdated);
    socket.on("room-topic-error", handleError);
    socket.emit("request-room-topic-permission", { roomId: room.id });
    return () => {
      socket.off("room-topic-permission", handlePermission);
      socket.off("room-topic-updated", handleUpdated);
      socket.off("room-topic-error", handleError);
    };
  }, [language, role, room.id, socket]);

  useEffect(() => {
    if (!topicSaving) return;
    const timeoutId = window.setTimeout(() => {
      setTopicSaving(false);
      setTopicEditorError(roomTopicTranslate(language, "unavailable"));
    }, 7000);
    return () => window.clearTimeout(timeoutId);
  }, [language, topicSaving]);

  useEffect(() => {
    const handlePermission = ({ roomId, canBlock }: { roomId: string; canBlock: boolean }) => {
      if (roomId === room.id) setCanBlockUsers(canBlock);
    };
    const handleSuccess = ({ action }: { action: "block" | "report" }) => {
      setMediaNotice(moderationTranslate(language, action === "block" ? "userBlocked" : "reportSent"));
    };
    const handleError = () => setMediaNotice(moderationTranslate(language, "moderationFailed"));
    socket.on("room-moderation-permission", handlePermission);
    socket.on("moderation-success", handleSuccess);
    socket.on("moderation-error", handleError);
    socket.emit("request-room-moderation-permission", { roomId: room.id });
    return () => {
      socket.off("room-moderation-permission", handlePermission);
      socket.off("moderation-success", handleSuccess);
      socket.off("moderation-error", handleError);
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
    if (!successNotice) return;
    const timeoutId = window.setTimeout(() => setSuccessNotice(null), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [successNotice]);

  useEffect(() => {
    if (!localMediaError) return;
    setMediaDeviceToast(localMediaError.message);
    const timeoutId = window.setTimeout(() => setMediaDeviceToast(null), 30_000);
    return () => window.clearTimeout(timeoutId);
  }, [localMediaError]);

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
      role,
      micEnabled,
      cameraEnabled,
      screenSharing: isScreenSharing,
      screenTrackId
    }),
    [avatarUrl, cameraEnabled, isScreenSharing, micEnabled, nickname, role, screenTrackId, serverLocalUser?.avatar]
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
            <ThemeToggle language={language} compact />
            {canEditYoutube ? (
              <button type="button" title={youtubeTranslate(language, "manage")} aria-label={youtubeTranslate(language, "manage")} onClick={openYoutubeSettings} className="room-youtube-action inline-flex h-9 items-center gap-2 rounded-md border border-red-400/25 bg-red-500/10 px-2.5 text-red-300 transition hover:bg-red-500/15 sm:px-3">
                <Youtube size={19}/><span className="hidden text-sm font-medium lg:inline">{youtubeTranslate(language, "share")}</span>
              </button>
            ) : null}
            {canEditTopic ? (
              <button
                type="button"
                title={roomTopicTranslate(language, "edit")}
                aria-label={roomTopicTranslate(language, "edit")}
                onClick={() => { setTopicEditorError(null); setTopicEditorOpen(true); }}
                className="room-topic-action inline-flex h-9 items-center gap-2 rounded-md border border-violet-300/20 bg-violet-400/10 px-2.5 text-violet-200 transition hover:bg-violet-400/15 sm:px-3"
              >
                <Palette size={18}/><span className="hidden text-sm font-medium md:inline">{roomTopicTranslate(language, "edit")}</span>
              </button>
            ) : null}
            <button
              type="button"
              title={moderationTranslate(language, "safety")}
              aria-label={moderationTranslate(language, "safety")}
              onClick={() => setModerationOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2.5 text-white/75 transition hover:bg-white/10 hover:text-white sm:px-3"
            >
              <ShieldAlert size={18} />
              <span className="hidden text-sm font-medium sm:inline">{moderationTranslate(language, "safety")}</span>
            </button>
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

        <div className="relative flex min-h-0 flex-1 flex-col overflow-visible p-2 sm:p-4">
          {mediaNotice || successNotice ? (
            <div
              role="status"
              aria-live="polite"
              className={`absolute left-2 top-2 z-20 flex w-[calc(100%-1rem)] max-w-sm items-start gap-2 rounded-lg border bg-panel/95 px-3 py-2 text-xs shadow-xl shadow-black/30 backdrop-blur sm:left-4 sm:top-4 sm:text-sm ${mediaNotice ? "border-coral/40 text-coral" : "border-mint/40 text-mint"}`}
            >
              {mediaNotice ? <AlertTriangle className="mt-0.5 shrink-0" size={16} /> : <CheckCircle2 className="mt-0.5 shrink-0" size={16} />}
              <span className="min-w-0 flex-1 leading-5">{mediaNotice ?? successNotice}</span>
              {mediaNotice && role === "unverified" ? <button type="button" onClick={onOpenVerificationRequest} className="shrink-0 text-xs font-semibold underline underline-offset-2">{t("requestVerification")}</button> : null}
            </div>
          ) : null}
          <div className="min-h-0 flex-1">
            <VideoGrid
              localStream={presentationStream}
              localCameraStream={stream}
              localUser={localUser}
              language={language}
              remotePeers={remotePeers}
              favoritedIds={favoritedUserIds}
              onToggleFavorite={handleToggleFavorite}
              stageContent={youtubeOnStage && youtubeVideo
                ? <YouTubeVideoStage key={youtubeVideo.videoId} video={youtubeVideo} canManage={canEditYoutube} language={language} onClose={() => setYoutubeOnStage(false)} onOwnerPlayback={handleOwnerYouTubePlayback} onViewerPlayback={handleViewerYouTubePlayback}/>
                : currentTopic ? <RoomTopicSlide topic={currentTopic} language={language} fill/> : undefined}
            />
          </div>
          {youtubeVideo && !youtubeOnStage ? <div className="absolute bottom-4 right-4 z-10"><YouTubeVideoDock videoId={youtubeVideo.videoId} language={language} onClick={() => setYoutubeOnStage(true)}/></div> : null}
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
          onOpenVerificationRequest={onOpenVerificationRequest}
          canRequestVerification={role === "unverified"}
        />
      </section>

      {mediaDeviceToast ? (
        <div role="alert" aria-live="polite" className="fixed left-3 top-16 z-50 flex w-[calc(100%-1.5rem)] max-w-sm items-start gap-3 rounded-lg border border-amber-300/30 bg-[#201a0d]/95 px-4 py-3 text-sm text-amber-100 shadow-2xl shadow-black/40 backdrop-blur sm:left-5 sm:top-20">
          <AlertTriangle className="mt-0.5 shrink-0 text-amber-300" size={18}/>
          <p className="min-w-0 flex-1 leading-5">{mediaDeviceToast}</p>
          <button type="button" onClick={() => setMediaDeviceToast(null)} aria-label="Close" className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-amber-100/60 hover:bg-white/10 hover:text-amber-100">
            <X size={16}/>
          </button>
        </div>
      ) : null}

      <ChatPanel messages={messages} typingNames={typingNames} currentSocketId={socket.id} open={chatOpen} language={language} onClose={() => setChatOpen(false)} onSend={sendMessage} />

      <RoomModerationPanel
        users={users}
        currentSocketId={socket.id ?? ""}
        canBlock={canBlockUsers}
        language={language}
        open={moderationOpen}
        onClose={() => setModerationOpen(false)}
        onReport={(targetSocketId: string, reason: ReportReason, details: string) => socket.emit("report-user", { targetSocketId, reason, details })}
        onBlock={(targetSocketId: string) => socket.emit("block-room-user", { targetSocketId })}
      />

      {topicEditorOpen && canEditTopic ? (
        <RoomTopicEditor
          topic={currentTopic}
          language={language}
          error={topicEditorError}
          saving={topicSaving}
          onClose={() => { setTopicEditorOpen(false); setTopicEditorError(null); }}
          onSave={(topic) => {
            setTopicEditorError(null);
            setTopicSaving(true);
            socket.emit("update-room-topic", { roomId: room.id, topic }, (result) => {
              if (result.ok) return;
              setTopicSaving(false);
              setTopicEditorError(roomTopicTranslate(language, result.error === "ROOM_TOPIC_PERMISSION_DENIED" ? "denied" : "invalid"));
            });
          }}
        />
      ) : null}

      {youtubeSettingsOpen && canEditYoutube ? (
        <YouTubeSettings
          currentVideo={youtubeVideo}
          recommendations={youtubeRecommendations}
          recommendationsLoading={youtubeRecommendationsLoading}
          recommendationsError={youtubeRecommendationsError}
          language={language}
          error={youtubeSettingsError}
          saving={youtubeSaving}
          onClose={() => { setYoutubeSettingsOpen(false); setYoutubeSettingsError(null); }}
          onShare={(url) => {
            setYoutubeSettingsError(null); setYoutubeSaving(true);
            socket.emit("share-room-youtube", { roomId: room.id, url }, (result) => { if (!result.ok) { setYoutubeSaving(false); setYoutubeSettingsError(getYouTubeErrorMessage(language, result.error)); } });
          }}
          onRemove={() => {
            setYoutubeSettingsError(null); setYoutubeSaving(true);
            socket.emit("remove-room-youtube", { roomId: room.id }, (result) => { if (!result.ok) { setYoutubeSaving(false); setYoutubeSettingsError(youtubeTranslate(language, result.error === "ROOM_YOUTUBE_PERMISSION_DENIED" ? "denied" : "failed")); } });
          }}
        />
      ) : null}

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

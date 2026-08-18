import { Heart, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { UserRole } from "../lib/auth";
import { useSpeaking } from "../hooks/useSpeaking";
import { type Language, translate } from "../lib/i18n";
import { AvatarBadge } from "./AvatarBadge";

type VideoTileProps = {
  stream: MediaStream | null;
  nickname: string;
  avatar: string;
  micEnabled: boolean;
  cameraEnabled: boolean;
  screenSharing?: boolean;
  language: Language;
  muted?: boolean;
  compact?: boolean;
  selected?: boolean;
  onClick?: () => void;
  favoriteEnabled?: boolean;
  favorited?: boolean;
  onToggleFavorite?: () => void;
  profileRole?: UserRole;
  senderType?: "human" | "virtual_user" | "presence_bot";
  showProfile?: boolean;
};

export function VideoTile({
  stream,
  nickname,
  avatar,
  micEnabled,
  cameraEnabled,
  screenSharing = false,
  language,
  muted = false,
  compact = false,
  selected = false,
  onClick,
  favoriteEnabled = false,
  favorited = false,
  onToggleFavorite,
  profileRole = "unverified",
  senderType = "human",
  showProfile = false,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { isSpeaking, level } = useSpeaking(stream, micEnabled);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profilePositionReady, setProfilePositionReady] = useState(false);
  const [profilePosition, setProfilePosition] = useState({ left: 0, top: 0 });
  const profileId = useId();
  const profileAnchorRef = useRef<HTMLDivElement | null>(null);
  const profileCardRef = useRef<HTMLDivElement | null>(null);
  const profileCloseTimerRef = useRef<number | null>(null);
  const hasLiveVideo = stream?.getVideoTracks().some((track) => track.readyState === "live") ?? false;
  const showVideo = Boolean(stream && cameraEnabled && hasLiveVideo);

  useEffect(() => {
    if (videoRef.current && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
    }
    if (audioRef.current && audioRef.current.srcObject !== stream) {
      audioRef.current.srcObject = stream;
    }
  }, [showVideo, stream]);

  const barLevels = [0.45, 0.75, 1];
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const roleKey = profileRole === "supporter" ? "roleSupporter" : profileRole === "verified" ? "roleVerified" : "roleUnverified";
  const roleLabel = senderType === "virtual_user"
    ? { en: "Virtual User", vi: "Người dùng ảo", zh: "虚拟用户", ja: "バーチャルユーザー" }[language]
    : t(roleKey);
  const screenShareMediaFrame = compact ? "absolute inset-x-0 top-0 bottom-8" : "absolute inset-x-0 top-0 bottom-10";
  const openProfile = () => {
    if (profileCloseTimerRef.current !== null) window.clearTimeout(profileCloseTimerRef.current);
    setProfileOpen(true);
  };
  const closeProfile = () => {
    if (profileCloseTimerRef.current !== null) window.clearTimeout(profileCloseTimerRef.current);
    profileCloseTimerRef.current = window.setTimeout(() => {
      setProfileOpen(false);
      setProfilePositionReady(false);
    }, 120);
  };
  const profileCard = <div id={profileId} ref={profileCardRef} role="dialog" aria-label={nickname} onMouseEnter={openProfile} onMouseLeave={closeProfile} onFocus={openProfile} onBlur={closeProfile} style={{ left: profilePosition.left, top: profilePosition.top, maxHeight: "calc(100dvh - 16px)" }} className={`pointer-events-auto fixed z-[9999] w-[min(14rem,calc(100vw-1rem))] overflow-y-auto rounded-xl border border-white/15 bg-panel/95 p-3 text-left shadow-2xl shadow-black/40 backdrop-blur-md transition-opacity duration-150 ${showProfile && profileOpen && profilePositionReady ? "visible opacity-100" : "invisible opacity-0"}`}>
    <div className="flex items-center gap-2"><AvatarBadge avatar={avatar} size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{nickname}</p><p className="text-xs text-white/55">{roleLabel}</p></div></div>
    <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px] text-white/65"><span className="rounded-md bg-white/5 px-2 py-1">{micEnabled ? <Mic size={13} className="mr-1 inline text-mint"/> : <MicOff size={13} className="mr-1 inline text-white/45"/>}{t(micEnabled ? "micUnmute" : "micMute")}</span><span className="rounded-md bg-white/5 px-2 py-1">{cameraEnabled ? <Video size={13} className="mr-1 inline text-mint"/> : <VideoOff size={13} className="mr-1 inline text-white/45"/>}{t(cameraEnabled ? "videoOn" : "videoOff")}</span></div>
    {favoriteEnabled && onToggleFavorite ? <button type="button" title={t(favorited ? "unfavoriteUser" : "favoriteUser")} aria-pressed={favorited} onClick={(event) => { event.stopPropagation(); onToggleFavorite(); }} onKeyDown={(event) => event.stopPropagation()} className={`mt-3 flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/60 ${favorited ? "border-rose-300/70 bg-rose-500/25 text-rose-100 hover:bg-rose-500/35" : "border-white/15 bg-white/5 text-white/75 hover:border-rose-300/60 hover:bg-rose-500/20 hover:text-rose-100"}`}><Heart size={15} fill={favorited ? "currentColor" : "none"}/><span>{t(favorited ? "unfavoriteUser" : "favoriteUser")}</span></button> : null}
  </div>;
  useLayoutEffect(() => {
    if (!profileOpen || !profileCardRef.current) return;
    const updatePosition = () => {
      const card = profileCardRef.current?.getBoundingClientRect();
      const anchor = profileAnchorRef.current?.getBoundingClientRect();
      if (!card || !anchor) return;
      const viewport = window.visualViewport;
      const viewportLeft = viewport?.offsetLeft ?? 0;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportWidth = viewport?.width ?? window.innerWidth;
      const viewportHeight = viewport?.height ?? window.innerHeight;
      const viewportRight = viewportLeft + viewportWidth;
      const viewportBottom = viewportTop + viewportHeight;
      const padding = 8;
      const gap = 10;
      const maxLeft = Math.max(viewportLeft + padding, viewportRight - card.width - padding);
      const left = Math.min(Math.max(anchor.left + anchor.width / 2 - card.width / 2, viewportLeft + padding), maxLeft);
      const fitsAbove = anchor.top - card.height - gap >= viewportTop + padding;
      const fitsBelow = anchor.bottom + card.height + gap <= viewportBottom - padding;
      const spaceAbove = anchor.top - viewportTop;
      const spaceBelow = viewportBottom - anchor.bottom;
      const preferredTop = fitsAbove || (!fitsBelow && spaceAbove >= spaceBelow)
        ? anchor.top - card.height - gap
        : anchor.bottom + gap;
      const maxTop = Math.max(viewportTop + padding, viewportBottom - card.height - padding);
      const top = Math.min(Math.max(preferredTop, viewportTop + padding), maxTop);
      setProfilePosition({ left, top });
      setProfilePositionReady(true);
    };
    updatePosition();
    const resizeObserver = new ResizeObserver(updatePosition);
    if (profileAnchorRef.current) resizeObserver.observe(profileAnchorRef.current);
    resizeObserver.observe(profileCardRef.current);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.visualViewport?.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("scroll", updatePosition);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.visualViewport?.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("scroll", updatePosition);
    };
  }, [profileOpen]);
  useEffect(() => () => { if (profileCloseTimerRef.current !== null) window.clearTimeout(profileCloseTimerRef.current); }, []);

  return (
    <div
      ref={profileAnchorRef}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-pressed={onClick ? selected : undefined}
      aria-label={onClick ? `Focus ${nickname}` : undefined}
      aria-controls={showProfile ? profileId : undefined}
      aria-expanded={showProfile ? profileOpen : undefined}
      aria-haspopup={showProfile ? "dialog" : undefined}
      onClick={onClick}
      onMouseEnter={showProfile ? openProfile : undefined}
      onMouseLeave={showProfile ? closeProfile : undefined}
      onFocus={showProfile ? openProfile : undefined}
      onBlur={showProfile ? closeProfile : undefined}
      onKeyDown={(event) => {
        if (!onClick || (event.key !== "Enter" && event.key !== " ")) {
          return;
        }

        event.preventDefault();
        onClick();
      }}
      className={`theme-dark-surface group relative h-full min-h-0 w-full overflow-visible rounded-lg border bg-black transition ${
        onClick ? "cursor-pointer outline-none hover:border-[#258ff4]/80 focus-visible:border-[#258ff4] focus-visible:ring-2 focus-visible:ring-[#258ff4]/35" : ""
      } ${
        selected
          ? "border-[#258ff4] shadow-[0_0_28px_rgba(37,143,244,0.28)]"
          : isSpeaking
            ? "border-mint shadow-glow"
            : "border-white/10"
      }`}
    >
      {showProfile && profileOpen ? createPortal(profileCard, document.body) : null}
      {showVideo ? (
        screenSharing ? (
          <div className={`${screenShareMediaFrame} grid place-items-center overflow-hidden rounded-lg bg-black`}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={muted}
            className="h-full w-full rounded-lg object-contain"
            />
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={muted}
            className="h-full w-full rounded-lg scale-x-[-1] object-cover"
          />
        )
      ) : (
        <div className="grid h-full w-full place-items-center rounded-lg bg-field">
          {stream && !muted ? <audio ref={audioRef} autoPlay playsInline /> : null}
          <div className="group/avatar relative">
            <AvatarBadge avatar={avatar} size={compact ? "md" : "lg"} />
            {isSpeaking ? (
              <span className="absolute -inset-2 rounded-full border-2 border-mint opacity-80 animate-ping" />
            ) : null}
          </div>
        </div>
      )}

      {isSpeaking && !compact ? (
        <div className="absolute left-3 top-3 rounded-md border border-mint/50 bg-mint/15 px-2 py-1 text-xs font-semibold text-mint">
          {t("speaking")}
        </div>
      ) : null}

      <div className={`absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 rounded-b-lg bg-black/55 backdrop-blur ${compact ? "px-2 py-1.5" : "px-3 py-2"}`}>
        <span className="flex min-w-0 items-center gap-2">
          {compact ? null : <AvatarBadge avatar={avatar} size="sm" />}
          <span className={`${compact ? "text-xs" : "text-sm"} truncate font-medium text-white`}>{nickname}</span>
        </span>
        <span className={`flex shrink-0 items-center ${compact ? "gap-1" : "gap-2"} text-white/80`}>
          <span className="flex items-center gap-1">
            {micEnabled ? <Mic size={compact ? 13 : 16} className={isSpeaking ? "text-mint" : undefined} /> : <MicOff size={compact ? 13 : 16} />}
            {micEnabled && !compact ? (
              <span className="flex h-4 items-end gap-0.5" aria-label={isSpeaking ? t("speaking") : t("micUnmute")}>
                {barLevels.map((barLevel) => {
                  const height = Math.max(3, Math.round(16 * Math.min(1, level / barLevel)));
                  return (
                    <span
                      key={barLevel}
                      className={`w-1 rounded-full transition-all duration-75 ${isSpeaking ? "bg-mint" : "bg-white/30"}`}
                      style={{ height }}
                    />
                  );
                })}
              </span>
            ) : null}
          </span>
          {cameraEnabled ? <Video size={compact ? 13 : 16} /> : <VideoOff size={compact ? 13 : 16} />}
        </span>
      </div>
    </div>
  );
}

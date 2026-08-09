import { ExternalLink, LoaderCircle, Pause, Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Language } from "../lib/i18n";
import { youtubeTranslate } from "../lib/youtubeI18n";
import type { RoomYouTubeVideo } from "../types/realtime";

type YouTubePlayer = {
  destroy: () => void; playVideo: () => void; pauseVideo: () => void; seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number; getPlayerState: () => number;
};

declare global {
  interface Window {
    YT?: { Player: new (element: string | HTMLElement, options: Record<string, unknown>) => YouTubePlayer; PlayerState: { PLAYING: number; PAUSED: number; ENDED: number } };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<NonNullable<Window["YT"]>> | null = null;
let nextYouTubePlayerId = 0;
function loadYouTubeApi(): Promise<NonNullable<Window["YT"]>> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve, reject) => {
    let settled = false;
    const finish = () => {
      if (settled || !window.YT?.Player) return;
      settled = true;
      window.clearTimeout(timeoutId);
      resolve(window.YT);
    };
    const fail = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      youtubeApiPromise = null;
      reject(new Error("YOUTUBE_IFRAME_API_UNAVAILABLE"));
    };
    const timeoutId = window.setTimeout(fail, 12_000);
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      finish();
    };

    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    if (existingScript) {
      existingScript.addEventListener("load", finish, { once: true });
      existingScript.addEventListener("error", fail, { once: true });
    } else {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.addEventListener("load", finish, { once: true });
      script.addEventListener("error", fail, { once: true });
      document.head.appendChild(script);
    }
  });
  return youtubeApiPromise;
}

function effectivePosition(video: RoomYouTubeVideo) {
  return Math.max(0, video.positionSeconds + (video.playback === "playing" ? (Date.now() - video.updatedAt) / 1000 : 0));
}

export function YouTubeVideoStage({ video, canManage, language, onClose, onOwnerPlayback, onViewerPlayback }: {
  video: RoomYouTubeVideo; canManage: boolean; language: Language; onClose: () => void;
  onOwnerPlayback: (playback: "playing" | "paused", positionSeconds: number) => void;
  onViewerPlayback: (playback: "playing" | "paused") => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hostIdRef = useRef("");
  if (!hostIdRef.current) hostIdRef.current = `room-youtube-player-${++nextYouTubePlayerId}`;
  const playerRef = useRef<YouTubePlayer | null>(null);
  const videoRef = useRef(video);
  const canManageRef = useRef(canManage);
  const onOwnerPlaybackRef = useRef(onOwnerPlayback);
  const onViewerPlaybackRef = useRef(onViewerPlayback);
  const applyingRoomStateUntil = useRef(0);
  const [ready, setReady] = useState(false);
  const [locallyPaused, setLocallyPaused] = useState(video.playback !== "playing");
  const [playerError, setPlayerError] = useState<number | null>(null);
  const t = (key: Parameters<typeof youtubeTranslate>[1]) => youtubeTranslate(language, key);
  videoRef.current = video;
  canManageRef.current = canManage;
  onOwnerPlaybackRef.current = onOwnerPlayback;
  onViewerPlaybackRef.current = onViewerPlayback;

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;
    setReady(false);
    setPlayerError(null);
    container.replaceChildren();
    // YT.Player must own the complete placeholder -> iframe transition. Mixing
    // a preloaded iframe with a later controller attachment creates two player
    // handshakes and can send postMessage calls to a stale window.
    const host = document.createElement("div");
    host.id = hostIdRef.current;
    host.className = "h-full w-full";
    container.appendChild(host);
    void loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      playerRef.current = new YT.Player(host.id, {
        videoId: video.videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          enablejsapi: 1,
          origin: window.location.origin,
          hl: language,
          playsinline: 1,
          rel: 0,
          controls: 1
        },
        events: {
          onReady: (event: { target: YouTubePlayer }) => {
            setPlayerError(null);
            const position = effectivePosition(videoRef.current);
            if (position > 0.5) event.target.seekTo(position, true);
            // A fresh YouTube player is already paused. Do not issue a delayed
            // pause command here because it can override the owner's first
            // click. Only restore an explicitly playing room state.
            if (videoRef.current.playback === "playing") event.target.playVideo();
            setLocallyPaused(videoRef.current.playback !== "playing");
            setReady(true);
          },
          onStateChange: (event: { data: number; target: YouTubePlayer }) => {
            const playback = event.data === YT.PlayerState.PLAYING ? "playing" : event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED ? "paused" : null;
            if (!playback) return;
            setLocallyPaused(playback === "paused");
            if (!canManageRef.current && Date.now() >= applyingRoomStateUntil.current) {
              onViewerPlaybackRef.current(playback);
            }
            if (canManageRef.current) onOwnerPlaybackRef.current(playback, event.target.getCurrentTime());
          },
          onError: (event: { data: number }) => {
            console.warn(`[YouTube Player] video=${video.videoId} error=${event.data}`);
            setPlayerError(event.data);
          }
        }
      });
    }).catch((error: unknown) => {
      if (cancelled) return;
      console.warn("[YouTube Player] iframe API failed to load", error);
      setPlayerError(-1);
    });
    return () => {
      cancelled = true;
      try { playerRef.current?.destroy(); } catch { /* The API may already have removed its iframe. */ }
      playerRef.current = null;
      container.replaceChildren();
    };
  }, [video.videoId]);

  useEffect(() => {
    const player = playerRef.current;
    if (!ready || !player || canManage) return;
    const expected = effectivePosition(video);
    applyingRoomStateUntil.current = Date.now() + 600;
    if (Math.abs(player.getCurrentTime() - expected) > 3) player.seekTo(expected, true);
    if (video.playback === "playing") player.playVideo(); else player.pauseVideo();
  }, [canManage, ready, video]);

  useEffect(() => {
    if (!ready || !canManage) return;
    const intervalId = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const playerState = player.getPlayerState();
      const playback = playerState === window.YT?.PlayerState.PLAYING ? "playing" : playerState === window.YT?.PlayerState.PAUSED || playerState === window.YT?.PlayerState.ENDED ? "paused" : null;
      if (!playback) return;
      onOwnerPlaybackRef.current(playback, player.getCurrentTime());
    }, 2500);
    return () => window.clearInterval(intervalId);
  }, [canManage, ready]);

  const toggleViewerPlayback = () => {
    const player = playerRef.current;
    if (!player) return;
    applyingRoomStateUntil.current = Date.now() + 600;
    if (locallyPaused) {
      player.seekTo(effectivePosition(videoRef.current), true);
      player.playVideo();
      onViewerPlaybackRef.current("playing");
    } else {
      player.pauseVideo();
      onViewerPlaybackRef.current("paused");
    }
  };

  return <section className="relative h-full min-h-[200px] w-full overflow-hidden rounded-lg border border-white/10 bg-black shadow-2xl shadow-black/30">
    <div ref={containerRef} className="absolute inset-0"/>
    {!ready && playerError === null ? <div className="absolute inset-0 z-10 grid place-items-center bg-black"><LoaderCircle className="animate-spin text-white/65" size={28}/></div> : null}
    {playerError !== null ? <div className="absolute inset-0 z-20 grid place-items-center bg-black/90 px-5 text-center"><div><p className="text-sm font-medium text-white/80">{t(playerError === 101 || playerError === 150 ? "embeddingDisabled" : playerError === 2 || playerError === 100 ? "videoUnavailable" : "playerFailed")}</p><a href={`https://www.youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noopener" className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-500">{t("openYouTube")}<ExternalLink size={15}/></a></div></div> : null}
    <button type="button" onClick={onClose} title={t("hide")} aria-label={t("hide")} className="absolute right-2 top-2 z-30 grid h-9 w-9 place-items-center rounded-full bg-black/75 text-white shadow-lg hover:bg-black"><X size={18}/></button>
    {!canManage ? <><div className="absolute inset-0 z-[5]" aria-hidden="true"/><div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-3 bg-black/75 px-3 py-2 backdrop-blur"><button type="button" onClick={toggleViewerPlayback} className="inline-flex h-9 items-center gap-2 rounded-md bg-white/10 px-3 text-sm font-semibold text-white hover:bg-white/20">{locallyPaused ? <Play size={16}/> : <Pause size={16}/>} {locallyPaused ? t("resume") : t("pause")}</button><span className="hidden text-xs text-white/45 sm:inline">{t("ownerControls")}</span></div></> : null}
  </section>;
}

export function YouTubeVideoDock({ videoId, language, onClick, compact = false, active = false }: { videoId: string; language: Language; onClick: () => void; compact?: boolean; active?: boolean }) {
  const label = youtubeTranslate(language, active ? "hide" : "show");
  return <button type="button" onClick={onClick} title={label} aria-label={label} className={`group relative overflow-hidden rounded-lg border border-red-400/40 bg-black shadow-2xl shadow-black/40 transition hover:-translate-y-0.5 hover:border-red-400 ${compact ? "h-full w-full" : "aspect-video w-36 sm:w-44"}`}><img src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover opacity-80 transition group-hover:opacity-100"/><span className="absolute inset-0 grid place-items-center"><span className={`grid place-items-center rounded-xl bg-red-600 text-white shadow-lg ${compact ? "h-8 w-10" : "h-10 w-12"}`}><Play size={compact ? 16 : 20} fill="currentColor"/></span></span></button>;
}

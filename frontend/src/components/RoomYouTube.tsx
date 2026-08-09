import { Pause, Play, Trash2, X, Youtube } from "lucide-react";
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
    YT?: { Player: new (element: HTMLElement, options: Record<string, unknown>) => YouTubePlayer; PlayerState: { PLAYING: number; PAUSED: number; ENDED: number } };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<NonNullable<Window["YT"]>> | null = null;
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  youtubeApiPromise ??= new Promise((resolve) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { previousReady?.(); if (window.YT) resolve(window.YT); };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
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
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const videoRef = useRef(video);
  const onOwnerPlaybackRef = useRef(onOwnerPlayback);
  const onViewerPlaybackRef = useRef(onViewerPlayback);
  const suppressEventsUntil = useRef(0);
  const applyingRoomStateUntil = useRef(0);
  const [ready, setReady] = useState(false);
  const [locallyPaused, setLocallyPaused] = useState(video.playback !== "playing");
  const t = (key: Parameters<typeof youtubeTranslate>[1]) => youtubeTranslate(language, key);
  videoRef.current = video;
  onOwnerPlaybackRef.current = onOwnerPlayback;
  onViewerPlaybackRef.current = onViewerPlayback;

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return;
    void loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      playerRef.current = new YT.Player(host, {
        videoId: video.videoId,
        width: "100%",
        height: "100%",
        playerVars: { enablejsapi: 1, origin: window.location.origin, playsinline: 1, rel: 0, controls: canManage ? 1 : 0, disablekb: canManage ? 0 : 1 },
        events: {
          onReady: (event: { target: YouTubePlayer }) => {
            suppressEventsUntil.current = Date.now() + 1200;
            event.target.seekTo(effectivePosition(videoRef.current), true);
            if (videoRef.current.playback === "playing") event.target.playVideo(); else event.target.pauseVideo();
            setLocallyPaused(videoRef.current.playback !== "playing");
            setReady(true);
          },
          onStateChange: (event: { data: number; target: YouTubePlayer }) => {
            const playback = event.data === YT.PlayerState.PLAYING ? "playing" : event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED ? "paused" : null;
            if (!playback) return;
            setLocallyPaused(playback === "paused");
            if (!canManage && Date.now() >= suppressEventsUntil.current && Date.now() >= applyingRoomStateUntil.current) {
              onViewerPlaybackRef.current(playback);
            }
            if (canManage && Date.now() >= suppressEventsUntil.current) onOwnerPlaybackRef.current(playback, event.target.getCurrentTime());
          }
        }
      });
    });
    return () => { cancelled = true; playerRef.current?.destroy(); playerRef.current = null; };
  }, [canManage, video.videoId]);

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
    <div ref={hostRef} className="h-full w-full"/>
    <button type="button" onClick={onClose} title={t("hide")} aria-label={t("hide")} className="absolute right-2 top-2 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/75 text-white shadow-lg hover:bg-black"><X size={18}/></button>
    {!canManage ? <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-3 bg-black/75 px-3 py-2 backdrop-blur"><button type="button" onClick={toggleViewerPlayback} className="inline-flex h-9 items-center gap-2 rounded-md bg-white/10 px-3 text-sm font-semibold text-white hover:bg-white/20">{locallyPaused ? <Play size={16}/> : <Pause size={16}/>} {locallyPaused ? t("resume") : t("pause")}</button><span className="hidden text-xs text-white/45 sm:inline">{t("ownerControls")}</span></div> : null}
  </section>;
}

export function YouTubeVideoDock({ videoId, language, onClick, compact = false, active = false }: { videoId: string; language: Language; onClick: () => void; compact?: boolean; active?: boolean }) {
  const label = youtubeTranslate(language, active ? "hide" : "show");
  return <button type="button" onClick={onClick} title={label} aria-label={label} className={`group relative overflow-hidden rounded-lg border border-red-400/40 bg-black shadow-2xl shadow-black/40 transition hover:-translate-y-0.5 hover:border-red-400 ${compact ? "h-full w-full" : "aspect-video w-36 sm:w-44"}`}><img src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover opacity-80 transition group-hover:opacity-100"/><span className="absolute inset-0 grid place-items-center"><span className={`grid place-items-center rounded-xl bg-red-600 text-white shadow-lg ${compact ? "h-8 w-10" : "h-10 w-12"}`}><Play size={compact ? 16 : 20} fill="currentColor"/></span></span></button>;
}

export function YouTubeSettings({ currentVideo, language, error, saving, onClose, onShare, onRemove }: { currentVideo: RoomYouTubeVideo | null; language: Language; error: string | null; saving: boolean; onClose: () => void; onShare: (url: string) => void; onRemove: () => void }) {
  const [url, setUrl] = useState("");
  const t = (key: Parameters<typeof youtubeTranslate>[1]) => youtubeTranslate(language, key);
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 backdrop-blur-sm" onMouseDown={() => { if (!saving) onClose(); }}><form onSubmit={(event) => { event.preventDefault(); if (!saving && url.trim()) onShare(url.trim()); }} onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-md rounded-xl border border-white/10 bg-panel p-5 text-white shadow-2xl"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-semibold"><Youtube className="text-red-500" size={22}/>{t("manage")}</h2><button disabled={saving} type="button" onClick={onClose} className="rounded-md p-2 text-white/55 hover:bg-white/10 disabled:opacity-40"><X size={18}/></button></div><label className="mt-5 block text-sm text-white/70">{t("url")}<input disabled={saving} autoFocus value={url} onChange={(event) => setUrl(event.target.value)} placeholder={t("placeholder")} className="mt-2 h-11 w-full rounded-md border border-white/10 bg-field px-3 text-sm outline-none focus:border-red-400 disabled:opacity-50"/></label>{error ? <p className="mt-3 text-sm text-coral">{error}</p> : null}<div className="mt-5 flex justify-between gap-3"><div>{currentVideo ? <button disabled={saving} type="button" onClick={onRemove} className="inline-flex h-10 items-center gap-2 rounded-md bg-coral/10 px-3 text-sm text-coral hover:bg-coral/20 disabled:opacity-40"><Trash2 size={16}/>{t("remove")}</button> : null}</div><div className="flex gap-2"><button disabled={saving} type="button" onClick={onClose} className="h-10 rounded-md bg-white/5 px-4 text-sm text-white/65 hover:bg-white/10 disabled:opacity-40">{t("cancel")}</button><button disabled={saving || !url.trim()} className="h-10 rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-wait disabled:opacity-40">{saving ? "..." : currentVideo ? t("replace") : t("add")}</button></div></div></form></div>;
}

import { LoaderCircle, Play, Trash2, X, Youtube } from "lucide-react";
import { useState } from "react";
import type { Language } from "../lib/i18n";
import { youtubeTranslate } from "../lib/youtubeI18n";
import type { RoomYouTubeVideo, YouTubeRecommendation } from "../types/realtime";

type YouTubeSettingsProps = {
  currentVideo: RoomYouTubeVideo | null;
  recommendations: YouTubeRecommendation[];
  recommendationsLoading: boolean;
  recommendationsError: string | null;
  language: Language;
  error: string | null;
  saving: boolean;
  onClose: () => void;
  onShare: (url: string) => void;
  onRemove: () => void;
};

export function YouTubeSettings({
  currentVideo,
  recommendations,
  recommendationsLoading,
  recommendationsError,
  language,
  error,
  saving,
  onClose,
  onShare,
  onRemove
}: YouTubeSettingsProps) {
  const [url, setUrl] = useState("");
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const t = (key: Parameters<typeof youtubeTranslate>[1]) => youtubeTranslate(language, key);

  const selectRecommendation = (videoId: string) => {
    setSelectedVideoId(videoId);
    setUrl(`https://www.youtube.com/watch?v=${videoId}`);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-3 py-4 backdrop-blur-sm" onMouseDown={() => { if (!saving) onClose(); }}>
      <form
        onSubmit={(event) => { event.preventDefault(); if (!saving && url.trim()) onShare(url.trim()); }}
        onMouseDown={(event) => event.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-white/10 bg-panel text-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Youtube className="text-red-500" size={22} />{t("manage")}</h2>
          <button disabled={saving} type="button" onClick={onClose} className="rounded-md p-2 text-white/55 hover:bg-white/10 disabled:opacity-40"><X size={18} /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <label className="block text-sm text-white/70">
            {t("url")}
            <input
              disabled={saving}
              autoFocus
              value={url}
              onChange={(event) => { setUrl(event.target.value); setSelectedVideoId(null); }}
              placeholder={t("placeholder")}
              className="mt-2 h-11 w-full rounded-md border border-white/10 bg-field px-3 text-sm outline-none focus:border-red-400 disabled:opacity-50"
            />
          </label>
          {error ? <p className="mt-3 text-sm text-coral">{error}</p> : null}

          <section className="mt-5">
            <h3 className="text-sm font-semibold text-white/85">{currentVideo ? t("recommendationsForCurrent") : t("recommendations")}</h3>
            {recommendationsLoading ? (
              <div className="mt-3 flex min-h-36 items-center justify-center gap-2 rounded-lg border border-white/8 bg-white/[0.025] text-sm text-white/50">
                <LoaderCircle size={18} className="animate-spin" />{t("loadingRecommendations")}
              </div>
            ) : recommendationsError ? (
              <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/5 px-4 py-4 text-sm text-amber-100/70">
                {t(recommendationsError === "YOUTUBE_RECOMMENDATIONS_NOT_CONFIGURED" ? "recommendationsNotConfigured" : recommendationsError === "YOUTUBE_RECOMMENDATIONS_QUOTA_EXCEEDED" ? "recommendationsQuotaExceeded" : "recommendationsUnavailable")}
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                {recommendations.map((video) => {
                  const selected = selectedVideoId === video.videoId;
                  return (
                    <button
                      key={video.videoId}
                      type="button"
                      disabled={saving}
                      onClick={() => selectRecommendation(video.videoId)}
                      title={`${t("selectVideo")}: ${video.title}`}
                      className={`group overflow-hidden rounded-lg border bg-black/25 text-left transition hover:-translate-y-0.5 hover:border-red-400/70 disabled:opacity-50 ${selected ? "border-red-400 ring-2 ring-red-400/25" : "border-white/10"}`}
                    >
                      <span className="relative block aspect-video overflow-hidden bg-black">
                        <img src={video.thumbnailUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
                        <span className="absolute inset-0 grid place-items-center bg-black/10"><span className="grid h-8 w-10 place-items-center rounded-lg bg-red-600 text-static-white shadow-lg"><Play size={15} fill="currentColor" /></span></span>
                      </span>
                      <span className="block px-2.5 py-2">
                        <span className="line-clamp-2 min-h-9 text-xs font-semibold leading-[18px] text-white/90">{video.title}</span>
                        <span className="mt-1 block truncate text-[11px] text-white/45">{video.channelTitle}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
          <div>{currentVideo ? <button disabled={saving} type="button" onClick={onRemove} className="inline-flex h-10 items-center gap-2 rounded-md bg-coral/10 px-3 text-sm text-coral hover:bg-coral/20 disabled:opacity-40"><Trash2 size={16} />{t("remove")}</button> : null}</div>
          <div className="flex gap-2">
            <button disabled={saving} type="button" onClick={onClose} className="h-10 rounded-md bg-white/5 px-4 text-sm text-white/65 hover:bg-white/10 disabled:opacity-40">{t("cancel")}</button>
            <button disabled={saving || !url.trim()} className="h-10 rounded-md bg-red-600 px-4 text-sm font-semibold text-static-white hover:bg-red-500 disabled:cursor-wait disabled:opacity-40">{saving ? "..." : currentVideo ? t("replace") : t("add")}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

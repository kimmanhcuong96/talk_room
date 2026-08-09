import { env } from "../config/env.js";
import type { RoomLanguage } from "../rooms/roomLanguages.js";
import type { YouTubeRecommendation } from "../types/socket.js";

type SearchResponse = {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      channelTitle?: string;
      thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
    };
  }>;
};

type VideoResponse = {
  items?: Array<{ snippet?: { title?: string; tags?: string[] } }>;
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { expiresAt: number; videos: YouTubeRecommendation[] }>();
const languageLabels: Record<RoomLanguage, string> = {
  en: "English", vi: "Vietnamese", zh: "Chinese", ja: "Japanese", es: "Spanish", fr: "French", de: "German",
  pt: "Portuguese", ru: "Russian", ar: "Arabic", hi: "Hindi", bn: "Bengali", id: "Indonesian", ko: "Korean"
};

async function requestYouTube<T>(path: string, parameters: Record<string, string>) {
  if (!env.youtubeDataApiKey) throw new Error("YOUTUBE_RECOMMENDATIONS_NOT_CONFIGURED");
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, {
    headers: { "X-Goog-Api-Key": env.youtubeDataApiKey },
    signal: AbortSignal.timeout(6_000)
  });
  if (!response.ok) throw new Error("YOUTUBE_RECOMMENDATIONS_UNAVAILABLE");
  return response.json() as Promise<T>;
}

async function buildSearchQuery(roomName: string, language: RoomLanguage, currentVideoId: string | null) {
  if (!currentVideoId) return `${roomName} ${languageLabels[language]} language learning conversation`;
  const metadata = await requestYouTube<VideoResponse>("videos", { part: "snippet", id: currentVideoId });
  const snippet = metadata.items?.[0]?.snippet;
  const keywords = [snippet?.title, ...(snippet?.tags?.slice(0, 3) ?? [])].filter(Boolean).join(" ");
  return keywords || `${roomName} ${languageLabels[language]}`;
}

export async function getYouTubeRecommendations(input: {
  roomName: string;
  primaryLanguage: RoomLanguage;
  currentVideoId: string | null;
}) {
  const cacheKey = `${input.primaryLanguage}:${input.roomName}:${input.currentVideoId ?? "default"}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.videos;

  const query = await buildSearchQuery(input.roomName, input.primaryLanguage, input.currentVideoId);
  const result = await requestYouTube<SearchResponse>("search", {
    part: "snippet",
    type: "video",
    maxResults: "15",
    order: "relevance",
    q: query.slice(0, 250),
    relevanceLanguage: input.primaryLanguage === "zh" ? "zh-Hans" : input.primaryLanguage,
    safeSearch: "strict",
    videoEmbeddable: "true"
  });

  const videos = (result.items ?? [])
    .flatMap((item): YouTubeRecommendation[] => {
      const videoId = item.id?.videoId;
      const title = item.snippet?.title;
      if (!videoId || !title || videoId === input.currentVideoId) return [];
      return [{
        videoId,
        title,
        channelTitle: item.snippet?.channelTitle ?? "YouTube",
        thumbnailUrl: item.snippet?.thumbnails?.medium?.url
          ?? item.snippet?.thumbnails?.default?.url
          ?? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
      }];
    })
    .slice(0, 10);

  if (videos.length === 0) throw new Error("YOUTUBE_RECOMMENDATIONS_UNAVAILABLE");
  cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, videos });
  return videos;
}

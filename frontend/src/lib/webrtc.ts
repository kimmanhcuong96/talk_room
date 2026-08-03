export type WebRtcIceConfig = {
  iceServers: RTCIceServer[];
};

const apiUrl = (import.meta.env.VITE_API_URL ?? import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000").replace(/\/$/, "");

export const fallbackRtcConfig: RTCConfiguration = {
  iceCandidatePoolSize: 10,
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" }
  ]
};

function isIceServer(value: unknown): value is RTCIceServer {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<RTCIceServer>;
  return (
    typeof candidate.urls === "string" ||
    (Array.isArray(candidate.urls) && candidate.urls.every((url) => typeof url === "string"))
  );
}

function isIceConfig(value: unknown): value is WebRtcIceConfig {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<WebRtcIceConfig>;
  return Array.isArray(candidate.iceServers) && candidate.iceServers.every(isIceServer);
}

export async function fetchRtcConfig(): Promise<RTCConfiguration> {
  const response = await fetch(`${apiUrl}/webrtc/ice-config`);
  const body = (await response.json().catch(() => null)) as unknown;

  if (!response.ok || !isIceConfig(body)) {
    throw new Error("LOAD_WEBRTC_ICE_CONFIG_FAILED");
  }

  return {
    ...fallbackRtcConfig,
    iceServers: body.iceServers
  };
}

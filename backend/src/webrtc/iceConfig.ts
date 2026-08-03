import { env } from "../config/env.js";

type IceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

type IceConfig = {
  iceServers: IceServer[];
};

const fallbackIceConfig: IceConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" }
  ]
};

let cachedCloudflareConfig: { expiresAt: number; config: IceConfig } | null = null;

function isIceServer(value: unknown): value is IceServer {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<IceServer>;
  const hasUrls =
    typeof candidate.urls === "string" ||
    (Array.isArray(candidate.urls) && candidate.urls.every((url) => typeof url === "string"));

  return hasUrls;
}

function isIceConfig(value: unknown): value is IceConfig {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<IceConfig>;
  return Array.isArray(candidate.iceServers) && candidate.iceServers.every(isIceServer);
}

export async function getIceConfig(): Promise<IceConfig> {
  if (!env.cloudflareTurnKeyId || !env.cloudflareTurnApiToken) {
    return fallbackIceConfig;
  }

  const now = Date.now();
  if (cachedCloudflareConfig && cachedCloudflareConfig.expiresAt > now) {
    return cachedCloudflareConfig.config;
  }

  const ttl = Number.isFinite(env.cloudflareTurnTtlSeconds) && env.cloudflareTurnTtlSeconds > 0
    ? env.cloudflareTurnTtlSeconds
    : 86400;

  try {
    const response = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(env.cloudflareTurnKeyId)}/credentials/generate-ice-servers`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.cloudflareTurnApiToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ttl })
      }
    );

    const body = (await response.json().catch(() => null)) as unknown;

    if (!response.ok || !isIceConfig(body)) {
      console.error("Cloudflare TURN credential generation failed", {
        status: response.status,
        body
      });
      return fallbackIceConfig;
    }

    cachedCloudflareConfig = {
      config: body,
      // Refresh before Cloudflare credentials expire so new calls do not receive stale ICE servers.
      expiresAt: now + Math.max(ttl - 60, 60) * 1000
    };

    return body;
  } catch (error) {
    console.error("Cloudflare TURN credential request failed", error);
    return fallbackIceConfig;
  }
}

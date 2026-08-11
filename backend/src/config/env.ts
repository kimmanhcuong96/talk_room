function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigins: (process.env.CLIENT_ORIGIN ?? "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean),

  databaseUrl: required("DATABASE_URL"),
  googleClientId: required("GOOGLE_CLIENT_ID"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  adminJwtSecret: process.env.ADMIN_JWT_SECRET?.trim() || required("JWT_SECRET"),
  adminJwtExpiresIn: process.env.ADMIN_JWT_EXPIRES_IN ?? "8h",
  youtubeDataApiKey: process.env.YOUTUBE_DATA_API_KEY?.trim() ?? "",
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434",
  ollamaModel: process.env.OLLAMA_MODEL?.trim() ?? "",
  cloudflareTurnKeyId: process.env.CLOUDFLARE_TURN_KEY_ID?.trim() ?? "",
  cloudflareTurnApiToken: process.env.CLOUDFLARE_TURN_API_TOKEN?.trim() ?? "",
  cloudflareTurnTtlSeconds: Number(process.env.CLOUDFLARE_TURN_TTL_SECONDS ?? 86400),
  cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ?? "",
  cloudflareAnalyticsApiToken: process.env.CLOUDFLARE_ANALYTICS_API_TOKEN?.trim() ?? "",
  cloudflareTurnUsageLimitGb: Number(process.env.CLOUDFLARE_TURN_USAGE_LIMIT_GB ?? 950),
  cloudflareTurnUsageCheckSeconds: Number(process.env.CLOUDFLARE_TURN_USAGE_CHECK_SECONDS ?? 300),
};

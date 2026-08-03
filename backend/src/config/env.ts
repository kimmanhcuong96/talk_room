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
  cloudflareTurnKeyId: process.env.CLOUDFLARE_TURN_KEY_ID?.trim() ?? "",
  cloudflareTurnApiToken: process.env.CLOUDFLARE_TURN_API_TOKEN?.trim() ?? "",
  cloudflareTurnTtlSeconds: Number(process.env.CLOUDFLARE_TURN_TTL_SECONDS ?? 86400),
};

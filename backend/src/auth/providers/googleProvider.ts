import { OAuth2Client } from "google-auth-library";
import { env } from "../../config/env.js";
import { HttpError } from "../../errors/httpError.js";
import type { VerifiedOAuthProfile } from "./types.js";

const googleClient = new OAuth2Client();

export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedOAuthProfile> {
  if (!env.googleClientId) {
    throw new HttpError(500, "GOOGLE_CLIENT_ID is not configured.");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.googleClientId
  });
  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email) {
    throw new HttpError(401, "Google token is missing required profile information.");
  }

  return {
    provider: "google",
    providerUserId: payload.sub,
    email: payload.email,
    displayName: payload.name ?? payload.email,
    avatarUrl: payload.picture ?? null
  };
}

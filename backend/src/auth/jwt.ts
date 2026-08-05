import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { HttpError } from "../errors/httpError.js";
import type { UserProfile } from "../users/userRepository.js";

export function issueAppJwt(user: UserProfile) {
  if (!env.jwtSecret) {
    throw new HttpError(500, "JWT_SECRET is not configured.");
  }

  const options: jwt.SignOptions = {
    subject: user.id,
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"]
  };

  return jwt.sign(
    {
      tokenType: "user",
      email: user.email,
      name: user.displayName,
      picture: user.avatarUrl,
      provider: "google"
    },
    env.jwtSecret,
    options
  );
}

export function verifyAppJwt(token: string) {
  if (!env.jwtSecret) {
    throw new HttpError(500, "JWT_SECRET is not configured.");
  }

  const payload = jwt.verify(token, env.jwtSecret);

  if (typeof payload === "string" || !payload.sub || (payload.tokenType && payload.tokenType !== "user")) {
    throw new HttpError(401, "Invalid authentication token.");
  }

  return { userId: payload.sub };
}

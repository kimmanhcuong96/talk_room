import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { HttpError } from "../errors/httpError.js";
import type { AdminProfile } from "./adminTypes.js";

export function issueAdminJwt(admin: AdminProfile) {
  return jwt.sign(
    {
      tokenType: "admin",
      email: admin.email,
      role: admin.role,
      provider: "google"
    },
    env.adminJwtSecret,
    {
      subject: admin.id,
      expiresIn: env.adminJwtExpiresIn as jwt.SignOptions["expiresIn"]
    }
  );
}

export function verifyAdminJwt(token: string) {
  const payload = jwt.verify(token, env.adminJwtSecret);

  if (typeof payload === "string" || !payload.sub || payload.tokenType !== "admin") {
    throw new HttpError(401, "Invalid admin authentication token.");
  }

  return { adminId: payload.sub };
}

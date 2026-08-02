import { randomUUID } from "node:crypto";
import type { QueryResultRow } from "pg";
import { getPool } from "../db/pool.js";
import { HttpError } from "../errors/httpError.js";
import type { VerifiedOAuthProfile } from "../auth/providers/types.js";

export type UserProfile = {
  id: string;
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  lastLogin: string;
};

type UserRow = QueryResultRow & {
  id: string;
  google_id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: Date;
  last_login: Date;
};

function toUserProfile(row: UserRow): UserProfile {
  return {
    id: row.id,
    googleId: row.google_id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at.toISOString(),
    lastLogin: row.last_login.toISOString()
  };
}

function mapDatabaseError(error: unknown): never {
  if (typeof error === "object" && error !== null && "code" in error) {
    if (error.code === "23505") {
      throw new HttpError(409, "This email is already linked to another account.");
    }

    if (error.code === "42P01") {
      throw new HttpError(500, "Database table users does not exist. Run backend/migrations/001_create_users.sql on Neon.");
    }

    if (error.code === "28P01" || error.code === "3D000" || error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      throw new HttpError(500, "DATABASE_URL is invalid or Neon is unreachable.");
    }
  }

  throw error;
}

export async function upsertGoogleUser(profile: VerifiedOAuthProfile) {
  try {
    const result = await getPool().query<UserRow>(
      `
        INSERT INTO users (id, google_id, email, display_name, avatar_url, last_login)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (google_id) DO UPDATE
        SET
          email = EXCLUDED.email,
          display_name = EXCLUDED.display_name,
          avatar_url = EXCLUDED.avatar_url,
          last_login = NOW()
        RETURNING id, google_id, email, display_name, avatar_url, created_at, last_login
      `,
      [randomUUID(), profile.providerUserId, profile.email, profile.displayName, profile.avatarUrl]
    );

    return toUserProfile(result.rows[0]);
  } catch (error) {
    mapDatabaseError(error);
  }
}

export async function findUserById(userId: string) {
  try {
    const result = await getPool().query<UserRow>(
      `
        SELECT id, google_id, email, display_name, avatar_url, created_at, last_login
        FROM users
        WHERE id = $1
      `,
      [userId]
    );

    const row = result.rows[0];
    return row ? toUserProfile(row) : null;
  } catch (error) {
    mapDatabaseError(error);
  }
}

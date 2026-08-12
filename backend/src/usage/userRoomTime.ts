import { randomUUID } from "node:crypto";
import { getPool } from "../db/pool.js";

type ActiveSession = { userId: string; roomId: string; startedAt: number };
const active = new Map<string, ActiveSession>();

export function startUserRoomSession(socketId: string, userId: string | undefined, roomId: string) {
  if (!userId) return;
  active.set(socketId, { userId, roomId, startedAt: Date.now() });
}

export async function finishUserRoomSession(socketId: string) {
  const session = active.get(socketId);
  if (!session) return;
  active.delete(socketId);
  const endedAt = Date.now();
  const durationSeconds = Math.max(0, Math.floor((endedAt - session.startedAt) / 1000));
  try {
    await getPool().query(
      `INSERT INTO user_room_time_sessions (id, user_id, room_id, started_at, ended_at, duration_seconds)
       VALUES ($1, $2, $3, to_timestamp($4 / 1000.0), to_timestamp($5 / 1000.0), $6);
       INSERT INTO user_room_time_totals (user_id, total_seconds)
       VALUES ($2, $6)
       ON CONFLICT (user_id) DO UPDATE SET total_seconds = user_room_time_totals.total_seconds + EXCLUDED.total_seconds, updated_at = NOW()`,
      [randomUUID(), session.userId, session.roomId, session.startedAt, endedAt, durationSeconds]
    );
  } catch (error) {
    console.error("Unable to persist user room time", error);
  }
}

export async function listUserRoomTime(options: { page: number; limit: number }) {
  const offset = (options.page - 1) * options.limit;
  const result = await getPool().query(
    `SELECT u.id, u.display_name, u.email, u.avatar_url, COALESCE(t.total_seconds, 0)::bigint AS total_seconds
     FROM users u LEFT JOIN user_room_time_totals t ON t.user_id = u.id
     ORDER BY total_seconds DESC, u.created_at DESC LIMIT $1 OFFSET $2`, [options.limit, offset]
  );
  const count = await getPool().query<{ count: string }>("SELECT COUNT(*)::text AS count FROM users");
  return { items: result.rows.map((row) => ({ userId: row.id, displayName: row.display_name, email: row.email, avatarUrl: row.avatar_url, totalSeconds: Number(row.total_seconds) })), total: Number(count.rows[0]?.count ?? 0), page: options.page, limit: options.limit };
}

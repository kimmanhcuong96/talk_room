import { randomUUID } from "node:crypto";
import { getPool } from "../db/pool.js";
import { qualifyReferralIfEligible, recordActivityPoints } from "../rewards/rewardRepository.js";

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
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const sessionId = randomUUID();
      await client.query(
        `INSERT INTO user_room_time_sessions (id, user_id, room_id, started_at, ended_at, duration_seconds)
         VALUES ($1, $2, $3, to_timestamp($4 / 1000.0), to_timestamp($5 / 1000.0), $6)`,
        [sessionId, session.userId, session.roomId, session.startedAt, endedAt, durationSeconds]
      );
      await client.query(
        `INSERT INTO user_room_time_totals (user_id, total_seconds)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET total_seconds = user_room_time_totals.total_seconds + EXCLUDED.total_seconds, updated_at = NOW()`,
        [session.userId, durationSeconds]
      );
      await recordActivityPoints(client, session.userId, sessionId, session.startedAt, endedAt);
      await qualifyReferralIfEligible(client, session.userId);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  } catch (error) {
    console.error("Unable to persist user room time", error);
  }
}

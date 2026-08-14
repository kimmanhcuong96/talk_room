import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getPool } from "../db/pool.js";
import { qualifyReferralIfEligible, recordActivityPoints } from "../rewards/rewardRepository.js";
import { isRewardEligibleRole } from "../rewards/rewardConfig.js";
import type { UserRole } from "../users/userRepository.js";
import { buildEligibleSegments } from "../rewards/rewardPolicy.js";

type ActiveSession = { userId: string; roomId: string; startedAt: number; eligibleAtStart: boolean };
const active = new Map<string, ActiveSession>();

export function startUserRoomSession(socketId: string, userId: string | undefined, roomId: string, role: UserRole) {
  if (!userId) return;
  const now = Date.now();
  active.set(socketId, { userId, roomId, startedAt: now, eligibleAtStart: isRewardEligibleRole(role) });
}

async function getEligibleSegments(client: PoolClient, session: ActiveSession, endedAt: number) {
  const initial = await client.query<{ eligible: boolean }>(
    `SELECT eligible FROM user_reward_eligibility_history
     WHERE user_id = $1 AND changed_at <= to_timestamp($2 / 1000.0)
     ORDER BY changed_at DESC, id DESC LIMIT 1`, [session.userId, session.startedAt]
  );
  const changes = await client.query<{ eligible: boolean; changed_at_ms: string }>(
    `SELECT eligible, (EXTRACT(EPOCH FROM changed_at) * 1000)::bigint::text AS changed_at_ms
     FROM user_reward_eligibility_history
     WHERE user_id = $1 AND changed_at > to_timestamp($2 / 1000.0) AND changed_at < to_timestamp($3 / 1000.0)
     ORDER BY changed_at, id`, [session.userId, session.startedAt, endedAt]
  );
  return buildEligibleSegments(session.startedAt, endedAt, initial.rows[0]?.eligible ?? session.eligibleAtStart,
    changes.rows.map(change => ({ changedAt: Number(change.changed_at_ms), eligible: change.eligible })));
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
      const rewardSegments = await getEligibleSegments(client, session, endedAt);
      for (const [index, segment] of rewardSegments.entries()) {
        await recordActivityPoints(client, session.userId, `${sessionId}:${index}`, segment.startedAt, segment.endedAt);
      }
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

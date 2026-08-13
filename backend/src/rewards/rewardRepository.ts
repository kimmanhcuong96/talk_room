import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getPool } from "../db/pool.js";
import { HttpError } from "../errors/httpError.js";
import { calculateActivityPointUpdate, REFERRAL_QUALIFY_SECONDS, splitActivityByUtcDate } from "./rewardPolicy.js";

const REFERRER_POINTS = 100;
const REFERRED_USER_POINTS = 50;
const FAVORITE_POINTS = 5;

async function insertLedger(
  client: PoolClient,
  userId: string,
  points: number,
  reason: string,
  sourceKey: string,
  metadata: Record<string, unknown> = {}
) {
  if (!points) return false;
  const result = await client.query(
    `INSERT INTO user_point_ledger (id, user_id, points, reason, source_key, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, reason, source_key) DO NOTHING`,
    [randomUUID(), userId, points, reason, sourceKey, JSON.stringify(metadata)]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function recordActivityPoints(
  client: PoolClient,
  userId: string,
  sessionId: string,
  startedAt: number,
  endedAt: number
) {
  for (const { activityDate, durationSeconds } of splitActivityByUtcDate(startedAt, endedAt)) {
    const sourceKey = `${sessionId}:${activityDate}`;
    const source = await client.query(
      `INSERT INTO user_point_activity_sources (user_id, source_key, activity_date, duration_seconds)
       VALUES ($1, $2, $3::date, $4) ON CONFLICT (user_id, source_key) DO NOTHING`,
      [userId, sourceKey, activityDate, durationSeconds]
    );
    if (!source.rowCount) continue;
    const current = await client.query<{ eligible_seconds: number; points_awarded: number }>(
      `INSERT INTO user_point_activity_daily (user_id, activity_date)
       VALUES ($1, $2::date)
       ON CONFLICT (user_id, activity_date) DO UPDATE SET updated_at = NOW()
       RETURNING eligible_seconds, points_awarded`,
      [userId, activityDate]
    );
    const previousSeconds = Number(current.rows[0]?.eligible_seconds ?? 0);
    const previousPoints = Number(current.rows[0]?.points_awarded ?? 0);
    const { eligibleSeconds, totalPoints, pointsToAward } = calculateActivityPointUpdate(previousSeconds, previousPoints, durationSeconds);

    await client.query(
      `UPDATE user_point_activity_daily
       SET eligible_seconds = $3, points_awarded = $4, updated_at = NOW()
       WHERE user_id = $1 AND activity_date = $2::date`,
      [userId, activityDate, eligibleSeconds, totalPoints]
    );
    await insertLedger(client, userId, pointsToAward, "room_activity", sourceKey, {
      activityDate,
      durationSeconds,
      dailyEligibleSeconds: eligibleSeconds,
    });
  }
}

export async function qualifyReferralIfEligible(client: PoolClient, referredUserId: string) {
  const referral = await client.query<{ referrer_user_id: string; total_seconds: string }>(
    `SELECT u.referred_by_user_id AS referrer_user_id, COALESCE(t.total_seconds, 0)::text AS total_seconds
     FROM users u
     LEFT JOIN user_room_time_totals t ON t.user_id = u.id
     WHERE u.id = $1 AND u.referred_by_user_id IS NOT NULL`,
    [referredUserId]
  );
  const row = referral.rows[0];
  if (!row || Number(row.total_seconds) < REFERRAL_QUALIFY_SECONDS) return;

  const inserted = await client.query(
    `INSERT INTO user_referral_rewards (referred_user_id, referrer_user_id)
     VALUES ($1, $2) ON CONFLICT (referred_user_id) DO NOTHING`,
    [referredUserId, row.referrer_user_id]
  );
  if (!(inserted.rowCount ?? 0)) return;

  await insertLedger(client, row.referrer_user_id, REFERRER_POINTS, "referral_inviter", referredUserId, { referredUserId });
  await insertLedger(client, referredUserId, REFERRED_USER_POINTS, "referral_invitee", row.referrer_user_id, { referrerUserId: row.referrer_user_id });
}

export async function toggleFavorite(userId: string, favoriteUserId: string) {
  if (userId === favoriteUserId) throw new HttpError(400, "You cannot favorite yourself.");
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const removed = await client.query(
      `DELETE FROM user_favorites WHERE user_id = $1 AND favorite_user_id = $2`,
      [userId, favoriteUserId]
    );
    if (removed.rowCount) {
      await client.query("COMMIT");
      return { favorited: false, pointsAwarded: 0 };
    }

    const target = await client.query(`SELECT 1 FROM users WHERE id = $1`, [favoriteUserId]);
    if (!target.rowCount) throw new HttpError(404, "User not found.");
    await client.query(
      `INSERT INTO user_favorites (user_id, favorite_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, favoriteUserId]
    );
    const eligibility = await client.query<{ eligible: boolean }>(
      `SELECT COALESCE(total_seconds, 0) >= $2 AS eligible
       FROM users u LEFT JOIN user_room_time_totals t ON t.user_id = u.id
       WHERE u.id = $1`,
      [userId, REFERRAL_QUALIFY_SECONDS]
    );
    let awarded = false;
    if (eligibility.rows[0]?.eligible) {
      const firstFavorite = await client.query(
        `INSERT INTO user_favorite_reward_history (user_id, favorite_user_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [userId, favoriteUserId]
      );
      awarded = Boolean(firstFavorite.rowCount)
        && await insertLedger(client, favoriteUserId, FAVORITE_POINTS, "received_favorite", userId, { fromUserId: userId });
    }
    await client.query("COMMIT");
    return { favorited: true, pointsAwarded: awarded ? FAVORITE_POINTS : 0 };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listFavoriteUserIds(userId: string, candidateUserIds: string[]) {
  if (!candidateUserIds.length) return [];
  const result = await getPool().query<{ favorite_user_id: string }>(
    `SELECT favorite_user_id FROM user_favorites
     WHERE user_id = $1 AND favorite_user_id = ANY($2::uuid[])`,
    [userId, candidateUserIds]
  );
  return result.rows.map((row) => row.favorite_user_id);
}

export async function getRewardSummary(userId: string) {
  const result = await getPool().query<{
    referral_code: string;
    total_points: string;
    activity_points: string;
    referral_points: string;
    favorite_points: string;
    favorite_count: string;
    qualified_referrals: string;
  }>(
    `SELECT u.referral_code,
            COALESCE(SUM(l.points), 0)::text AS total_points,
            COALESCE(SUM(l.points) FILTER (WHERE l.reason = 'room_activity'), 0)::text AS activity_points,
            COALESCE(SUM(l.points) FILTER (WHERE l.reason IN ('referral_inviter', 'referral_invitee')), 0)::text AS referral_points,
            COALESCE(SUM(l.points) FILTER (WHERE l.reason = 'received_favorite'), 0)::text AS favorite_points,
            (SELECT COUNT(*)::text FROM user_favorites f WHERE f.favorite_user_id = u.id) AS favorite_count,
            (SELECT COUNT(*)::text FROM user_referral_rewards r WHERE r.referrer_user_id = u.id) AS qualified_referrals
     FROM users u
     LEFT JOIN user_point_ledger l ON l.user_id = u.id
     WHERE u.id = $1
     GROUP BY u.id, u.referral_code`,
    [userId]
  );
  const row = result.rows[0];
  if (!row) throw new HttpError(404, "User not found.");
  return {
    totalPoints: Number(row.total_points),
    activityPoints: Number(row.activity_points),
    referralPoints: Number(row.referral_points),
    favoritePoints: Number(row.favorite_points),
    favoriteCount: Number(row.favorite_count),
    qualifiedReferrals: Number(row.qualified_referrals),
    referralCode: row.referral_code,
  };
}

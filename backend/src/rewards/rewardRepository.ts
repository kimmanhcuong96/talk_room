import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getPool } from "../db/pool.js";
import { HttpError } from "../errors/httpError.js";
import { rewardConfig, type RewardEventType } from "./rewardConfig.js";
import { calculateActivityPointUpdate, isQualityChatMessage, splitActivityByUtcDate } from "./rewardPolicy.js";

const eligibleRoles = ["verified", "supporter"] as const;

async function isEligible(client: PoolClient, userId: string) {
  const result = await client.query<{ eligible: boolean }>(
    `SELECT role = ANY($2::text[]) AS eligible FROM users WHERE id = $1`,
    [userId, eligibleRoles]
  );
  return result.rows[0]?.eligible === true;
}

async function insertLedger(
  client: PoolClient,
  userId: string,
  points: number,
  eventType: RewardEventType,
  sourceKey: string,
  metadata: Record<string, unknown> = {}
) {
  if (!points) return false;
  const result = await client.query(
    `INSERT INTO user_point_ledger (id, user_id, points, reason, source_key, metadata)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     ON CONFLICT (user_id, reason, source_key) DO NOTHING`,
    [randomUUID(), userId, points, eventType, sourceKey, JSON.stringify(metadata)]
  );
  return (result.rowCount ?? 0) > 0;
}

async function markActiveDay(client: PoolClient, userId: string, activityDate: string, sourceEventKey: string) {
  await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [`reward:streak:${userId}`]);
  const inserted = await client.query(
    `INSERT INTO user_reward_active_days (user_id, activity_date, source_event_key)
     VALUES ($1, $2::date, $3) ON CONFLICT (user_id, activity_date) DO NOTHING`,
    [userId, activityDate, sourceEventKey]
  );
  if (!inserted.rowCount) return;
  const activeDays = await client.query<{ activity_date: string }>(
    `SELECT activity_date::text FROM user_reward_active_days WHERE user_id = $1 ORDER BY activity_date`, [userId]
  );
  let current = 0;
  let highest = 0;
  let start = activeDays.rows[0]?.activity_date ?? activityDate;
  let previous: string | null = null;
  const milestones: Array<{ start: string; days: 3 | 7; activityDate: string }> = [];
  for (const row of activeDays.rows) {
    const expected = previous ? new Date(`${previous}T00:00:00.000Z`) : null;
    if (expected) expected.setUTCDate(expected.getUTCDate() + 1);
    if (!previous || expected?.toISOString().slice(0, 10) !== row.activity_date) {
      current = 1;
      start = row.activity_date;
    } else current += 1;
    highest = Math.max(highest, current);
    if (current === 3 || current === 7) milestones.push({ start, days: current, activityDate: row.activity_date });
    previous = row.activity_date;
  }
  await client.query(
    `INSERT INTO user_reward_streaks
       (user_id, current_streak_days, highest_streak_days, streak_started_on, last_qualified_activity_date)
     VALUES ($1, $2, $3, $4::date, $5::date)
     ON CONFLICT (user_id) DO UPDATE SET current_streak_days = EXCLUDED.current_streak_days,
       highest_streak_days = GREATEST(user_reward_streaks.highest_streak_days, EXCLUDED.highest_streak_days),
       streak_started_on = EXCLUDED.streak_started_on,
       last_qualified_activity_date = EXCLUDED.last_qualified_activity_date, updated_at = NOW()`,
    [userId, current, highest, start, previous ?? activityDate]
  );

  for (const milestone of milestones) {
    const milestoneInsert = await client.query(
      `INSERT INTO user_reward_streak_milestones (user_id, streak_started_on, milestone_days)
       VALUES ($1, $2::date, $3) ON CONFLICT DO NOTHING`, [userId, milestone.start, milestone.days]
    );
    if (!milestoneInsert.rowCount) continue;
    const points = milestone.days === 3 ? rewardConfig.streak.threeDayPoints : rewardConfig.streak.sevenDayPoints;
    await insertLedger(client, userId, points, milestone.days === 3 ? "STREAK_3_DAYS_REWARD" : "STREAK_7_DAYS_REWARD", `${milestone.start}:${milestone.days}`, { activityDate: milestone.activityDate, streakDays: milestone.days });
  }
}

export async function recordActivityPoints(client: PoolClient, userId: string, sessionId: string, startedAt: number, endedAt: number) {
  for (const { activityDate, durationSeconds } of splitActivityByUtcDate(startedAt, endedAt)) {
    const sourceKey = `${sessionId}:${activityDate}`;
    const source = await client.query(
      `INSERT INTO user_point_activity_sources (user_id, source_key, activity_date, duration_seconds)
       VALUES ($1, $2, $3::date, $4) ON CONFLICT (user_id, source_key) DO NOTHING`,
      [userId, sourceKey, activityDate, durationSeconds]
    );
    if (!source.rowCount) continue;
    const current = await client.query<{ eligible_seconds: number; points_awarded: number }>(
      `INSERT INTO user_point_activity_daily (user_id, activity_date) VALUES ($1, $2::date)
       ON CONFLICT (user_id, activity_date) DO UPDATE SET updated_at = NOW()
       RETURNING eligible_seconds, points_awarded`, [userId, activityDate]
    );
    const previousSeconds = Number(current.rows[0]?.eligible_seconds ?? 0);
    const previousPoints = Number(current.rows[0]?.points_awarded ?? 0);
    const update = calculateActivityPointUpdate(previousSeconds, previousPoints, durationSeconds);
    await client.query(
      `UPDATE user_point_activity_daily SET eligible_seconds = $3, points_awarded = $4, updated_at = NOW()
       WHERE user_id = $1 AND activity_date = $2::date`,
      [userId, activityDate, update.eligibleSeconds, update.totalPoints]
    );
    await insertLedger(client, userId, update.pointsToAward, "ROOM_TIME_REWARD", sourceKey, {
      activityDate, durationSeconds, dailyEligibleSeconds: update.eligibleSeconds,
    });
    if (update.eligibleSeconds >= rewardConfig.activeDay.minimumRoomSeconds) {
      await markActiveDay(client, userId, activityDate, `room-time:${sourceKey}`);
    }
  }
}

export async function qualifyReferralIfEligible(client: PoolClient, referredUserId: string) {
  const referral = await client.query<{ referrer_user_id: string; eligible_seconds: string }>(
    `SELECT u.referred_by_user_id AS referrer_user_id,
       COALESCE((SELECT SUM(s.duration_seconds) FROM user_point_activity_sources s WHERE s.user_id = u.id), 0)::text AS eligible_seconds
     FROM users u
     WHERE u.id = $1 AND u.referred_by_user_id IS NOT NULL`, [referredUserId]
  );
  const row = referral.rows[0];
  if (!row || Number(row.eligible_seconds) < rewardConfig.referral.qualifySeconds) return;
  const inserted = await client.query(
    `INSERT INTO user_referral_rewards (referred_user_id, referrer_user_id)
     VALUES ($1, $2) ON CONFLICT (referred_user_id) DO NOTHING`, [referredUserId, row.referrer_user_id]
  );
  if (!inserted.rowCount) return;
  await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [`reward:referral:${row.referrer_user_id}`]);
  if (await isEligible(client, row.referrer_user_id)) {
    const usedToday = await client.query<{ points: string }>(
      `SELECT COALESCE(SUM(points), 0)::text AS points FROM user_point_ledger
       WHERE user_id = $1 AND reason = 'REFERRAL_REWARD' AND source_key LIKE 'inviter:%'
       AND created_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`, [row.referrer_user_id]
    );
    if (Number(usedToday.rows[0]?.points ?? 0) + rewardConfig.referral.inviterPoints <= rewardConfig.referral.dailyInviterPointsCap) {
      await insertLedger(client, row.referrer_user_id, rewardConfig.referral.inviterPoints, "REFERRAL_REWARD", `inviter:${referredUserId}`, { referredUserId, side: "inviter" });
    }
  }
  if (await isEligible(client, referredUserId)) {
    await insertLedger(client, referredUserId, rewardConfig.referral.inviteePoints, "REFERRAL_REWARD", `invitee:${row.referrer_user_id}`, { referrerUserId: row.referrer_user_id, side: "invitee" });
  }
}

export async function recordQualityChatMessage(input: { userId: string; roomId: string; messageId: string; text: string; timestamp: number }) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    if (!await isEligible(client, input.userId)) { await client.query("COMMIT"); return; }
    const activityDate = new Date(input.timestamp).toISOString().slice(0, 10);
    const quality = isQualityChatMessage(input.text);
    const hash = createHash("sha256").update(quality.normalized).digest("hex");
    const duplicate = quality.qualified && Boolean((await client.query(
      `SELECT 1 FROM user_chat_reward_events WHERE user_id = $1 AND message_hash = $2
       AND created_at >= NOW() - ($3 * INTERVAL '1 hour') LIMIT 1`,
      [input.userId, hash, rewardConfig.qualityChat.recentDuplicateWindowHours]
    )).rowCount);
    const daily = await client.query<{ qualifying_messages: number; points_awarded: number; cooldown_ok: boolean }>(
      `INSERT INTO user_chat_reward_daily (user_id, activity_date) VALUES ($1, $2::date)
       ON CONFLICT (user_id, activity_date) DO UPDATE SET updated_at = NOW()
       RETURNING qualifying_messages, points_awarded,
         (last_qualifying_message_at IS NULL OR last_qualifying_message_at <= NOW() - ($3 * INTERVAL '1 second')) AS cooldown_ok`,
      [input.userId, activityDate, rewardConfig.qualityChat.cooldownSeconds]
    );
    const qualifies = quality.qualified && !duplicate && daily.rows[0]?.cooldown_ok === true;
    const event = await client.query(
      `INSERT INTO user_chat_reward_events (message_id, user_id, room_id, activity_date, message_hash, qualified)
       VALUES ($1, $2, $3, $4::date, $5, $6) ON CONFLICT (message_id) DO NOTHING`,
      [input.messageId, input.userId, input.roomId, activityDate, hash, qualifies]
    );
    if (!event.rowCount || !qualifies) { await client.query("COMMIT"); return; }
    const nextCount = Number(daily.rows[0].qualifying_messages) + 1;
    const previousPoints = Number(daily.rows[0].points_awarded);
    const earnedTotal = Math.min(rewardConfig.qualityChat.dailyPointsCap, Math.floor(nextCount / rewardConfig.qualityChat.messagesPerPoint));
    const points = Math.max(0, earnedTotal - previousPoints);
    await client.query(
      `UPDATE user_chat_reward_daily SET qualifying_messages = $3, points_awarded = $4,
       last_qualifying_message_at = NOW(), updated_at = NOW() WHERE user_id = $1 AND activity_date = $2::date`,
      [input.userId, activityDate, nextCount, earnedTotal]
    );
    await insertLedger(client, input.userId, points, "QUALITY_CHAT_REWARD", input.messageId, { roomId: input.roomId, activityDate });
    await markActiveDay(client, input.userId, activityDate, `chat:${input.messageId}`);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); console.error("Unable to record chat reward", error); }
  finally { client.release(); }
}

export async function recordRoomOwnerJoinReward(roomId: string, ownerUserId: string | null, joiningUserId: string | undefined) {
  if (!ownerUserId || !joiningUserId || ownerUserId === joiningUserId) return;
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    if (!await isEligible(client, ownerUserId)) { await client.query("COMMIT"); return; }
    await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [`reward:room-owner:${ownerUserId}`]);
    const realUser = await client.query(`SELECT 1 FROM users WHERE id = $1`, [joiningUserId]);
    if (!realUser.rowCount) { await client.query("COMMIT"); return; }
    const usedToday = await client.query<{ points: string }>(
      `SELECT COALESCE(SUM(points), 0)::text AS points FROM user_point_ledger
       WHERE user_id = $1 AND reason = 'ROOM_PARTICIPANT_JOINED_REWARD'
       AND created_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`, [ownerUserId]
    );
    if (Number(usedToday.rows[0]?.points ?? 0) + rewardConfig.roomOwnerJoin.points > rewardConfig.roomOwnerJoin.dailyPointsCap) { await client.query("COMMIT"); return; }
    const firstPair = await client.query(
      `INSERT INTO user_room_owner_join_reward_history (owner_user_id, joining_user_id, room_id)
       VALUES ($1, $2, $3) ON CONFLICT (owner_user_id, joining_user_id) DO NOTHING`, [ownerUserId, joiningUserId, roomId]
    );
    if (firstPair.rowCount) await insertLedger(client, ownerUserId, rewardConfig.roomOwnerJoin.points, "ROOM_PARTICIPANT_JOINED_REWARD", `${ownerUserId}:${joiningUserId}`, { roomId, joiningUserId });
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); console.error("Unable to record room owner reward", error); }
  finally { client.release(); }
}

export async function toggleFavorite(userId: string, favoriteUserId: string) {
  if (userId === favoriteUserId) throw new HttpError(400, "You cannot favorite yourself.");
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const removed = await client.query(`DELETE FROM user_favorites WHERE user_id = $1 AND favorite_user_id = $2`, [userId, favoriteUserId]);
    if (removed.rowCount) { await client.query("COMMIT"); return { favorited: false, pointsAwarded: 0 }; }
    const target = await client.query(`SELECT 1 FROM users WHERE id = $1`, [favoriteUserId]);
    if (!target.rowCount) throw new HttpError(404, "User not found.");
    await client.query(`INSERT INTO user_favorites (user_id, favorite_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [userId, favoriteUserId]);
    const giverTime = await client.query<{ total_seconds: string }>(`SELECT COALESCE(total_seconds, 0)::text AS total_seconds FROM user_room_time_totals WHERE user_id = $1`, [userId]);
    const first = await client.query(`INSERT INTO user_favorite_reward_history (user_id, favorite_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [userId, favoriteUserId]);
    let awarded = false;
    if (first.rowCount && await isEligible(client, userId) && await isEligible(client, favoriteUserId)
      && Number(giverTime.rows[0]?.total_seconds ?? 0) >= rewardConfig.favorite.giverMinimumRoomSeconds) {
      awarded = await insertLedger(client, favoriteUserId, rewardConfig.favorite.points, "LIKE_RECEIVED_REWARD", userId, { fromUserId: userId });
    }
    await client.query("COMMIT");
    return { favorited: true, pointsAwarded: awarded ? rewardConfig.favorite.points : 0 };
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

export async function listFavoriteUserIds(userId: string, candidateUserIds: string[]) {
  if (!candidateUserIds.length) return [];
  const result = await getPool().query<{ favorite_user_id: string }>(
    `SELECT favorite_user_id FROM user_favorites WHERE user_id = $1 AND favorite_user_id = ANY($2::uuid[])`, [userId, candidateUserIds]
  );
  return result.rows.map(row => row.favorite_user_id);
}

export async function getRewardSummary(userId: string) {
  const result = await getPool().query<{
    referral_code: string; role: string; total_points: string; activity_points: string; referral_points: string;
    favorite_points: string; quality_chat_points: string; room_owner_points: string; streak_points: string;
    favorite_count: string; qualified_referrals: string; current_streak_days: number; highest_streak_days: number;
    last_qualified_activity_date: string | null;
  }>(
    `SELECT u.referral_code, u.role,
      COALESCE(SUM(l.points), 0)::text AS total_points,
      COALESCE(SUM(l.points) FILTER (WHERE l.reason = 'ROOM_TIME_REWARD'), 0)::text AS activity_points,
      COALESCE(SUM(l.points) FILTER (WHERE l.reason = 'REFERRAL_REWARD'), 0)::text AS referral_points,
      COALESCE(SUM(l.points) FILTER (WHERE l.reason = 'LIKE_RECEIVED_REWARD'), 0)::text AS favorite_points,
      COALESCE(SUM(l.points) FILTER (WHERE l.reason = 'QUALITY_CHAT_REWARD'), 0)::text AS quality_chat_points,
      COALESCE(SUM(l.points) FILTER (WHERE l.reason = 'ROOM_PARTICIPANT_JOINED_REWARD'), 0)::text AS room_owner_points,
      COALESCE(SUM(l.points) FILTER (WHERE l.reason LIKE 'STREAK_%'), 0)::text AS streak_points,
      (SELECT COUNT(*)::text FROM user_favorites f WHERE f.favorite_user_id = u.id) AS favorite_count,
      (SELECT COUNT(*)::text FROM user_referral_rewards r WHERE r.referrer_user_id = u.id) AS qualified_referrals,
      COALESCE(s.current_streak_days, 0) AS current_streak_days, COALESCE(s.highest_streak_days, 0) AS highest_streak_days,
      s.last_qualified_activity_date::text AS last_qualified_activity_date
     FROM users u LEFT JOIN user_point_ledger l ON l.user_id = u.id LEFT JOIN user_reward_streaks s ON s.user_id = u.id
     WHERE u.id = $1 GROUP BY u.id, u.referral_code, u.role, s.current_streak_days, s.highest_streak_days, s.last_qualified_activity_date`, [userId]
  );
  const row = result.rows[0];
  if (!row) throw new HttpError(404, "User not found.");
  const transactions = await getPool().query<{ id: string; points: number; reason: RewardEventType; created_at: Date }>(
    `SELECT id, points, reason, created_at FROM user_point_ledger WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`, [userId]
  );
  const today = new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date(`${today}T00:00:00.000Z`);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const current = row.last_qualified_activity_date === today || row.last_qualified_activity_date === yesterdayDate.toISOString().slice(0, 10)
    ? Number(row.current_streak_days) : 0;
  return {
    eligible: eligibleRoles.includes(row.role as typeof eligibleRoles[number]),
    totalPoints: Number(row.total_points), activityPoints: Number(row.activity_points), referralPoints: Number(row.referral_points),
    favoritePoints: Number(row.favorite_points), qualityChatPoints: Number(row.quality_chat_points), roomOwnerPoints: Number(row.room_owner_points),
    streakPoints: Number(row.streak_points), favoriteCount: Number(row.favorite_count), qualifiedReferrals: Number(row.qualified_referrals),
    referralCode: row.referral_code, currentStreakDays: current, highestStreakDays: Number(row.highest_streak_days),
    nextStreakMilestone: current < 3 ? 3 : current < 7 ? 7 : null,
    recentTransactions: transactions.rows.map(item => ({ id: item.id, points: item.points, eventType: item.reason, createdAt: item.created_at.toISOString() })),
    canonicalTimeZone: rewardConfig.canonicalTimeZone,
  };
}

export async function getAdminRewardOverview() {
  const pool = getPool();
  const [daily, byType, topEarners] = await Promise.all([
    pool.query<{ date: string; points: string }>(
      `SELECT day::date::text AS date, COALESCE(SUM(l.points), 0)::text AS points
       FROM generate_series((NOW() AT TIME ZONE 'UTC')::date - 6, (NOW() AT TIME ZONE 'UTC')::date, INTERVAL '1 day') day
       LEFT JOIN user_point_ledger l ON l.created_at >= day AND l.created_at < day + INTERVAL '1 day'
       GROUP BY day ORDER BY day`
    ),
    pool.query<{ event_type: RewardEventType; points: string; transactions: string }>(
      `SELECT reason AS event_type, SUM(points)::text AS points, COUNT(*)::text AS transactions
       FROM user_point_ledger WHERE created_at >= ((NOW() AT TIME ZONE 'UTC')::date - 29) AT TIME ZONE 'UTC' GROUP BY reason ORDER BY SUM(points) DESC`
    ),
    pool.query<{ user_id: string; display_name: string; email: string; points: string }>(
      `SELECT u.id AS user_id, u.display_name, u.email, SUM(l.points)::text AS points
       FROM user_point_ledger l JOIN users u ON u.id = l.user_id
       WHERE l.created_at >= ((NOW() AT TIME ZONE 'UTC')::date - 29) AT TIME ZONE 'UTC' GROUP BY u.id, u.display_name, u.email
       ORDER BY SUM(l.points) DESC LIMIT 5`
    ),
  ]);
  return {
    daily: daily.rows.map(row => ({ date: row.date, points: Number(row.points) })),
    byType: byType.rows.map(row => ({ eventType: row.event_type, points: Number(row.points), transactions: Number(row.transactions) })),
    topEarners: topEarners.rows.map(row => ({ userId: row.user_id, displayName: row.display_name, email: row.email, points: Number(row.points) })),
  };
}

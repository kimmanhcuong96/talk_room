import { rewardConfig } from "./rewardConfig.js";

export const ACTIVITY_SECONDS_PER_POINT = rewardConfig.roomTime.secondsPerPoint;
export const DAILY_ACTIVITY_SECONDS_CAP = rewardConfig.roomTime.dailySecondsCap;
export const REFERRAL_QUALIFY_SECONDS = rewardConfig.referral.qualifySeconds;

export function calculateActivityPointUpdate(previousSeconds: number, previousPoints: number, durationSeconds: number) {
  const eligibleSeconds = Math.min(
    DAILY_ACTIVITY_SECONDS_CAP,
    Math.max(0, previousSeconds) + Math.max(0, durationSeconds)
  );
  const totalPoints = Math.floor(eligibleSeconds / ACTIVITY_SECONDS_PER_POINT);
  return {
    eligibleSeconds,
    totalPoints,
    pointsToAward: Math.max(0, totalPoints - Math.max(0, previousPoints)),
  };
}

export function splitActivityByUtcDate(startedAt: number, endedAt: number) {
  const segments: Array<{ activityDate: string; durationSeconds: number }> = [];
  let cursor = Math.max(0, startedAt);
  const end = Math.max(cursor, endedAt);
  while (cursor < end) {
    const date = new Date(cursor);
    const nextDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
    const segmentEnd = Math.min(end, nextDay);
    segments.push({
      activityDate: date.toISOString().slice(0, 10),
      durationSeconds: Math.max(0, Math.floor((segmentEnd - cursor) / 1000)),
    });
    cursor = segmentEnd;
  }
  return segments;
}

export function isQualityChatMessage(text: string) {
  const normalized = text.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
  const words = normalized.match(/[\p{L}\p{N}]+/gu) ?? [];
  return {
    normalized,
    qualified: normalized.length >= rewardConfig.qualityChat.minCharacters
      && words.length >= rewardConfig.qualityChat.minWords
      && new Set(words).size >= 3,
  };
}

export function calculateStreakUpdate(previous: {
  currentStreakDays: number; highestStreakDays: number; streakStartedOn: string | null; lastQualifiedDate: string | null;
}, activityDate: string) {
  const priorDate = new Date(`${activityDate}T00:00:00.000Z`);
  priorDate.setUTCDate(priorDate.getUTCDate() - 1);
  const consecutive = previous.lastQualifiedDate === priorDate.toISOString().slice(0, 10);
  const currentStreakDays = consecutive ? Math.max(0, previous.currentStreakDays) + 1 : 1;
  return {
    currentStreakDays,
    highestStreakDays: Math.max(previous.highestStreakDays, currentStreakDays),
    streakStartedOn: consecutive && previous.streakStartedOn ? previous.streakStartedOn : activityDate,
    reachedMilestone: currentStreakDays === 3 ? 3 as const : currentStreakDays === 7 ? 7 as const : null,
  };
}

export function buildEligibleSegments(
  startedAt: number,
  endedAt: number,
  eligibleAtStart: boolean,
  changes: Array<{ changedAt: number; eligible: boolean }>
) {
  const segments: Array<{ startedAt: number; endedAt: number }> = [];
  let eligible = eligibleAtStart;
  let eligibleSince: number | null = eligible ? startedAt : null;
  for (const change of [...changes].sort((a, b) => a.changedAt - b.changedAt)) {
    const changedAt = Math.min(endedAt, Math.max(startedAt, change.changedAt));
    if (eligible && !change.eligible && eligibleSince !== null && changedAt > eligibleSince) {
      segments.push({ startedAt: eligibleSince, endedAt: changedAt });
    }
    if (!eligible && change.eligible) eligibleSince = changedAt;
    eligible = change.eligible;
    if (!eligible) eligibleSince = null;
  }
  if (eligible && eligibleSince !== null && endedAt > eligibleSince) segments.push({ startedAt: eligibleSince, endedAt });
  return segments;
}

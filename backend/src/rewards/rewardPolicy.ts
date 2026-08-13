export const ACTIVITY_SECONDS_PER_POINT = 5 * 60;
export const DAILY_ACTIVITY_SECONDS_CAP = 2 * 60 * 60;
export const REFERRAL_QUALIFY_SECONDS = 30 * 60;

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

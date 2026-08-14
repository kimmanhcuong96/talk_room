import assert from "node:assert/strict";
import test from "node:test";
import { buildEligibleSegments, calculateActivityPointUpdate, calculateStreakUpdate, isQualityChatMessage, splitActivityByUtcDate } from "../src/rewards/rewardPolicy.js";
import { isRewardEligibleRole } from "../src/rewards/rewardConfig.js";

test("room activity points accumulate across short sessions", () => {
  assert.deepEqual(calculateActivityPointUpdate(120, 0, 179), { eligibleSeconds: 299, totalPoints: 0, pointsToAward: 0 });
  assert.deepEqual(calculateActivityPointUpdate(299, 0, 1), { eligibleSeconds: 300, totalPoints: 1, pointsToAward: 1 });
});

test("quality chat requires meaningful length and vocabulary", () => {
  assert.equal(isQualityChatMessage("hello hello hello hello hello").qualified, false);
  assert.equal(isQualityChatMessage("I enjoyed learning a useful phrase today.").qualified, true);
  assert.equal(isQualityChatMessage("ok thanks").qualified, false);
});

test("quality chat normalization is deterministic", () => {
  assert.equal(
    isQualityChatMessage("  I  Enjoyed learning a useful phrase TODAY. ").normalized,
    "i enjoyed learning a useful phrase today."
  );
});

test("only verified and supporter roles are reward eligible", () => {
  assert.equal(isRewardEligibleRole("verified"), true);
  assert.equal(isRewardEligibleRole("supporter"), true);
  assert.equal(isRewardEligibleRole("unverified"), false);
  assert.equal(isRewardEligibleRole("guest"), false);
});

test("streak reaches day 3 and day 7 without resetting", () => {
  let state = { currentStreakDays: 0, highestStreakDays: 0, streakStartedOn: null as string | null, lastQualifiedDate: null as string | null };
  const milestones: Array<number | null> = [];
  for (let day = 1; day <= 8; day += 1) {
    const date = `2026-08-${String(day).padStart(2, "0")}`;
    const next = calculateStreakUpdate(state, date);
    milestones.push(next.reachedMilestone);
    state = { ...next, lastQualifiedDate: date };
  }
  assert.deepEqual(milestones, [null, null, 3, null, null, null, 7, null]);
  assert.equal(state.currentStreakDays, 8);
});

test("a missing qualifying day starts a new streak", () => {
  const next = calculateStreakUpdate({ currentStreakDays: 2, highestStreakDays: 5, streakStartedOn: "2026-08-01", lastQualifiedDate: "2026-08-02" }, "2026-08-04");
  assert.equal(next.currentStreakDays, 1);
  assert.equal(next.highestStreakDays, 5);
  assert.equal(next.streakStartedOn, "2026-08-04");
});

test("room rewards include only eligible portions of a changing session", () => {
  assert.deepEqual(buildEligibleSegments(0, 10_000, false, [
    { changedAt: 2_000, eligible: true }, { changedAt: 7_000, eligible: false }, { changedAt: 9_000, eligible: true },
  ]), [
    { startedAt: 2_000, endedAt: 7_000 }, { startedAt: 9_000, endedAt: 10_000 },
  ]);
});

test("ineligible time is not backfilled when eligibility is restored", () => {
  assert.deepEqual(buildEligibleSegments(0, 5_000, false, [{ changedAt: 4_000, eligible: true }]), [
    { startedAt: 4_000, endedAt: 5_000 },
  ]);
});

test("room activity points cannot exceed the two-hour daily cap", () => {
  assert.deepEqual(calculateActivityPointUpdate(7_100, 23, 1_000), { eligibleSeconds: 7_200, totalPoints: 24, pointsToAward: 1 });
  assert.deepEqual(calculateActivityPointUpdate(7_200, 24, 600), { eligibleSeconds: 7_200, totalPoints: 24, pointsToAward: 0 });
});

test("invalid negative durations never remove points", () => {
  assert.deepEqual(calculateActivityPointUpdate(600, 2, -100), { eligibleSeconds: 600, totalPoints: 2, pointsToAward: 0 });
});

test("activity crossing UTC midnight is credited to both dates", () => {
  const start = Date.parse("2026-08-13T23:55:00.000Z");
  const end = Date.parse("2026-08-14T00:10:00.000Z");
  assert.deepEqual(splitActivityByUtcDate(start, end), [
    { activityDate: "2026-08-13", durationSeconds: 300 },
    { activityDate: "2026-08-14", durationSeconds: 600 },
  ]);
});

import assert from "node:assert/strict";
import test from "node:test";
import { calculateActivityPointUpdate, splitActivityByUtcDate } from "../src/rewards/rewardPolicy.js";

test("room activity points accumulate across short sessions", () => {
  assert.deepEqual(calculateActivityPointUpdate(120, 0, 179), { eligibleSeconds: 299, totalPoints: 0, pointsToAward: 0 });
  assert.deepEqual(calculateActivityPointUpdate(299, 0, 1), { eligibleSeconds: 300, totalPoints: 1, pointsToAward: 1 });
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

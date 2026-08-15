export const rewardConfig = Object.freeze({
  canonicalTimeZone: "UTC",
  roomTime: { secondsPerPoint: 5 * 60, dailySecondsCap: 2 * 60 * 60 },
  referral: { qualifySeconds: 30 * 60, inviterPoints: 100, inviteePoints: 50, dailyInviterPointsCap: 500 },
  favorite: { points: 5, giverMinimumRoomSeconds: 30 * 60 },
  qualityChat: {
    minCharacters: 20,
    minWords: 4,
    cooldownSeconds: 45,
    messagesPerPoint: 3,
    dailyPointsCap: 10,
    recentDuplicateWindowHours: 24,
  },
  roomOwnerJoin: { points: 2, dailyPointsCap: 20 },
  activeDay: { minimumRoomSeconds: 10 * 60 },
  streak: { threeDayPoints: 10, sevenDayPoints: 30 },
} as const);

export const rewardEventTypes = [
  "ROOM_TIME_REWARD", "QUALITY_CHAT_REWARD", "LIKE_RECEIVED_REWARD", "REFERRAL_REWARD",
  "ROOM_PARTICIPANT_JOINED_REWARD", "STREAK_3_DAYS_REWARD", "STREAK_7_DAYS_REWARD", "ADMIN_ADJUSTMENT",
] as const;

export type RewardEventType = typeof rewardEventTypes[number];

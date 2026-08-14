ALTER TABLE user_point_ledger DROP CONSTRAINT IF EXISTS user_point_ledger_reason_check;
ALTER TABLE user_point_ledger DROP CONSTRAINT IF EXISTS user_point_ledger_event_type_check;

UPDATE user_point_ledger SET reason = 'ROOM_TIME_REWARD' WHERE reason = 'room_activity';
UPDATE user_point_ledger SET reason = 'REFERRAL_REWARD' WHERE reason IN ('referral_inviter', 'referral_invitee');
UPDATE user_point_ledger SET reason = 'LIKE_RECEIVED_REWARD' WHERE reason = 'received_favorite';
UPDATE user_point_ledger SET reason = 'ADMIN_ADJUSTMENT' WHERE reason = 'admin_adjustment';

ALTER TABLE user_point_ledger ADD CONSTRAINT user_point_ledger_event_type_check CHECK (reason IN (
  'ROOM_TIME_REWARD', 'QUALITY_CHAT_REWARD', 'LIKE_RECEIVED_REWARD', 'REFERRAL_REWARD',
  'ROOM_PARTICIPANT_JOINED_REWARD', 'STREAK_3_DAYS_REWARD', 'STREAK_7_DAYS_REWARD', 'ADMIN_ADJUSTMENT'
));

CREATE TABLE IF NOT EXISTS user_reward_eligibility_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  eligible BOOLEAN NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS user_reward_eligibility_history_user_changed_idx
  ON user_reward_eligibility_history (user_id, changed_at);
INSERT INTO user_reward_eligibility_history (user_id, eligible)
SELECT u.id, u.role IN ('verified', 'supporter') FROM users u
WHERE NOT EXISTS (SELECT 1 FROM user_reward_eligibility_history h WHERE h.user_id = u.id);

CREATE TABLE IF NOT EXISTS user_reward_active_days (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  source_event_key VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, activity_date)
);

CREATE TABLE IF NOT EXISTS user_reward_streaks (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak_days INTEGER NOT NULL DEFAULT 0 CHECK (current_streak_days >= 0),
  highest_streak_days INTEGER NOT NULL DEFAULT 0 CHECK (highest_streak_days >= 0),
  streak_started_on DATE,
  last_qualified_activity_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_reward_streak_milestones (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  streak_started_on DATE NOT NULL,
  milestone_days INTEGER NOT NULL CHECK (milestone_days IN (3, 7)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, streak_started_on, milestone_days)
);

CREATE TABLE IF NOT EXISTS user_chat_reward_events (
  message_id VARCHAR(255) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id VARCHAR(255) NOT NULL,
  activity_date DATE NOT NULL,
  message_hash CHAR(64) NOT NULL,
  qualified BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS user_chat_reward_events_user_day_idx
  ON user_chat_reward_events (user_id, activity_date, created_at DESC);

CREATE TABLE IF NOT EXISTS user_chat_reward_daily (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  qualifying_messages INTEGER NOT NULL DEFAULT 0 CHECK (qualifying_messages >= 0),
  points_awarded INTEGER NOT NULL DEFAULT 0 CHECK (points_awarded >= 0),
  last_qualifying_message_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, activity_date)
);

CREATE TABLE IF NOT EXISTS user_room_owner_join_reward_history (
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joining_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id VARCHAR(255) NOT NULL,
  rewarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (owner_user_id, joining_user_id),
  CHECK (owner_user_id <> joining_user_id)
);

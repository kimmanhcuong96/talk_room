ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(12);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

UPDATE users
SET referral_code = LOWER(SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 10))
WHERE referral_code IS NULL;

ALTER TABLE users ALTER COLUMN referral_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_referral_code_idx ON users (referral_code);
CREATE INDEX IF NOT EXISTS users_referred_by_idx ON users (referred_by_user_id);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'users'::regclass AND conname = 'users_referrer_not_self') THEN
    ALTER TABLE users ADD CONSTRAINT users_referrer_not_self CHECK (referred_by_user_id IS NULL OR referred_by_user_id <> id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS user_point_ledger (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL CHECK (points <> 0),
  reason VARCHAR(30) NOT NULL CHECK (reason IN ('room_activity', 'referral_inviter', 'referral_invitee', 'received_favorite', 'admin_adjustment')),
  source_key VARCHAR(255) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, reason, source_key)
);
CREATE INDEX IF NOT EXISTS user_point_ledger_user_created_idx ON user_point_ledger (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_point_activity_daily (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  eligible_seconds INTEGER NOT NULL DEFAULT 0 CHECK (eligible_seconds BETWEEN 0 AND 7200),
  points_awarded INTEGER NOT NULL DEFAULT 0 CHECK (points_awarded BETWEEN 0 AND 24),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, activity_date)
);

CREATE TABLE IF NOT EXISTS user_point_activity_sources (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_key VARCHAR(255) NOT NULL,
  activity_date DATE NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, source_key)
);

CREATE TABLE IF NOT EXISTS user_favorites (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  favorite_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, favorite_user_id),
  CHECK (user_id <> favorite_user_id)
);
CREATE INDEX IF NOT EXISTS user_favorites_target_idx ON user_favorites (favorite_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_favorite_reward_history (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  favorite_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, favorite_user_id),
  CHECK (user_id <> favorite_user_id)
);

CREATE TABLE IF NOT EXISTS user_referral_rewards (
  referred_user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  qualified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (referred_user_id <> referrer_user_id)
);

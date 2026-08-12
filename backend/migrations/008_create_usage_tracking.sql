CREATE TABLE IF NOT EXISTS user_room_time_totals (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_seconds BIGINT NOT NULL DEFAULT 0 CHECK (total_seconds >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_room_time_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id VARCHAR(255) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds >= 0)
);
CREATE INDEX IF NOT EXISTS user_room_time_sessions_user_idx ON user_room_time_sessions (user_id, ended_at DESC);

CREATE TABLE IF NOT EXISTS webrtc_usage_daily (
  usage_date DATE NOT NULL,
  transport VARCHAR(10) NOT NULL CHECK (transport IN ('stun', 'turn')),
  total_seconds BIGINT NOT NULL DEFAULT 0 CHECK (total_seconds >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usage_date, transport)
);
CREATE INDEX IF NOT EXISTS webrtc_usage_daily_date_idx ON webrtc_usage_daily (usage_date DESC);

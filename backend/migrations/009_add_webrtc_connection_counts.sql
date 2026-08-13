ALTER TABLE webrtc_usage_daily
  ADD COLUMN IF NOT EXISTS connection_count BIGINT NOT NULL DEFAULT 0 CHECK (connection_count >= 0);

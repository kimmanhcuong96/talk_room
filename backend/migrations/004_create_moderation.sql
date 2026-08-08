CREATE TABLE IF NOT EXISTS moderation_reports (
  id UUID PRIMARY KEY,
  reporter_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reporter_ip_hash CHAR(64) NOT NULL,
  reporter_display_name VARCHAR(255) NOT NULL,
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_ip_hash CHAR(64) NOT NULL,
  target_display_name VARCHAR(255) NOT NULL,
  room_id VARCHAR(255) NOT NULL,
  room_name VARCHAR(255) NOT NULL,
  reason VARCHAR(40) NOT NULL CHECK (reason IN ('harassment', 'hate_speech', 'sexual_content', 'spam', 'impersonation', 'other')),
  details VARCHAR(500),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'blocked', 'dismissed')),
  reviewed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS moderation_reports_created_at_idx ON moderation_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS moderation_reports_status_created_idx ON moderation_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS moderation_reports_target_user_idx ON moderation_reports (target_user_id) WHERE target_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS moderation_reports_target_ip_idx ON moderation_reports (target_ip_hash);

CREATE TABLE IF NOT EXISTS global_user_blocks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ip_hash CHAR(64),
  source_report_id UUID REFERENCES moderation_reports(id) ON DELETE SET NULL,
  blocked_by UUID NOT NULL REFERENCES admin_users(id),
  reason VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (user_id IS NOT NULL AND ip_hash IS NULL AND expires_at IS NULL)
    OR (user_id IS NULL AND ip_hash IS NOT NULL AND expires_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS global_user_blocks_user_idx ON global_user_blocks (user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS global_user_blocks_ip_idx ON global_user_blocks (ip_hash, expires_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS global_user_blocks_report_idx ON global_user_blocks (source_report_id);

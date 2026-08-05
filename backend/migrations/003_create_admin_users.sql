CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY,
  google_id VARCHAR(255) UNIQUE,
  email VARCHAR(320) NOT NULL UNIQUE,
  display_name VARCHAR(255),
  avatar_url TEXT,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin')),
  status VARCHAR(20) NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'suspended')),
  invited_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS admin_users_email_idx ON admin_users (email);
CREATE INDEX IF NOT EXISTS admin_users_status_idx ON admin_users (status);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY,
  actor_admin_id UUID REFERENCES admin_users(id),
  action VARCHAR(100) NOT NULL,
  target_user_id UUID REFERENCES users(id),
  target_admin_id UUID REFERENCES admin_users(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_actor_idx ON admin_audit_logs (actor_admin_id);
CREATE INDEX IF NOT EXISTS admin_audit_logs_created_at_idx ON admin_audit_logs (created_at DESC);

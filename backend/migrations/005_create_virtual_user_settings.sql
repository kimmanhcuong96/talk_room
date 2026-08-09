CREATE TABLE IF NOT EXISTS virtual_user_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  virtual_user_count INTEGER NOT NULL DEFAULT 6 CHECK (virtual_user_count BETWEEN 1 AND 72),
  target_room_count INTEGER NOT NULL DEFAULT 6 CHECK (target_room_count BETWEEN 1 AND 18),
  updated_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (virtual_user_count >= target_room_count),
  CHECK (virtual_user_count <= target_room_count * 4)
);

INSERT INTO virtual_user_settings (id, enabled, virtual_user_count, target_room_count)
VALUES (1, FALSE, 6, 6)
ON CONFLICT (id) DO NOTHING;

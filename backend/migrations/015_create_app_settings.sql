CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

INSERT INTO app_settings (key, value)
VALUES ('totalPresenceBots', '0')
ON CONFLICT (key) DO NOTHING;

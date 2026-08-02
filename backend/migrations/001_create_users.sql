CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  google_id VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(320) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_google_id_idx ON users (google_id);
CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);

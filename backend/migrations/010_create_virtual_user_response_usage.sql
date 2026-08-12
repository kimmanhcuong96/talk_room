CREATE TABLE IF NOT EXISTS virtual_user_response_events (
  id UUID PRIMARY KEY,
  virtual_user_id VARCHAR(6) NOT NULL REFERENCES virtual_user_profiles(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL,
  source VARCHAR(10) NOT NULL CHECK (source IN ('rule', 'llm')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS virtual_user_response_events_created_at_idx ON virtual_user_response_events (created_at DESC);
CREATE INDEX IF NOT EXISTS virtual_user_response_events_source_idx ON virtual_user_response_events (source, created_at DESC);

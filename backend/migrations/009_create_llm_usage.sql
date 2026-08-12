CREATE TABLE IF NOT EXISTS llm_usage_events (
  id UUID PRIMARY KEY,
  provider VARCHAR(40) NOT NULL,
  model VARCHAR(160) NOT NULL,
  virtual_user_id VARCHAR(6) NOT NULL REFERENCES virtual_user_profiles(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  total_tokens INTEGER NOT NULL DEFAULT 0 CHECK (total_tokens >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS llm_usage_events_created_at_idx ON llm_usage_events (created_at DESC);
CREATE INDEX IF NOT EXISTS llm_usage_events_provider_model_idx ON llm_usage_events (provider, model);
CREATE INDEX IF NOT EXISTS llm_usage_events_virtual_user_idx ON llm_usage_events (virtual_user_id);

CREATE TABLE IF NOT EXISTS llm_usage_counters (
  scope TEXT PRIMARY KEY,
  total_tokens BIGINT NOT NULL DEFAULT 0 CHECK (total_tokens >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO llm_usage_counters (scope, total_tokens)
SELECT 'application', COALESCE(SUM(total_tokens), 0)
FROM llm_usage_events
ON CONFLICT (scope) DO NOTHING;

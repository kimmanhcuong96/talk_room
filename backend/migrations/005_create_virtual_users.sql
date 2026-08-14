BEGIN;

-- Final Virtual User schema. This file replaces the former 005/006/007/009/010/012/013 files.
-- All statements are rerunnable so an already-migrated database is safe to upgrade.
DROP TABLE IF EXISTS virtual_user_settings;

CREATE TABLE IF NOT EXISTS virtual_user_profiles (
  id VARCHAR(6) PRIMARY KEY CHECK (id ~ '^bot-(0[1-9]|1[0-5])$'),
  name VARCHAR(80) NOT NULL,
  avatar_url TEXT,
  english_level VARCHAR(40) NOT NULL,
  personality TEXT NOT NULL,
  interests TEXT[] NOT NULL DEFAULT '{}',
  speaking_style TEXT NOT NULL,
  reply_probability NUMERIC(4,3) NOT NULL DEFAULT 0.500 CHECK (reply_probability BETWEEN 0 AND 1),
  proactive_message_probability NUMERIC(4,3) NOT NULL DEFAULT 0.500 CHECK (proactive_message_probability BETWEEN 0 AND 1),
  long_response_delay_min_seconds INTEGER NOT NULL DEFAULT 5 CHECK (long_response_delay_min_seconds BETWEEN 1 AND 120),
  long_response_delay_max_seconds INTEGER NOT NULL DEFAULT 15 CHECK (long_response_delay_max_seconds BETWEEN 1 AND 120),
  single_sentence_probability INTEGER NOT NULL DEFAULT 70 CHECK (single_sentence_probability BETWEEN 0 AND 100),
  two_sentence_probability INTEGER NOT NULL DEFAULT 30 CHECK (two_sentence_probability BETWEEN 0 AND 100),
  leave_when_rejected_probability INTEGER NOT NULL DEFAULT 70 CHECK (leave_when_rejected_probability BETWEEN 0 AND 100),
  non_english_reminder_cooldown_seconds INTEGER NOT NULL DEFAULT 60 CHECK (non_english_reminder_cooldown_seconds BETWEEN 0 AND 3600),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT virtual_user_response_delay_bounds
    CHECK (long_response_delay_min_seconds <= long_response_delay_max_seconds),
  CONSTRAINT virtual_user_sentence_probability_total
    CHECK (single_sentence_probability + two_sentence_probability = 100)
);

ALTER TABLE virtual_user_profiles
  ADD COLUMN IF NOT EXISTS proactive_message_probability NUMERIC(4,3) NOT NULL DEFAULT 0.500
    CHECK (proactive_message_probability BETWEEN 0 AND 1),
  ADD COLUMN IF NOT EXISTS long_response_delay_min_seconds INTEGER NOT NULL DEFAULT 5
    CHECK (long_response_delay_min_seconds BETWEEN 1 AND 120),
  ADD COLUMN IF NOT EXISTS long_response_delay_max_seconds INTEGER NOT NULL DEFAULT 15
    CHECK (long_response_delay_max_seconds BETWEEN 1 AND 120),
  ADD COLUMN IF NOT EXISTS single_sentence_probability INTEGER NOT NULL DEFAULT 70
    CHECK (single_sentence_probability BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS two_sentence_probability INTEGER NOT NULL DEFAULT 30
    CHECK (two_sentence_probability BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS leave_when_rejected_probability INTEGER NOT NULL DEFAULT 70
    CHECK (leave_when_rejected_probability BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS non_english_reminder_cooldown_seconds INTEGER NOT NULL DEFAULT 60
    CHECK (non_english_reminder_cooldown_seconds BETWEEN 0 AND 3600);

UPDATE virtual_user_profiles
SET long_response_delay_min_seconds = 5,
    long_response_delay_max_seconds = 15
WHERE long_response_delay_min_seconds > long_response_delay_max_seconds;

UPDATE virtual_user_profiles
SET single_sentence_probability = 70,
    two_sentence_probability = 30
WHERE single_sentence_probability + two_sentence_probability <> 100;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'virtual_user_profiles'::regclass
      AND conname = 'virtual_user_response_delay_bounds'
  ) THEN
    ALTER TABLE virtual_user_profiles
      ADD CONSTRAINT virtual_user_response_delay_bounds
      CHECK (long_response_delay_min_seconds <= long_response_delay_max_seconds);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'virtual_user_profiles'::regclass
      AND conname = 'virtual_user_sentence_probability_total'
  ) THEN
    ALTER TABLE virtual_user_profiles
      ADD CONSTRAINT virtual_user_sentence_probability_total
      CHECK (single_sentence_probability + two_sentence_probability = 100);
  END IF;
END;
$$;

INSERT INTO virtual_user_profiles
  (id, name, avatar_url, english_level, personality, interests, speaking_style, reply_probability, enabled)
VALUES
  ('bot-01', 'Emma', NULL, 'B2', 'Friendly, curious, and slightly shy.', ARRAY['travel','movies','food'], 'Casual, natural, and concise.', 0.900, TRUE),
  ('bot-02', 'Jack', NULL, 'B1', 'Easygoing, upbeat, and practical.', ARRAY['sports','music','technology'], 'Short sentences with light humor.', 0.780, TRUE),
  ('bot-03', 'Sophia', NULL, 'C1', 'Thoughtful, warm, and open-minded.', ARRAY['books','culture','psychology'], 'Natural and reflective without being formal.', 0.850, TRUE),
  ('bot-04', 'Noah', NULL, 'B2', 'Curious, playful, and honest.', ARRAY['gaming','science','movies'], 'Relaxed and occasionally witty.', 0.800, TRUE),
  ('bot-05', 'Mia', NULL, 'B1', 'Cheerful, supportive, and talkative.', ARRAY['cooking','fashion','travel'], 'Friendly everyday English.', 0.880, TRUE),
  ('bot-06', 'Leo', NULL, 'B2', 'Calm, direct, and observant.', ARRAY['fitness','business','podcasts'], 'Clear, brief, and confident.', 0.760, TRUE),
  ('bot-07', 'Lina', NULL, 'A2', 'Kind, enthusiastic, and patient.', ARRAY['pets','food','music'], 'Simple vocabulary and short sentences.', 0.900, TRUE),
  ('bot-08', 'Oliver', NULL, 'C1', 'Analytical, curious, and dryly funny.', ARRAY['history','technology','economics'], 'Conversational with precise wording.', 0.720, TRUE),
  ('bot-09', 'Ava', NULL, 'B2', 'Creative, energetic, and empathetic.', ARRAY['art','photography','nature'], 'Expressive but concise.', 0.840, TRUE),
  ('bot-10', 'Ethan', NULL, 'B1', 'Relaxed, friendly, and modest.', ARRAY['football','movies','travel'], 'Informal and straightforward.', 0.770, TRUE),
  ('bot-11', 'Hana', NULL, 'B2', 'Polite, curious, and quietly funny.', ARRAY['languages','coffee','design'], 'Warm and natural with occasional emojis.', 0.830, TRUE),
  ('bot-12', 'Kai', NULL, 'A2', 'Positive, patient, and adventurous.', ARRAY['games','food','animals'], 'Simple, casual English.', 0.860, TRUE),
  ('bot-13', 'Grace', NULL, 'C1', 'Independent, thoughtful, and candid.', ARRAY['books','career','current affairs'], 'Concise and gently challenging.', 0.740, TRUE),
  ('bot-14', 'Ben', NULL, 'B1', 'Sociable, humorous, and curious.', ARRAY['music','sports','street food'], 'Lively, short, and casual.', 0.810, TRUE),
  ('bot-15', 'Zoe', NULL, 'B2', 'Imaginative, friendly, and spontaneous.', ARRAY['films','travel','creative writing'], 'Natural, playful conversation.', 0.820, TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS virtual_user_response_events (
  id UUID PRIMARY KEY,
  virtual_user_id VARCHAR(6) NOT NULL REFERENCES virtual_user_profiles(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL,
  source VARCHAR(10) NOT NULL CHECK (source IN ('rule', 'llm')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS virtual_user_response_events_created_at_idx
  ON virtual_user_response_events (created_at DESC);
CREATE INDEX IF NOT EXISTS virtual_user_response_events_source_idx
  ON virtual_user_response_events (source, created_at DESC);

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

CREATE INDEX IF NOT EXISTS llm_usage_events_created_at_idx
  ON llm_usage_events (created_at DESC);
CREATE INDEX IF NOT EXISTS llm_usage_events_provider_model_idx
  ON llm_usage_events (provider, model);
CREATE INDEX IF NOT EXISTS llm_usage_events_virtual_user_idx
  ON llm_usage_events (virtual_user_id);

CREATE TABLE IF NOT EXISTS llm_usage_counters (
  scope TEXT PRIMARY KEY,
  total_tokens BIGINT NOT NULL DEFAULT 0 CHECK (total_tokens >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO llm_usage_counters (scope, total_tokens)
SELECT 'application', COALESCE(SUM(total_tokens), 0)
FROM llm_usage_events
ON CONFLICT (scope) DO NOTHING;

COMMIT;

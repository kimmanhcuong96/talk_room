ALTER TABLE virtual_user_profiles
  ADD COLUMN IF NOT EXISTS proactive_message_probability NUMERIC(4,3) NOT NULL DEFAULT 0.500
  CHECK (proactive_message_probability BETWEEN 0 AND 1);

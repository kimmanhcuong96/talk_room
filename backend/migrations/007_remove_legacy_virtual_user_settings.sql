-- Migration 005 supported the retired fake-occupancy implementation.
-- Virtual User configuration now lives entirely in virtual_user_profiles.
DROP TABLE IF EXISTS virtual_user_settings;

import type { QueryResultRow } from "pg";
import { writeAudit } from "../admin/adminRepository.js";
import { getPool } from "../db/pool.js";
import { VIRTUAL_USER_IDS, type VirtualUserProfile } from "./virtualUserTypes.js";

type ProfileRow = QueryResultRow & {
  id: string;
  name: string;
  avatar_url: string | null;
  english_level: string;
  personality: string;
  interests: string[];
  speaking_style: string;
  reply_probability: string | number;
  proactive_message_probability: string | number;
  long_response_delay_min_seconds: number;
  long_response_delay_max_seconds: number;
  enabled: boolean;
  updated_at: Date;
};

function toProfile(row: ProfileRow): VirtualUserProfile {
  return {
    id: row.id,
    name: row.name,
    avatarUrl: row.avatar_url,
    englishLevel: row.english_level,
    personality: row.personality,
    interests: row.interests,
    speakingStyle: row.speaking_style,
    replyProbability: Number(row.reply_probability),
    proactiveMessageProbability: Number(row.proactive_message_probability),
    longResponseDelayMinSeconds: Number(row.long_response_delay_min_seconds),
    longResponseDelayMaxSeconds: Number(row.long_response_delay_max_seconds),
    enabled: row.enabled,
    updatedAt: row.updated_at.toISOString()
  };
}

export async function listVirtualUserProfiles() {
  const result = await getPool().query<ProfileRow>(
    `SELECT id, name, avatar_url, english_level, personality, interests, speaking_style,
       reply_probability, proactive_message_probability, long_response_delay_min_seconds,
       long_response_delay_max_seconds, enabled, updated_at
     FROM virtual_user_profiles ORDER BY id`
  );
  return result.rows.map(toProfile);
}

export type VirtualUserProfileUpdate = Pick<VirtualUserProfile,
  "name" | "avatarUrl" | "englishLevel" | "personality" | "interests" | "speakingStyle" | "replyProbability" | "proactiveMessageProbability" | "longResponseDelayMinSeconds" | "longResponseDelayMaxSeconds" | "enabled"
>;

export async function updateVirtualUserProfile(actorAdminId: string, id: string, input: VirtualUserProfileUpdate) {
  if (!VIRTUAL_USER_IDS.includes(id)) return null;
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<ProfileRow>(
      `UPDATE virtual_user_profiles SET name = $2, avatar_url = $3, english_level = $4,
         personality = $5, interests = $6, speaking_style = $7, reply_probability = $8,
         proactive_message_probability = $9, long_response_delay_min_seconds = $10,
         long_response_delay_max_seconds = $11, enabled = $12, updated_by = $13, updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, avatar_url, english_level, personality, interests, speaking_style,
         reply_probability, proactive_message_probability, long_response_delay_min_seconds,
         long_response_delay_max_seconds, enabled, updated_at`,
      [id, input.name, input.avatarUrl, input.englishLevel, input.personality, input.interests,
        input.speakingStyle, input.replyProbability, input.proactiveMessageProbability,
        input.longResponseDelayMinSeconds, input.longResponseDelayMaxSeconds, input.enabled, actorAdminId]
    );
    if (!result.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }
    await writeAudit(client, actorAdminId, "virtual_users.profile_updated", {}, { botId: id, ...input });
    await client.query("COMMIT");
    return toProfile(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

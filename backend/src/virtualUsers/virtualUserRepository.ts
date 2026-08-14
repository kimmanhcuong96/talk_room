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
  single_sentence_probability: number;
  two_sentence_probability: number;
  leave_when_rejected_probability: number;
  non_english_reminder_cooldown_seconds: number;
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
    singleSentenceProbability: Number(row.single_sentence_probability),
    twoSentenceProbability: Number(row.two_sentence_probability),
    leaveWhenRejectedProbability: Number(row.leave_when_rejected_probability),
    nonEnglishReminderCooldownSeconds: Number(row.non_english_reminder_cooldown_seconds),
    enabled: row.enabled,
    updatedAt: row.updated_at.toISOString()
  };
}

export async function listVirtualUserProfiles() {
  const result = await getPool().query<ProfileRow>(
    `SELECT id, name, avatar_url, english_level, personality, interests, speaking_style,
       reply_probability, proactive_message_probability, long_response_delay_min_seconds,
       long_response_delay_max_seconds, single_sentence_probability, two_sentence_probability,
       leave_when_rejected_probability, non_english_reminder_cooldown_seconds, enabled, updated_at
     FROM virtual_user_profiles ORDER BY id`
  );
  return result.rows.map(toProfile);
}

export type VirtualUserProfileUpdate = Pick<VirtualUserProfile,
  "name" | "avatarUrl" | "englishLevel" | "personality" | "interests" | "speakingStyle" | "replyProbability" | "proactiveMessageProbability" | "longResponseDelayMinSeconds" | "longResponseDelayMaxSeconds" | "singleSentenceProbability" | "twoSentenceProbability" | "leaveWhenRejectedProbability" | "nonEnglishReminderCooldownSeconds" | "enabled"
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
         long_response_delay_max_seconds = $11, single_sentence_probability = $12,
         two_sentence_probability = $13, leave_when_rejected_probability = $14,
         non_english_reminder_cooldown_seconds = $15, enabled = $16, updated_by = $17, updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, avatar_url, english_level, personality, interests, speaking_style,
         reply_probability, proactive_message_probability, long_response_delay_min_seconds,
         long_response_delay_max_seconds, single_sentence_probability, two_sentence_probability,
         leave_when_rejected_probability, non_english_reminder_cooldown_seconds, enabled, updated_at`,
      [id, input.name, input.avatarUrl, input.englishLevel, input.personality, input.interests,
        input.speakingStyle, input.replyProbability, input.proactiveMessageProbability,
        input.longResponseDelayMinSeconds, input.longResponseDelayMaxSeconds,
        input.singleSentenceProbability, input.twoSentenceProbability, input.leaveWhenRejectedProbability,
        input.nonEnglishReminderCooldownSeconds, input.enabled, actorAdminId]
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

export async function updateVirtualUserProfiles(actorAdminId: string, profiles: Array<{ id: string; input: VirtualUserProfileUpdate }>) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const updated: VirtualUserProfile[] = [];
    for (const { id, input } of profiles) {
      const result = await client.query<ProfileRow>(
        `UPDATE virtual_user_profiles SET name = $2, avatar_url = $3, english_level = $4,
           personality = $5, interests = $6, speaking_style = $7, reply_probability = $8,
           proactive_message_probability = $9, long_response_delay_min_seconds = $10,
           long_response_delay_max_seconds = $11, single_sentence_probability = $12,
           two_sentence_probability = $13, leave_when_rejected_probability = $14,
           non_english_reminder_cooldown_seconds = $15, enabled = $16, updated_by = $17, updated_at = NOW()
         WHERE id = $1
         RETURNING id, name, avatar_url, english_level, personality, interests, speaking_style,
           reply_probability, proactive_message_probability, long_response_delay_min_seconds,
           long_response_delay_max_seconds, single_sentence_probability, two_sentence_probability,
           leave_when_rejected_probability, non_english_reminder_cooldown_seconds, enabled, updated_at`,
        [id, input.name, input.avatarUrl, input.englishLevel, input.personality, input.interests,
          input.speakingStyle, input.replyProbability, input.proactiveMessageProbability,
          input.longResponseDelayMinSeconds, input.longResponseDelayMaxSeconds,
          input.singleSentenceProbability, input.twoSentenceProbability, input.leaveWhenRejectedProbability,
          input.nonEnglishReminderCooldownSeconds, input.enabled, actorAdminId]
      );
      if (!result.rows[0]) throw new Error(`Virtual user ${id} was not found.`);
      updated.push(toProfile(result.rows[0]));
      await writeAudit(client, actorAdminId, "virtual_users.profile_imported", {}, { botId: id, ...input });
    }
    await client.query("COMMIT");
    return updated;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

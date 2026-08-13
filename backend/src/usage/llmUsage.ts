import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getPool } from "../db/pool.js";
import type { LLMGeneration, LLMUsage, LLMUsageCoordinator } from "../virtualUsers/virtualUserTypes.js";

export type LLMUsageTotals = {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type LLMUsageBreakdownItem = {
  key: string;
  label: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type LLMUsageSummary = {
  periods: {
    today: LLMUsageTotals;
    week: LLMUsageTotals;
    month: LLMUsageTotals;
    year: LLMUsageTotals;
  };
  byProvider: LLMUsageBreakdownItem[];
  byModel: LLMUsageBreakdownItem[];
  byVirtualUser: LLMUsageBreakdownItem[];
};

function toInt(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function rowToTotals(row: Record<string, unknown> | undefined): LLMUsageTotals {
  return {
    requests: toInt(row?.requests),
    inputTokens: toInt(row?.input_tokens),
    outputTokens: toInt(row?.output_tokens),
    totalTokens: toInt(row?.total_tokens)
  };
}

function rowToBreakdown(row: Record<string, unknown>): LLMUsageBreakdownItem {
  return {
    key: String(row.key ?? ""),
    label: String(row.label ?? row.key ?? ""),
    requests: toInt(row.requests),
    inputTokens: toInt(row.input_tokens),
    outputTokens: toInt(row.output_tokens),
    totalTokens: toInt(row.total_tokens)
  };
}

let trackingDisabled = false;

function tokenCount(value: number) {
  if (!Number.isFinite(value) || value < 0) throw new Error("LLM provider returned invalid token usage.");
  return Math.min(Number.MAX_SAFE_INTEGER, Math.ceil(value));
}

function normalizeUsage(usage: LLMUsage): LLMUsage {
  const inputTokens = tokenCount(usage.inputTokens);
  const outputTokens = tokenCount(usage.outputTokens);
  return {
    provider: usage.provider.trim().slice(0, 40),
    model: usage.model.trim().slice(0, 160),
    inputTokens,
    outputTokens,
    totalTokens: Math.max(tokenCount(usage.totalTokens), inputTokens + outputTokens)
  };
}

async function insertUsage(client: PoolClient, virtualUserId: string, roomId: string, usage: LLMUsage) {
  const normalized = normalizeUsage(usage);
  if (!normalized.provider || !normalized.model) throw new Error("LLM provider returned incomplete usage metadata.");
  await client.query(
    `INSERT INTO llm_usage_events (id, provider, model, virtual_user_id, room_id, input_tokens, output_tokens, total_tokens)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [randomUUID(), normalized.provider, normalized.model, virtualUserId, roomId, normalized.inputTokens, normalized.outputTokens, normalized.totalTokens]
  );
  const counterUpdate = await client.query(
    `UPDATE llm_usage_counters
     SET total_tokens = total_tokens + $1, updated_at = NOW()
     WHERE scope = 'application'`,
    [normalized.totalTokens]
  );
  if (counterUpdate.rowCount !== 1) throw new Error("LLM usage counter is missing. Run migration 005_create_virtual_users.sql.");
}

export async function recordLLMUsage(virtualUserId: string, roomId: string, usage: LLMUsage) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await insertUsage(client, virtualUserId, roomId, usage);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function getTotalLLMTokens() {
  const result = await getPool().query<{ total_tokens: string }>(
    "SELECT total_tokens::text AS total_tokens FROM llm_usage_counters WHERE scope = 'application'"
  );
  return Number(result.rows[0]?.total_tokens ?? 0);
}

export async function isLLMTokenLimitReached(maxTokens: number | null) {
  if (maxTokens == null || !Number.isFinite(maxTokens) || maxTokens < 0) return false;
  return await getTotalLLMTokens() >= maxTokens;
}

async function generateTracked(
  virtualUserId: string,
  roomId: string,
  maxTokens: number | null,
  generation: () => Promise<LLMGeneration>
) {
  if (trackingDisabled) throw new Error("LLM usage tracking is unavailable; LLM calls are disabled for safety.");

  const client = await getPool().connect();
  let generationCompleted = false;
  try {
    await client.query("BEGIN");
    if (maxTokens !== null) {
      const counter = await client.query<{ total_tokens: string }>(
        "SELECT total_tokens::text AS total_tokens FROM llm_usage_counters WHERE scope = 'application' FOR UPDATE"
      );
      if (!counter.rows[0]) throw new Error("LLM usage counter is missing. Run migration 005_create_virtual_users.sql.");
      if (Number(counter.rows[0]?.total_tokens ?? 0) >= maxTokens) {
        await client.query("ROLLBACK");
        return null;
      }
    }

    const result = await generation();
    generationCompleted = true;
    await insertUsage(client, virtualUserId, roomId, result.usage);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (generationCompleted) trackingDisabled = true;
    throw error;
  } finally {
    client.release();
  }
}

export const llmUsageCoordinator: LLMUsageCoordinator = { generate: generateTracked };

async function totalsSince(sinceExpression: string) {
  const result = await getPool().query(
    `SELECT COUNT(*)::int AS requests,
            COALESCE(SUM(input_tokens), 0)::text AS input_tokens,
            COALESCE(SUM(output_tokens), 0)::text AS output_tokens,
            COALESCE(SUM(total_tokens), 0)::text AS total_tokens
     FROM llm_usage_events
     WHERE created_at >= ${sinceExpression}`
  );
  return rowToTotals(result.rows[0]);
}

async function breakdown(groupSql: string, labelSql: string) {
  const result = await getPool().query(
    `SELECT ${groupSql} AS key,
            ${labelSql} AS label,
            COUNT(*)::int AS requests,
            COALESCE(SUM(input_tokens), 0)::text AS input_tokens,
            COALESCE(SUM(output_tokens), 0)::text AS output_tokens,
            COALESCE(SUM(total_tokens), 0)::text AS total_tokens
     FROM llm_usage_events events
     LEFT JOIN virtual_user_profiles profiles ON profiles.id = events.virtual_user_id
     WHERE events.created_at >= date_trunc('month', NOW())
     GROUP BY key, label
     ORDER BY total_tokens DESC
     LIMIT 50`
  );
  return result.rows.map(rowToBreakdown);
}

export async function getLLMUsageSummary(): Promise<LLMUsageSummary> {
  const [today, week, month, year, byProvider, byModel, byVirtualUser] = await Promise.all([
    totalsSince("date_trunc('day', NOW())"),
    totalsSince("date_trunc('week', NOW())"),
    totalsSince("date_trunc('month', NOW())"),
    totalsSince("date_trunc('year', NOW())"),
    breakdown("events.provider", "events.provider"),
    breakdown("events.provider || ':' || events.model", "events.model"),
    breakdown("events.virtual_user_id", "COALESCE(profiles.name, events.virtual_user_id)")
  ]);
  return { periods: { today, week, month, year }, byProvider, byModel, byVirtualUser };
}

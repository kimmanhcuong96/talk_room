import { randomUUID } from "node:crypto";
import { getPool } from "../db/pool.js";

export type VirtualUserResponseSource = "rule" | "llm";
export type ResponseUsageSummary = {
  total: { rule: number; llm: number };
  periods: {
    today: { rule: number; llm: number };
    week: { rule: number; llm: number };
    month: { rule: number; llm: number };
    year: { rule: number; llm: number };
  };
};

export async function recordVirtualUserResponse(virtualUserId: string, roomId: string, source: VirtualUserResponseSource) {
  await getPool().query(
    `INSERT INTO virtual_user_response_events (id, virtual_user_id, room_id, source) VALUES ($1, $2, $3, $4)`,
    [randomUUID(), virtualUserId, roomId, source]
  );
}

async function countsSince(since: string) {
  const result = await getPool().query<{ source: VirtualUserResponseSource; count: string }>(
    `SELECT source, COUNT(*)::text AS count FROM virtual_user_response_events WHERE created_at >= ${since} GROUP BY source`
  );
  const counts = { rule: 0, llm: 0 };
  for (const row of result.rows) counts[row.source] = Number(row.count ?? 0);
  return counts;
}

export async function getResponseUsageSummary(): Promise<ResponseUsageSummary> {
  const [total, today, week, month, year] = await Promise.all([
    countsSince("TIMESTAMPTZ '-infinity'"),
    countsSince("date_trunc('day', NOW())"),
    countsSince("date_trunc('week', NOW())"),
    countsSince("date_trunc('month', NOW())"),
    countsSince("date_trunc('year', NOW())")
  ]);
  return { total, periods: { today, week, month, year } };
}

import { getPool } from "../db/pool.js";

type Active = { transport: "stun" | "turn"; startedAt: number };
const active = new Map<string, Active>();

export async function recordWebRtcTransport(connectionId: string, transport: "stun" | "turn") {
  if (transport !== "stun" && transport !== "turn") return;
  const current = active.get(connectionId);
  const now = Date.now();
  if (current?.transport === transport) return;
  active.set(connectionId, { transport, startedAt: now });
  if (current) await persist(current.transport, current.startedAt, now);
}

export async function finishWebRtcConnection(connectionId: string) {
  const current = active.get(connectionId);
  if (!current) return;
  active.delete(connectionId);
  await persist(current.transport, current.startedAt, Date.now());
}

async function persist(transport: "stun" | "turn", startedAt: number, endedAt: number) {
  const buckets = new Map<string, number>();
  let cursor = startedAt;
  while (cursor < endedAt) {
    const date = new Date(cursor);
    const dayEnd = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
    const seconds = Math.max(0, Math.floor((Math.min(endedAt, dayEnd) - cursor) / 1000));
    const key = new Date(cursor).toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + seconds);
    cursor = dayEnd;
  }
  try {
    for (const [date, seconds] of buckets) {
      await getPool().query(
        `INSERT INTO webrtc_usage_daily (usage_date, transport, total_seconds) VALUES ($1, $2, $3)
         ON CONFLICT (usage_date, transport) DO UPDATE SET total_seconds = webrtc_usage_daily.total_seconds + EXCLUDED.total_seconds, updated_at = NOW()`,
        [date, transport, seconds]
      );
    }
  } catch (error) { console.error("Unable to persist WebRTC usage", error); }
}

export async function getWebRtcUsageSummary() {
  const result = await getPool().query<{ usage_date: string; transport: "stun" | "turn"; total_seconds: string }>(
    `SELECT usage_date::text, transport, total_seconds::text FROM webrtc_usage_daily WHERE usage_date >= CURRENT_DATE - INTERVAL '1 year' ORDER BY usage_date`
  );
  const now = new Date();
  const rows = result.rows.map((row) => ({ date: row.usage_date, transport: row.transport, seconds: Number(row.total_seconds) }));
  const sum = (from: Date) => rows.reduce((acc, row) => row.date >= from.toISOString().slice(0, 10) ? { ...acc, [row.transport]: (acc[row.transport] ?? 0) + row.seconds } : acc, {} as Record<string, number>);
  const startWeek = new Date(now); startWeek.setUTCDate(now.getUTCDate() - 6);
  const startMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  return { daily: sum(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))), weekly: sum(startWeek), monthly: sum(startMonth), yearly: sum(startYear), series: rows };
}

import { getPool } from "../db/pool.js";

const TOTAL_PRESENCE_BOTS_KEY = "totalPresenceBots";

export async function getTotalPresenceBots() {
  const result = await getPool().query<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = $1",
    [TOTAL_PRESENCE_BOTS_KEY]
  );
  const value = Number(result.rows[0]?.value ?? 0);
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

export async function updateTotalPresenceBots(value: number) {
  await getPool().query(
    `INSERT INTO app_settings (key, value)
     VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [TOTAL_PRESENCE_BOTS_KEY, String(value)]
  );
  return value;
}

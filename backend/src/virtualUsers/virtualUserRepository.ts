import type { QueryResultRow } from "pg";
import { writeAudit } from "../admin/adminRepository.js";
import { getPool } from "../db/pool.js";

export type VirtualUserSettings = {
  enabled: boolean;
  virtualUserCount: number;
  targetRoomCount: number;
  updatedAt: string;
};

type SettingsRow = QueryResultRow & {
  enabled: boolean;
  virtual_user_count: number;
  target_room_count: number;
  updated_at: Date;
};

function toSettings(row: SettingsRow): VirtualUserSettings {
  return {
    enabled: row.enabled,
    virtualUserCount: row.virtual_user_count,
    targetRoomCount: row.target_room_count,
    updatedAt: row.updated_at.toISOString()
  };
}

export async function getVirtualUserSettings() {
  const result = await getPool().query<SettingsRow>(
    `SELECT enabled, virtual_user_count, target_room_count, updated_at
     FROM virtual_user_settings WHERE id = 1`
  );
  return result.rows[0] ? toSettings(result.rows[0]) : null;
}

export async function updateVirtualUserSettings(
  actorAdminId: string,
  input: Pick<VirtualUserSettings, "enabled" | "virtualUserCount" | "targetRoomCount">
) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<SettingsRow>(
      `INSERT INTO virtual_user_settings (id, enabled, virtual_user_count, target_room_count, updated_by, updated_at)
       VALUES (1, $1, $2, $3, $4, NOW())
       ON CONFLICT (id) DO UPDATE SET enabled = EXCLUDED.enabled,
         virtual_user_count = EXCLUDED.virtual_user_count,
         target_room_count = EXCLUDED.target_room_count,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING enabled, virtual_user_count, target_room_count, updated_at`,
      [input.enabled, input.virtualUserCount, input.targetRoomCount, actorAdminId]
    );
    await writeAudit(client, actorAdminId, "virtual_users.settings_updated", {}, input);
    await client.query("COMMIT");
    return toSettings(result.rows[0]!);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

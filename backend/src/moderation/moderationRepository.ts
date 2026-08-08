import { randomUUID } from "node:crypto";
import type { QueryResultRow } from "pg";
import { writeAudit } from "../admin/adminRepository.js";
import { getPool } from "../db/pool.js";
import { HttpError } from "../errors/httpError.js";

export const reportReasons = ["harassment", "hate_speech", "sexual_content", "spam", "impersonation", "other"] as const;
export type ReportReason = (typeof reportReasons)[number];
export type ReportStatus = "pending" | "blocked" | "dismissed";

type ReportRow = QueryResultRow & {
  id: string;
  reporter_user_id: string | null;
  reporter_display_name: string;
  reporter_email: string | null;
  target_user_id: string | null;
  target_ip_hash: string;
  target_display_name: string;
  target_email: string | null;
  room_id: string;
  room_name: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  reviewed_by: string | null;
  reviewer_email: string | null;
  reviewed_at: Date | null;
  created_at: Date;
};

const reportSelect = `
  SELECT reports.id, reports.reporter_user_id, reports.reporter_display_name,
         reporter.email AS reporter_email, reports.target_user_id, reports.target_ip_hash,
         reports.target_display_name, target.email AS target_email, reports.room_id,
         reports.room_name, reports.reason, reports.details, reports.status,
         reports.reviewed_by, reviewer.email AS reviewer_email, reports.reviewed_at,
         reports.created_at
  FROM moderation_reports reports
  LEFT JOIN users reporter ON reporter.id = reports.reporter_user_id
  LEFT JOIN users target ON target.id = reports.target_user_id
  LEFT JOIN admin_users reviewer ON reviewer.id = reports.reviewed_by`;

function toReport(row: ReportRow) {
  return {
    id: row.id,
    reporter: { userId: row.reporter_user_id, displayName: row.reporter_display_name, email: row.reporter_email },
    target: { userId: row.target_user_id, displayName: row.target_display_name, email: row.target_email },
    roomId: row.room_id,
    roomName: row.room_name,
    reason: row.reason,
    details: row.details,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewerEmail: row.reviewer_email,
    reviewedAt: row.reviewed_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString()
  };
}

export async function createModerationReport(input: {
  reporterUserId: string | null;
  reporterIpHash: string;
  reporterDisplayName: string;
  targetUserId: string | null;
  targetIpHash: string;
  targetDisplayName: string;
  roomId: string;
  roomName: string;
  reason: ReportReason;
  details: string | null;
}) {
  const duplicate = await getPool().query<{ id: string }>(
    `SELECT id FROM moderation_reports
     WHERE status = 'pending' AND created_at > NOW() - INTERVAL '1 hour' AND room_id = $5
       AND (($1::uuid IS NOT NULL AND reporter_user_id = $1)
         OR ($1::uuid IS NULL AND reporter_user_id IS NULL AND reporter_ip_hash = $2))
       AND (($3::uuid IS NOT NULL AND target_user_id = $3)
         OR ($3::uuid IS NULL AND target_user_id IS NULL AND target_ip_hash = $4))
     LIMIT 1`,
    [input.reporterUserId, input.reporterIpHash, input.targetUserId, input.targetIpHash, input.roomId]
  );
  if (duplicate.rows[0]) throw new HttpError(429, "You already reported this user recently.");

  const id = randomUUID();
  await getPool().query(
    `INSERT INTO moderation_reports (
       id, reporter_user_id, reporter_ip_hash, reporter_display_name,
       target_user_id, target_ip_hash, target_display_name,
       room_id, room_name, reason, details
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [id, input.reporterUserId, input.reporterIpHash, input.reporterDisplayName,
      input.targetUserId, input.targetIpHash, input.targetDisplayName,
      input.roomId, input.roomName, input.reason, input.details]
  );
  return { id };
}

export async function findActiveGlobalBlock(userId: string | null, ipHash: string) {
  if (userId) {
    const result = await getPool().query<{ id: string; expires_at: Date | null }>(
      `SELECT id, expires_at FROM global_user_blocks
       WHERE user_id = $1 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    return result.rows[0] ?? null;
  }

  const result = await getPool().query<{ id: string; expires_at: Date | null }>(
    `SELECT id, expires_at FROM global_user_blocks
     WHERE ip_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()
     ORDER BY expires_at DESC LIMIT 1`,
    [ipHash]
  );
  return result.rows[0] ?? null;
}

export async function listModerationReports(options: {
  page: number;
  limit: number;
  status?: ReportStatus;
  from?: string;
  to?: string;
}) {
  const params: unknown[] = [];
  const filters: string[] = [];
  if (options.status) {
    params.push(options.status);
    filters.push(`reports.status = $${params.length}`);
  }
  if (options.from) {
    params.push(options.from);
    filters.push(`reports.created_at >= $${params.length}::date`);
  }
  if (options.to) {
    params.push(options.to);
    filters.push(`reports.created_at < ($${params.length}::date + INTERVAL '1 day')`);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const count = await getPool().query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM moderation_reports reports ${where}`, params);
  const offset = (options.page - 1) * options.limit;
  params.push(options.limit, offset);
  const rows = await getPool().query<ReportRow>(
    `${reportSelect} ${where}
     ORDER BY reports.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return { items: rows.rows.map(toReport), total: Number(count.rows[0]?.count ?? 0), page: options.page, limit: options.limit };
}

export async function blockReportedUser(actorAdminId: string, reportId: string) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const report = await client.query<ReportRow>(
      `${reportSelect} WHERE reports.id = $1 FOR UPDATE OF reports`,
      [reportId]
    );
    const row = report.rows[0];
    if (!row) throw new HttpError(404, "Report was not found.");
    if (row.status !== "pending") throw new HttpError(409, "This report has already been reviewed.");

    const expiresAt = row.target_user_id ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const blockId = randomUUID();
    await client.query(
      `INSERT INTO global_user_blocks (id, user_id, ip_hash, source_report_id, blocked_by, reason, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [blockId, row.target_user_id, row.target_user_id ? null : row.target_ip_hash, row.id, actorAdminId, `Confirmed report: ${row.reason}`, expiresAt]
    );
    await client.query(
      `UPDATE moderation_reports SET status = 'blocked', reviewed_by = $2, reviewed_at = NOW() WHERE id = $1`,
      [row.id, actorAdminId]
    );
    await writeAudit(client, actorAdminId, "moderation.report_blocked", { userId: row.target_user_id ?? undefined }, {
      reportId: row.id,
      blockId,
      subjectType: row.target_user_id ? "user" : "ip",
      expiresAt: expiresAt?.toISOString() ?? null
    });
    await client.query("COMMIT");
    return {
      reportId: row.id,
      targetUserId: row.target_user_id,
      targetIpHash: row.target_user_id ? null : row.target_ip_hash,
      expiresAt: expiresAt?.toISOString() ?? null
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function dismissModerationReport(actorAdminId: string, reportId: string) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const updated = await client.query<{ id: string }>(
      `UPDATE moderation_reports
       SET status = 'dismissed', reviewed_by = $2, reviewed_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING id`,
      [reportId, actorAdminId]
    );
    if (!updated.rows[0]) throw new HttpError(409, "Report was not found or has already been reviewed.");
    await writeAudit(client, actorAdminId, "moderation.report_dismissed", {}, { reportId });
    await client.query("COMMIT");
    return { reportId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

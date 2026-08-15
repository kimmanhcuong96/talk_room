import { randomUUID } from "node:crypto";
import type { QueryResultRow } from "pg";
import { getPool } from "../db/pool.js";
import { HttpError } from "../errors/httpError.js";

export type VerificationRequestStatus = "pending" | "approved" | "rejected";
export type VerificationRequest = {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  message: string;
  communityCommitment: boolean;
  status: VerificationRequestStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewerEmail: string | null;
};

type RequestRow = QueryResultRow & {
  id: string; user_id: string; display_name: string; email: string; message: string;
  community_commitment: boolean; status: VerificationRequestStatus; created_at: Date;
  reviewed_at: Date | null; reviewer_email: string | null;
};

function toRequest(row: RequestRow): VerificationRequest {
  return {
    id: row.id, userId: row.user_id, displayName: row.display_name, email: row.email,
    message: row.message, communityCommitment: row.community_commitment, status: row.status,
    createdAt: row.created_at.toISOString(), reviewedAt: row.reviewed_at?.toISOString() ?? null,
    reviewerEmail: row.reviewer_email
  };
}

const requestSelect = `
  SELECT r.id, r.user_id, u.display_name, u.email, r.message, r.community_commitment,
         r.status, r.created_at, r.reviewed_at, a.email AS reviewer_email
  FROM verification_requests r
  JOIN users u ON u.id = r.user_id
  LEFT JOIN admin_users a ON a.id = r.reviewed_by`;

export async function getMyVerificationRequest(userId: string) {
  const result = await getPool().query<RequestRow>(`${requestSelect} WHERE r.user_id = $1 ORDER BY r.created_at DESC LIMIT 1`, [userId]);
  return result.rows[0] ? toRequest(result.rows[0]) : null;
}

export async function createVerificationRequest(userId: string, message: string, communityCommitment: boolean) {
  const existingUser = await getPool().query<{ role: string }>("SELECT role FROM users WHERE id = $1", [userId]);
  if (!existingUser.rows[0]) throw new HttpError(404, "User was not found.");
  if (existingUser.rows[0].role !== "unverified") throw new HttpError(409, "This account is already verified.");
  const existing = await getMyVerificationRequest(userId);
  if (existing?.status === "pending") throw new HttpError(409, "A verification request is already pending.");
  try {
    const requestId = randomUUID();
    await getPool().query(
      `INSERT INTO verification_requests (id, user_id, message, community_commitment) VALUES ($1, $2, $3, $4)`,
      [requestId, userId, message, communityCommitment]
    );
    return getMyVerificationRequest(userId);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      throw new HttpError(409, "A verification request is already pending.");
    }
    throw error;
  }
}

export async function listVerificationRequests(status: VerificationRequestStatus = "pending") {
  const result = await getPool().query<RequestRow>(`${requestSelect} WHERE r.status = $1 ORDER BY r.created_at ASC`, [status]);
  return result.rows.map(toRequest);
}

export async function reviewVerificationRequest(adminId: string, requestId: string, decision: "approved" | "rejected") {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const request = await client.query<{ user_id: string; status: VerificationRequestStatus }>(
      "SELECT user_id, status FROM verification_requests WHERE id = $1 FOR UPDATE", [requestId]
    );
    if (!request.rows[0]) throw new HttpError(404, "Verification request was not found.");
    if (request.rows[0].status !== "pending") throw new HttpError(409, "This verification request has already been reviewed.");
    if (decision === "approved") {
      const updatedUser = await client.query("UPDATE users SET role = 'verified' WHERE id = $1 AND role = 'unverified'", [request.rows[0].user_id]);
      if (updatedUser.rowCount === 1) {
        await client.query("INSERT INTO user_reward_eligibility_history (user_id, eligible) VALUES ($1, TRUE)", [request.rows[0].user_id]);
      }
    }
    await client.query(
      "UPDATE verification_requests SET status = $2, reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW() WHERE id = $1",
      [requestId, decision, adminId]
    );
    await client.query(
      `INSERT INTO admin_audit_logs (id, actor_admin_id, action, target_user_id, metadata)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [randomUUID(), adminId, `verification_request.${decision}`, request.rows[0].user_id, JSON.stringify({ requestId })]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  const result = await getPool().query<RequestRow>(`${requestSelect} WHERE r.id = $1`, [requestId]);
  return result.rows[0] ? toRequest(result.rows[0]) : null;
}

export async function reviewVerificationRequests(adminId: string, requestIds: string[], decision: "approved" | "rejected") {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const pending = await client.query<{ id: string; user_id: string }>(
      "SELECT id, user_id FROM verification_requests WHERE id = ANY($1::uuid[]) AND status = 'pending' FOR UPDATE",
      [requestIds]
    );
    if (pending.rows.length !== requestIds.length) throw new HttpError(409, "One or more requests have already been reviewed.");
    if (decision === "approved") {
      for (const row of pending.rows) {
        const updated = await client.query("UPDATE users SET role = 'verified' WHERE id = $1 AND role = 'unverified'", [row.user_id]);
        if (updated.rowCount === 1) await client.query("INSERT INTO user_reward_eligibility_history (user_id, eligible) VALUES ($1, TRUE)", [row.user_id]);
      }
    }
    await client.query(
      "UPDATE verification_requests SET status = $2, reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW() WHERE id = ANY($1::uuid[])",
      [requestIds, decision, adminId]
    );
    for (const row of pending.rows) {
      await client.query(
        `INSERT INTO admin_audit_logs (id, actor_admin_id, action, target_user_id, metadata)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [randomUUID(), adminId, `verification_request.${decision}`, row.user_id, JSON.stringify({ requestId: row.id, bulk: true })]
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return listVerificationRequests("pending");
}

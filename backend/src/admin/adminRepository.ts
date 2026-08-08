import { randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import type { VerifiedOAuthProfile } from "../auth/providers/types.js";
import { getPool } from "../db/pool.js";
import { HttpError } from "../errors/httpError.js";
import type { UserRole } from "../users/userRepository.js";
import type { AdminProfile, AdminRole, AdminStatus } from "./adminTypes.js";

type AdminRow = QueryResultRow & {
  id: string;
  google_id: string | null;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: AdminRole;
  status: AdminStatus;
  invited_by: string | null;
  created_at: Date;
  activated_at: Date | null;
  last_login: Date | null;
};

type ManagedUserRow = QueryResultRow & {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  role: UserRole;
  created_at: Date;
  last_login: Date;
};

const adminColumns = "id, google_id, email, display_name, avatar_url, role, status, invited_by, created_at, activated_at, last_login";

function toAdminProfile(row: AdminRow): AdminProfile {
  return {
    id: row.id,
    googleId: row.google_id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    role: row.role,
    status: row.status,
    invitedBy: row.invited_by,
    createdAt: row.created_at.toISOString(),
    activatedAt: row.activated_at?.toISOString() ?? null,
    lastLogin: row.last_login?.toISOString() ?? null
  };
}

function toManagedUser(row: ManagedUserRow) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    role: row.role,
    createdAt: row.created_at.toISOString(),
    lastLogin: row.last_login.toISOString()
  };
}

export async function writeAudit(
  client: PoolClient,
  actorAdminId: string | null,
  action: string,
  targets: { userId?: string; adminId?: string },
  metadata: Record<string, unknown> = {}
) {
  await client.query(
    `INSERT INTO admin_audit_logs (id, actor_admin_id, action, target_user_id, target_admin_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [randomUUID(), actorAdminId, action, targets.userId ?? null, targets.adminId ?? null, JSON.stringify(metadata)]
  );
}

export async function findAdminById(id: string) {
  const result = await getPool().query<AdminRow>(`SELECT ${adminColumns} FROM admin_users WHERE id = $1`, [id]);
  return result.rows[0] ? toAdminProfile(result.rows[0]) : null;
}

export async function activateAdminIfEligible(profile: VerifiedOAuthProfile) {
  const result = await getPool().query<Pick<AdminRow, "google_id" | "status"> & QueryResultRow>(
    "SELECT google_id, status FROM admin_users WHERE LOWER(email) = LOWER($1)",
    [profile.email]
  );
  const admin = result.rows[0];
  if (!admin || admin.status === "suspended" || (admin.google_id && admin.google_id !== profile.providerUserId)) {
    return null;
  }
  return activateAdminWithGoogle(profile);
}

export async function activateAdminWithGoogle(profile: VerifiedOAuthProfile) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<AdminRow>(
      `SELECT ${adminColumns} FROM admin_users WHERE LOWER(email) = LOWER($1) FOR UPDATE`,
      [profile.email]
    );
    const existing = result.rows[0];

    if (!existing) {
      throw new HttpError(403, "This Google account has not been invited to the admin area.");
    }
    if (existing.status === "suspended") {
      throw new HttpError(403, "This admin account is suspended.");
    }
    if (existing.google_id && existing.google_id !== profile.providerUserId) {
      throw new HttpError(403, "This admin email is already linked to another Google account.");
    }

    const updated = await client.query<AdminRow>(
      `UPDATE admin_users
       SET google_id = $2, display_name = $3, avatar_url = $4, status = 'active',
           activated_at = COALESCE(activated_at, NOW()), last_login = NOW()
       WHERE id = $1
       RETURNING ${adminColumns}`,
      [existing.id, profile.providerUserId, profile.displayName, profile.avatarUrl]
    );
    if (existing.status === "invited") {
      await writeAudit(client, existing.id, "admin.activated", { adminId: existing.id });
    }
    await client.query("COMMIT");
    return toAdminProfile(updated.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listManagedUsers(options: { page: number; limit: number; search: string; role?: UserRole }) {
  const offset = (options.page - 1) * options.limit;
  const params: unknown[] = [];
  const filters: string[] = [];

  if (options.search) {
    params.push(`%${options.search}%`);
    filters.push(`(email ILIKE $${params.length} OR display_name ILIKE $${params.length})`);
  }
  if (options.role) {
    params.push(options.role);
    filters.push(`role = $${params.length}`);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const countResult = await getPool().query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM users ${where}`, params);
  params.push(options.limit, offset);
  const rows = await getPool().query<ManagedUserRow>(
    `SELECT id, email, display_name, avatar_url, role, created_at, last_login
     FROM users ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { items: rows.rows.map(toManagedUser), total: Number(countResult.rows[0]?.count ?? 0), page: options.page, limit: options.limit };
}

export async function updateManagedUserRole(actorAdminId: string, userId: string, role: UserRole) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{ role: UserRole }>("SELECT role FROM users WHERE id = $1 FOR UPDATE", [userId]);
    if (!current.rows[0]) {
      throw new HttpError(404, "User was not found.");
    }
    const updated = await client.query<ManagedUserRow>(
      `UPDATE users SET role = $2 WHERE id = $1
       RETURNING id, email, display_name, avatar_url, role, created_at, last_login`,
      [userId, role]
    );
    await writeAudit(client, actorAdminId, "user.role_updated", { userId }, { from: current.rows[0].role, to: role });
    await client.query("COMMIT");
    return toManagedUser(updated.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listAdminUsers() {
  const result = await getPool().query<AdminRow>(`SELECT ${adminColumns} FROM admin_users ORDER BY created_at DESC`);
  return result.rows.map(toAdminProfile);
}

export async function inviteAdmin(actorAdminId: string, email: string, role: AdminRole) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<AdminRow>(
      `INSERT INTO admin_users (id, email, role, status, invited_by)
       VALUES ($1, LOWER($2), $3, 'invited', $4)
       RETURNING ${adminColumns}`,
      [randomUUID(), email, role, actorAdminId]
    );
    await writeAudit(client, actorAdminId, "admin.invited", { adminId: result.rows[0].id }, { email: email.toLowerCase(), role });
    await client.query("COMMIT");
    return toAdminProfile(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      throw new HttpError(409, "An admin account with this email already exists.");
    }
    throw error;
  } finally {
    client.release();
  }
}

async function assertOwnerCanBeChanged(client: PoolClient, target: AdminRow, nextRole: AdminRole, nextStatus: AdminStatus) {
  if (target.role !== "owner" || target.status !== "active" || (nextRole === "owner" && nextStatus === "active")) {
    return;
  }
  await client.query("LOCK TABLE admin_users IN SHARE ROW EXCLUSIVE MODE");
  const owners = await client.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM admin_users WHERE role = 'owner' AND status = 'active'"
  );
  if (Number(owners.rows[0]?.count ?? 0) <= 1) {
    throw new HttpError(409, "The last active owner cannot be demoted or suspended.");
  }
}

export async function updateAdminUser(
  actorAdminId: string,
  targetAdminId: string,
  changes: { role?: AdminRole; status?: AdminStatus }
) {
  if (actorAdminId === targetAdminId) {
    throw new HttpError(409, "You cannot change your own admin role or status.");
  }
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<AdminRow>(`SELECT ${adminColumns} FROM admin_users WHERE id = $1 FOR UPDATE`, [targetAdminId]);
    const target = current.rows[0];
    if (!target) {
      throw new HttpError(404, "Admin account was not found.");
    }
    const nextRole = changes.role ?? target.role;
    const nextStatus = changes.status ?? target.status;
    await assertOwnerCanBeChanged(client, target, nextRole, nextStatus);
    const updated = await client.query<AdminRow>(
      `UPDATE admin_users SET role = $2, status = $3 WHERE id = $1 RETURNING ${adminColumns}`,
      [targetAdminId, nextRole, nextStatus]
    );
    await writeAudit(client, actorAdminId, "admin.updated", { adminId: targetAdminId }, {
      from: { role: target.role, status: target.status },
      to: { role: nextRole, status: nextStatus }
    });
    await client.query("COMMIT");
    return toAdminProfile(updated.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function suspendAdminUser(actorAdminId: string, targetAdminId: string) {
  return updateAdminUser(actorAdminId, targetAdminId, { status: "suspended" });
}

export async function bootstrapOwner(email: string) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("LOCK TABLE admin_users IN SHARE ROW EXCLUSIVE MODE");
    const existingOwner = await client.query<AdminRow>(`SELECT ${adminColumns} FROM admin_users WHERE role = 'owner' LIMIT 1`);
    if (existingOwner.rows[0]) {
      if (existingOwner.rows[0].email.toLowerCase() === email.toLowerCase()) {
        await client.query("COMMIT");
        return toAdminProfile(existingOwner.rows[0]);
      }
      throw new HttpError(409, "An owner already exists. Invite additional admins from the admin area.");
    }
    const result = await client.query<AdminRow>(
      `INSERT INTO admin_users (id, email, role, status) VALUES ($1, LOWER($2), 'owner', 'invited') RETURNING ${adminColumns}`,
      [randomUUID(), email]
    );
    await writeAudit(client, null, "admin.owner_bootstrapped", { adminId: result.rows[0].id }, { email: email.toLowerCase() });
    await client.query("COMMIT");
    return toAdminProfile(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

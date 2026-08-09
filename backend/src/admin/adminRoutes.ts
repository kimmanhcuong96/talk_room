import { Router } from "express";
import { verifyGoogleIdToken } from "../auth/providers/googleProvider.js";
import { HttpError } from "../errors/httpError.js";
import type { UserRole } from "../users/userRepository.js";
import { getRequestAdmin, requireAdmin, requireOwner } from "./adminAuth.js";
import { issueAdminJwt } from "./adminJwt.js";
import {
  activateAdminWithGoogle,
  inviteAdmin,
  listAdminUsers,
  listManagedUsers,
  suspendAdminUser,
  updateAdminUser,
  updateManagedUserRole
} from "./adminRepository.js";
import type { AdminRole, AdminStatus } from "./adminTypes.js";
import {
  blockReportedUser,
  dismissModerationReport,
  listModerationReports,
  type ReportStatus
} from "../moderation/moderationRepository.js";
import { evictGloballyBlockedUsers } from "../socket/registerSocketHandlers.js";
import type { AppServer } from "../types/socket.js";
import { getVirtualUserSettings, updateVirtualUserSettings } from "../virtualUsers/virtualUserRepository.js";
import { applyVirtualUserSettings } from "../virtualUsers/virtualUserService.js";

const userRoles = new Set<UserRole>(["unverified", "verified", "supporter"]);
const adminRoles = new Set<AdminRole>(["owner", "admin"]);
const adminStatuses = new Set<AdminStatus>(["invited", "active", "suspended"]);
const reportStatuses = new Set<ReportStatus>(["pending", "blocked", "dismissed"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireUuid(value: string) {
  if (!uuidPattern.test(value)) throw new HttpError(400, "Invalid account identifier.");
  return value;
}

export const adminRouter = Router();

adminRouter.post("/auth/google", async (request, response, next) => {
  try {
    const idToken = typeof request.body?.idToken === "string" ? request.body.idToken : "";
    if (!idToken) {
      throw new HttpError(400, "idToken is required.");
    }
    const googleProfile = await verifyGoogleIdToken(idToken);
    const admin = await activateAdminWithGoogle(googleProfile);
    response.json({ token: issueAdminJwt(admin), admin });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/auth/me", requireAdmin, (request, response) => {
  response.json({ admin: getRequestAdmin(request) });
});

adminRouter.get("/users", requireAdmin, async (request, response, next) => {
  try {
    const page = Math.max(1, Number.parseInt(String(request.query.page ?? "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(String(request.query.limit ?? "20"), 10) || 20));
    const search = String(request.query.search ?? "").trim().slice(0, 100);
    const roleValue = String(request.query.role ?? "");
    const role = userRoles.has(roleValue as UserRole) ? roleValue as UserRole : undefined;
    response.json(await listManagedUsers({ page, limit, search, role }));
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/users/:id/role", requireAdmin, async (request, response, next) => {
  try {
    const role = request.body?.role as UserRole;
    if (!userRoles.has(role)) {
      throw new HttpError(400, "Invalid user role.");
    }
    const user = await updateManagedUserRole(getRequestAdmin(request).id, requireUuid(request.params.id), role);
    response.json({ user });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/virtual-users", requireAdmin, async (_request, response, next) => {
  try {
    const settings = await getVirtualUserSettings();
    if (!settings) throw new HttpError(500, "Virtual user settings are not initialized.");
    response.json({ settings });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/virtual-users", requireAdmin, async (request, response, next) => {
  try {
    const enabled = request.body?.enabled;
    const virtualUserCount = Number(request.body?.virtualUserCount);
    const targetRoomCount = Number(request.body?.targetRoomCount);
    if (typeof enabled !== "boolean"
      || !Number.isInteger(virtualUserCount) || virtualUserCount < 1 || virtualUserCount > 72
      || !Number.isInteger(targetRoomCount) || targetRoomCount < 1 || targetRoomCount > 18
      || virtualUserCount < targetRoomCount || virtualUserCount > targetRoomCount * 4) {
      throw new HttpError(400, "Virtual users must be distributed between 1 and 18 rooms, with 1 to 4 users per room.");
    }
    const settings = await updateVirtualUserSettings(getRequestAdmin(request).id, { enabled, virtualUserCount, targetRoomCount });
    const io = request.app.get("io") as AppServer | undefined;
    if (io) applyVirtualUserSettings(io, settings);
    response.json({ settings });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/reports", requireAdmin, async (request, response, next) => {
  try {
    const page = Math.max(1, Number.parseInt(String(request.query.page ?? "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(String(request.query.limit ?? "20"), 10) || 20));
    const statusValue = String(request.query.status ?? "");
    const status = reportStatuses.has(statusValue as ReportStatus) ? statusValue as ReportStatus : undefined;
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    const fromValue = String(request.query.from ?? "");
    const toValue = String(request.query.to ?? "");
    const from = datePattern.test(fromValue) ? fromValue : undefined;
    const to = datePattern.test(toValue) ? toValue : undefined;
    response.json(await listModerationReports({ page, limit, status, from, to }));
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/reports/:id/block", requireAdmin, async (request, response, next) => {
  try {
    const block = await blockReportedUser(getRequestAdmin(request).id, requireUuid(request.params.id));
    const io = request.app.get("io") as AppServer | undefined;
    if (io) evictGloballyBlockedUsers(io, block);
    response.json({ block });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/reports/:id/dismiss", requireAdmin, async (request, response, next) => {
  try {
    response.json(await dismissModerationReport(getRequestAdmin(request).id, requireUuid(request.params.id)));
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/admins", requireAdmin, requireOwner, async (_request, response, next) => {
  try {
    response.json({ admins: await listAdminUsers() });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/admins", requireAdmin, requireOwner, async (request, response, next) => {
  try {
    const email = typeof request.body?.email === "string" ? request.body.email.trim().toLowerCase() : "";
    const role = request.body?.role as AdminRole;
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      throw new HttpError(400, "A valid email is required.");
    }
    if (!adminRoles.has(role)) {
      throw new HttpError(400, "Invalid admin role.");
    }
    const admin = await inviteAdmin(getRequestAdmin(request).id, email, role);
    response.status(201).json({ admin });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/admins/:id", requireAdmin, requireOwner, async (request, response, next) => {
  try {
    const role = request.body?.role as AdminRole | undefined;
    const status = request.body?.status as AdminStatus | undefined;
    if (role !== undefined && !adminRoles.has(role)) {
      throw new HttpError(400, "Invalid admin role.");
    }
    if (status !== undefined && !adminStatuses.has(status)) {
      throw new HttpError(400, "Invalid admin status.");
    }
    if (role === undefined && status === undefined) {
      throw new HttpError(400, "At least one admin field is required.");
    }
    const admin = await updateAdminUser(getRequestAdmin(request).id, requireUuid(request.params.id), { role, status });
    response.json({ admin });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete("/admins/:id", requireAdmin, requireOwner, async (request, response, next) => {
  try {
    const admin = await suspendAdminUser(getRequestAdmin(request).id, requireUuid(request.params.id));
    response.json({ admin });
  } catch (error) {
    next(error);
  }
});

import { Router } from "express";
import { verifyGoogleIdToken } from "../auth/providers/googleProvider.js";
import { HttpError } from "../errors/httpError.js";
import type { UserRole } from "../users/userRepository.js";
import { getRequestAdmin, requireAdmin, requireOwner } from "./adminAuth.js";
import { issueAdminJwt } from "./adminJwt.js";
import { issueAppJwt, verifyAppJwt } from "../auth/jwt.js";
import { findUserById } from "../users/userRepository.js";
import {
  activateAdminWithGoogle,
  inviteAdmin,
  findActiveAdminForUser,
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
import { updateVirtualUserProfile, updateVirtualUserProfiles, type VirtualUserProfileUpdate } from "../virtualUsers/virtualUserRepository.js";
import { applyVirtualUserProfile, getVirtualUsersForAdmin } from "../virtualUsers/virtualUserService.js";
import { VIRTUAL_USER_IDS, type VirtualUserProfile } from "../virtualUsers/virtualUserTypes.js";
import { getWebRtcUsageSummary } from "../usage/webrtcUsage.js";
import { getTurnUsageStatus } from "../webrtc/turnUsage.js";
import { getLLMUsageSummary } from "../usage/llmUsage.js";
import { getResponseUsageSummary } from "../usage/responseUsage.js";
import { getAdminRewardOverview } from "../rewards/rewardRepository.js";
import { listVerificationRequests, reviewVerificationRequest, reviewVerificationRequests, type VerificationRequestStatus } from "../users/verificationRequestRepository.js";
import { getTotalPresenceBots, updateTotalPresenceBots } from "../settings/appSettings.js";
import { getPresenceBotStatus, refreshPresenceBots } from "../presenceBots/presenceBotService.js";

const userRoles = new Set<UserRole>(["unverified", "verified", "supporter"]);
const adminRoles = new Set<AdminRole>(["owner", "admin"]);
const adminStatuses = new Set<AdminStatus>(["invited", "active", "suspended"]);
const reportStatuses = new Set<ReportStatus>(["pending", "blocked", "dismissed"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireUuid(value: string) {
  if (!uuidPattern.test(value)) throw new HttpError(400, "Invalid account identifier.");
  return value;
}

function isValidAvatarUrl(value: string | null) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && value.length <= 2_048;
  } catch {
    return false;
  }
}

function parseVirtualUserProfileInput(body: Record<string, unknown> | undefined, fallback?: VirtualUserProfile): VirtualUserProfileUpdate {
  const value = body ?? {};
  const name = typeof value.name === "string" ? value.name.trim() : fallback?.name ?? "";
  const avatarHasValidType = value.avatarUrl === undefined
    || value.avatarUrl === null
    || typeof value.avatarUrl === "string";
  const avatarInput = value.avatarUrl === undefined
    ? fallback?.avatarUrl ?? ""
    : value.avatarUrl === null ? "" : typeof value.avatarUrl === "string" ? value.avatarUrl.trim() : "";
  const avatarUrl = avatarInput || null;
  const englishLevel = typeof value.englishLevel === "string" ? value.englishLevel.trim() : fallback?.englishLevel ?? "";
  const personality = typeof value.personality === "string" ? value.personality.trim() : fallback?.personality ?? "";
  const interestsProvided = value.interests !== undefined;
  const interestsAreStrings = Array.isArray(value.interests) && value.interests.every((item) => typeof item === "string");
  const interests = interestsAreStrings
    ? (value.interests as string[]).map((item) => item.trim()).filter(Boolean)
    : fallback?.interests ?? [];
  const speakingStyle = typeof value.speakingStyle === "string" ? value.speakingStyle.trim() : fallback?.speakingStyle ?? "";
  const numberValue = (key: keyof VirtualUserProfile, defaultValue: number) => {
    const input = value[key];
    if (input === undefined) return Number(fallback?.[key] ?? defaultValue);
    return typeof input === "number" ? input : Number.NaN;
  };
  const replyProbability = numberValue("replyProbability", 0.5);
  const proactiveMessageProbability = numberValue("proactiveMessageProbability", 0.5);
  const longResponseDelayMinSeconds = numberValue("longResponseDelayMinSeconds", 5);
  const longResponseDelayMaxSeconds = numberValue("longResponseDelayMaxSeconds", 15);
  const singleSentenceProbability = numberValue("singleSentenceProbability", 60);
  const twoSentenceProbability = numberValue("twoSentenceProbability", 30);
  const threeSentenceProbability = value.threeSentenceProbability === undefined
    && typeof value.singleSentenceProbability === "number"
    && typeof value.twoSentenceProbability === "number"
    ? 100 - singleSentenceProbability - twoSentenceProbability
    : numberValue("threeSentenceProbability", 10);
  const leaveWhenRejectedProbability = numberValue("leaveWhenRejectedProbability", 70);
  const nonEnglishReminderCooldownSeconds = numberValue("nonEnglishReminderCooldownSeconds", 60);
  const enabled = typeof value.enabled === "boolean" ? value.enabled : fallback?.enabled;

  if (!name || name.length > 80 || !avatarHasValidType || !isValidAvatarUrl(avatarUrl)
    || !englishLevel || englishLevel.length > 40 || !personality || personality.length > 1_000
    || (interestsProvided ? !interestsAreStrings : !fallback) || interests.length > 20 || interests.some((item) => item.length > 40)
    || !speakingStyle || speakingStyle.length > 1_000
    || !Number.isFinite(replyProbability) || replyProbability < 0 || replyProbability > 1
    || !Number.isFinite(proactiveMessageProbability) || proactiveMessageProbability < 0 || proactiveMessageProbability > 1
    || !Number.isInteger(longResponseDelayMinSeconds) || longResponseDelayMinSeconds < 1 || longResponseDelayMinSeconds > 120
    || !Number.isInteger(longResponseDelayMaxSeconds) || longResponseDelayMaxSeconds < 1 || longResponseDelayMaxSeconds > 120
    || longResponseDelayMinSeconds > longResponseDelayMaxSeconds
    || !Number.isInteger(singleSentenceProbability) || singleSentenceProbability < 0 || singleSentenceProbability > 100
    || !Number.isInteger(twoSentenceProbability) || twoSentenceProbability < 0 || twoSentenceProbability > 100
    || !Number.isInteger(threeSentenceProbability) || threeSentenceProbability < 0 || threeSentenceProbability > 100
    || singleSentenceProbability + twoSentenceProbability + threeSentenceProbability !== 100
    || !Number.isInteger(leaveWhenRejectedProbability) || leaveWhenRejectedProbability < 0 || leaveWhenRejectedProbability > 100
    || !Number.isInteger(nonEnglishReminderCooldownSeconds) || nonEnglishReminderCooldownSeconds < 0 || nonEnglishReminderCooldownSeconds > 3_600
    || typeof enabled !== "boolean") {
    throw new HttpError(400, "Invalid virtual user profile.");
  }
  return {
    name, avatarUrl, englishLevel, personality, interests, speakingStyle, replyProbability,
    proactiveMessageProbability, longResponseDelayMinSeconds, longResponseDelayMaxSeconds,
    singleSentenceProbability, twoSentenceProbability, threeSentenceProbability, leaveWhenRejectedProbability,
    nonEnglishReminderCooldownSeconds, enabled
  };
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

adminRouter.post("/auth/refresh", async (request, response, next) => {
  try {
    const authorization = request.header("authorization") ?? "";
    const [scheme, token] = authorization.split(" ");
    if (scheme !== "Bearer" || !token) throw new HttpError(401, "Application authentication token is required.");

    const { userId } = verifyAppJwt(token);
    const user = await findUserById(userId);
    if (!user) throw new HttpError(401, "User no longer exists.");

    const admin = await findActiveAdminForUser(user);
    if (!admin) throw new HttpError(403, "Admin account is unavailable.");
    response.json({ token: issueAdminJwt(admin), applicationToken: issueAppJwt(user), admin });
  } catch (error) {
    next(error);
  }
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

adminRouter.get("/rewards", requireAdmin, async (_request, response, next) => {
  try { response.json(await getAdminRewardOverview()); } catch (error) { next(error); }
});

adminRouter.get("/verification-requests", requireAdmin, async (request, response, next) => {
  try {
    const status = String(request.query.status ?? "pending") as VerificationRequestStatus;
    if (!["pending", "approved", "rejected"].includes(status)) throw new HttpError(400, "Invalid verification request status.");
    response.json({ requests: await listVerificationRequests(status) });
  } catch (error) { next(error); }
});

adminRouter.patch("/verification-requests/bulk", requireAdmin, async (request, response, next) => {
  try {
    const requestIds = Array.isArray(request.body?.requestIds) ? request.body.requestIds.map((value: unknown) => typeof value === "string" ? requireUuid(value) : "") : [];
    const decision = request.body?.decision as "approved" | "rejected";
    if (!requestIds.length || requestIds.length > 100 || requestIds.some((value: string) => !value)) throw new HttpError(400, "Select between 1 and 100 requests.");
    if (decision !== "approved" && decision !== "rejected") throw new HttpError(400, "Invalid verification request decision.");
    response.json({ requests: await reviewVerificationRequests(getRequestAdmin(request).id, requestIds, decision) });
  } catch (error) { next(error); }
});

adminRouter.patch("/verification-requests/:id", requireAdmin, async (request, response, next) => {
  try {
    const decision = request.body?.decision as "approved" | "rejected";
    if (decision !== "approved" && decision !== "rejected") throw new HttpError(400, "Invalid verification request decision.");
    response.json({ request: await reviewVerificationRequest(getRequestAdmin(request).id, requireUuid(request.params.id), decision) });
  } catch (error) { next(error); }
});

adminRouter.get("/webrtc-usage", requireAdmin, async (_request, response, next) => {
  try { response.json(await getWebRtcUsageSummary()); } catch (error) { next(error); }
});

adminRouter.get("/turn-usage", requireAdmin, async (_request, response, next) => {
  try { response.json(await getTurnUsageStatus()); } catch (error) { next(error); }
});

adminRouter.get("/llm-usage", requireAdmin, async (_request, response, next) => {
  try { response.json({ llm: await getLLMUsageSummary(), responses: await getResponseUsageSummary() }); } catch (error) { next(error); }
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
    const virtualUsers = getVirtualUsersForAdmin();
    if (virtualUsers.length !== 15) throw new HttpError(503, "Virtual Users are not initialized. Run all database migrations.");
    response.json({ virtualUsers });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/presence-bots", requireAdmin, async (_request, response, next) => {
  try {
    const { activePresenceBots } = getPresenceBotStatus();
    response.json({ totalPresenceBots: await getTotalPresenceBots(), activePresenceBots });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/presence-bots", requireAdmin, async (request, response, next) => {
  try {
    const totalPresenceBots = request.body?.totalPresenceBots;
    if (!Number.isSafeInteger(totalPresenceBots) || totalPresenceBots < 0) {
      throw new HttpError(400, "totalPresenceBots must be a non-negative integer.");
    }
    await updateTotalPresenceBots(totalPresenceBots);
    await refreshPresenceBots();
    response.json({ totalPresenceBots, activePresenceBots: getPresenceBotStatus().activePresenceBots });
  } catch (error) {
    next(error);
  }
});

adminRouter.put("/virtual-users", requireAdmin, async (request, response, next) => {
  try {
    const imported = request.body?.profiles;
    if (!Array.isArray(imported) || imported.length !== VIRTUAL_USER_IDS.length) {
      throw new HttpError(400, "Import must contain all 15 virtual user profiles.");
    }
    const currentProfiles = new Map(getVirtualUsersForAdmin().map((item) => [item.profile.id, item.profile]));
    const seenIds = new Set<string>();
    const updates = imported.map((value: unknown) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpError(400, "Invalid virtual user import.");
      const body = value as Record<string, unknown>;
      const requiredFields = [
        "id", "name", "avatarUrl", "englishLevel", "personality", "interests", "speakingStyle",
        "replyProbability", "proactiveMessageProbability", "longResponseDelayMinSeconds",
        "longResponseDelayMaxSeconds", "enabled"
      ];
      if (requiredFields.some((field) => !(field in body))) throw new HttpError(400, "Import is missing required profile fields.");
      const id = typeof body.id === "string" ? body.id : "";
      const fallback = currentProfiles.get(id);
      if (!VIRTUAL_USER_IDS.includes(id) || !fallback || seenIds.has(id)) throw new HttpError(400, "Invalid or duplicate virtual user ID.");
      seenIds.add(id);
      return { id, input: parseVirtualUserProfileInput(body, fallback) };
    });
    if (VIRTUAL_USER_IDS.some((id) => !seenIds.has(id))) throw new HttpError(400, "Import is missing virtual user profiles.");
    const profiles = await updateVirtualUserProfiles(getRequestAdmin(request).id, updates);
    const io = request.app.get("io") as AppServer | undefined;
    if (io) profiles.forEach((profile) => applyVirtualUserProfile(io, profile));
    response.json({ virtualUsers: getVirtualUsersForAdmin() });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/virtual-users/:id", requireAdmin, async (request, response, next) => {
  try {
    const input = parseVirtualUserProfileInput(request.body);
    const profile = await updateVirtualUserProfile(getRequestAdmin(request).id, request.params.id, input);
    if (!profile) throw new HttpError(404, "Virtual user not found.");
    const io = request.app.get("io") as AppServer | undefined;
    if (io) applyVirtualUserProfile(io, profile);
    const runtime = getVirtualUsersForAdmin().find((item) => item.profile.id === profile.id)?.runtime;
    response.json({ virtualUser: { profile, runtime } });
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

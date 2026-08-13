import type { UserRole } from "./auth";

export type AdminRole = "owner" | "admin";
export type AdminStatus = "invited" | "active" | "suspended";

export type AdminProfile = {
  id: string;
  googleId: string | null;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: AdminRole;
  status: AdminStatus;
  invitedBy: string | null;
  createdAt: string;
  activatedAt: string | null;
  lastLogin: string | null;
};

export type ManagedUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: string;
  lastLogin: string;
  totalRoomSeconds: number;
};

export type ReportStatus = "pending" | "blocked" | "dismissed";
export type ModerationReport = {
  id: string;
  reporter: { userId: string | null; displayName: string; email: string | null };
  target: { userId: string | null; displayName: string; email: string | null };
  roomId: string; roomName: string; reason: string; details: string | null; status: ReportStatus;
  reviewerEmail: string | null; reviewedAt: string | null; createdAt: string;
};

export type VirtualUserProfile = {
  id: string;
  name: string;
  avatarUrl: string | null;
  englishLevel: string;
  personality: string;
  interests: string[];
  speakingStyle: string;
  replyProbability: number;
  enabled: boolean;
  updatedAt: string;
};
export type VirtualUserRuntime = { botId: string; status: "AVAILABLE" | "ACTIVE"; roomId?: string };
export type AdminVirtualUser = { profile: VirtualUserProfile; runtime: VirtualUserRuntime };
export type WebRtcUsageMetric = { seconds: number; connections: number };
export type WebRtcUsage = { daily: Record<"stun" | "turn", WebRtcUsageMetric>; weekly: Record<"stun" | "turn", WebRtcUsageMetric>; monthly: Record<"stun" | "turn", WebRtcUsageMetric>; yearly: Record<"stun" | "turn", WebRtcUsageMetric>; series: Array<{ date: string; transport: "stun" | "turn"; seconds: number; connections: number }> };
export type TurnUsageStatus = { configured: boolean; checkedAt: string | null; egressBytes: number | null; egressMb: number | null; egressGb: number | null; limitGb: number; turnAllowed: boolean };
export type LLMUsageTotals = { requests: number; inputTokens: number; outputTokens: number; totalTokens: number };
export type LLMUsageBreakdownItem = { key: string; label: string; requests: number; inputTokens: number; outputTokens: number; totalTokens: number };
export type LLMUsageSummary = {
  periods: { today: LLMUsageTotals; week: LLMUsageTotals; month: LLMUsageTotals; year: LLMUsageTotals };
  byProvider: LLMUsageBreakdownItem[];
  byModel: LLMUsageBreakdownItem[];
  byVirtualUser: LLMUsageBreakdownItem[];
};
export type ResponseUsageCounts = { rule: number; llm: number };
export type ResponseUsageSummary = {
  total: ResponseUsageCounts;
  periods: { today: ResponseUsageCounts; week: ResponseUsageCounts; month: ResponseUsageCounts; year: ResponseUsageCounts };
};
export type AdminLLMUsageResponse = { llm: LLMUsageSummary; responses: ResponseUsageSummary };

export type AdminSession = { token: string; admin: AdminProfile };
export type RefreshedAdminSession = AdminSession & { applicationToken: string };
export const ADMIN_TOKEN_STORAGE_KEY = "me2talk:admin-token";
const LEGACY_ADMIN_TOKEN_STORAGE_KEY = "talking-room:admin-token";

const apiUrl = (import.meta.env.VITE_API_URL ?? import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000").replace(/\/$/, "");

export class AdminRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "AdminRequestError";
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new AdminRequestError(body.error ?? "ADMIN_REQUEST_FAILED", response.status);
  return body;
}

function authHeaders(token: string, json = false) {
  return { Authorization: `Bearer ${token}`, ...(json ? { "Content-Type": "application/json" } : {}) };
}

export function readAdminToken() {
  const storedToken = localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
  if (storedToken) return storedToken;

  const legacyToken = localStorage.getItem(LEGACY_ADMIN_TOKEN_STORAGE_KEY);
  if (legacyToken) {
    localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, legacyToken);
  }
  return legacyToken;
}

export function storeAdminToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
  localStorage.removeItem(LEGACY_ADMIN_TOKEN_STORAGE_KEY);
}

export function removeAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  localStorage.removeItem(LEGACY_ADMIN_TOKEN_STORAGE_KEY);
}

export function clearAdminToken() {
  removeAdminToken();
  window.google?.accounts.id.disableAutoSelect();
}

export async function loginAdmin(idToken: string) {
  const response = await fetch(`${apiUrl}/admin/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken })
  });
  return parseResponse<AdminSession>(response);
}

export async function getAdminMe(token: string) {
  const response = await fetch(`${apiUrl}/admin/auth/me`, { headers: authHeaders(token) });
  return (await parseResponse<{ admin: AdminProfile }>(response)).admin;
}

export async function refreshAdminSession(applicationToken: string) {
  const response = await fetch(`${apiUrl}/admin/auth/refresh`, {
    method: "POST",
    headers: authHeaders(applicationToken)
  });
  return parseResponse<RefreshedAdminSession>(response);
}

export async function getManagedUsers(token: string, options: { page: number; search: string; role: string }) {
  const params = new URLSearchParams({ page: String(options.page), limit: "20" });
  if (options.search) params.set("search", options.search);
  if (options.role) params.set("role", options.role);
  const response = await fetch(`${apiUrl}/admin/users?${params}`, { headers: authHeaders(token) });
  return parseResponse<{ items: ManagedUser[]; total: number; page: number; limit: number }>(response);
}

export async function setManagedUserRole(token: string, userId: string, role: UserRole) {
  const response = await fetch(`${apiUrl}/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: authHeaders(token, true),
    body: JSON.stringify({ role })
  });
  return (await parseResponse<{ user: ManagedUser }>(response)).user;
}

export async function getAdminUsers(token: string) {
  const response = await fetch(`${apiUrl}/admin/admins`, { headers: authHeaders(token) });
  return (await parseResponse<{ admins: AdminProfile[] }>(response)).admins;
}

export async function createAdminInvite(token: string, email: string, role: AdminRole) {
  const response = await fetch(`${apiUrl}/admin/admins`, {
    method: "POST",
    headers: authHeaders(token, true),
    body: JSON.stringify({ email, role })
  });
  return (await parseResponse<{ admin: AdminProfile }>(response)).admin;
}

export async function setAdminAccount(token: string, adminId: string, changes: { role?: AdminRole; status?: AdminStatus }) {
  const response = await fetch(`${apiUrl}/admin/admins/${adminId}`, {
    method: "PATCH",
    headers: authHeaders(token, true),
    body: JSON.stringify(changes)
  });
  return (await parseResponse<{ admin: AdminProfile }>(response)).admin;
}

export async function suspendAdminAccount(token: string, adminId: string) {
  const response = await fetch(`${apiUrl}/admin/admins/${adminId}`, { method: "DELETE", headers: authHeaders(token) });
  return (await parseResponse<{ admin: AdminProfile }>(response)).admin;
}

export async function getModerationReports(token: string, options: { page: number; status: string; from: string; to: string }) {
  const params = new URLSearchParams({ page: String(options.page), limit: "20" });
  if (options.status) params.set("status", options.status);
  if (options.from) params.set("from", options.from);
  if (options.to) params.set("to", options.to);
  const response = await fetch(`${apiUrl}/admin/reports?${params}`, { headers: authHeaders(token) });
  return parseResponse<{ items: ModerationReport[]; total: number; page: number; limit: number }>(response);
}

export async function confirmModerationBlock(token: string, reportId: string) {
  const response = await fetch(`${apiUrl}/admin/reports/${reportId}/block`, { method: "POST", headers: authHeaders(token) });
  return parseResponse<{ block: { reportId: string } }>(response);
}

export async function dismissModerationReport(token: string, reportId: string) {
  const response = await fetch(`${apiUrl}/admin/reports/${reportId}/dismiss`, { method: "POST", headers: authHeaders(token) });
  return parseResponse<{ reportId: string }>(response);
}

export async function getVirtualUsers(token: string) {
  const response = await fetch(`${apiUrl}/admin/virtual-users`, { headers: authHeaders(token) });
  return (await parseResponse<{ virtualUsers: AdminVirtualUser[] }>(response)).virtualUsers;
}

export async function saveVirtualUserProfile(token: string, profile: VirtualUserProfile) {
  const response = await fetch(`${apiUrl}/admin/virtual-users/${profile.id}`, {
    method: "PATCH",
    headers: authHeaders(token, true),
    body: JSON.stringify(profile)
  });
  return (await parseResponse<{ virtualUser: AdminVirtualUser }>(response)).virtualUser;
}

export async function getWebRtcUsage(token: string) {
  const response = await fetch(`${apiUrl}/admin/webrtc-usage`, { headers: authHeaders(token) });
  return parseResponse<WebRtcUsage>(response);
}

export async function getTurnUsage(token: string) {
  const response = await fetch(`${apiUrl}/admin/turn-usage`, { headers: authHeaders(token) });
  return parseResponse<TurnUsageStatus>(response);
}

export async function getLLMUsage(token: string) {
  const response = await fetch(`${apiUrl}/admin/llm-usage`, { headers: authHeaders(token) });
  return parseResponse<AdminLLMUsageResponse>(response);
}

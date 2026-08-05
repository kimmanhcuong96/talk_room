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
};

export type AdminSession = { token: string; admin: AdminProfile };
export const ADMIN_TOKEN_STORAGE_KEY = "talking-room:admin-token";

const apiUrl = (import.meta.env.VITE_API_URL ?? import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000").replace(/\/$/, "");

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "ADMIN_REQUEST_FAILED");
  return body;
}

function authHeaders(token: string, json = false) {
  return { Authorization: `Bearer ${token}`, ...(json ? { "Content-Type": "application/json" } : {}) };
}

export function readAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
}

export function storeAdminToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
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

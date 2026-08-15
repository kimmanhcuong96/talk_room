import { clearAdminToken, removeAdminToken, storeAdminToken, type AdminSession } from "./adminAuth";

export const AUTH_TOKEN_STORAGE_KEY = "me2talk:auth-token";
export const AUTH_USER_STORAGE_KEY = "me2talk:auth-user";
const LEGACY_AUTH_TOKEN_STORAGE_KEY = "english-talk-rooms:auth-token";
const LEGACY_AUTH_USER_STORAGE_KEY = "english-talk-rooms:auth-user";
const REFERRAL_CODE_STORAGE_KEY = "me2talk:referral-code";

export type UserRole = "unverified" | "verified" | "supporter";

export type AuthUser = {
  id: string;
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: string;
  lastLogin: string;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
  adminSession?: AdminSession | null;
};

export type RewardSummary = {
  eligible: boolean;
  totalPoints: number;
  activityPoints: number;
  referralPoints: number;
  favoritePoints: number;
  qualityChatPoints: number;
  roomOwnerPoints: number;
  streakPoints: number;
  favoriteCount: number;
  qualifiedReferrals: number;
  referralCode: string;
  currentStreakDays: number;
  highestStreakDays: number;
  nextStreakMilestone: 3 | 7 | null;
  canonicalTimeZone: string;
  recentTransactions: Array<{ id: string; points: number; eventType: string; createdAt: string }>;
};

export type VerificationRequest = {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  message: string;
  communityCommitment: boolean;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  reviewedAt: string | null;
  reviewerEmail: string | null;
};

export class AuthRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "AuthRequestError";
  }
}

const apiUrl = (import.meta.env.VITE_API_URL ?? import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000").replace(/\/$/, "");

function readMigratedLocalStorage(primaryKey: string, legacyKey: string) {
  const storedValue = localStorage.getItem(primaryKey);
  if (storedValue !== null) return storedValue;

  const legacyValue = localStorage.getItem(legacyKey);
  if (legacyValue !== null) {
    localStorage.setItem(primaryKey, legacyValue);
  }
  return legacyValue;
}

export function readStoredToken() {
  return readMigratedLocalStorage(AUTH_TOKEN_STORAGE_KEY, LEGACY_AUTH_TOKEN_STORAGE_KEY);
}

export function storeApplicationToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  localStorage.removeItem(LEGACY_AUTH_TOKEN_STORAGE_KEY);
}

export function readStoredSession(): AuthSession | null {
  const token = readStoredToken();
  const storedUser = readMigratedLocalStorage(AUTH_USER_STORAGE_KEY, LEGACY_AUTH_USER_STORAGE_KEY);
  if (!token || !storedUser) return null;

  try {
    const user = JSON.parse(storedUser) as Partial<AuthUser>;
    const validRole = user.role === "unverified" || user.role === "verified" || user.role === "supporter";
    if (!user.id || !user.email || !user.displayName || !validRole) return null;
    return { token, user: user as AuthUser };
  } catch {
    return null;
  }
}

export function isInvalidAuthSessionError(error: unknown) {
  return error instanceof AuthRequestError && (error.status === 401 || error.status === 403);
}

export function storeSession(session: AuthSession) {
  storeApplicationToken(session.token);
  localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(session.user));
  localStorage.removeItem(LEGACY_AUTH_USER_STORAGE_KEY);
  if (session.adminSession) storeAdminToken(session.adminSession.token);
  else if (session.adminSession === null) removeAdminToken();
}

export function clearStoredSession() {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  localStorage.removeItem(LEGACY_AUTH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(LEGACY_AUTH_USER_STORAGE_KEY);
  clearAdminToken();
  window.google?.accounts.id.disableAutoSelect();
}

export async function loginWithGoogleIdToken(idToken: string): Promise<AuthSession> {
  const urlReferralCode = new URLSearchParams(window.location.search).get("ref")?.trim().toLowerCase();
  if (urlReferralCode && /^[a-z0-9]{8,12}$/.test(urlReferralCode)) localStorage.setItem(REFERRAL_CODE_STORAGE_KEY, urlReferralCode);
  const referralCode = localStorage.getItem(REFERRAL_CODE_STORAGE_KEY) ?? undefined;
  const response = await fetch(`${apiUrl}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, referralCode })
  });

  const body = (await response.json().catch(() => ({}))) as Partial<AuthSession> & { error?: string };

  if (!response.ok || !body.token || !body.user) {
    throw new Error(body.error ?? "GOOGLE_SIGN_IN_FAILED");
  }

  localStorage.removeItem(REFERRAL_CODE_STORAGE_KEY);
  return { token: body.token, user: body.user, adminSession: body.adminSession ?? null };
}

export async function getRewardSummary(token: string): Promise<RewardSummary> {
  const response = await fetch(`${apiUrl}/auth/rewards`, { headers: { Authorization: `Bearer ${token}` } });
  const body = (await response.json().catch(() => ({}))) as RewardSummary & { error?: string };
  if (!response.ok) throw new AuthRequestError(body.error ?? "LOAD_REWARDS_FAILED", response.status);
  return body;
}

export async function getVerificationRequest(token: string) {
  const response = await fetch(`${apiUrl}/auth/verification-request`, { headers: { Authorization: `Bearer ${token}` } });
  const body = (await response.json().catch(() => ({}))) as { request?: VerificationRequest | null; error?: string };
  if (!response.ok) throw new AuthRequestError(body.error ?? "LOAD_VERIFICATION_REQUEST_FAILED", response.status);
  return body.request ?? null;
}

export async function submitVerificationRequest(token: string, message: string, communityCommitment: boolean) {
  const response = await fetch(`${apiUrl}/auth/verification-request`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message, communityCommitment })
  });
  const body = (await response.json().catch(() => ({}))) as { request?: VerificationRequest; error?: string };
  if (!response.ok || !body.request) throw new AuthRequestError(body.error ?? "SUBMIT_VERIFICATION_REQUEST_FAILED", response.status);
  return body.request;
}

export async function getCurrentUser(token: string): Promise<AuthSession> {
  const response = await fetch(`${apiUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const body = (await response.json().catch(() => ({}))) as { token?: string; user?: AuthUser; adminSession?: AdminSession | null; error?: string };

  if (!response.ok || !body.user) {
    throw new AuthRequestError(body.error ?? "LOAD_USER_PROFILE_FAILED", response.status);
  }

  return { token: body.token ?? token, user: body.user, adminSession: body.adminSession ?? null };
}

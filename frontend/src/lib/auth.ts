export const AUTH_TOKEN_STORAGE_KEY = "english-talk-rooms:auth-token";
export const AUTH_USER_STORAGE_KEY = "english-talk-rooms:auth-user";

export type AuthUser = {
  id: string;
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  lastLogin: string;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

const apiUrl = (import.meta.env.VITE_API_URL ?? import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000").replace(/\/$/, "");

export function readStoredToken() {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function storeSession(session: AuthSession) {
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, session.token);
  localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(session.user));
}

export function clearStoredSession() {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  window.google?.accounts.id.disableAutoSelect();
}

export async function loginWithGoogleIdToken(idToken: string): Promise<AuthSession> {
  const response = await fetch(`${apiUrl}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken })
  });

  const body = (await response.json().catch(() => ({}))) as Partial<AuthSession> & { error?: string };

  if (!response.ok || !body.token || !body.user) {
    throw new Error(body.error ?? "GOOGLE_SIGN_IN_FAILED");
  }

  return { token: body.token, user: body.user };
}

export async function getCurrentUser(token: string): Promise<AuthUser> {
  const response = await fetch(`${apiUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const body = (await response.json().catch(() => ({}))) as { user?: AuthUser; error?: string };

  if (!response.ok || !body.user) {
    throw new Error(body.error ?? "LOAD_USER_PROFILE_FAILED");
  }

  return body.user;
}

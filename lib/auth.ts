export const TOKEN_KEY = "bizintel_access_token";
export const USER_KEY = "bizintel_user";
export const ROLE_COOKIE = "bizintel_role";
export const AUTH_CHANGED_EVENT = "bizintel-auth-changed";

export type AuthUser = {
  id: number;
  full_name: string;
  email: string;
  role: string;
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return Boolean(getToken());
}

export function hasAdminAccess(): boolean {
  const role = getUser()?.role;
  return role === "admin" || role === "super_admin";
}

/**
 * The role cookie is not httpOnly - it is only used so middleware.ts can do
 * a basic "logged in with an admin role" gate on /admin/* at the edge. The
 * real authorization boundary is the API, which independently checks the
 * JWT on every admin request regardless of what this cookie says.
 */
export function setSession(token: string, user: AuthUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  document.cookie = `${ROLE_COOKIE}=${user.role}; path=/; max-age=86400; SameSite=Lax`;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0`;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

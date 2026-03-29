const USER_KEY = 'bolo237-user';
const ROLE_KEY = 'bolo237-account-role';
const PHONE_VERIFIED_KEY = 'bolo237-phone-verified';
const FORCE_LOGOUT_KEY = 'bolo237-force-logout';
const AUTH_SUCCESS_KEY = 'bolo237-auth-last-success';

export type StoredUser = Record<string, unknown> & {
  id?: number;
  name?: string;
  email?: string;
  role?: string;
  isVerified?: boolean;
};

export function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

export function mergeStoredUser(patch: Partial<StoredUser>): StoredUser | null {
  if (typeof window === 'undefined') return null;
  const current = getStoredUser() || {};
  const next = { ...current, ...patch };
  window.localStorage.setItem(USER_KEY, JSON.stringify(next));
  return next;
}

export function clearStoredSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem(ROLE_KEY);
  window.localStorage.removeItem(PHONE_VERIFIED_KEY);
  window.localStorage.removeItem(AUTH_SUCCESS_KEY);
  // Broadcast a one-shot logout signal for other opened tabs.
  window.localStorage.setItem(FORCE_LOGOUT_KEY, String(Date.now()));
}

export function markRecentAuthSuccess(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AUTH_SUCCESS_KEY, String(Date.now()));
}

export function hasRecentAuthSuccess(maxAgeMs = 45000): boolean {
  if (typeof window === 'undefined') return false;
  const raw = window.localStorage.getItem(AUTH_SUCCESS_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts <= maxAgeMs;
}
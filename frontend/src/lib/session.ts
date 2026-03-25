const USER_KEY = 'bolo237-user';
const ROLE_KEY = 'bolo237-account-role';
const PHONE_VERIFIED_KEY = 'bolo237-phone-verified';
const FORCE_LOGOUT_KEY = 'bolo237-force-logout';

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
  // Broadcast a one-shot logout signal for other opened tabs.
  window.localStorage.setItem(FORCE_LOGOUT_KEY, String(Date.now()));
}
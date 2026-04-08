const USER_KEY = 'bolo237-user';
const ROLE_KEY = 'bolo237-account-role';
const PHONE_VERIFIED_KEY = 'bolo237-phone-verified';
const FORCE_LOGOUT_KEY = 'bolo237-force-logout';
const AUTH_SUCCESS_KEY = 'bolo237-auth-last-success';
const SESSION_CHANGE_EVENT = 'bolo237-session-change';
const SESSION_RELATED_KEYS = new Set([
  USER_KEY,
  ROLE_KEY,
  PHONE_VERIFIED_KEY,
  FORCE_LOGOUT_KEY,
  AUTH_SUCCESS_KEY,
]);

export type StoredUser = Record<string, unknown> & {
  id?: number;
  name?: string | null;
  email?: string;
  role?: string;
  isVerified?: boolean;
};

function notifySessionChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}

export function subscribeToSessionStorage(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || SESSION_RELATED_KEYS.has(event.key)) {
      onStoreChange();
    }
  };

  const handleSessionChange = () => {
    onStoreChange();
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener(SESSION_CHANGE_EVENT, handleSessionChange);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(SESSION_CHANGE_EVENT, handleSessionChange);
  };
}

export function getSessionStorageValue(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(key);
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

export function storeAuthenticatedUser(
  user: Partial<StoredUser>,
  options: { role?: string | null; phoneVerified?: boolean } = {}
): StoredUser | null {
  if (typeof window === 'undefined') return null;

  const current = getStoredUser() || {};
  const next = { ...current, ...user };
  window.localStorage.setItem(USER_KEY, JSON.stringify(next));

  if (options.role !== undefined) {
    if (options.role) {
      window.localStorage.setItem(ROLE_KEY, options.role);
    } else {
      window.localStorage.removeItem(ROLE_KEY);
    }
  }

  if (options.phoneVerified) {
    window.localStorage.setItem(PHONE_VERIFIED_KEY, 'true');
  }

  notifySessionChange();
  return next;
}

export function mergeStoredUser(patch: Partial<StoredUser>): StoredUser | null {
  return storeAuthenticatedUser(patch);
}

export function clearStoredSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem(ROLE_KEY);
  window.localStorage.removeItem(PHONE_VERIFIED_KEY);
  window.localStorage.removeItem(AUTH_SUCCESS_KEY);
  // Broadcast a one-shot logout signal for other opened tabs.
  window.localStorage.setItem(FORCE_LOGOUT_KEY, String(Date.now()));
  notifySessionChange();
}

export function markRecentAuthSuccess(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AUTH_SUCCESS_KEY, String(Date.now()));
  notifySessionChange();
}

export function hasRecentAuthSuccess(maxAgeMs = 45000): boolean {
  if (typeof window === 'undefined') return false;
  const raw = window.localStorage.getItem(AUTH_SUCCESS_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts <= maxAgeMs;
}
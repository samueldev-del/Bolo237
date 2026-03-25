const USER_KEY = 'bolo237-user';

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
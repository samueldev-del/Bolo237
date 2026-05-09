/**
 * Backoff exponentiel par IP pour l'endpoint /api/admin-login.
 *
 * Stockage in-memory : suffisant pour ralentir un attaquant single-source sur
 * une instance Vercel chaude. Sur scale-out réel, à remplacer par Upstash Redis
 * (cf. M-7-bis dans REMEDIATION_LOG.md).
 *
 * Stratégie :
 * - chaque échec incrémente un compteur par IP avec TTL 15 min.
 * - le délai imposé est `BASE_DELAY_MS * 2^min(failures, MAX_DOUBLINGS)`,
 *   capé à `MAX_DELAY_MS`.
 * - un succès remet le compteur à zéro.
 */

const BASE_DELAY_MS = 800;
const MAX_DELAY_MS = 8000;
const MAX_DOUBLINGS = 5; // 800 → 1600 → 3200 → 6400 → 8000 (cap) → 8000 …
const WINDOW_MS = 15 * 60 * 1000;

type Entry = { count: number; firstFail: number };

const failures = new Map<string, Entry>();

function purgeExpired(now: number) {
  for (const [key, entry] of failures) {
    if (now - entry.firstFail > WINDOW_MS) failures.delete(key);
  }
}

export function getBackoffDelay(ip: string | null): number {
  const key = ip ?? "unknown";
  const now = Date.now();
  purgeExpired(now);
  const entry = failures.get(key);
  if (!entry) return BASE_DELAY_MS;
  const exp = Math.min(entry.count, MAX_DOUBLINGS);
  return Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** exp);
}

export function registerFailure(ip: string | null): void {
  const key = ip ?? "unknown";
  const now = Date.now();
  purgeExpired(now);
  const entry = failures.get(key);
  if (!entry || now - entry.firstFail > WINDOW_MS) {
    failures.set(key, { count: 1, firstFail: now });
  } else {
    entry.count += 1;
  }
}

export function clearFailures(ip: string | null): void {
  failures.delete(ip ?? "unknown");
}

export function __resetForTests(): void {
  failures.clear();
}

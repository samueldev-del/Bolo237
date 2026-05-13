import "server-only";

import { readStoredBackendSession } from "@/lib/auth";

const DEFAULT_BACKEND_API_URL = "https://api-237jobs.onrender.com";
const SESSION_COOKIE_NAME = "bolo237_session";
const CSRF_COOKIE_NAME = "bolo237_csrf";
const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);
const PROD_ORIGIN = String(process.env.NEXT_PUBLIC_APP_URL || "").trim() || "https://admin.bolo237.com";

type CachedBackendSession = {
  cookie: string;
  expiresAt: number;
};

type BackendLoginBackoff = {
  until: number;
  message: string;
};

type CsrfContext = {
  token: string;
  cookie: string;
  expiresAt: number;
};

let cachedBackendSession: CachedBackendSession | null = null;
let pendingBackendLogin: Promise<string> | null = null;
let backendLoginBackoff: BackendLoginBackoff | null = null;
let cachedCsrfContext: CsrfContext | null = null;

function normalizeBase(value: string) {
  return String(value || "").trim().replace(/\/$/, "");
}

// Wrapper fetch resilient aux cold-starts Render :
// - timeout configurable (defaut 50s, cold-start typique 30-60s)
// - 1 retry sur erreur reseau ("fetch failed", AbortError)
// - traduction des erreurs opaques en messages clairs
async function fetchResilient(input: string, init: RequestInit & { timeoutMs?: number } = {}) {
  const timeoutMs = init.timeoutMs ?? 50_000;
  const { timeoutMs: _omit, ...fetchInit } = init;
  void _omit;

  const attempt = async (): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(input, { ...fetchInit, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    return await attempt();
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    const message = err instanceof Error ? err.message : String(err);
    const isTransient = name === "AbortError" || /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN/i.test(message);
    if (!isTransient) throw err;
    try {
      return await attempt();
    } catch (err2) {
      const name2 = err2 instanceof Error ? err2.name : "";
      if (name2 === "AbortError") {
        throw new Error("Le backend n'a pas repondu (timeout). Reessayez dans quelques secondes — Render se reveille peut-etre.");
      }
      throw new Error("Backend injoignable. Verifiez que Render est en ligne, puis reessayez.");
    }
  }
}

function getBackendApiBase() {
  return normalizeBase(process.env.NEXT_PUBLIC_API_URL || "") || DEFAULT_BACKEND_API_URL;
}

function getBackendAdminCredentials() {
  const email = String(process.env.ADMIN_BACKEND_EMAIL || "").trim();
  const password = String(process.env.ADMIN_BACKEND_PASSWORD || "").trim();

  if (!email || !password) {
    throw new Error("Identifiants backend admin non configures.");
  }

  return { email, password };
}

function getSetCookieValues(headers: Headers) {
  const headersWithSetCookie = headers as Headers & { getSetCookie?: () => string[] };

  if (typeof headersWithSetCookie.getSetCookie === "function") {
    return headersWithSetCookie.getSetCookie().filter(Boolean);
  }

  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

function parseCookieByName(headers: Headers, name: string) {
  for (const value of getSetCookieValues(headers)) {
    const [cookiePair = ""] = String(value).split(";");
    if (cookiePair.startsWith(`${name}=`)) {
      return cookiePair.trim();
    }
  }
  return null;
}

function getValidCsrfContext(): CsrfContext | null {
  if (cachedCsrfContext && cachedCsrfContext.expiresAt > Date.now()) {
    return cachedCsrfContext;
  }
  cachedCsrfContext = null;
  return null;
}

async function fetchCsrfContext(): Promise<CsrfContext | null> {
  const cached = getValidCsrfContext();
  if (cached) return cached;

  try {
    const response = await fetchResilient(`${getBackendApiBase()}/api/csrf-token`, {
      method: "GET",
      cache: "no-store",
      timeoutMs: 30_000,
    });
    if (!response.ok) return null;

    const data = (await response.json().catch(() => ({}))) as { csrfToken?: string };
    const token = String(data.csrfToken || response.headers.get("x-csrf-token") || "").trim();
    const cookie = parseCookieByName(response.headers, CSRF_COOKIE_NAME);

    if (!token || !cookie) return null;

    cachedCsrfContext = { token, cookie, expiresAt: Date.now() + 10 * 60 * 1000 };
    return cachedCsrfContext;
  } catch {
    return null;
  }
}

function clearCsrfContext() {
  cachedCsrfContext = null;
}

function parseSessionCookie(headers: Headers) {
  for (const value of getSetCookieValues(headers)) {
    const [cookiePair = ""] = String(value).split(";");
    if (cookiePair.startsWith(`${SESSION_COOKIE_NAME}=`)) {
      return cookiePair.trim();
    }
  }

  return null;
}

function parseSessionMaxAge(headers: Headers) {
  for (const value of getSetCookieValues(headers)) {
    const match = String(value).match(/max-age=(\d+)/i);
    if (match) {
      const parsed = Number.parseInt(match[1], 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }

  return null;
}

function clearCachedSessionIfExpired() {
  if (cachedBackendSession && cachedBackendSession.expiresAt <= Date.now()) {
    cachedBackendSession = null;
  }
}

function getCachedSessionCookie() {
  clearCachedSessionIfExpired();
  return cachedBackendSession?.cookie || null;
}

function getActiveBackendLoginBackoff() {
  if (!backendLoginBackoff) return null;
  if (backendLoginBackoff.until <= Date.now()) {
    backendLoginBackoff = null;
    return null;
  }
  return backendLoginBackoff;
}

function setBackendLoginBackoff(waitSeconds: number, baseMessage: string) {
  const safeWaitSeconds = Number.isFinite(waitSeconds) && waitSeconds > 0 ? waitSeconds : 900;
  const minutes = Math.max(1, Math.ceil(safeWaitSeconds / 60));
  const suffix = `Reessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`;
  // Si le backend renvoie déjà "Reessayez dans X minutes" dans baseMessage,
  // on évite de le dupliquer dans la réponse côté admin.
  const alreadyHasRetrySuffix = /reessayez dans/i.test(baseMessage);
  backendLoginBackoff = {
    until: Date.now() + safeWaitSeconds * 1000,
    message: alreadyHasRetrySuffix ? baseMessage.trim() : `${baseMessage} ${suffix}`.trim(),
  };
}

function setBackendInvalidCredentialsBackoff() {
  // Avoid hammering backend login with invalid credentials from env.
  backendLoginBackoff = {
    until: Date.now() + 5 * 60 * 1000,
    message:
      "Les identifiants backend admin sont invalides. Verifiez ADMIN_BACKEND_EMAIL et ADMIN_BACKEND_PASSWORD puis redeployez admin.",
  };
}

function cacheSession(cookie: string, maxAgeSeconds: number | null) {
  const ttlSeconds = maxAgeSeconds && maxAgeSeconds > 120 ? maxAgeSeconds - 60 : 300;
  cachedBackendSession = {
    cookie,
    expiresAt: Date.now() + ttlSeconds * 1000,
  };
}

async function readJsonBody(response: Response) {
  return response.json().catch(() => ({}));
}

function isAdminRole(role: unknown) {
  return ADMIN_ROLES.has(String(role || "").toUpperCase());
}

async function loginAsBackendAdmin(forceRefresh = false): Promise<string> {
  const activeBackoff = getActiveBackendLoginBackoff();
  if (activeBackoff) {
    throw new Error(activeBackoff.message);
  }

  if (!forceRefresh) {
    const cachedCookie = getCachedSessionCookie();
    if (cachedCookie) {
      return cachedCookie;
    }
    if (pendingBackendLogin) {
      return pendingBackendLogin;
    }
  }

  pendingBackendLogin = (async () => {
    const { email, password } = getBackendAdminCredentials();
    const headers = new Headers({ "Content-Type": "application/json" });
    headers.set("origin", PROD_ORIGIN);
    headers.set("referer", `${PROD_ORIGIN}/`);

    // Fetch CSRF token before the POST so the backend CSRF middleware accepts it.
    const csrf = await fetchCsrfContext();
    if (csrf) {
      headers.set("x-csrf-token", csrf.token);
      headers.set("cookie", csrf.cookie);
    }

    const response = await fetchResilient(`${getBackendApiBase()}/api/auth/login`, {
      method: "POST",
      headers,
      body: JSON.stringify({ identifier: email, password }),
      cache: "no-store",
      timeoutMs: 50_000,
    });

    const payload = (await readJsonBody(response)) as { error?: string; role?: string };

    if (!response.ok) {
      const backendError = String(payload.error || "").trim();
      if (response.status === 429) {
        const retryAfterHeader = Number.parseInt(String(response.headers.get("retry-after") || "0"), 10);
        setBackendLoginBackoff(retryAfterHeader, backendError || "Connexion admin temporairement bloquee.");
        const blocked = getActiveBackendLoginBackoff();
        throw new Error(blocked?.message || backendError || "Connexion admin temporairement bloquee.");
      }
      if (response.status === 401) {
        setBackendInvalidCredentialsBackoff();
        const blocked = getActiveBackendLoginBackoff();
        throw new Error(blocked?.message || "Les identifiants backend admin sont invalides.");
      }
      throw new Error(backendError || "Connexion au backend admin impossible.");
    }

    if (!isAdminRole(payload.role)) {
      throw new Error("Le compte backend configure n'a pas les droits admin.");
    }

    const sessionCookie = parseSessionCookie(response.headers);
    if (!sessionCookie) {
      throw new Error("Le backend n'a pas retourne de cookie de session admin.");
    }

    backendLoginBackoff = null;
    cacheSession(sessionCookie, parseSessionMaxAge(response.headers));
    return sessionCookie;
  })().finally(() => {
    pendingBackendLogin = null;
  });

  return pendingBackendLogin;
}

async function authenticateProvidedBackendAdmin(identifier: string, password: string): Promise<string> {
  const normalizedIdentifier = String(identifier || "").trim();
  const normalizedPassword = String(password || "").trim();

  if (!normalizedIdentifier || !normalizedPassword) {
    throw new Error("Identifiants backend admin invalides.");
  }

  const headers = new Headers({ "Content-Type": "application/json" });
  headers.set("origin", PROD_ORIGIN);
  headers.set("referer", `${PROD_ORIGIN}/`);

  const csrf = await fetchCsrfContext();
  if (csrf) {
    headers.set("x-csrf-token", csrf.token);
    headers.set("cookie", csrf.cookie);
  }

  const response = await fetchResilient(`${getBackendApiBase()}/api/auth/login`, {
    method: "POST",
    headers,
    body: JSON.stringify({ identifier: normalizedIdentifier, password: normalizedPassword }),
    cache: "no-store",
    timeoutMs: 50_000,
  });

  const payload = (await readJsonBody(response)) as { error?: string; role?: string };

  if (!response.ok) {
    throw new Error(String(payload.error || "Connexion au backend admin impossible.").trim());
  }

  if (!isAdminRole(payload.role)) {
    throw new Error("Le compte fourni n'a pas les droits admin.");
  }

  const sessionCookie = parseSessionCookie(response.headers);
  if (!sessionCookie) {
    throw new Error("Le backend n'a pas retourne de cookie de session admin.");
  }

  cacheSession(sessionCookie, parseSessionMaxAge(response.headers));
  backendLoginBackoff = null;
  return sessionCookie;
}

export async function ensureBackendAdminSession(forceRefresh = false) {
  return loginAsBackendAdmin(forceRefresh);
}

export async function ensureProvidedBackendAdminSession(identifier: string, password: string) {
  return authenticateProvidedBackendAdmin(identifier, password);
}

export function clearBackendAdminSession() {
  cachedBackendSession = null;
  pendingBackendLogin = null;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function isAllowedBackendPath(path: string) {
  const normalized = String(path || "").trim();
  return normalized.startsWith("/api/") || normalized.startsWith("/uploads/");
}

async function fetchBackendWithAdminSession(path: string, init?: RequestInit) {
  if (!isAllowedBackendPath(path)) {
    throw new Error("Chemin backend invalide.");
  }

  const method = String(init?.method || "GET").toUpperCase();
  const needsCsrf = !SAFE_METHODS.has(method);

  const execute = async (forceRefresh: boolean) => {
    const storedSessionCookie = forceRefresh ? null : await readStoredBackendSession();
    const sessionCookie = storedSessionCookie || await loginAsBackendAdmin(forceRefresh);
    const headers = new Headers(init?.headers);
    headers.delete("connection");
    headers.delete("content-length");
    headers.delete("cookie");
    headers.delete("host");
    headers.set("origin", PROD_ORIGIN);
    headers.set("referer", `${PROD_ORIGIN}/`);

    if (needsCsrf) {
      const csrf = await fetchCsrfContext();
      if (csrf) {
        headers.set("x-csrf-token", csrf.token);
        // Merge session cookie + CSRF cookie
        headers.set("cookie", `${sessionCookie}; ${csrf.cookie}`);
      } else {
        headers.set("cookie", sessionCookie);
      }
    } else {
      headers.set("cookie", sessionCookie);
    }

    return fetchResilient(`${getBackendApiBase()}${path}`, {
      ...init,
      headers,
      cache: "no-store",
      timeoutMs: 50_000,
    });
  };

  let response = await execute(false);

  if (response.status === 401 || response.status === 403) {
    clearBackendAdminSession();
    clearCsrfContext();
    response = await execute(true);
  }

  return response;
}

export async function fetchBackendAsAdmin(path: string, init?: RequestInit) {
  if (!String(path || "").startsWith("/api/")) {
    throw new Error("Chemin backend invalide.");
  }

  return fetchBackendWithAdminSession(path, init);
}

export async function fetchBackendPathAsAdmin(path: string, init?: RequestInit) {
  return fetchBackendWithAdminSession(path, init);
}

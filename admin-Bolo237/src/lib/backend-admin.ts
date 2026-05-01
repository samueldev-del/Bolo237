import "server-only";

const DEFAULT_BACKEND_API_URL = "https://api-237jobs.onrender.com";
const SESSION_COOKIE_NAME = "bolo237_session";
const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);
const TRUSTED_FRONTEND_HOSTS = new Set([
  "admin.bolo237.com",
  "www.bolo237.com",
  "localhost",
  "127.0.0.1",
]);

type CachedBackendSession = {
  cookie: string;
  expiresAt: number;
};

let cachedBackendSession: CachedBackendSession | null = null;
let pendingBackendLogin: Promise<string> | null = null;

type BackendRequestContext = {
  origin?: string;
};

function normalizeBase(value: string) {
  return String(value || "").trim().replace(/\/$/, "");
}

function normalizeHost(value: string) {
  const normalizedInput = String(value || "").trim().toLowerCase();
  if (!normalizedInput) {
    return "";
  }

  const first = normalizedInput.split(",")[0]?.trim() || "";
  if (!first) {
    return "";
  }

  const withoutProtocol = first.replace(/^https?:\/\//, "");
  const withoutPath = withoutProtocol.split("/")[0] || "";
  const withoutPort = withoutPath.split(":")[0] || "";
  return withoutPort.trim();
}

function isTrustedFrontendHost(host: string) {
  return TRUSTED_FRONTEND_HOSTS.has(host) || host.endsWith(".vercel.app");
}

function buildOrigin(protocol: string, host: string) {
  return `${protocol}://${host}`;
}

export function resolveTrustedOriginFromRequest(request: Request) {
  const originHeader = String(request.headers.get("origin") || "").trim();
  if (originHeader) {
    try {
      const parsed = new URL(originHeader);
      const host = normalizeHost(parsed.hostname);
      if (host && isTrustedFrontendHost(host)) {
        return parsed.origin;
      }
    } catch {
      // Ignore malformed origin and continue with host-based fallback.
    }
  }

  const forwardedProto = String(request.headers.get("x-forwarded-proto") || "").trim().toLowerCase();
  const requestProtocol = (() => {
    try {
      return new URL(request.url).protocol.replace(":", "").toLowerCase();
    } catch {
      return "https";
    }
  })();
  const protocol = forwardedProto === "http" || forwardedProto === "https"
    ? forwardedProto
    : requestProtocol === "http" || requestProtocol === "https"
      ? requestProtocol
      : "https";

  const hostCandidates = [
    request.headers.get("x-forwarded-host"),
    request.headers.get("host"),
  ];

  for (const candidate of hostCandidates) {
    const host = normalizeHost(candidate || "");
    if (host && isTrustedFrontendHost(host)) {
      return buildOrigin(protocol, host);
    }
  }

  throw new Error("Origine admin non autorisee.");
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

async function loginAsBackendAdmin(forceRefresh = false, context?: BackendRequestContext): Promise<string> {
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
    const trustedOrigin = String(context?.origin || "").trim();
    if (trustedOrigin) {
      headers.set("origin", trustedOrigin);
      headers.set("referer", `${trustedOrigin}/`);
    }

    const response = await fetch(`${getBackendApiBase()}/api/auth/login`, {
      method: "POST",
      headers,
      body: JSON.stringify({ identifier: email, password }),
      cache: "no-store",
    });

    const payload = (await readJsonBody(response)) as { error?: string; role?: string };

    if (!response.ok) {
      const backendError = String(payload.error || "").trim();
      if (response.status === 401) {
        throw new Error("Les identifiants backend admin sont invalides.");
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

    cacheSession(sessionCookie, parseSessionMaxAge(response.headers));
    return sessionCookie;
  })().finally(() => {
    pendingBackendLogin = null;
  });

  return pendingBackendLogin;
}

export async function ensureBackendAdminSession(forceRefresh = false, context?: BackendRequestContext) {
  return loginAsBackendAdmin(forceRefresh, context);
}

export function clearBackendAdminSession() {
  cachedBackendSession = null;
  pendingBackendLogin = null;
}

export async function fetchBackendAsAdmin(path: string, init?: RequestInit, context?: BackendRequestContext) {
  if (!String(path || "").startsWith("/api/")) {
    throw new Error("Chemin backend invalide.");
  }

  const execute = async (forceRefresh: boolean) => {
    const sessionCookie = await loginAsBackendAdmin(forceRefresh, context);
    const headers = new Headers(init?.headers);
    headers.delete("connection");
    headers.delete("content-length");
    headers.delete("cookie");
    headers.delete("host");
    headers.set("cookie", sessionCookie);

    return fetch(`${getBackendApiBase()}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  };

  let response = await execute(false);

  if (response.status === 401 || response.status === 403) {
    clearBackendAdminSession();
    response = await execute(true);
  }

  return response;
}

export const ADMIN_SESSION_COOKIE_NAME = "admin_session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8;

const DEVELOPMENT_FALLBACK_SECRET = "local-dev-admin-session-secret";

type ParsedAdminSessionToken = {
  payload: string;
  signature: string;
  createdAt: number;
};

export function getAdminSessionSecret() {
  const configuredSecret = String(process.env.ADMIN_SESSION_SECRET || "").trim();
  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEVELOPMENT_FALLBACK_SECRET;
  }

  return null;
}

export function getAdminLoginUsername() {
  const configuredUsername = String(process.env.ADMIN_USERNAME || "").trim();
  if (configuredUsername) {
    return configuredUsername;
  }

  if (process.env.NODE_ENV !== "production") {
    return "admin";
  }

  return "";
}

export function getAdminAuthConfigurationError() {
  const adminPassword = String(process.env.ADMIN_PASSWORD || "").trim();
  const backendPassword = String(process.env.ADMIN_BACKEND_PASSWORD || "").trim();
  const adminUsername = getAdminLoginUsername();

  if (!adminPassword) {
    return "ADMIN_PASSWORD doit etre defini pour securiser le back-office.";
  }

  if (backendPassword && adminPassword === backendPassword) {
    return "ADMIN_PASSWORD doit etre distinct de ADMIN_BACKEND_PASSWORD.";
  }

  if (!adminUsername) {
    return "ADMIN_USERNAME doit etre defini en production.";
  }

  return null;
}

export function getAdminIpRestrictionConfigurationError() {
  if (process.env.NODE_ENV === "production" && getAdminAllowedIps().length === 0) {
    return "ADMIN_ALLOWED_IPS ou ADMIN_IP_ALLOWLIST doit etre defini en production pour le back-office.";
  }

  return null;
}

export function getAdminSessionConfigurationError() {
  if (!getAdminSessionSecret()) {
    return "ADMIN_SESSION_SECRET doit etre defini en production.";
  }

  return getAdminAuthConfigurationError() || getAdminIpRestrictionConfigurationError();
}

export function parseAdminSessionToken(token: string): ParsedAdminSessionToken | null {
  const normalizedToken = String(token || "").trim();
  if (!normalizedToken) {
    return null;
  }

  const dotIndex = normalizedToken.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === normalizedToken.length - 1) {
    return null;
  }

  const payload = normalizedToken.slice(0, dotIndex);
  const signature = normalizedToken.slice(dotIndex + 1);
  const [timestampStr, nonce] = payload.split(":");
  if (!timestampStr || !nonce) {
    return null;
  }

  const createdAt = Number.parseInt(timestampStr, 36);
  if (!Number.isFinite(createdAt) || createdAt <= 0) {
    return null;
  }

  return {
    payload,
    signature,
    createdAt,
  };
}

export function isAdminSessionExpired(createdAt: number, now = Date.now()) {
  return now - createdAt > ADMIN_SESSION_MAX_AGE * 1000;
}

export function normalizeIp(value: string | null | undefined) {
  let ip = String(value || "").trim();
  if (!ip) {
    return null;
  }

  if (ip.includes(",")) {
    ip = ip.split(",")[0]?.trim() || "";
  }

  if (!ip) {
    return null;
  }

  if (ip === "localhost") {
    return "127.0.0.1";
  }

  if (ip.startsWith("::ffff:")) {
    ip = ip.slice(7);
  }

  if (ip.startsWith("[") && ip.includes("]")) {
    ip = ip.slice(1, ip.indexOf("]"));
  }

  if (ip.includes(".") && ip.includes(":") && ip.indexOf(":") === ip.lastIndexOf(":")) {
    ip = ip.slice(0, ip.lastIndexOf(":"));
  }

  return ip.toLowerCase();
}

function normalizeHostCandidate(value: string | null | undefined) {
  const normalized = normalizeIp(value);
  if (!normalized) {
    return null;
  }

  if (normalized === "0.0.0.0" || normalized === "::" || normalized === "::1") {
    return "127.0.0.1";
  }

  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized)) {
    return normalized;
  }

  if (normalized.includes(":")) {
    return normalized;
  }

  return normalized === "localhost" ? "127.0.0.1" : null;
}

export function getClientIpFromHeaders(headers: Headers, hostname?: string) {
  const headerCandidates = [
    headers.get("x-forwarded-for"),
    headers.get("x-real-ip"),
    headers.get("x-vercel-forwarded-for"),
    headers.get("cf-connecting-ip"),
  ];

  for (const candidate of headerCandidates) {
    const normalized = normalizeIp(candidate);
    if (normalized) {
      return normalized;
    }
  }

  const hostCandidates = [headers.get("host"), headers.get("x-forwarded-host"), hostname];

  for (const candidate of hostCandidates) {
    const normalized = normalizeHostCandidate(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

export function getAdminAllowedIps() {
  const rawValues = [process.env.ADMIN_ALLOWED_IPS, process.env.ADMIN_IP_ALLOWLIST];

  return Array.from(
    new Set(
      rawValues
        .flatMap((value) => String(value || "").split(","))
        .map((entry) => normalizeIp(entry))
        .filter((entry): entry is string => Boolean(entry)),
    ),
  );
}
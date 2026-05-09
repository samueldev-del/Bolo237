export const ADMIN_SESSION_COOKIE_NAME = "admin_session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8;

// Secret dev-only marqué explicitement comme tel pour éviter toute fuite en prod.
// 64 caractères pour passer la même validation de longueur que la prod.
const DEVELOPMENT_FALLBACK_SECRET =
  "dev-only-insecure-admin-session-secret-do-not-use-in-prod-xxxxxxx";

const MIN_SECRET_LENGTH = 32;

export function getAdminSessionSecret() {
  const configuredSecret = String(process.env.ADMIN_SESSION_SECRET || "").trim();

  if (process.env.NODE_ENV === "production") {
    if (!configuredSecret) {
      throw new Error(
        "ADMIN_SESSION_SECRET est requis en production. Generez une clef avec `openssl rand -hex 32`.",
      );
    }
    if (configuredSecret.length < MIN_SECRET_LENGTH) {
      throw new Error(
        `ADMIN_SESSION_SECRET doit faire au moins ${MIN_SECRET_LENGTH} caracteres en production.`,
      );
    }
    return configuredSecret;
  }

  if (configuredSecret) {
    if (configuredSecret.length < MIN_SECRET_LENGTH) {
      // Log mais ne casse pas le dev — facilite l'onboarding tout en signalant le risque.
      console.warn(
        `[admin] ADMIN_SESSION_SECRET (${configuredSecret.length} chars) < ${MIN_SECRET_LENGTH}. ` +
          `Generez une clef longue avec \`openssl rand -hex 32\`.`,
      );
    }
    return configuredSecret;
  }

  console.warn(
    "[admin] ADMIN_SESSION_SECRET non defini : utilisation d'un secret de developpement non securise.",
  );
  return DEVELOPMENT_FALLBACK_SECRET;
}

export function getAdminSessionConfigurationError(): string | null {
  try {
    getAdminSessionSecret();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Configuration admin invalide.";
  }
}

type ParsedAdminSessionToken = {
  payload: string;
  signature: string;
  createdAt: number;
};

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
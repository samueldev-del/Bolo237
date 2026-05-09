import { NextResponse } from "next/server";
import { createSession, verifyCredentials } from "@/lib/auth";
import {
  getAdminAllowedIps,
  getAdminIpRestrictionConfigurationError,
  getAdminSessionConfigurationError,
  getClientIpFromHeaders,
} from "@/lib/admin-session";
import { ensureBackendAdminSession } from "@/lib/backend-admin";

export const maxDuration = 60;

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

type LoginAttemptEntry = {
  count: number;
  resetAt: number;
};

const globalForAdminLoginRateLimit = globalThis as typeof globalThis & {
  __boloAdminLoginAttempts?: Map<string, LoginAttemptEntry>;
};

const loginAttemptStore = globalForAdminLoginRateLimit.__boloAdminLoginAttempts || new Map<string, LoginAttemptEntry>();
globalForAdminLoginRateLimit.__boloAdminLoginAttempts = loginAttemptStore;

function isBlockingBackendSessionError(message: string) {
  const normalized = String(message || "").toLowerCase();
  return (
    normalized.includes("identifiants backend admin") ||
    normalized.includes("backend admin non configures") ||
    normalized.includes("droits admin")
  );
}

function getAttemptKey(request: Request, username: string) {
  const clientIp = getClientIpFromHeaders(request.headers, new URL(request.url).hostname) || "unknown";
  return `${clientIp}:${String(username || "").trim().toLowerCase() || "unknown"}`;
}

function getAttemptEntry(key: string) {
  const entry = loginAttemptStore.get(key);
  if (!entry) {
    return null;
  }

  if (entry.resetAt <= Date.now()) {
    loginAttemptStore.delete(key);
    return null;
  }

  return entry;
}

function registerFailedAttempt(key: string) {
  const now = Date.now();
  const existingEntry = getAttemptEntry(key);
  if (!existingEntry) {
    const nextEntry = { count: 1, resetAt: now + LOGIN_WINDOW_MS };
    loginAttemptStore.set(key, nextEntry);
    return nextEntry;
  }

  const nextEntry = {
    count: existingEntry.count + 1,
    resetAt: existingEntry.resetAt,
  };
  loginAttemptStore.set(key, nextEntry);
  return nextEntry;
}

function clearAttempts(key: string) {
  loginAttemptStore.delete(key);
}

function tooManyAttemptsResponse(entry: LoginAttemptEntry) {
  const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - Date.now()) / 1000));
  return NextResponse.json(
    {
      success: false,
      error: "Trop de tentatives de connexion admin. Reessayez plus tard.",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = String(body?.username || "").trim();
    const password = String(body?.password || "");
    const sessionConfigurationError = getAdminSessionConfigurationError();
    const ipConfigurationError = getAdminIpRestrictionConfigurationError();

    if (sessionConfigurationError) {
      return NextResponse.json(
        { success: false, error: sessionConfigurationError },
        { status: 503 }
      );
    }

    if (ipConfigurationError) {
      return NextResponse.json(
        { success: false, error: ipConfigurationError },
        { status: 503 }
      );
    }

    const allowedIps = getAdminAllowedIps();
    const clientIp = getClientIpFromHeaders(request.headers, new URL(request.url).hostname);
    if (allowedIps.length > 0 && (!clientIp || !allowedIps.includes(clientIp))) {
      return NextResponse.json({ success: false, error: "Acces introuvable." }, { status: 404 });
    }

    if (!username) {
      return NextResponse.json(
        { success: false, error: "Veuillez entrer l'identifiant administrateur." },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { success: false, error: "Veuillez entrer le mot de passe." },
        { status: 400 }
      );
    }

    const attemptKey = getAttemptKey(request, username);
    const activeAttempt = getAttemptEntry(attemptKey);
    if (activeAttempt && activeAttempt.count >= LOGIN_MAX_ATTEMPTS) {
      return tooManyAttemptsResponse(activeAttempt);
    }

    if (!verifyCredentials(username, password)) {
      const failedAttempt = registerFailedAttempt(attemptKey);
      await new Promise((r) => setTimeout(r, 800));
      if (failedAttempt.count >= LOGIN_MAX_ATTEMPTS) {
        return tooManyAttemptsResponse(failedAttempt);
      }
      return NextResponse.json(
        { success: false, error: "Identifiant ou mot de passe incorrect." },
        { status: 401 }
      );
    }

    clearAttempts(attemptKey);

    // La session admin locale (cookie) est creee meme si le backend est temporairement
    // injoignable. La session backend sera re-acquise au prochain appel API via
    // fetchBackendAsAdmin (qui a deja un retry sur 401/403). Cela evite de bloquer
    // l'admin sur un cold-start Render ou un incident reseau.
    let backendSessionWarning: string | null = null;
    try {
      await ensureBackendAdminSession(true);
    } catch (backendErr) {
      const message = backendErr instanceof Error ? backendErr.message : String(backendErr);
      console.warn("[admin-login] backend session warmup failed:", message);

      if (isBlockingBackendSessionError(message)) {
        return NextResponse.json(
          { success: false, error: message },
          { status: 503 }
        );
      }

      backendSessionWarning = message;
    }

    await createSession();
    return NextResponse.json({
      success: true,
      ...(backendSessionWarning ? { warning: `Session backend differee: ${backendSessionWarning}` } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur de connexion admin.";
    console.error("POST /api/admin-login error:", error);
    return NextResponse.json(
      {
        success: false,
        error: message === "fetch failed"
          ? "Le serveur backend est injoignable. Verifiez NEXT_PUBLIC_API_URL et reessayez."
          : message,
      },
      { status: 502 }
    );
  }
}

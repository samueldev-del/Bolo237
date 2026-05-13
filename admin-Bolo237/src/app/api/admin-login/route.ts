import { NextResponse } from "next/server";
import { createSession, storeBackendSession, verifyCredentials } from "@/lib/auth";
import {
  getAdminAllowedIps,
  getAdminIpRestrictionConfigurationError,
  getAdminSessionConfigurationError,
  getClientIpFromHeaders,
} from "@/lib/admin-session";
import {
  BackendAdminAuthError,
  ensureBackendAdminSession,
  ensureProvidedBackendAdminSession,
} from "@/lib/backend-admin";
import { clearFailures, getBackoffDelay, registerFailure } from "@/lib/admin-login-backoff";

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
    normalized.includes("droits admin") ||
    normalized.includes("trop de tentatives de connexion")
  );
}

function buildStructuredBackendErrorResponse(error: unknown) {
  if (!(error instanceof BackendAdminAuthError)) {
    return null;
  }

  const headers: Record<string, string> = {};
  if (error.retryAfterSeconds && error.retryAfterSeconds > 0) {
    headers["Retry-After"] = String(error.retryAfterSeconds);
  }

  return NextResponse.json(
    {
      success: false,
      error: error.message || "Connexion au backend admin impossible.",
    },
    {
      status: error.status,
      headers,
    }
  );
}

function getAttemptKey(request: Request, username: string) {
  const clientIp = getClientIpFromHeaders(request.headers, new URL(request.url).hostname) || "unknown";
  return `${clientIp}:${String(username || "").trim().toLowerCase() || "unknown"}`;
}

function looksLikeBackendIdentifier(value: string) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return false;
  }

  if (normalized.includes("@")) {
    return true;
  }

  const digitsOnly = normalized.replace(/\s+/g, "");
  return /^\+?\d{6,}$/.test(digitsOnly);
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

    const localCredentialsValid = verifyCredentials(username, password);
    let backendFallbackAuthenticated = false;
    let backendSessionCookie: string | null = null;

    if (!localCredentialsValid && looksLikeBackendIdentifier(username)) {
      try {
        backendSessionCookie = await ensureProvidedBackendAdminSession(username, password);
        backendFallbackAuthenticated = true;
      } catch (backendErr) {
        const structuredErrorResponse = buildStructuredBackendErrorResponse(backendErr);
        if (structuredErrorResponse) {
          return structuredErrorResponse;
        }

        const message = backendErr instanceof Error ? backendErr.message : String(backendErr || "");
        const normalized = message.toLowerCase();
        const backendUnavailable = normalized.includes("timeout")
          || normalized.includes("backend injoignable")
          || normalized.includes("n'a pas repondu")
          || normalized.includes("connexion au backend admin impossible");

        if (backendUnavailable) {
          return NextResponse.json(
            { success: false, error: message || "Backend admin injoignable." },
            { status: 503 }
          );
        }
      }
    }

    if (!localCredentialsValid && !backendFallbackAuthenticated) {
      // Backoff exponentiel par IP (800ms → 8s) AVANT d'incrémenter le compteur,
      // pour que la première frappe soit déjà ralentie.
      const delay = getBackoffDelay(clientIp);
      registerFailure(clientIp);
      const failedAttempt = registerFailedAttempt(attemptKey);
      await new Promise((r) => setTimeout(r, delay));
      if (failedAttempt.count >= LOGIN_MAX_ATTEMPTS) {
        return tooManyAttemptsResponse(failedAttempt);
      }
      return NextResponse.json(
        { success: false, error: "Identifiant ou mot de passe incorrect." },
        { status: 401 }
      );
    }

    clearFailures(clientIp);
    clearAttempts(attemptKey);

    // La session admin locale (cookie) est creee meme si le backend est temporairement
    // injoignable. La session backend sera re-acquise au prochain appel API via
    // fetchBackendAsAdmin (qui a deja un retry sur 401/403). Cela evite de bloquer
    // l'admin sur un cold-start Render ou un incident reseau.
    let backendSessionWarning: string | null = null;
    if (!backendFallbackAuthenticated) {
      try {
        backendSessionCookie = await ensureBackendAdminSession(true);
      } catch (backendErr) {
        const structuredErrorResponse = buildStructuredBackendErrorResponse(backendErr);
        if (structuredErrorResponse) {
          return structuredErrorResponse;
        }

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
    }

    await createSession();
    if (backendSessionCookie) {
      await storeBackendSession(backendSessionCookie);
    }
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

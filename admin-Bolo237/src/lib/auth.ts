import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import {
  ADMIN_SESSION_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE,
  getAdminAuthConfigurationError,
  getAdminLoginUsername,
  getAdminSessionSecret,
  parseAdminSessionToken,
  isAdminSessionExpired,
} from "@/lib/admin-session";

const COOKIE_NAME = ADMIN_SESSION_COOKIE_NAME;
const SESSION_MAX_AGE = ADMIN_SESSION_MAX_AGE;

function getRequiredAdminSessionSecret() {
  const secret = getAdminSessionSecret();
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET doit etre defini en production.");
  }

  return secret;
}

/**
 * Genere un token de session signe avec HMAC-SHA256.
 */
function generateToken(): string {
  const secret = getRequiredAdminSessionSecret();
  const timestamp = Date.now().toString(36);
  const nonce = randomBytes(16).toString("hex");
  const payload = `${timestamp}:${nonce}`;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

/**
 * Verifie si le token de session est valide (signature HMAC).
 */
function isValidToken(token: string): boolean {
  try {
    const secret = getAdminSessionSecret();
    if (!secret) return false;

    const parsedToken = parseAdminSessionToken(token);
    if (!parsedToken) return false;

    const expectedSignature = createHmac("sha256", secret)
      .update(parsedToken.payload)
      .digest("base64url");

    // Comparaison en temps constant pour eviter les timing attacks
    const sigBuf = Buffer.from(parsedToken.signature);
    const expectedBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expectedBuf.length) return false;
    if (!timingSafeEqual(sigBuf, expectedBuf)) return false;

    // Verifier l'expiration du token
    if (isAdminSessionExpired(parsedToken.createdAt)) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Verifie les identifiants admin locaux.
 */
function safeEqualStrings(left: string, right: string) {
  const leftBuf = Buffer.from(left);
  const rightBuf = Buffer.from(right);
  if (leftBuf.length !== rightBuf.length) {
    return false;
  }

  return timingSafeEqual(leftBuf, rightBuf);
}

function matchesCredentialPair(
  username: string,
  password: string,
  expectedUsername: string,
  expectedPassword: string,
) {
  if (!expectedUsername || !expectedPassword) {
    return false;
  }

  return safeEqualStrings(username, expectedUsername) && safeEqualStrings(password, expectedPassword);
}

export function verifyCredentials(username: string, password: string): boolean {
  const configurationError = getAdminAuthConfigurationError();
  if (configurationError) {
    console.error(`[Auth] ${configurationError}`);
    return false;
  }

  const expectedUsername = getAdminLoginUsername().toLowerCase();
  const expectedPassword = String(process.env.ADMIN_PASSWORD || "").trim();
  const backendAdminEmail = String(process.env.ADMIN_BACKEND_EMAIL || "").trim().toLowerCase();
  const backendAdminPassword = String(process.env.ADMIN_BACKEND_PASSWORD || "").trim();
  const normalizedUsername = String(username || "").trim().toLowerCase();
  const normalizedPassword = String(password || "").trim();

  return (
    matchesCredentialPair(normalizedUsername, normalizedPassword, expectedUsername, expectedPassword)
    || matchesCredentialPair(normalizedUsername, normalizedPassword, backendAdminEmail, backendAdminPassword)
  );
}

/**
 * Cree une session admin (pose le cookie).
 */
export async function createSession(): Promise<void> {
  const token = generateToken();
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

/**
 * Detruit la session admin (supprime le cookie).
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Verifie si l'utilisateur est authentifie.
 */
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return isValidToken(token);
}

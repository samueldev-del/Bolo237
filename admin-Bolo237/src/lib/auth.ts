import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const COOKIE_NAME = "admin_session";
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 heures

/**
 * Genere un token de session signe avec HMAC-SHA256.
 */
function generateToken(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || "fallback_secret";
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
    const secret = process.env.ADMIN_SESSION_SECRET || "fallback_secret";
    const dotIndex = token.lastIndexOf(".");
    if (dotIndex === -1) return false;

    const payload = token.slice(0, dotIndex);
    const signature = token.slice(dotIndex + 1);

    const expectedSignature = createHmac("sha256", secret).update(payload).digest("base64url");

    // Comparaison en temps constant pour eviter les timing attacks
    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expectedBuf.length) return false;
    if (!timingSafeEqual(sigBuf, expectedBuf)) return false;

    // Verifier l'expiration du token
    const [timestampStr] = payload.split(":");
    const created = parseInt(timestampStr, 36);
    const now = Date.now();
    if (now - created > SESSION_MAX_AGE * 1000) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Verifie le mot de passe admin.
 */
export function verifyPassword(password: string): boolean {
  const candidates = [
    String(process.env.ADMIN_PASSWORD || ''),
    String(process.env.ADMIN_BACKEND_PASSWORD || ''),
  ].map((v) => v.trim()).filter(Boolean);

  if (candidates.length === 0) {
    console.error("[Auth] ADMIN_PASSWORD / ADMIN_BACKEND_PASSWORD non definis dans l'environnement");
    return false;
  }

  const normalizedInput = String(password || '').trim();
  const inputBuf = Buffer.from(normalizedInput);

  for (const expected of candidates) {
    const expectedBuf = Buffer.from(expected);
    if (inputBuf.length !== expectedBuf.length) continue;
    if (timingSafeEqual(inputBuf, expectedBuf)) return true;
  }

  return false;
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

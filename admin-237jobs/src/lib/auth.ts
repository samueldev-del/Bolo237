import { cookies } from "next/headers";

const COOKIE_NAME = "admin_session";
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 heures

/**
 * Genere un token de session simple a partir du secret + timestamp.
 * En production, utiliser JWT ou un vrai systeme de session.
 */
function generateToken(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || "fallback_secret";
  const timestamp = Date.now().toString(36);
  const payload = `${secret}:${timestamp}`;
  // Encodage base64 simple (pas crypto-grade, mais suffisant pour un admin unique)
  return Buffer.from(payload).toString("base64url");
}

/**
 * Verifie si le token de session est valide.
 */
function isValidToken(token: string): boolean {
  try {
    const secret = process.env.ADMIN_SESSION_SECRET || "fallback_secret";
    const decoded = Buffer.from(token, "base64url").toString();
    const [tokenSecret] = decoded.split(":");
    return tokenSecret === secret;
  } catch {
    return false;
  }
}

/**
 * Verifie le mot de passe admin.
 */
export function verifyPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error("[Auth] ADMIN_PASSWORD non defini dans .env");
    return false;
  }
  return password === adminPassword;
}

/**
 * Cree une session admin (pose le cookie).
 */
export async function createSession(): Promise<void> {
  const token = generateToken();
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
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

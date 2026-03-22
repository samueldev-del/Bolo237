import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "admin_session";

// Routes publiques (pas besoin d'auth)
const PUBLIC_PATHS = ["/login"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Laisser passer les fichiers statiques et API Next.js
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") // fichiers statiques (.ico, .svg, etc.)
  ) {
    return NextResponse.next();
  }

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const sessionToken = request.cookies.get(COOKIE_NAME)?.value;

  // Verification basique du token (meme logique que auth.ts)
  let isValid = false;
  if (sessionToken) {
    try {
      const secret = process.env.ADMIN_SESSION_SECRET || "fallback_secret";
      const decoded = Buffer.from(sessionToken, "base64url").toString();
      const [tokenSecret] = decoded.split(":");
      isValid = tokenSecret === secret;
    } catch {
      isValid = false;
    }
  }

  // Si pas authentifie et pas sur une route publique -> rediriger vers /login
  if (!isValid && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Si authentifie et sur /login -> rediriger vers /
  if (isValid && isPublicPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Matcher toutes les routes sauf les fichiers statiques
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

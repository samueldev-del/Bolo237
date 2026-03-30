import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware de protection serveur.
 * Redirige vers /login si pas de session admin valide.
 * Pas besoin de lire document.cookie cote client.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Routes publiques (login, assets, api)
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg")
  ) {
    // Si l'utilisateur est deja connecte et va sur /login, rediriger vers /
    if (pathname === "/login") {
      const session = request.cookies.get("admin_session")?.value;
      if (session) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
    return NextResponse.next();
  }

  // Verifier la session admin
  const session = request.cookies.get("admin_session")?.value;
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

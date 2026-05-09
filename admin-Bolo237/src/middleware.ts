import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE_NAME,
  getAdminAllowedIps,
  getAdminIpRestrictionConfigurationError,
  getAdminSessionConfigurationError,
  getAdminSessionSecret,
  getClientIpFromHeaders,
  isAdminSessionExpired,
  parseAdminSessionToken,
} from "@/lib/admin-session";

let cachedSecret: string | null = null;
let cachedKeyPromise: Promise<CryptoKey> | null = null;

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/manifest.json" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname === "/offline.html" ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".json") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".webp")
  );
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function getSigningKey(secret: string) {
  if (cachedSecret !== secret || !cachedKeyPromise) {
    cachedSecret = secret;
    cachedKeyPromise = crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
  }

  return cachedKeyPromise;
}

async function isValidAdminSessionToken(token: string) {
  const secret = getAdminSessionSecret();
  if (!secret) {
    return false;
  }

  const parsedToken = parseAdminSessionToken(token);
  if (!parsedToken || isAdminSessionExpired(parsedToken.createdAt)) {
    return false;
  }

  const signingKey = await getSigningKey(secret);
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    signingKey,
    new TextEncoder().encode(parsedToken.payload),
  );

  return toBase64Url(new Uint8Array(signatureBuffer)) === parsedToken.signature;
}

function notFoundResponse() {
  return new NextResponse("Not Found", { status: 404 });
}

function redirectToLogin(request: NextRequest, clearSession = false) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  if (clearSession) {
    response.cookies.delete(ADMIN_SESSION_COOKIE_NAME);
  }
  return response;
}

/**
 * Middleware de protection serveur.
 * Redirige vers /login si pas de session admin valide.
 * Pas besoin de lire document.cookie cote client.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessConfigurationError = getAdminSessionConfigurationError();
  const ipConfigurationError = getAdminIpRestrictionConfigurationError();

  const shouldCheckIp = pathname === "/login" || (!pathname.startsWith("/api/") && !isPublicAsset(pathname));

  if (!pathname.startsWith("/api/") && !isPublicAsset(pathname) && accessConfigurationError) {
    return new NextResponse(accessConfigurationError, { status: 503 });
  }

  if (shouldCheckIp && ipConfigurationError) {
    return new NextResponse(ipConfigurationError, { status: 503 });
  }

  if (shouldCheckIp) {
    const allowedIps = getAdminAllowedIps();
    if (allowedIps.length > 0) {
      const clientIp = getClientIpFromHeaders(request.headers, request.nextUrl.hostname);
      if (!clientIp || !allowedIps.includes(clientIp)) {
        console.warn('[MIDDLEWARE IP REJECT]', {
          clientIp,
          allowedIps,
          forwardedFor: request.headers.get('x-forwarded-for'),
        });
        return notFoundResponse();
      }
    }
  }

  const sessionToken = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  const hasValidSession = sessionToken ? await isValidAdminSessionToken(sessionToken) : false;

  // Routes publiques (login, assets, api)
  if (
    pathname === "/login" ||
    pathname.startsWith("/monitoring") ||
    pathname.startsWith("/api/") ||
    isPublicAsset(pathname)
  ) {
    if (pathname === "/login" && sessionToken && !hasValidSession) {
      const response = NextResponse.next();
      response.cookies.delete(ADMIN_SESSION_COOKIE_NAME);
      return response;
    }

    return NextResponse.next();
  }

  // Verifier la session admin
  if (!sessionToken || !hasValidSession) {
    return redirectToLogin(request, Boolean(sessionToken));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    "/((?!monitoring|_next/static|_next/image|favicon.ico|manifest.json|manifest.webmanifest|sw.js|offline.html|icons/).*)",
  ],
};

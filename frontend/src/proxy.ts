import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const DEFAULT_LOCALE = 'fr';
const SUPPORTED_LOCALES = ['fr', 'en'] as const;
const PUBLIC_FILE = /\.(.*)$/;
const SESSION_COOKIE_NAME = 'bolo237_session';

type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function getPreferredLocale(request: NextRequest): SupportedLocale {
	const acceptLanguage = request.headers.get('accept-language') || '';
	return /\ben\b/i.test(acceptLanguage) ? 'en' : DEFAULT_LOCALE;
}

let cachedSecret: Uint8Array | null = null;
function getSessionSecret(): Uint8Array | null {
	if (cachedSecret) return cachedSecret;
	const raw = process.env.SESSION_JWT_SECRET;
	if (!raw) return null;
	cachedSecret = new TextEncoder().encode(raw);
	return cachedSecret;
}

async function getSessionRoleFromCookie(cookieValue: string | undefined): Promise<string | null> {
	if (!cookieValue) return null;
	const secret = getSessionSecret();
	if (!secret) return null;

	try {
		const { payload } = await jwtVerify(cookieValue, secret, { algorithms: ['HS256'] });
		const role = String((payload as { role?: string }).role || '').trim().toUpperCase();
		return role || null;
	} catch {
		return null;
	}
}

function getPathLocale(pathname: string): SupportedLocale | null {
	const maybeLocale = pathname.split('/')[1];
	return SUPPORTED_LOCALES.includes(maybeLocale as SupportedLocale)
		? (maybeLocale as SupportedLocale)
		: null;
}

function stripLocalePrefix(pathname: string) {
	const pathLocale = getPathLocale(pathname);
	if (!pathLocale) return pathname;

	const stripped = pathname.replace(`/${pathLocale}`, '');
	return stripped || '/';
}

function buildLocalizedPath(path: string, locale: SupportedLocale) {
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	return `/${locale}${normalizedPath === '/' ? '' : normalizedPath}`;
}

function isHomePath(pathname: string) {
	return pathname === '/' || pathname === '/fr' || pathname === '/en';
}

function isLoginPath(pathname: string, normalizedPathname: string) {
	return pathname === '/connexion' || normalizedPathname === '/connexion';
}

function getRoleDashboardPath(role: string, locale: SupportedLocale) {
	if (role === 'ARTISAN') {
		return buildLocalizedPath('/dashboard-artisan', locale);
	}

	if (role === 'ENTREPRISE') {
		return buildLocalizedPath('/dashboard-entreprise', locale);
	}

	return null;
}

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	if (
		pathname.startsWith('/_next') ||
		pathname.startsWith('/api') ||
		pathname.startsWith('/monitoring') ||
		pathname.startsWith('/favicon') ||
		PUBLIC_FILE.test(pathname)
	) {
		return NextResponse.next();
	}

	const pathLocale = getPathLocale(pathname);
	const normalizedPathname = stripLocalePrefix(pathname);
	const effectiveLocale = pathLocale || getPreferredLocale(request);

	const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
	const sessionRole = await getSessionRoleFromCookie(sessionCookie);

	if (sessionRole && (isHomePath(pathname) || isLoginPath(pathname, normalizedPathname))) {
		const dashboardPath = getRoleDashboardPath(sessionRole, effectiveLocale);
		if (dashboardPath) {
			return NextResponse.redirect(new URL(dashboardPath, request.url));
		}
	}

	if (!pathLocale) {
		const redirectUrl = request.nextUrl.clone();
		redirectUrl.pathname = buildLocalizedPath(pathname, effectiveLocale);

		const response = NextResponse.redirect(redirectUrl);
		response.headers.set('Vary', 'Accept-Language');
		return response;
	}

	const nonce = generateCspNonce();
	const isProd = process.env.NODE_ENV === 'production';
	const cspHeader = buildCspHeader(nonce, isProd);

	const requestHeaders = new Headers(request.headers);
	requestHeaders.set('x-nonce', nonce);
	requestHeaders.set('content-security-policy', cspHeader);

	if (pathname === '/fr' || pathname === '/en') {
		const response = NextResponse.next({ request: { headers: requestHeaders } });
		response.headers.set('Content-Security-Policy', cspHeader);
		return response;
	}

	const rewriteUrl = request.nextUrl.clone();
	rewriteUrl.pathname = normalizedPathname;

	const response = NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } });
	response.headers.set('Content-Security-Policy', cspHeader);
	return response;
}

function generateCspNonce(): string {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary);
}

function buildCspHeader(nonce: string, isProd: boolean): string {
	const scriptSrc = isProd
		? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
		: `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`;
	return [
		"default-src 'self'",
		scriptSrc,
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
		"font-src 'self' https://fonts.gstatic.com data:",
		"img-src 'self' data: blob: https:",
		"worker-src 'self' blob:",
		"child-src 'self' blob:",
		"frame-ancestors 'none'",
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self' https://wa.me",
	].join('; ');
}

export const config = {
	matcher: ['/((?!monitoring|_next|.*\\..*).*)'],
};

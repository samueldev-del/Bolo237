import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_LOCALE = 'fr';
const SUPPORTED_LOCALES = ['fr', 'en'] as const;
const PUBLIC_FILE = /\.(.*)$/;
const SESSION_COOKIE_NAME = 'bolo237_session';

type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function getPreferredLocale(request: NextRequest): SupportedLocale {
	const acceptLanguage = request.headers.get('accept-language') || '';
	return /\ben\b/i.test(acceptLanguage) ? 'en' : DEFAULT_LOCALE;
}

function decodeBase64Url(input: string) {
	const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
	const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
	return atob(padded);
}

function getSessionRoleFromCookie(cookieValue: string | undefined): string | null {
	if (!cookieValue) return null;

	try {
		const parts = cookieValue.split('.');
		if (parts.length !== 3) return null;

		const payloadRaw = decodeBase64Url(parts[1]);
		const payload = JSON.parse(payloadRaw) as { role?: string };
		const role = String(payload.role || '').trim().toUpperCase();
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

export function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	if (
		pathname.startsWith('/_next') ||
		pathname.startsWith('/api') ||
		pathname.startsWith('/favicon') ||
		PUBLIC_FILE.test(pathname)
	) {
		return NextResponse.next();
	}

	const pathLocale = getPathLocale(pathname);
	const normalizedPathname = stripLocalePrefix(pathname);
	const effectiveLocale = pathLocale || getPreferredLocale(request);

	const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
	const sessionRole = getSessionRoleFromCookie(sessionCookie);

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

	if (pathname === '/fr' || pathname === '/en') {
		return NextResponse.next();
	}

	const rewriteUrl = request.nextUrl.clone();
	rewriteUrl.pathname = normalizedPathname;

	return NextResponse.rewrite(rewriteUrl);
}

export const config = {
	matcher: ['/((?!_next|.*\\..*).*)'],
};
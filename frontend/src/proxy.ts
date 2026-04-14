import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_LOCALE = 'fr';
const SUPPORTED_LOCALES = ['fr', 'en'] as const;
const PUBLIC_FILE = /\.(.*)$/;

function getPreferredLocale(request: NextRequest) {
  const acceptLanguage = request.headers.get('accept-language') || '';
  return /\ben\b/i.test(acceptLanguage) ? 'en' : DEFAULT_LOCALE;
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

  const maybeLocale = pathname.split('/')[1];
  const isLocalePath = SUPPORTED_LOCALES.includes(maybeLocale as (typeof SUPPORTED_LOCALES)[number]);
  const isLocaleHomePath = pathname === '/fr' || pathname === '/en';

  if (isLocaleHomePath) {
    return NextResponse.next();
  }

  if (!isLocalePath) {
    const locale = getPreferredLocale(request);
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = pathname === '/' ? `/${locale}` : `/${locale}${pathname}`;

    const response = NextResponse.redirect(redirectUrl);
    response.headers.set('Vary', 'Accept-Language');
    return response;
  }

  const locale = maybeLocale as (typeof SUPPORTED_LOCALES)[number];
  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = pathname.replace(`/${locale}`, '') || '/';

  return NextResponse.rewrite(rewriteUrl);
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};
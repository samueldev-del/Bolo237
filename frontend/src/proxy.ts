import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_LOCALE = 'fr';
const SUPPORTED_LOCALES = ['fr', 'en'] as const;
const PUBLIC_FILE = /\.(.*)$/;

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

  if (!isLocalePath) {
    const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
    const locale = cookieLocale === 'en' ? 'en' : DEFAULT_LOCALE;
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = pathname === '/' ? `/${locale}` : `/${locale}${pathname}`;
    return NextResponse.redirect(redirectUrl);
  }

  const locale = maybeLocale as (typeof SUPPORTED_LOCALES)[number];
  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = pathname.replace(`/${locale}`, '') || '/';

  const response = NextResponse.rewrite(rewriteUrl);
  response.cookies.set('NEXT_LOCALE', locale, { path: '/', maxAge: 60 * 60 * 24 * 365 });
  return response;
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};
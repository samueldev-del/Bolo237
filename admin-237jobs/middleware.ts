import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // On cherche le badge d'accès
  const session = request.cookies.get('admin_session');
  const isLoginPage = request.nextUrl.pathname === '/login';

  // Si pas de badge et qu'on n'est pas sur la page login -> Dehors !
  if (!session && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Si on a le badge et qu'on essaie d'aller sur login -> Retour à l'accueil
  if (session && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// Le vigile surveille toutes les pages SAUF les images et l'API
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
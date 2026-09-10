/**
 * Proxy — Kima Facturação (Next.js 16.3.0)
 *
 * Edge Runtime: apenas verifica existência do cookie kima-session.
 * Nunca consulta BD. A validação real da sessão é feita no servidor.
 */

import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'kima-session';

const PUBLIC_PATHS = [
  '/login',
  '/primeiro-acesso',
  '/acesso-negado',
  '/api/auth/login',
  '/api/auth/primeiro-acesso',
  '/api/auth/permissions',
  '/api/auth/check-subscription',
];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Rotas públicas → sempre permite
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Rotas estáticas → permite
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp)$/)
  ) {
    return NextResponse.next();
  }

  // Verificar se existe cookie de sessão
  const session = request.cookies.get(SESSION_COOKIE);
  if (!session) {
    // API routes → 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado.' },
        { status: 401 }
      );
    }
    // Pages → redirect para login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image, favicon.ico
     * - public files (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

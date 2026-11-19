/**
 * Proxy — Kima Facturação (Next.js 16.3.0)
 *
 * Valida a sessão Supabase antes de permitir acesso às páginas e APIs.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getKimaCookieDomain } from '@/lib/kima-cookie-domain';

const PUBLIC_PATHS = [
  '/login',
  '/primeiro-acesso',
  '/acesso-negado',
  '/auth/callback',
  '/api/auth/context',
  '/api/auth/logout',
  '/api/auth/primeiro-acesso',
];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Rotas públicas → sempre permite
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
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

  if (process.env.NEXT_PUBLIC_USE_MOCK_DB === 'true') {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const authSource =
    request.cookies.get('kima-auth-source')?.value === 'faturas'
      ? 'faturas'
      : 'hub';
  const supabaseUrl =
    authSource === 'faturas'
      ? process.env.NEXT_PUBLIC_FATURAS_AUTH_SUPABASE_URL
      : process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    authSource === 'faturas'
      ? process.env.NEXT_PUBLIC_FATURAS_AUTH_SUPABASE_ANON_KEY
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error(`[Proxy Supabase Auth] Configuração ${authSource} não encontrada.`);
    return NextResponse.json(
      {
        error:
          authSource === 'faturas'
            ? 'A autenticação do Kima Faturas não está configurada.'
            : 'A autenticação partilhada não está configurada.',
      },
      { status: 503 }
    );
  }

  const cookieDomain = getKimaCookieDomain(request.nextUrl.hostname);
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    db: { schema: 'public' },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, {
            ...options,
            ...(cookieDomain ? { domain: cookieDomain } : {}),
          })
        );
        Object.entries(headers).forEach(([name, value]) =>
          response.headers.set(name, value)
        );
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (
    error &&
    error.status !== 401 &&
    error.name !== 'AuthSessionMissingError'
  ) {
    console.error('[Proxy Supabase Auth]', error.message);
    return NextResponse.json(
      { error: 'Não foi possível validar a sessão. Tente novamente.' },
      { status: 503 }
    );
  }

  if (!user) {
    // API routes → 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado.' },
        { status: 401 }
      );
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set(
      'redirect',
      `${pathname}${request.nextUrl.search}`
    );
    return NextResponse.redirect(loginUrl);
  }

  return response;
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

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const MODULE_KEY = process.env.NEXT_PUBLIC_KIMA_MODULE_KEY || 'faturas';

function getCookieDomain(request: NextRequest): string | undefined {
  const host = request.headers.get('host') || '';
  const rootDomain = process.env.NEXT_PUBLIC_KIMA_ROOT_DOMAIN || 'kima.ao';
  if (host.includes(rootDomain)) {
    return `.${rootDomain}`;
  }
  return undefined;
}

export async function proxy(request: NextRequest) {
  const COOKIE_DOMAIN = getCookieDomain(request);
  const requestHeaders = new Headers(request.headers);

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              domain: COOKIE_DOMAIN,
              path: '/',
            })
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isAuthCallback = request.nextUrl.pathname.startsWith('/auth/callback');
  const isAuthPage =
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/signup' ||
    request.nextUrl.pathname === '/auth';
  const isStaticAsset =
    request.nextUrl.pathname.startsWith('/_next/') ||
    request.nextUrl.pathname.startsWith('/favicon.ico');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');

  if (isStaticAsset || isAuthCallback || isAuthPage) {
    return response;
  }

  if (!user) {
    if (isApiRoute) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado. Faça login no Kima Hub.' },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 1. Resolver a empresa ativa e validar o membership do utilizador.
  const cookieCompanyId = request.cookies.get('kima-company-id')?.value;
  let activeCompanyId: string | null = null;

  if (cookieCompanyId) {
    const { data: membership } = await supabase
      .from('memberships')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', cookieCompanyId)
      .maybeSingle();

    if (membership?.company_id) {
      activeCompanyId = membership.company_id;
    }
  }

  if (!activeCompanyId) {
    const { data: membership } = await supabase
      .from('memberships')
      .select('company_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership?.company_id) {
      if (isApiRoute) {
        return NextResponse.json(
          { success: false, error: 'Sem empresa associada a este utilizador. Configure a empresa no Kima Hub.' },
          { status: 403 }
        );
      }
      const onboardingUrl = new URL('/onboarding', process.env.NEXT_PUBLIC_KIMA_HUB_URL || 'https://kima-hub.vercel.app');
      return NextResponse.redirect(onboardingUrl);
    }

    activeCompanyId = membership.company_id;
    response.cookies.set('kima-company-id', membership.company_id, {
      domain: COOKIE_DOMAIN,
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' && request.nextUrl.protocol === 'https:',
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  const companyId = activeCompanyId;

  // 2. Verificar se a empresa ativa possui este módulo contratado e ativo
  const { data: hasModule } = await supabase
    .from('company_modules')
    .select('id, status, expires_at')
    .eq('company_id', companyId)
    .eq('module_key', MODULE_KEY)
    .maybeSingle();

  if (!hasModule || hasModule.status !== 'Ativo') {
    if (isApiRoute) {
      return NextResponse.json(
        { success: false, error: 'Módulo de facturação não contratado ou inativo para esta empresa.' },
        { status: 403 }
      );
    }
    const marketplaceUrl = new URL('/marketplace', process.env.NEXT_PUBLIC_KIMA_HUB_URL || 'https://kima-hub.vercel.app');
    marketplaceUrl.searchParams.set('required_module', MODULE_KEY);
    return NextResponse.redirect(marketplaceUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

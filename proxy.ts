import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const MODULE_KEY = process.env.NEXT_PUBLIC_KIMA_MODULE_KEY || 'faturas';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const COOKIE_DOMAIN = process.env.NODE_ENV === 'production' ? '.kima.ao' : undefined;

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

  if (isStaticAsset || isAuthCallback || isAuthPage) {
    return response;
  }

  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 1. Resolver a empresa ativa: usa o cookie de SSO quando existir,
  //    senão procura a associação do próprio user na tabela `memberships`.
  const cookieCompanyId = request.cookies.get('kima-company-id')?.value;

  let activeCompanyId: string | null = cookieCompanyId ?? null;

  if (!activeCompanyId) {
    const { data: membership } = await supabase
      .from('memberships')
      .select('company_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership?.company_id) {
      // Sem empresa associada: direciona para o onboarding do Hub
      const onboardingUrl = new URL('/onboarding', process.env.NEXT_PUBLIC_KIMA_HUB_URL!);
      return NextResponse.redirect(onboardingUrl);
    }

    activeCompanyId = membership.company_id;
    response.cookies.set('kima-company-id', membership.company_id, {
      domain: COOKIE_DOMAIN,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
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
    const marketplaceUrl = new URL('/marketplace', process.env.NEXT_PUBLIC_KIMA_HUB_URL!);
    marketplaceUrl.searchParams.set('required_module', MODULE_KEY);
    return NextResponse.redirect(marketplaceUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

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
  const isStaticAsset =
    request.nextUrl.pathname.startsWith('/_next/') ||
    request.nextUrl.pathname.startsWith('/favicon.ico');

  if (isStaticAsset || isAuthCallback) {
    return response;
  }

  if (!user) {
    const hubLoginUrl = new URL('/login', process.env.NEXT_PUBLIC_KIMA_HUB_URL!);
    hubLoginUrl.searchParams.set('app', MODULE_KEY);
    hubLoginUrl.searchParams.set('redirect_uri', request.url);
    return NextResponse.redirect(hubLoginUrl);
  }

  const activeCompanyId = request.cookies.get('kima-company-id')?.value;
  if (activeCompanyId) {
    const { data: hasModule } = await supabase
      .from('company_modules')
      .select('id')
      .eq('company_id', activeCompanyId)
      .eq('module_key', MODULE_KEY)
      .eq('status', 'Ativo')
      .maybeSingle();

    if (!hasModule) {
      const marketplaceUrl = new URL('/marketplace', process.env.NEXT_PUBLIC_KIMA_HUB_URL!);
      marketplaceUrl.searchParams.set('required_module', MODULE_KEY);
      return NextResponse.redirect(marketplaceUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

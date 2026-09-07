import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get('token');
  const redirectTarget = requestUrl.searchParams.get('redirect') || '/';

  const host = request.headers.get('host') || '';
  const rootDomain = process.env.NEXT_PUBLIC_KIMA_ROOT_DOMAIN || 'kima.ao';
  const COOKIE_DOMAIN = host.includes(rootDomain) ? `.${rootDomain}` : undefined;

  if (token) {
    try {
      const verifyRes = await fetch(
        `${process.env.NEXT_PUBLIC_KIMA_HUB_URL || 'https://kima-hub.vercel.app'}/api/sso/verify?token=${token}`,
        { cache: 'no-store' }
      );

      if (verifyRes.ok) {
        const data = await verifyRes.json();
        if (data.valid && data.companyId) {
          response.cookies.set('kima-company-id', data.companyId, {
            domain: COOKIE_DOMAIN,
            path: '/',
            httpOnly: false,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production' && request.nextUrl.protocol === 'https:',
            maxAge: 60 * 60 * 24 * 30,
          });
        }
      }
    } catch (err) {
      console.error('Erro ao verificar SSO Token no Hub:', err);
    }
  }

  return response;
}

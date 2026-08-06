import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get('token');
  const redirectTarget = requestUrl.searchParams.get('redirect') || '/';

  const response = NextResponse.redirect(new URL(redirectTarget, request.url));
  const COOKIE_DOMAIN = process.env.NODE_ENV === 'production' ? '.kima.ao' : undefined;

  if (token) {
    try {
      const verifyRes = await fetch(
        `${process.env.NEXT_PUBLIC_KIMA_HUB_URL}/api/sso/verify?token=${token}`,
        { cache: 'no-store' }
      );

      if (verifyRes.ok) {
        const data = await verifyRes.json();
        if (data.valid && data.companyId) {
          response.cookies.set('kima-company-id', data.companyId, {
            domain: COOKIE_DOMAIN,
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
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

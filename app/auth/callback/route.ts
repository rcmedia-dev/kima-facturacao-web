import { NextResponse, type NextRequest } from 'next/server';
import {
  createSupabaseRequestClient,
  setAuthSourceCookie,
  setCompanyContextCookie,
} from '@/lib/supabase-request';

interface SsoVerification {
  valid: boolean;
  userId?: string | null;
  companyId?: string | null;
  appKey?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
}

function safeRedirectTarget(value: string | null, origin: string): string {
  if (!value) {
    return '/dashboard';
  }
  const target = new URL(value, origin);
  if (target.origin !== origin) return '/dashboard';
  return `${target.pathname}${target.search}${target.hash}`;
}

function redirectExistingResponse(
  response: NextResponse,
  url: URL
): NextResponse {
  response.headers.set('Location', url.toString());
  return response;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get('token');
  const redirectTarget = safeRedirectTarget(
    requestUrl.searchParams.get('redirect'),
    requestUrl.origin
  );
  const response = NextResponse.redirect(
    new URL(redirectTarget, request.url)
  );

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'sso_token_missing');
    return NextResponse.redirect(loginUrl);
  }

  try {
    const hubUrl = process.env.NEXT_PUBLIC_KIMA_HUB_URL;
    if (!hubUrl) {
      throw new Error('NEXT_PUBLIC_KIMA_HUB_URL não está configurada.');
    }

    const verificationUrl = new URL('/api/sso/verify', hubUrl);
    verificationUrl.searchParams.set('token', token);
    const verificationResponse = await fetch(verificationUrl, {
      cache: 'no-store',
    });

    if (!verificationResponse.ok) {
      throw new Error(`O Hub rejeitou o token SSO (${verificationResponse.status}).`);
    }

    const verification =
      (await verificationResponse.json()) as SsoVerification;
    const expectedAppKey =
      process.env.NEXT_PUBLIC_KIMA_MODULE_KEY || 'faturas';

    if (
      !verification.valid ||
      !verification.accessToken ||
      !verification.refreshToken ||
      verification.appKey !== expectedAppKey
    ) {
      throw new Error('O token SSO é inválido ou não pertence a este módulo.');
    }

    const supabase = createSupabaseRequestClient(request, response);
    const { data, error } = await supabase.auth.setSession({
      access_token: verification.accessToken,
      refresh_token: verification.refreshToken,
    });

    if (error || !data.user) {
      throw new Error(error?.message || 'O Supabase não confirmou a sessão SSO.');
    }

    if (verification.userId && data.user.id !== verification.userId) {
      await supabase.auth.signOut();
      throw new Error('O utilizador do token SSO não corresponde à sessão Supabase.');
    }

    setAuthSourceCookie(response, request, 'hub');
    if (verification.companyId) {
      setCompanyContextCookie(response, request, verification.companyId);
    } else {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', redirectTarget);
      return redirectExistingResponse(response, loginUrl);
    }
  } catch (error: unknown) {
    console.error(
      '[SSO callback]',
      error instanceof Error ? error.message : 'Erro inesperado.'
    );
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'sso_failed');
    return redirectExistingResponse(response, loginUrl);
  }

  return response;
}

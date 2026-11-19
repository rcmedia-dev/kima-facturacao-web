import { createServerClient } from '@/lib/supabase-ssr';
import { getKimaCookieDomain } from '@/lib/kima-cookie-domain';
import {
  getSupabaseAuthConfig,
  type SupabaseAuthSource,
} from '@/lib/auth-source';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NextResponse } from 'next/server';

type CookiePair = { name: string; value: string };
const AUTH_SOURCE_COOKIE = 'kima-auth-source';

function requestCookies(request: Request): CookiePair[] {
  const requestWithCookies = request as Request & {
    cookies?: { getAll: () => CookiePair[] };
  };

  if (requestWithCookies.cookies?.getAll) {
    return requestWithCookies.cookies.getAll();
  }

  const header = request.headers.get('cookie') || '';
  return header
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator = part.indexOf('=');
      if (separator < 0) return null;
      const name = part.slice(0, separator).trim();
      const rawValue = part.slice(separator + 1).trim();
      try {
        return { name, value: decodeURIComponent(rawValue) };
      } catch {
        return { name, value: rawValue };
      }
    })
    .filter((cookie): cookie is CookiePair => cookie !== null);
}

export function getRequestCookie(
  request: Request,
  name: string
): string | undefined {
  return requestCookies(request).find((cookie) => cookie.name === name)?.value;
}

export function getRequestAuthSource(request: Request): SupabaseAuthSource {
  return getRequestCookie(request, AUTH_SOURCE_COOKIE) === 'faturas'
    ? 'faturas'
    : 'hub';
}

export function createSupabaseRequestClient(
  request: Request,
  response?: NextResponse,
  authSource: SupabaseAuthSource = getRequestAuthSource(request)
): SupabaseClient {
  const { url: supabaseUrl, anonKey: supabaseKey } =
    getSupabaseAuthConfig(authSource);

  const requestWithCookies = request as Request & {
    cookies?: { set: (name: string, value: string) => void };
  };
  const domain = getKimaCookieDomain(new URL(request.url).hostname);

  return createServerClient(supabaseUrl, supabaseKey, {
    db: { schema: 'public' },
    cookies: {
      getAll: () => requestCookies(request),
      setAll: (cookiesToSet: Array<{
        name: string;
        value: string;
        options?: Record<string, unknown>;
      }>, headers: Record<string, string>) => {
        for (const { name, value, options } of cookiesToSet) {
          requestWithCookies.cookies?.set(name, value);
          if (response) {
            response.cookies.set(name, value, {
              ...options,
              ...(domain ? { domain } : {}),
            });
          }
        }
        if (response) {
          for (const [name, value] of Object.entries(headers)) {
            response.headers.set(name, value);
          }
        }
      },
    },
  });
}

export function setAuthSourceCookie(
  response: NextResponse,
  request: Request,
  authSource: SupabaseAuthSource
): void {
  const domain = getKimaCookieDomain(new URL(request.url).hostname);
  response.cookies.set(AUTH_SOURCE_COOKIE, authSource, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    ...(domain ? { domain } : {}),
  });
}

export function clearAuthSourceCookie(
  response: NextResponse,
  request: Request
): void {
  const domain = getKimaCookieDomain(new URL(request.url).hostname);
  response.cookies.set(AUTH_SOURCE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
    ...(domain ? { domain } : {}),
  });
}

export function setCompanyContextCookie(
  response: NextResponse,
  request: Request,
  companyId: string
): void {
  const domain = getKimaCookieDomain(new URL(request.url).hostname);
  response.cookies.set('kima-company-id', companyId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    ...(domain ? { domain } : {}),
  });
}

export function clearCompanyContextCookie(
  response: NextResponse,
  request: Request
): void {
  const domain = getKimaCookieDomain(new URL(request.url).hostname);
  response.cookies.set('kima-company-id', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
    ...(domain ? { domain } : {}),
  });
}

# 🔧 Guia de Integração — Kima Facturacao (SSO)

> **Para**: Equipa de desenvolvimento do kima-facturacao  
> **Problema atual**: Loop infinito de redireccionamento  
> **Causa**: A rota `/auth/callback` não existe ou não está a processar o token SSO correctamente

---

## Diagnóstico do Erro

O Hub está a enviar o utilizador para:
```
https://kima-facturacao.vercel.app/auth/callback?token=eyJ...
```

Mas o kima-facturacao redireciona de volta para:
```
https://kima-hub.vercel.app/login?app=faturas&redirect_uri=...
```

Isto cria um loop infinito. **A solução é implementar correctamente a rota `/auth/callback` no kima-facturacao.**

---

## O que tem de fazer

### 1. Variáveis de Ambiente (Vercel)

Configura estas variáveis no painel do kima-facturacao na Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://o-mesmo-supabase-do-hub.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=a-mesma-anon-key-do-hub
NEXT_PUBLIC_KIMA_HUB_URL=https://kima-hub.vercel.app
NEXT_PUBLIC_APP_URL=https://kima-facturacao.vercel.app
NEXT_PUBLIC_KIMA_MODULE_KEY=faturas
KIMA_SSO_SECRET=a-mesma-secret-do-hub
```

---

### 2. Middleware (`src/middleware.ts`)

O middleware deve deixar passar pedidos com `?token=` e pedidos para `/auth/callback`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const MODULE_KEY = 'faturas';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isAuthCallback = request.nextUrl.pathname.startsWith('/auth/callback');
  const hasSsoToken = request.nextUrl.searchParams.has('token');
  const isStatic = request.nextUrl.pathname.startsWith('/_next/');

  // Deixa passar: callback, token SSO, assets estáticos
  if (isAuthCallback || hasSsoToken || isStatic) {
    return response;
  }

  // Sem autenticação → manda para o Hub
  if (!user) {
    const hubLogin = new URL('/login', process.env.NEXT_PUBLIC_KIMA_HUB_URL!);
    hubLogin.searchParams.set('app', MODULE_KEY);
    hubLogin.searchParams.set('redirect_uri', `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`);
    return NextResponse.redirect(hubLogin);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

### 3. Rota de Callback SSO (`src/app/auth/callback/route.ts`)

**ESTA É A PEÇA EM FALTA.** Cria este ficheiro:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get('token');
  const redirectTarget = requestUrl.searchParams.get('redirect') || '/faturas';

  const response = NextResponse.redirect(new URL(redirectTarget, request.url));

  if (!token) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, { ...options, path: '/' })
          );
        },
      },
    }
  );

  try {
    // Valida o token no Hub (server-to-server)
    const verifyRes = await fetch(
      `${process.env.NEXT_PUBLIC_KIMA_HUB_URL}/api/sso/verify?token=${token}`,
      { cache: 'no-store' }
    );

    if (verifyRes.ok) {
      const data = await verifyRes.json();

      if (data.valid) {
        // PASSO CRÍTICO: Criar sessão Supabase real
        // Sem isto, o getUser() do middleware devolve null → loop
        if (data.accessToken && data.refreshToken) {
          await supabase.auth.setSession({
            access_token: data.accessToken,
            refresh_token: data.refreshToken,
          });
        }

        // Cookie de empresa ativa
        if (data.companyId) {
          response.cookies.set('kima-company-id', data.companyId, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 30,
          });
        }
      }
    }
  } catch (err) {
    console.error('Erro no callback SSO:', err);
  }

  return response;
}
```

---

## Resumo do Fluxo

```
1. User clica "Abrir Faturas" no Dashboard
         ↓
2. Hub gera token SSO (JWT, 5 min expiry)
         ↓
3. Browser → kima-facturacao.vercel.app/auth/callback?token=eyJ...
         ↓
4. Middleware: vê ?token=, deixa passar (NÃO redireciona)
         ↓
5. Rota /auth/callback chama Hub /api/sso/verify?token=...
         ↓
6. Hub responde: { valid: true, accessToken, refreshToken, companyId }
         ↓
7. Callback chama supabase.auth.setSession(accessToken, refreshToken)
         ↓
8. Cookie kima-company-id definido
         ↓
9. Redirect para /faturas (dashboard do módulo)
         ↓
10. Próximo pedido: getUser() devolve o user ✓ (sem redirect)
```

---

## Checklist

- [ ] `/auth/callback/route.ts` existe e chama `setSession()`
- [ ] Middleware não redirecciona pedidos com `?token=`
- [ ] Middleware não redirecciona `/auth/callback`
- [ ] Variáveis de Ambiente configuradas na Vercel
- [ ] Supabase URL/Key são as **mesmas** do Hub
- [ ] `npm run build` passa sem erros
- [ ] Deploy feito na Vercel

---

## Teste

1. Limpa cookies de ambos os domínios
2. Faz login no Hub (kima-hub.vercel.app)
3. Clica "Abrir Faturas"
4. Deve entrar directamente no kima-facturacao sem pedir login

---

*Documento gerado a 10/08/2026 — RC Media / Kima Enterprise*

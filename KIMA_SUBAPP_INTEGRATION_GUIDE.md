# 📘 Guia de Integração de Sub-Apps — Ecossistema KIMA

> **Documento de Referência para Desenvolvedores de Módulos (Kima RH, Kima Faturas, Kima Inventário, etc.)**  
> *Versão: 1.3.0 — Integração Kima Facturacao (Vercel) — RC Media*

---

## 1. Visão Geral da Arquitetura

Cada aplicação do ecossistema Kima (ex: `kima-rh.vercel.app` ou `rh.kima.ao`) é desenvolvida num **repositório Git independente**, mas conecta-se ao **Kima Core Hub** central (`hub.kima.ao` ou `kima-hub.vercel.app`).

```
                              ┌───────────────────────────────┐
                              │         KIMA CORE HUB         │
                              │     (kima-hub.vercel.app)     │
                              │   Autenticação & SSO / DB     │
                              └───────────────┬───────────────┘
                                              │
              ┌───────────────────────────────┼───────────────────────────────┐
              │                               │                               │
              ▼                               ▼                               ▼
   ┌───────────────────────┐       ┌───────────────────────────┐   ┌───────────────────────┐
   │        Kima RH        │       │      Kima Faturas         │   │    Kima Inventário    │
   │ (kima-rh.vercel.app)  │       │ (kima-facturacao.ver…)    │   │(kima-inv.vercel.app)  │
   └───────────────────────┘       └───────────────────────────┘   └───────────────────────┘
```

### Princípios Chave:
- **Banco de Dados Centralizado**: Todos os sub-apps conectam-se à **mesma instância do Supabase** do Hub.
- **Login Centralizado**: NENHUM sub-app possui tela de login própria. A autenticação é feita no Hub.
- **Domínios Suportados**: O Hub aceita redirecionamentos e CORS tanto para domínios corporativos (`*.kima.ao`) como para URLs da Vercel (`kima-*.vercel.app`) e `localhost` em desenvolvimento.
- **SSO Token Flow**: O Hub emite um token JWT de 5 minutos assinado por HMAC-SHA256 para transferir a sessão de forma ultra-segura.
- **Event Bus em Tempo Real**: Eventos de `LOGOUT`, `COMPANY_SWITCHED` e `MODULE_STATUS_CHANGED` são sincronizados instantaneamente via Supabase Realtime (`kima-events`).

---

## 2. Configuração de Variáveis de Ambiente (`.env.local` / Vercel Environment Variables)

Configure as seguintes variáveis no seu sub-app (localmente e no painel da Vercel):

```env
# ─── Supabase (Conexão Única com Kima Core Hub) ──────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsIn...

# ─── Kima Core Hub URL ───────────────────────────────────────────────
# Em produção: https://hub.kima.ao (ou https://kima-hub.vercel.app)
# Em desenvolvimento local: http://localhost:3000
NEXT_PUBLIC_KIMA_HUB_URL=https://kima-hub.vercel.app

# ─── URL Deste Sub-App ───────────────────────────────────────────────
# Exemplo para o Kima RH hospedado na Vercel:
# Em produção: https://kima-rh.vercel.app (ou https://rh.kima.ao)
# Em dev local: http://localhost:3001
NEXT_PUBLIC_APP_URL=https://kima-rh.vercel.app

# Exemplo para o Kima Facturacao hospedado na Vercel:
# NEXT_PUBLIC_APP_URL=https://kima-facturacao.vercel.app

# ─── Chave do Módulo ────────────────────────────────────────────────
# 'rh' | 'faturas' | 'inventario' | 'contratos' | 'projetos' | 'compras' | etc.
NEXT_PUBLIC_KIMA_MODULE_KEY=rh
```

---

## 3. Instalação de Dependências

Certifique-se de que o repositório do seu sub-app possui as dependências do Supabase:

```bash
npm install @supabase/ssr @supabase/supabase-js
```

---

## 4. Middleware do Sub-App (`src/middleware.ts`)

O middleware deteta se o utilizador está autenticado e se a empresa ativa possui licença para usar o módulo. Caso contrário, redireciona para o Hub.

> ⚠️ **IMPORTANTE**: O middleware NUNCA deve redirecionar pedidos com o parâmetro `?token=`, para permitir que a rota `/auth/callback` processe o token de SSO sem entrar num loop infinito de redirecionamento.
>
> ⚠️ **Causa comum de loop**: se o `/auth/callback` apenas gravar o cookie de empresa e **não criar a sessão Supabase** (via `setSession`), o `getUser()` abaixo continua a devolver `null` e o utilizador volta ao login do Hub em ciclo. Certifique-se de que a rota de callback segue o passo‑a‑passo da secção 5.

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const MODULE_KEY = process.env.NEXT_PUBLIC_KIMA_MODULE_KEY || 'rh';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const host = request.nextUrl.hostname;
  const isCustomDomain = host.endsWith('.kima.ao');
  const COOKIE_DOMAIN = process.env.NODE_ENV === 'production' && isCustomDomain ? '.kima.ao' : undefined;

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

  // Rotas públicas, assets estáticos ou requisições com token SSO
  const isAuthCallback = request.nextUrl.pathname.startsWith('/auth/callback');
  const hasSsoToken = request.nextUrl.searchParams.has('token');
  const isStaticAsset =
    request.nextUrl.pathname.startsWith('/_next/') ||
    request.nextUrl.pathname.startsWith('/favicon.ico');

  if (isStaticAsset || isAuthCallback || hasSsoToken) {
    return response;
  }

  // 1. Se não estiver autenticado -> Redirecionar para o Login do Hub
  if (!user) {
    const hubLoginUrl = new URL('/login', process.env.NEXT_PUBLIC_KIMA_HUB_URL!);
    hubLoginUrl.searchParams.set('app', MODULE_KEY);
    
    // Constrói a URL de callback dinâmica (ex: https://kima-rh.vercel.app/auth/callback)
    const currentAppBaseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const redirectCallbackUrl = `${currentAppBaseUrl}/auth/callback`;
    
    hubLoginUrl.searchParams.set('redirect_uri', redirectCallbackUrl);
    return NextResponse.redirect(hubLoginUrl);
  }

  // 2. Verificar se a empresa ativa tem licença ativa para o módulo
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
      // Redireciona para o Marketplace do Hub se não tiver módulo assinado
      const marketplaceUrl = new URL('/marketplace', process.env.NEXT_PUBLIC_KIMA_HUB_URL!);
      marketplaceUrl.searchParams.set('required_module', MODULE_KEY);
      return NextResponse.redirect(marketplaceUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

---

## 5. Rota de Callback SSO (`src/app/auth/callback/route.ts`)

Esta rota valida o token de acesso SSO emitido pelo Hub, **estabelece a sessão Supabase real no sub-app** e configura o contexto de empresa ativa.

> ⚠️ **IMPORTANTE**: O callback NUNCA deve apenas gravar o cookie `kima-company-id`. Sem uma sessão Supabase real (`sb-*-auth-token`), o `supabase.auth.getUser()` do middleware devolve sempre `null` e o utilizador é redirecionado novamente para o Hub → **loop infinito de redirecionamento**. É obrigatório chamar `supabase.auth.setSession()` com os tokens devolvidos pelo `/api/sso/verify`.

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get('token');
  const redirectTarget = requestUrl.searchParams.get('redirect') || '/';

  const host = request.nextUrl.hostname;
  const isCustomDomain = host.endsWith('.kima.ao');
  const COOKIE_DOMAIN = process.env.NODE_ENV === 'production' && isCustomDomain ? '.kima.ao' : undefined;

  // Construir a resposta de redirect primeiro e reutilizá-la no setAll(),
  // para que os cookies de sessão Supabase sejam gravados na resposta final.
  let response = NextResponse.redirect(new URL(redirectTarget, request.url));

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

  if (token) {
    try {
      // Valida o token SSO no Hub (server-to-server)
      const verifyRes = await fetch(
        `${process.env.NEXT_PUBLIC_KIMA_HUB_URL}/api/sso/verify?token=${token}`,
        { cache: 'no-store' }
      );

      if (verifyRes.ok) {
        const data = await verifyRes.json();
        if (data.valid) {
          // 1. Estabelece a sessão Supabase real (access + refresh tokens
          //    vindos do Hub). Sem isto o getUser() do middleware devolve
          //    sempre null e o utilizador entra em loop de redirecionamento.
          //    (Não depende de companyId — mesmo sem empresa a sessão deve
          //    ser criada para quebrar o loop.)
          if (data.accessToken && data.refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: data.accessToken,
              refresh_token: data.refreshToken,
            });

            if (sessionError) {
              console.error('Erro ao estabelecer sessão Supabase:', sessionError);
            }
          }

          // 2. Define o cookie de empresa ativa (se o Hub devolver empresa)
          if (data.companyId) {
            response.cookies.set('kima-company-id', data.companyId, {
              domain: COOKIE_DOMAIN,
              path: '/',
              httpOnly: true,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              maxAge: 60 * 60 * 24 * 30, // 30 dias
            });
          }
        }
      }
    } catch (err) {
      console.error('Erro ao verificar SSO Token no Hub:', err);
    }
  }

  return response;
}
```

> **Nota de segurança**: `accessToken` e `refreshToken` são a sessão Supabase do utilizador no Hub. São transportados dentro do token SSO (JWT assinado por HMAC-SHA256 com `KIMA_SSO_SECRET`, expiração de 5 minutos) e só funcionam porque sub-apps e Hub partilham a **mesma instância Supabase**. Nunca partilhe estes valores fora do ecossistema Kima nem os inclua em logs.

> **Nota sobre utilizadores já autenticados no Hub**: se o utilizador já tiver sessão no Hub e aceder a `/login?app=rh&redirect_uri=...`, o próprio Hub (proxy) gera o token SSO e anexa-o ao `redirect_uri` — não precisa de voltar a introduzir credenciais. O callback funciona da mesma forma com `?token=...`.

---

## 5.1 Checklist de Correção — Loop de Redirecionamento SSO

> **Sintoma**: o browser alterna indefinidamente entre `kima-rh.vercel.app/` → `kima-hub.vercel.app/login?app=rh&redirect_uri=...` → `kima-rh.vercel.app/auth/callback` → `kima-rh.vercel.app/`.

### Causa Raiz
O callback antigo apenas gravava o cookie `kima-company-id` e **nunca criava a sessão Supabase real** (`sb-*-auth-token`). Como o middleware verifica `supabase.auth.getUser()`, que continua a devolver `null`, o sub-app reenvia o utilizador para o login do Hub — em ciclo.

### Requisitos do Hub
O Hub deve estar atualizado (commit ≥ `4770c64`) para que `/api/sso/verify` devolva `accessToken` e `refreshToken` no corpo da resposta. Confirme com:
```bash
curl -s "https://kima-hub.vercel.app/api/sso/verify?token=<token>" 
# deve incluir: "accessToken": "...", "refreshToken": "..."
```

### Passos de Implementação no Sub-App
1. **Dependências**: `npm install @supabase/ssr @supabase/supabase-js`.
2. **Env vars** (secção 2): `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` devem apontar para a **mesma instância Supabase do Hub**; `NEXT_PUBLIC_KIMA_HUB_URL=https://kima-hub.vercel.app`; `NEXT_PUBLIC_APP_URL=https://kima-rh.vercel.app`; `NEXT_PUBLIC_KIMA_MODULE_KEY=rh`.
3. **Middleware** (secção 4): NUNCA redirecionar pedidos com `?token=` nem com o pathname `/auth/callback` — deixá-los passar.
4. **Callback** (secção 5): substituir `src/app/auth/callback/route.ts` pelo código da secção 5. O passo crítico é:
   ```ts
   if (data.valid && data.accessToken && data.refreshToken) {
     await supabase.auth.setSession({
       access_token: data.accessToken,
       refresh_token: data.refreshToken,
     });
   }
   ```
5. **Verificar** `npm run build` no sub-app e fazer redeploy na Vercel.
6. **Testar** com sessão limpa (limpar cookies do `kima-rh.vercel.app` e `kima-hub.vercel.app`).

### O que NÃO fazer
- Não depender de `companyId` para criar a sessão — a sessão deve ser criada sempre que o token for válido (o cookie de empresa é opcional e definido à parte).
- Não tentar definir `Domain=.kima.ao` fora de hosts `*.kima.ao` (o browser rejeita e o login quebra).

---

## 6. Sincronizador Realtime (`src/components/KimaEventListener.tsx`)

Inclua este componente no seu `layout.tsx` para sincronizar eventos em tempo real com o Hub:

```tsx
'use client';

import { useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

const MODULE_KEY = process.env.NEXT_PUBLIC_KIMA_MODULE_KEY || 'rh';

export function KimaEventListener() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 1. Escutar alterações diretas de estado de autenticação Supabase
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        window.location.href = `${process.env.NEXT_PUBLIC_KIMA_HUB_URL}/login?app=${MODULE_KEY}`;
      }
    });

    // 2. Escutar o canal de eventos Realtime do Kima Core Hub
    const channel = supabase
      .channel('kima-events')
      .on('broadcast', { event: 'LOGOUT' }, () => {
        supabase.auth.signOut();
        window.location.href = `${process.env.NEXT_PUBLIC_KIMA_HUB_URL}/login?app=${MODULE_KEY}`;
      })
      .on('broadcast', { event: 'COMPANY_SWITCHED' }, () => {
        router.refresh();
      })
      .on('broadcast', { event: 'MODULE_STATUS_CHANGED' }, (payload: any) => {
        if (payload?.moduleKey === MODULE_KEY && payload?.status !== 'Ativo') {
          alert('A licença deste módulo foi alterada ou cancelada.');
          window.location.href = `${process.env.NEXT_PUBLIC_KIMA_HUB_URL}/marketplace`;
        }
      })
      .subscribe();

    return () => {
      authListener.subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
```

---

## 7. Passo a Passo para Deploy na Vercel (Exemplos)

### 7.1 Kima RH

1. **Repositório Git**: Certifique-se de que o projeto `kima-rh` está num repositório Git separado.
2. **Novo Projeto na Vercel**: Importe o repositório na Vercel.
3. **Configurar Variáveis de Ambiente**:
   - `NEXT_PUBLIC_SUPABASE_URL`: *(URL do projeto Supabase do Hub)*
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: *(Chave anónima do Hub)*
   - `NEXT_PUBLIC_KIMA_HUB_URL`: `https://kima-hub.vercel.app` (ou o domínio do Hub)
   - `NEXT_PUBLIC_APP_URL`: `https://kima-rh.vercel.app`
   - `NEXT_PUBLIC_KIMA_MODULE_KEY`: `rh`
4. **Deploy**: O deploy criará a URL `https://kima-rh.vercel.app`.
5. **Pronto**: O Hub reconhecerá automaticamente a marca e logo do Kima RH ao efetuar o login e redirecionará com segurança!

### 7.2 Kima Facturacao

1. **Repositório Git**: Certifique-se de que o projeto `kima-facturacao` está num repositório Git separado.
2. **Novo Projeto na Vercel**: Importe o repositório na Vercel.
3. **Configurar Variáveis de Ambiente**:
   - `NEXT_PUBLIC_SUPABASE_URL`: *(URL do projeto Supabase do Hub)*
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: *(Chave anónima do Hub)*
   - `NEXT_PUBLIC_KIMA_HUB_URL`: `https://kima-hub.vercel.app` (ou o domínio do Hub)
   - `NEXT_PUBLIC_APP_URL`: `https://kima-facturacao.vercel.app`
   - `NEXT_PUBLIC_KIMA_MODULE_KEY`: `faturas`
4. **Deploy**: O deploy criará a URL `https://kima-facturacao.vercel.app`.
5. **Pronto**: O Hub reconhece automaticamente o domínio `kima-facturacao.vercel.app` e redireciona com SSO!

---
*© 2026 RC Media — Kima Enterprise Ecosystem*

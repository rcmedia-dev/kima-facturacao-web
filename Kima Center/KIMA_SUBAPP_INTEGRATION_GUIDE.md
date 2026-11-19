# 📘 Guia de Integração de Sub-Apps — Ecossistema KIMA

> **Documento de Referência para Desenvolvedores de Módulos (Kima Faturas, Kima RH, Kima Inventário, etc.)**  
> *Versão: 1.0.0 — RC Media*

---

## 1. Visão Geral da Arquitetura

Cada aplicação do ecossistema Kima (ex: `facturacao.kima.ao`, `rh.kima.ao`) é desenvolvida num **repositório Git independente**, mas partilha o mesmo **Kima Core Hub** (`hub.kima.ao`).

```
                              ┌───────────────────────────────┐
                              │         KIMA CORE HUB         │
                              │         (hub.kima.ao)         │
                              │   Autenticação & SSO / DB     │
                              └───────────────┬───────────────┘
                                              │
              ┌───────────────────────────────┼───────────────────────────────┐
              │                               │                               │
              ▼                               ▼                               ▼
  ┌───────────────────────┐       ┌───────────────────────┐       ┌───────────────────────┐
  │     Kima Faturas      │       │        Kima RH        │       │    Kima Inventário    │
  │ (facturacao.kima.ao)  │       │      (rh.kima.ao)     │       │  (inventario.kima.ao) │
  └───────────────────────┘       └───────────────────────┘       └───────────────────────┘
```

### Princípios Chave:
- **Banco de Dados Centralizado**: Todos os sub-apps conectam-se à **mesma instância do Supabase** do Hub.
- **Login Centralizado**: NENHUM sub-app possui tela de login/registo própria. Toda a autenticação acontece no Hub.
- **Sessão Global (`.kima.ao`)**: Em produção, os cookies de sessão Supabase e o cookie da empresa ativa (`kima-company-id`) funcionam em todos os subdomínios sob `.kima.ao`.
- **SSO Fallback (Dev Local)**: Em desenvolvimento (`localhost`), a troca de contexto entre portas é feita via **SSO JWT Token** assinado.
- **Event Bus em Tempo Real**: Eventos de `LOGOUT`, `COMPANY_SWITCHED` e `MODULE_STATUS_CHANGED` são sincronizados em tempo real via Supabase Realtime Channel (`kima-events`).

---

## 2. Configuração de Variáveis de Ambiente

Crie ou atualize o ficheiro `.env.local` no repositório do seu sub-app:

```env
# ─── Supabase (Conexão Única com Kima Core Hub) ──────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsIn...

# ─── Kima Core Hub URL ───────────────────────────────────────────────
# Em produção: https://hub.kima.ao
# Em desenvolvimento local: http://localhost:3000
NEXT_PUBLIC_KIMA_HUB_URL=https://hub.kima.ao

# ─── Identificador do Módulo Atual ───────────────────────────────────
# Ex: 'faturas' | 'rh' | 'inventario' | 'contratos' | 'projetos'
NEXT_PUBLIC_KIMA_MODULE_KEY=faturas
```

---

## 3. Instalação de Dependências

Certifique-se de que o seu sub-app possui as bibliotecas do Supabase instaladas:

```bash
npm install @supabase/ssr @supabase/supabase-js
```

---

## 4. Implementação do Middleware (`src/middleware.ts`)

O middleware do sub-app assegura 3 coisas:
1. **Autenticação**: Redireciona utilizadores não autenticados para o Hub com `app` e `redirect_uri`.
2. **Empresa Ativa**: Lê o contexto da empresa selecionada pelo utilizador.
3. **Módulo Contratado**: Garante que a empresa ativa possui permissão/contrato ativo para utilizar este sub-app.

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Defina a chave do módulo deste repositório
const MODULE_KEY = process.env.NEXT_PUBLIC_KIMA_MODULE_KEY || 'faturas';

export async function middleware(request: NextRequest) {
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

  // Rotas isentas de bloqueio
  const isAuthCallback = request.nextUrl.pathname.startsWith('/auth/callback');
  const isStaticAsset = request.nextUrl.pathname.startsWith('/_next/') || request.nextUrl.pathname.startsWith('/favicon.ico');

  if (isStaticAsset || isAuthCallback) {
    return response;
  }

  // 1. Se não estiver autenticado -> Redirecionar para o Login do Hub
  if (!user) {
    const hubLoginUrl = new URL('/login', process.env.NEXT_PUBLIC_KIMA_HUB_URL!);
    hubLoginUrl.searchParams.set('app', MODULE_KEY);
    hubLoginUrl.searchParams.set('redirect_uri', request.url);
    return NextResponse.redirect(hubLoginUrl);
  }

  // 2. Verificar se a empresa ativa possui este módulo contratado
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
      // Redireciona para a loja do Hub para subscrever o módulo
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

O callback tem de trocar o token de curta duração por uma sessão Supabase real.
O endpoint do Hub `/api/sso/verify` deve confirmar o token e devolver `valid`,
`appKey`, `userId`, `companyId`, `accessToken` e `refreshToken`. O sub-app deve:

1. validar a resposta e confirmar que `appKey` corresponde a
   `NEXT_PUBLIC_KIMA_MODULE_KEY`;
2. chamar `supabase.auth.setSession({ access_token, refresh_token })`;
3. confirmar o utilizador criado pela sessão antes de definir
   `kima-company-id`;
4. validar membership e subscrição ativa no servidor antes de servir dados;
5. rejeitar destinos de redireccionamento externos.

Definir apenas o cookie `kima-company-id` não autentica o utilizador. Os cookies
de autenticação Supabase devem usar o domínio `.kima.ao` apenas nos subdomínios
de produção desse domínio; em localhost e preview devem permanecer no host da
aplicação.

---

## 6. Sincronizador de Eventos em Tempo Real (React Component)

Crie o componente `KimaEventListener.tsx` e inclua-o no seu `layout.tsx` principal:

### `src/components/KimaEventListener.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

const MODULE_KEY = process.env.NEXT_PUBLIC_KIMA_MODULE_KEY || 'faturas';

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

    // 2. Escutar o canal de eventos em tempo real do Kima Core Hub
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

## 7. Como Testar em Ambiente de Desenvolvimento Local

1. **Iniciar o Hub**:
   - No repositório `kima-project` (Hub), execute `npm run dev` (roda em `http://localhost:3000`).
2. **Iniciar o Sub-App**:
   - No repositório do sub-app (ex: `kima-faturas`), configure `.env.local` apontando `NEXT_PUBLIC_KIMA_HUB_URL=http://localhost:3000`.
   - Execute `npm run dev -- -p 3001` (roda em `http://localhost:3001`).
3. **Fluxo de Teste**:
   - Acesse `http://localhost:3001`.
   - Será automaticamente redirecionado para `http://localhost:3000/login?app=faturas&redirect_uri=...`.
   - Faça login no Hub.
   - Será redirecionado de volta para `http://localhost:3001/auth/callback?token=...` e entrará no dashboard do sub-app com a empresa e sessão sincronizadas.

## 8. Funcionários do Kima Faturas

No Kima Faturas, o administrador gera o convite em `/utilizadores` e partilha
o link apresentado pela aplicação. O convite expira após 7 dias e só pode ser
aceite uma vez. O módulo guarda apenas o hash do token e associa o funcionário
à empresa em `kima_facturas.employees`, com permissões em
`kima_facturas.employee_permissions`. As rotas de dados do módulo verificam
essas permissões no servidor; a interface apenas espelha os acessos disponíveis.

A identidade continua a usar `auth.users` e Supabase Auth. Funcionários não
recebem uma linha em `public.memberships` e, por isso, este convite não lhes dá
acesso ao Kima Hub nem a outros módulos. A empresa e a subscrição continuam a
ser lidas do Hub; o acesso ao Faturas só é aceite enquanto a subscrição do
módulo estiver ativa. Se o email já tiver uma identidade Kima, o convidado
inicia sessão com a palavra-passe existente para aceitar o convite; o fluxo não
altera essa palavra-passe.

A migration `migrations/006_funcionarios_kima_facturas.sql` cria as tabelas e
funções necessárias no schema do módulo. Ela não é executada pela aplicação:
deve ser revista e aplicada explicitamente antes de publicar o novo fluxo. A
aplicação gera o link para partilha manual; não existe envio de email integrado
nesta implementação.

---
*© 2026 RC Media — Kima Enterprise Ecosystem*

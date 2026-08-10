# Guia de Integração Sub-App — Usando @rcmedia-dev/kima-sdk

> **Para:** developers que vão integrar um sub-app (Kima RH, Faturas, Inventário, etc.) com o Hub
> **Como:** usando o SDK oficial `@rcmedia-dev/kima-sdk` — não precisam de reimplementar nada
> **Objetivo:** conectar ao SSO do Hub sem loops de redirect

---

## 1. O que o SDK faz por ti

O SDK encapsula **toda** a lógica de integração. O teu sub-app só precisa de 3 ficheiros:

| Sem SDK (manual) | Com SDK |
|---|---|
| Proxy com Supabase client + verificação de sessão + licenças (~50 linhas) | `createKimaMiddleware({ moduleKey: "rh" })` (1 linha) |
| Rota de callback com verificação JWT + setSession + cookies (~80 linhas) | `handleSsoCallback(request)` (1 linha) |
| Supabase clients server/request/browser com cookie domain (~60 linhas) | `createServerSupabase()` / `createRequestSupabase()` / `createBrowserSupabase()` |
| Listener Realtime com 3 eventos (~40 linhas) | `<KimaEventListener moduleKey="rh" />` (1 linha) |
| Validação de token SSO + construção de URLs | `verifySsoToken()` / `buildHubLoginUrl()` |

**O SDK é a implementação de referência** — se seguires este guia, não precisas de escrever lógica de autenticação.

---

## 2. Instalação

```bash
npm install @rcmedia-dev/kima-sdk
```

O SDK depende de peer dependencies que já devem estar no projeto:
```bash
npm install @supabase/ssr @supabase/supabase-js
```

### Autenticação no GitHub Packages

Criem `.npmrc` na raiz do sub-app:
```
@rcmedia-dev:registry=https://npm.pkg.github.com
```

Cada developer autentica no `~/.npmrc` (ficheiro global, não committed):
```
//npm.pkg.github.com/:_authToken=ghp_SEU_TOKEN_INDIVIDUAL
```

O token precisa dos scopes `read:packages` e (para publicar) `write:packages`.

### Next.js config (OBRIGATÓRIO)

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@rcmedia-dev/kima-sdk"],
};

export default nextConfig;
```

> **⚠️ Sem `transpilePackages`**, o Next não transpila o SDK e obtérs erros em runtime. Isto é obrigatório porque o SDK é distribuído como TypeScript source (os consumidores transpilam).

### Variáveis de ambiente

```env
# ═══ OBRIGATÓRIAS ═══

# Têm de ser IDÊNTICAS às do Hub (mesmo projeto Supabase)
# Peçam estes valores ao maintainer do Hub
NEXT_PUBLIC_SUPABASE_URL=https://hpdesbvqqmdhxoksrvij.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_cnjDWZp_0qHqdtqolLHa5A_iknfe8Q-

# URL do Hub
NEXT_PUBLIC_KIMA_HUB_URL=https://kima-hub.vercel.app

# URL deste sub-app (ex: https://kima-rh.vercel.app ou https://kima-facturacao.vercel.app)
NEXT_PUBLIC_APP_URL=https://kima-rh.vercel.app

# Chave do módulo (definida no Hub — 'rh' | 'faturas' | 'inventario' | ...)
NEXT_PUBLIC_KIMA_MODULE_KEY=rh

# ═══ OPCIONAIS ═══
NEXT_PUBLIC_KIMA_LOG_LEVEL=debug
```

---

## 3. Setup mínimo — 3 ficheiros

Isto é tudo que precisam. O SDK trata do resto.

### 3.1 Proxy — protege rotas

`src/proxy.ts` (Next 16) ou `src/middleware.ts`:

```ts
import type { NextRequest } from "next/server";
import { createKimaMiddleware } from "@rcmedia-dev/kima-sdk";

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|mmap|json|txt|xml|woff2?|ttf|eot|otf|webmanifest)$).*)",
  ],
};

export async function proxy(request: NextRequest) {
  return createKimaMiddleware({
    moduleKey: "rh",          // o vosso módulo ('rh' | 'faturas' | ...)
    publicPaths: ["/login"],  // rotas públicas adicionais (opcional)
  })(request);
}
```

**O que o SDK faz por ti aqui:**
- Cria cliente Supabase com cookie domain correto
- Verifica sessão via `getUser()`
- Redireciona não autenticados para Hub/login
- Verifica licença do módulo em `company_modules`
- Redireciona sem licença para Hub/marketplace
- Deixa passar `/auth/callback`, `?token=` e assets estáticos

### 3.2 Callback — cria a sessão

`src/app/auth/callback/route.ts`:

```ts
import type { NextRequest } from "next/server";
import { handleSsoCallback } from "@rcmedia-dev/kima-sdk";

export async function GET(request: NextRequest) {
  return handleSsoCallback(request);
}
```

**O que o SDK faz por ti aqui:**
- Lê o `?token=` do URL
- Valida o token no Hub (`GET /api/sso/verify?token=...`)
- Chama `supabase.auth.setSession()` — **CRIA A SESSÃO REAL**
- Define cookie `kima-company-id`
- Redireciona para `/`

### 3.3 Realtime — escuta eventos do Hub

`src/app/layout.tsx`:

```tsx
"use client";
import { KimaEventListener } from "@rcmedia-dev/kima-sdk";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>
        <KimaEventListener
          moduleKey="rh"  // o vosso módulo
          onLogout={() => {
            window.location.href = "https://kima-hub.vercel.app/login?app=rh";
          }}
        />
        {children}
      </body>
    </html>
  );
}
```

**O que o SDK faz por ti aqui:**
- Subscreve o canal `kima-events`
- Reage a `LOGOUT`, `COMPANY_SWITCHED`, `MODULE_STATUS_CHANGED`
- Gere cookies de sessão em ambos os contextos

---

## 4. O que recebes do Hub (dados)

### 4.1 Via `?token=` no callback

JWT (HMAC-SHA256, 5 min de validade) com este payload:

```ts
interface SSOTokenPayload {
  userId: string;           // UUID do utilizador
  email: string;            // Email
  companyId: string | null; // UUID da empresa ativa
  appKey: string;           // Módulo de destino ('rh')
  accessToken: string;      // Supabase access_token (sessão do Hub)
  refreshToken: string;     // Supabase refresh_token (sessão do Hub)
  exp: number;              // Expiração (unix timestamp)
}
```

### 4.2 Via `verifySsoToken()` (se precisares de validar manualmente)

```ts
import { verifySsoToken } from "@rcmedia-dev/kima-sdk";

const result = await verifySsoToken(token, { hubUrl: "https://kima-hub.vercel.app" });
// result: SsoVerifyResult
```

```ts
interface SsoVerifyResult {
  valid: boolean;
  userId?: string;
  email?: string | null;
  companyId?: string | null;
  appKey?: string | null;
  accessToken?: string | null;    // → usar no setSession
  refreshToken?: string | null;   // → usar no setSession
  userProfile?: {
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    role: string;                  // 'admin' | 'user'
  } | null;
  company?: {
    id: string;
    name: string;
    nif: string | null;
    slug: string;
    plan: string;                  // 'Basic' | 'Pro'
    status: string;                // 'Ativo' | 'Inativo'
    orgType: string;               // 'company' | 'individual'
  } | null;
  activeModules?: string[];        // ['rh', 'faturas', ...]
  error?: string;                  // presente quando valid === false
}
```

### 4.3 Via eventos Realtime (KimaEventListener)

| Evento | Payload | Quando |
|--------|---------|--------|
| `LOGOUT` | nenhum | Admin terminou a sessão |
| `COMPANY_SWITCHED` | nenhum | Utilizador trocou de empresa |
| `MODULE_STATUS_CHANGED` | `{ moduleKey: string, status: string }` | Licença alterada/cancelada |

---

## 5. Usar o Supabase no sub-app (SDK)

O SDK fornece 3 factories — usam a configuração e cookie domain corretos automaticamente.

### Server Components / Server Actions

```ts
import { createServerSupabase } from "@rcmedia-dev/kima-sdk";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  // ...
}
```

### Proxy / Route Handlers (com NextRequest)

```ts
import { createRequestSupabase } from "@rcmedia-dev/kima-sdk";

const { supabase, getResponse } = createRequestSupabase(request);
const { data: { user } } = await supabase.auth.getUser();
// ... usar supabase ...
return getResponse();  // devolve resposta com cookies atualizados
```

### Client Components

```ts
import { createBrowserSupabase } from "@rcmedia-dev/kima-sdk";

const supabase = createBrowserSupabase();
```

### Verificar token SSO manualmente (caso especial)

```ts
import { verifySsoToken } from "@rcmedia-dev/kima-sdk";

const result = await verifySsoToken(token, { hubUrl: "https://kima-hub.vercel.app" });
if (result.valid && result.accessToken && result.refreshToken) {
  // criar sessão
}
```

### Construir URL de login do Hub

```ts
import { buildHubLoginUrl } from "@rcmedia-dev/kima-sdk";

const loginUrl = buildHubLoginUrl({
  moduleKey: "rh",
  redirectUri: `${window.location.origin}/auth/callback",
});
if (loginUrl) window.location.href = loginUrl.toString();
```

### Abrir outro sub-app via SSO

```ts
import { launchSubApp } from "@rcmedia-dev/kima-sdk";

await launchSubApp("faturas", { newTab: true });
```

---

## 6. Fluxo completo (como o SDK quebra o loop)

```
1. GET subapp.vercel.app/
   → SDK middleware: getUser() === null
   → 307 para Hub/login?app=rh&redirect_uri=subapp.vercel.app/auth/callback

2. Hub: utilizador autentica
   → Hub gera token SSO (JWT com accessToken + refreshToken)
   → Hub redireciona para subapp.vercel.app/auth/callback?token=eyJ...

3. GET subapp.vercel.app/auth/callback?token=eyJ...
   → SDK middleware: tem ?token= → PASSA DIRETO (nunca redirecionar)
   → SDK handleSsoCallback:
      a. verifySsoToken(token) → Hub valida e devolve dados
      b. supabase.auth.setSession({ access_token, refresh_token }) ← CRIA A SESSÃO
      c. setCookie('kima-company-id', companyId)
      d. 307 para /

4. GET subapp.vercel.app/
   → SDK middleware: getUser() !== null ← SESSÃO EXISTE ✅
   → verifica licença em company_modules
   → tem licença → mostra a app
```

---

## 7. Troubleshooting: "Too Many Redirects"

O loop acontece quando o passo 3b falha. Causas e soluções:

| Causa | Como diagnosticar | Solução |
|---|---|---|
| **Supabase diferente** entre Hub e sub-app | Comparar `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` com os do Hub | Usar os mesmos valores |
| **`setSession` falha** | Logs: "setSession ERROR: ..." | Confirmar que os tokens vêm do Hub correto |
| **Callback não chama `setSession`** | Callback manual sem SDK | Usar `handleSsoCallback` do SDK |
| **Redirecionam `?token=`** | Proxy redireciona `/auth/callback` | Passar `?token=` direto (SDK já faz isto) |
| **Cookie domain errado** | Definir `.kima.ao` em `*.vercel.app` | Deixar o SDK gerir via `getCookieDomain()` |
| **Falta `transpilePackages`** | Erros em runtime / SDK não funciona | Adicionar ao `next.config.ts` |
| **Domínio Vercel não reconhecido** | `kima-facturacao.vercel.app` não mapeia | Confirmar que o alias `facturacao → faturas` existe no `getAppFromHost()` do Hub |

### Diagnóstico rápido nos logs do callback

```ts
const { error } = await supabase.auth.setSession({ access_token, refresh_token });
console.log("setSession error:", error?.message ?? "none");

const { data: { user } } = await supabase.auth.getUser();
console.log("User após setSession:", user?.id ?? "NULL");
```

Se `getUser()` devolver `NULL` após `setSession` → os tokens não são válidos para o Supabase configurado (causa #1).

---

## 8. Referência rápida da API do SDK

```ts
// ─── Proxy / middleware ───
createKimaMiddleware(options?: {
  moduleKey?: string;
  appUrl?: string;
  hubUrl?: string;
  publicPaths?: string[];
  checkModuleLicense?: boolean;       // default true
  blockOnModuleError?: boolean;       // default false
})

// ─── Callback SSO ───
handleSsoCallback(request: NextRequest, options?: {
  appUrl?: string;
  hubUrl?: string;
  cookieMaxAgeSeconds?: number;
  onError?: (err: unknown) => void;
}): Promise<NextResponse>

// ─── Clientes Supabase ───
createServerSupabase(): Promise<SupabaseClient>              // Server Components / Actions
createRequestSupabase(request, response?): ServerSupabaseHandle  // Proxy / Route Handlers
createBrowserSupabase(): SupabaseClient                      // Client Components

// ─── SSO helpers ───
verifySsoToken(token, options?: { hubUrl?, timeoutMs? }): Promise<SsoVerifyResult>
buildHubLoginUrl(options?: { moduleKey?, redirectUri?, hubUrl? }): URL | null
looksLikeJwt(token: string): boolean
isValidRedirectUri(uri: string, allowedHost?: string): boolean

// ─── Realtime (client component) ───
<KimaEventListener
  moduleKey="rh"
  onLogout={fn}
  onCompanySwitched={fn}
  onModuleStatusChanged={fn}
/>

// ─── Abrir sub-app (client) ───
launchSubApp(appKey: string, options?: { newTab?, hubUrl?, appUrl? }): Promise<boolean>

// ─── Cookie domain (para usarem se precisarem de cookies custom) ───
getCookieDomain(host: string): string | undefined
```

---

## 9. Estrutura de ficheiros recomendada

```
src/
├── proxy.ts                          # createKimaMiddleware (SDK)
├── app/
│   ├── layout.tsx                    # KimaEventListener (SDK)
│   ├── page.tsx                      # createServerSupabase (SDK)
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts              # handleSsoCallback (SDK)
│   └── dashboard/
│       └── page.tsx                  # rota protegida de exemplo
```

---

## 10. Fazer e Não Fazer

### ✅ FAZER

| Ação | Porquê |
|------|--------|
| Usar `handleSsoCallback` do SDK | Já faz tudo corretamente — não reimplementar |
| Usar `createKimaMiddleware` para o proxy | Gere auth + licenças |
| Confirmar que as env vars Supabase são IDÊNTICAS às do Hub | Tokens só funcionam no projeto correto |
| Colocar `transpilePackages: ["@rcmedia-dev/kima-sdk"]` | Sem isto o SDK não compila |
| Usar os clients do SDK (`createServerSupabase`, etc.) | Têm cookie domain correto |

### ❌ NÃO FAZER

| Ação | Consequência |
|------|--------------|
| Reimplementar o callback sem `setSession()` | **Loop infinito** |
| Usar Supabase URL/key diferente do Hub | `setSession()` falha → **loop** |
| Redirecionar pedidos com `?token=` | **Loop infinito** |
| Definir `Domain=.kima.ao` manualmente | Browser rejeita cookie → login quebra |
| Esquecer `transpilePackages` | Erros em runtime |

---

*Dúvidas? Abrir issue no repo `rcmedia-dev/kima-hub`.*

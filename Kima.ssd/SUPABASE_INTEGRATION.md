# Guia de Integração Subapp — Supabase

## Visão Geral

Cada subapp usa o cliente Supabase diretamente. Sem SDK partilhado.

```
Subapp → Supabase Client → Supabase (Auth + PostgREST + RLS)
```

---

## Dependências

```bash
npm install @supabase/supabase-js
npm install zod  # opcional, para validação
```

---

## Variáveis de Ambiente

Cria um ficheiro `.env.local` na raiz do subapp:

### Localhost (desenvolvimento)

```env
# ─── Supabase (igual para todos) ────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://hpdesbvqqmdhxoksrvij.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_cnjDWZp_0qHqdtqolLHa5A_iknfe8Q-

# ─── Hub (para redirects de ativação) ──────────────────────────────────
NEXT_PUBLIC_KIMA_HUB_URL=http://localhost:3000

# ─── App Config ────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_KIMA_MODULE_KEY=rh
```

### Vercel (preview/staging)

```env
# ─── Supabase (igual para todos) ────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://hpdesbvqqmdhxoksrvij.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_cnjDWZp_0qHqdtqolLHa5A_iknfe8Q-

# ─── Hub (para redirects de ativação) ──────────────────────────────────
NEXT_PUBLIC_KIMA_HUB_URL=https://kima-hub.vercel.app

# ─── App Config ────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://kima-rh.vercel.app
NEXT_PUBLIC_KIMA_MODULE_KEY=rh
```

### Produção

```env
# ─── Supabase (igual para todos) ────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://hpdesbvqqmdhxoksrvij.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_cnjDWZp_0qHqdtqolLHa5A_iknfe8Q-

# ─── Hub (para redirects de ativação) ──────────────────────────────────
NEXT_PUBLIC_KIMA_HUB_URL=https://hub.kima.ao

# ─── App Config ────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://rh.kima.ao
NEXT_PUBLIC_KIMA_MODULE_KEY=rh
```

### Notas:
- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` são as mesmas para todos os ambientes e subapps
- `NEXT_PUBLIC_APP_URL` é a URL do subapp atual (ex: `rh.kima.ao`, `facturas.kima.ao`)
- `NEXT_PUBLIC_KIMA_MODULE_KEY` identifica o módulo (ex: `rh`, `facturas`)
- Usa `.env.local` para desenvolvimento, variáveis de ambiente no Vercel para deploy

---

## Cliente Supabase

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    db: {
      schema: process.env.NEXT_PUBLIC_KIMA_MODULE_KEY!, // 'rh', 'facturas', etc.
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)
```

---

## Check de Acesso

```typescript
// src/lib/access.ts
import { redirect } from 'next/navigation'
import { supabase } from './supabase'

export interface AccessResult {
  hasAccess: boolean
  redirectUrl: string | null
  companyId: string | null
}

export async function requireAppAccess(): Promise<AccessResult> {
  // 1. Verificar autenticação
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const hubUrl = process.env.NEXT_PUBLIC_KIMA_HUB_URL || 'https://hub.kima.ao'
    return {
      hasAccess: false,
      redirectUrl: `${hubUrl}/login?returnTo=${process.env.NEXT_PUBLIC_APP_URL}`,
      companyId: null,
    }
  }

  // 2. Buscar empresa do user
  const { data: membership } = await supabase
    .from('memberships')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) {
    const hubUrl = process.env.NEXT_PUBLIC_KIMA_HUB_URL || 'https://hub.kima.ao'
    return {
      hasAccess: false,
      redirectUrl: `${hubUrl}/onboarding`,
      companyId: null,
    }
  }

  // 3. Verificar se tem acesso ao módulo
  const moduleKey = process.env.NEXT_PUBLIC_KIMA_MODULE_KEY!

  const { data: module } = await supabase
    .from('company_modules')
    .select('status, plan, expires_at')
    .eq('company_id', membership.company_id)
    .eq('module_key', moduleKey)
    .maybeSingle()

  const hubUrl = process.env.NEXT_PUBLIC_KIMA_HUB_URL || 'https://hub.kima.ao'

  if (!module) {
    return {
      hasAccess: false,
      redirectUrl: `${hubUrl}/activate?app=${moduleKey}&company=${membership.company_id}&reason=no_access`,
      companyId: membership.company_id,
    }
  }

  if (module.status === 'Expirado') {
    return {
      hasAccess: false,
      redirectUrl: `${hubUrl}/activate?app=${moduleKey}&company=${membership.company_id}&reason=expired`,
      companyId: membership.company_id,
    }
  }

  if (module.status !== 'Ativo') {
    return {
      hasAccess: false,
      redirectUrl: `${hubUrl}/activate?app=${moduleKey}&company=${membership.company_id}&reason=inactive`,
      companyId: membership.company_id,
    }
  }

  return {
    hasAccess: true,
    redirectUrl: null,
    companyId: membership.company_id,
  }
}
```

---

## Uso no Layout

```typescript
// src/app/layout.tsx
import { redirect } from 'next/navigation'
import { requireAppAccess } from '@/lib/access'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { hasAccess, redirectUrl } = await requireAppAccess()

  if (!hasAccess && redirectUrl) {
    redirect(redirectUrl)
  }

  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  )
}
```

---

## CRUD (Queries)

### Inserir

```typescript
const { data, error } = await supabase
  .from('employees')
  .insert({
    company_id: companyId,
    first_name: 'João',
    last_name: 'Silva',
    email: 'joao@empresa.com',
  })
  .select()
  .single()
```

### Buscar

```typescript
const { data, error } = await supabase
  .from('employees')
  .select('*')
  .eq('company_id', companyId)
  .order('created_at', { ascending: false })
```

### Atualizar

```typescript
const { data, error } = await supabase
  .from('employees')
  .update({ position: 'Senior Developer' })
  .eq('id', employeeId)
  .select()
  .single()
```

### Deletar (soft delete)

```typescript
const { error } = await supabase
  .from('employees')
  .update({ deleted_at: new Date().toISOString(), status: 'inactive' })
  .eq('id', employeeId)
```

---

## Validação com Zod (Opcional)

```typescript
// src/validation/employee.ts
import { z } from 'zod'

export const CreateEmployeeSchema = z.object({
  company_id: z.string().uuid(),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  position: z.string().max(100).optional(),
  salary: z.number().min(0).optional(),
})

export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>
```

```typescript
// Uso
const result = CreateEmployeeSchema.safeParse(input)
if (!result.success) {
  console.log(result.error.issues)
  return
}
await supabase.from('employees').insert(result.data)
```

---

## Auth (Login/Logout)

```typescript
// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@empresa.com',
  password: 'password',
})

// Logout
await supabase.auth.signOut()

// Get current user
const { data: { user } } = await supabase.auth.getUser()

// Get session
const { data: { session } } = await supabase.auth.getSession()
```

---

## Realtime (Opcional)

```typescript
// Subscriber a mudanças
const channel = supabase
  .channel('employees-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'rh',
      table: 'employees',
      filter: `company_id=eq.${companyId}`,
    },
    (payload) => {
      console.log('Change received!', payload)
    }
  )
  .subscribe()

// Cleanup
supabase.removeChannel(channel)
```

---

## Estrutura de Pastas Recomendada

```
src/
├── lib/
│   ├── supabase.ts       # Cliente Supabase
│   └── access.ts         # Check de acesso
├── types/
│   ├── employee.ts       # Types do domínio
│   └── invoice.ts
├── validation/
│   ├── employee.ts       # Zod schemas
│   └── invoice.ts
├── app/
│   ├── layout.tsx        # Com check de acesso
│   ├── page.tsx
│   └── actions/
│       └── employees.ts  # Server actions
└── .env.local            # Variáveis de ambiente
```

---

## Schemas Disponíveis

| Schema | Tabelas | Módulo |
|--------|---------|--------|
| `shared` | companies, memberships, modules, company_modules | Todos |
| `rh` | employees, departments, leave_requests | Kima RH |
| `facturas` | clients, invoices, invoice_items, payments | Kima Faturação |

---

## Troubleshooting

### Erro: `relation "rh.employees" does not exist`

A tabela não foi criada. Executar `supabase/setup.sql` no SQL Editor do Supabase.

### Erro: `new row violates row-level security policy`

O user não tem permissão. Verificar se `company_modules` tem o módulo como `Ativo`.

### Erro: `JWT expired`

Fazer logout e login novamente. O Supabase refresh automático deve resolver, mas em alguns casos precisa de intervir manualmente.

### User não tem acesso após ativação no Hub

O JWT é stateless. O user precisa de fazer refresh (F5) ou logout/login para ver o novo status.

---

## URLs Importantes

### Supabase (igual para todos os ambientes)

| Serviço | URL |
|---------|-----|
| Supabase Dashboard | `https://supabase.com/dashboard/project/hpdesbvqqmdhxoksrvij` |
| SQL Editor | `https://supabase.com/dashboard/project/hpdesbvqqmdhxoksrvij/sql/new` |
| Supabase API | `https://hpdesbvqqmdhxoksrvij.supabase.co` |

### Hub

| Ambiente | URL |
|----------|-----|
| Localhost | `http://localhost:3000` |
| Vercel (preview) | `https://kima-hub.vercel.app` |
| Produção | `https://hub.kima.ao` |

### Subapps

| App | Localhost | Vercel | Produção |
|-----|-----------|--------|----------|
| Kima RH | `http://localhost:3001` | `https://kima-rh.vercel.app` | `https://rh.kima.ao` |
| Kima Faturação | `http://localhost:3002` | `https://kima-facturas.vercel.app` | `https://facturas.kima.ao` |

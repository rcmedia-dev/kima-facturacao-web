# PLANO DE IMPLEMENTAÇÃO — Sistema de Permissões

## Kima Facturação Web

---

## Resumo

O Kima Facturação passa a ter **login próprio** com código da empresa + email + senha, seguindo o mesmo fluxo do Kima RH. O Kima Hub continua como origem da empresa e da subscrição, mas deixa de ser o login operacional. Existem dois tipos de utilizador: o **Admin** (criador da empresa, acesso total) e os **Funcionários** (permissões individuais atribuídas pelo Admin). O Admin dá ou tira permissões caixinha a caixinha. Não há cargos nem níveis.

---

## 1. Arquitectura Geral

```
                    KIMA-HUB
                       │
              Conta principal / Owner
                       │
              ┌────────┴────────┐
              │                 │
        Criar empresa      Assinaturas
        e módulos          Kima Facturação
                                │
                                ▼
                        KIMA FACTURAÇÃO
                                │
                    ┌───────────┴───────────┐
                    │                       │
              Autenticação             Operação
              (própria)                     │
                    │                       │
                    ▼                       ▼
             Cód. empresa            Admin (owner)
             Email                   Funcionários
             Senha                   (permissões
                                      atribuídas)
```

---

## 2. Fluxo de Login

### 2.1 Tela de Login

```
┌─────────────────────────────────────┐
│              LOGIN                  │
├─────────────────────────────────────┤
│  Código da empresa: [__________]    │
│  Email:             [__________]    │
│  Senha:             [__________]    │
│                                     │
│            [ Entrar ]               │
│                                     │
│  Primeiro acesso? Clique aqui       │
└─────────────────────────────────────┘
```

### 2.2 Validação

```
Código da empresa → company_code → company_id
                              │
Email + company_id → utilizador existe?
                              │
                ┌─────────────┴─────────────┐
                │                           │
           Não existe                   Existe
                │                           │
                ▼                           ▼
     "Colaborador não              Tem senha?
      encontrado.                       │
      Verifique o código           ┌─────┴─────┐
      e o email."                  │           │
                                  NÃO         SIM
                                   │           │
                                   ▼           │
                            /primeiro-acesso   │
                                   │           │
                                   ▼           │
                            Definir senha      │
                                   │           │
                                   ▼           │
                            Senha criada       │
                                   │           │
                                   ▼           │
                            [Voltar ao login]  │
                                               │
                                    ◄──────────┘
                                        │
                                        ▼
                                  Validar senha
                                        │
                                 ┌──────┴──────┐
                                 │             │
                               Erro        Sucesso
                                 │             │
                                 ▼             ▼
                          "Senha         Criar sessão
                           inválida"     (cookie)
                                              │
                                              ▼
                                        /dashboard
```

### 2.3 Quem é Admin?

```
companies.owner_id = user.id?
       │
  ┌────┴────┐
  │         │
 SIM       NÃO
  │         │
  ▼         ▼
 ADMIN   FUNCIONÁRIO
(tudo)   (permissões
          atribuídas)
```

---

## 3. Tela "Primeiro Acesso"

```
┌─────────────────────────────────────┐
│         DEFINIR SENHA               │
├─────────────────────────────────────┤
│                                     │
│  Email reconhecido na empresa.      │
│  Cria a tua senha para continuar.   │
│                                     │
│  Nova senha:      [__________]      │
│  Confirmar senha: [__________]      │
│                                     │
│            [ Criar senha ]          │
└─────────────────────────────────────┘
```

Depois:

```
┌─────────────────────────────────────┐
│   Senha criada com sucesso!         │
│                                     │
│      [ Voltar ao login ]            │
└─────────────────────────────────────┘
```

---

## 4. Base de Dados

### 4.1 Tabelas Existentes (manter)

```
companies (schema: public)
─────────────────────────
id              UUID PK
name            TEXT
nif             TEXT
owner_id        UUID → auth.users.id
created_by      UUID → auth.users.id
created_at      TIMESTAMPTZ
trade_name      TEXT (opcional)
```

### 4.2 Alterações em Tabelas Existentes

```sql
-- Adicionar company_code à tabela companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS company_code TEXT UNIQUE;

-- Popular company_code para empresas existentes
-- (usar os 4 primeiros caracteres do NIF ou código gerado)
UPDATE public.companies
  SET company_code = UPPER(SUBSTRING(nif FROM 1 FOR 4))
  WHERE company_code IS NULL;
```

### 4.3 Tabelas a Criar

```sql
-- Utilizadores do Kima Facturação (login próprio)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  password_hash TEXT,  -- NULL até definir senha no primeiro acesso
  is_owner BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'ativo',  -- ativo, inativo, pendente
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, email)
);

-- Permissões disponíveis (catálogo fixo)
CREATE TABLE public.permissions (
  code TEXT PRIMARY KEY,
  description TEXT NOT NULL
);

-- Permissões atribuídas a cada funcionário
CREATE TABLE public.user_permissions (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES public.permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (user_id, company_id, permission_code)
);
```

### 4.4 Seed

```sql
-- Admin da empresa (owner)
-- NOTA: O owner é criado automaticamente quando a empresa é criada no Kima Hub
-- ou quando o primeiro utilizador faz login.password_hash é NULL até definir senha.

-- Permissões (18 total)
INSERT INTO public.permissions (code, description) VALUES
  ('dashboard.view', 'Ver dashboard'),
  ('invoices.view', 'Ver facturas'),
  ('invoices.create', 'Criar facturas'),
  ('invoices.update', 'Editar facturas'),
  ('invoices.delete', 'Apagar facturas'),
  ('customers.view', 'Ver clientes'),
  ('customers.manage', 'Criar/editar clientes'),
  ('customers.delete', 'Apagar clientes'),
  ('suppliers.view', 'Ver fornecedores'),
  ('suppliers.manage', 'Gerir fornecedores'),
  ('articles.view', 'Ver artigos'),
  ('articles.manage', 'Gerir artigos'),
  ('expenses.view', 'Ver despesas'),
  ('expenses.manage', 'Gerir despesas'),
  ('reports.view', 'Ver relatórios'),
  ('settings.manage', 'Gerir configurações'),
  ('agt.manage', 'Gerir AGT'),
  ('users.manage', 'Gerir utilizadores');
```

### 4.5 Relação entre Tabelas

```
public.companies
  ├── company_code (novo)
  ├── owner_id → auth.users.id
  │
  ├── public.users (novo)
  │     ├── company_id → companies.id
  │     ├── email
  │     ├── password_hash
  │     ├── is_owner
  │     └── status
  │
  └── public.user_permissions (novo)
        ├── user_id → users.id
        ├── company_id → companies.id
        └── permission_code → permissions.code

public.permissions (novo)
  └── code (PK), description
```

---

## 5. Páginas e Permissões

### 5.1 Mapa de Páginas

| Página | Permissão | Admin | Funcionário |
|--------|-----------|:-----:|:-----------:|
| `/login` | pública | ✅ | ✅ |
| `/primeiro-acesso` | pública (com validação) | ✅ | ✅ |
| `/dashboard` | `dashboard.view` | ✅ | Conforme atribuído |
| `/faturas` | `invoices.view` | ✅ | Conforme atribuído |
| `/faturas/nova` | `invoices.create` | ✅ | Conforme atribuído |
| `/faturas/[id]` | `invoices.view` | ✅ | Conforme atribuído |
| `/clientes` | `customers.view` | ✅ | Conforme atribuído |
| `/fornecedores` | `suppliers.view` | ✅ | Conforme atribuído |
| `/artigos` | `articles.view` | ✅ | Conforme atribuído |
| `/despesas` | `expenses.view` | ✅ | Conforme atribuído |
| `/relatorios` | `reports.view` | ✅ | Conforme atribuído |
| `/configuracoes` | `settings.manage` | ✅ | Conforme atribuído |
| `/agt` | `agt.manage` | ✅ | Conforme atribuído |
| `/utilizadores` | `users.manage` | ✅ | ❌ (só Admin) |
| `/acesso-negado` | autenticado | ✅ | ✅ |

### 5.2 Admin vs Funcionário

| Aspecto | Admin | Funcionário |
|---------|-------|------------|
| Quem é | `companies.owner_id = user.id` | Qualquer outro |
| Permissões | Todas (hardcoded) | Atribuídas pelo Admin |
| Pode editar permissões | Sim (em /utilizadores) | Não |
| Pode desactivar utilizadores | Sim | Não |
| Aparece na lista de edição | Não (tem tudo) | Sim |

### 5.3 Lista de Permissões (18)

| Código | O que permite |
|--------|--------------|
| `dashboard.view` | Ver dashboard |
| `invoices.view` | Ver facturas |
| `invoices.create` | Criar facturas |
| `invoices.update` | Editar facturas |
| `invoices.delete` | Apagar facturas |
| `customers.view` | Ver clientes |
| `customers.manage` | Criar/editar clientes |
| `customers.delete` | Apagar clientes |
| `suppliers.view` | Ver fornecedores |
| `suppliers.manage` | Gerir fornecedores |
| `articles.view` | Ver artigos |
| `articles.manage` | Gerir artigos |
| `expenses.view` | Ver despesas |
| `expenses.manage` | Gerir despesas |
| `reports.view` | Ver relatórios |
| `settings.manage` | Gerir configurações |
| `agt.manage` | Gerir AGT |
| `users.manage` | Gerir utilizadores |

---

## 6. Página /utilizadores (Admin)

```
┌─────────────────────────────────────────────┐
│        GESTÃO DE FUNCIONÁRIOS               │
├─────────────────────────────────────────────┤
│  Nome      Estado       Permissões          │
│  ─────────────────────────────────────────  │
│  Ana       owner        (todas)             │
│  Bruno     activo       facturas, clientes  │
│  Maria     activo       facturas, relatórios│
│  João      activo       só ver facturas     │
│  Rita      pendente     —                   │
├─────────────────────────────────────────────┤
│  [Adicionar Funcionário]                    │
│                                             │
│  [Editar Bruno]                             │
│    Email: bruno@empresa.ao                  │
│    Permissões:                              │
│      ☑ invoices.view                        │
│      ☑ invoices.create                      │
│      ☑ customers.view                       │
│      ☐ reports.view                         │
│      ☐ settings.manage                      │
│    [Guardar]                                │
└─────────────────────────────────────────────┘
```

---

## 7. Três Camadas de Segurança

```
┌─────────────────────────────────────────┐
│  INTERFACE (React)                      │
│  Esconde botões e menus                 │
│  → NÃO é segurança                      │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  SERVIDOR (API / Server Actions)        │
│  Valida sempre com a BD                 │
│  Admin → todas as permissões            │
│  Funcionário → consulta user_permissions│
│  → FONTE DE VERDADE                    │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  BASE DE DADOS                          │
│  public.users + user_permissions        │
│  company_id isolation                   │
└─────────────────────────────────────────┘
```

---

## 8. Sessão

### 8.1 Cookie de Sessão

Após login bem-sucedido, criar cookie criptografado:

```
kima-session = { userId, companyId, isOwner, email }
```

- **HttpOnly**: true (não acessível via JavaScript)
- **Secure**: true em produção
- **SameSite**: Lax
- **MaxAge**: 30 dias
- **Path**: /

### 8.2 Leitura da Sessão

```typescript
// lib/session.ts
export async function obterSessao(request): Promise<Sessao | null> {
  const cookie = request.cookies.get('kima-session');
  if (!cookie) return null;
  return decrypt(cookie.value);
}
```

### 8.3 Logout

```typescript
// Limpar cookie kima-session
response.cookies.set('kima-session', '', { maxAge: 0 });
```

---

## 9. Middleware

```typescript
// middleware.ts (Edge Runtime — sem BD)

const PUBLIC_PATHS = ['/login', '/primeiro-acesso', '/api/auth/login',
                      '/api/auth/primeiro-acesso', '/api/auth/permissions'];

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Rotas públicas → passa
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Verificar sessão
  const session = req.cookies.get('kima-session');
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}
```

**Nota:** O middleware apenas verifica existência do cookie. A validação real da sessão e permissões é feita no servidor.

---

## 10. Ficheiros a Criar

| # | Ficheiro | Função |
|---|----------|--------|
| 1 | `migrations/005_auth_e_permissoes.sql` | Tabelas `users`, `permissions`, `user_permissions`; coluna `company_code`; seed |
| 2 | `lib/permissions.ts` | Tipos, `can()`, `ROUTE_PERMISSIONS`, `ALL_PERMISSIONS` |
| 3 | `lib/auth.ts` | `login()`, `definirSenha()`, `obterSessao()`, `terminarSessao()`, `hashSenha()`, `verificarSenha()` |
| 4 | `middleware.ts` | Verifica sessão (cookie), exclui rotas públicas |
| 5 | `app/api/auth/login/route.ts` | POST: valida company_code + email + password |
| 6 | `app/api/auth/primeiro-acesso/route.ts` | POST: define senha para utilizador sem password |
| 7 | `app/api/auth/permissions/route.ts` | GET: devolve permissões finais |
| 8 | `app/primeiro-acesso/page.tsx` | Tela de Definir Senha |
| 9 | `app/acesso-negado/page.tsx` | Página de acesso negado |
| 10 | `lib/use-permissions.ts` | Hook cliente para permissões |
| 11 | `components/protected-route.tsx` | Protecção client-side |
| 12 | `app/utilizadores/page.tsx` | Gestão de funcionários (só Admin) |
| 13 | `app/utilizadores/actions.ts` | Server Actions |

## 11. Ficheiros a Alterar

| # | Ficheiro | Alteração |
|---|----------|-----------|
| 1 | `lib/types.ts` | Tipos `Sessao`, `Permission`, `UserPermissions` |
| 2 | `lib/session.ts` | Substituir por nossa sessão (cookie criptografado) |
| 3 | `lib/company.ts` | Nova `requirePermission()`, `isAdmin()` |
| 4 | `components/sidebar.tsx` | Filtrar itens por permissão |
| 5 | `components/profile-dropdown.tsx` | Mostrar "Admin" ou "Funcionário" |
| 6 | `app/layout-client.tsx` | Integrar `ProtectedRoute` |
| 7 | `app/login/page.tsx` | Login com código + email + senha |
| 8 | `app/page.tsx` | Redirect para /login (não mais /dashboard) |
| 9 | `db/mocks/mock-data.ts` | Adicionar mocks para `users`, `permissions`, `user_permissions` |
| 10 | `db/mocks/mock-client.ts` | Registar novas tabelas |
| 11 | `db/mocks/query-builder.ts` | Adicionar tabelas ao query builder |

---

## 12. Exemplo Prático

| Utilizador | Tipo | Login | Permissões |
|------------|------|-------|-----------|
| Ana | Admin (owner) | KIMA + ana@empresa.ao + senha | Todas (automático) |
| Bruno | Funcionário | KIMA + bruno@empresa.ao + senha | `dashboard.view`, `invoices.view`, `invoices.create`, `customers.view` |
| Maria | Funcionário | KIMA + maria@empresa.ao + senha | `dashboard.view`, `invoices.view`, `reports.view` |
| João | Funcionário | KIMA + joao@empresa.ao + senha | `dashboard.view`, `invoices.view` |
| Rita | Funcionário | KIMA + rita@empresa.ao + (sem senha) | — (pendente) |

---

## 13. Regras de Ouro

1. **Login é sempre código + email + senha**
2. **Admin = tudo, sempre** — não precisa de permissões na BD
3. **Funcionário = só o que o Admin lhe der** — via `user_permissions`
4. **Nunca procurar utilizador só por email** — sempre `company_id + email`
5. **UI só esconde botões** — servidor valida sempre
6. **Middleware nunca consulta a BD** — Edge é rápido
7. **Ao mudar permissões → terminar sessão do funcionário**
8. **Kima Hub cria a empresa; Kima Facturação gere o acesso**
9. **password_hash = NULL → primeiro acesso → /primeiro-acesso**

---

**Fim do Plano**

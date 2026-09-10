# TASKS — Implementação do Sistema de Permissões

## Kima Facturação Web

---

## Legenda

- ⬜ Pendente
- 🔄 Em progresso
- ✅ Concluído

---

## FASE 1 — Base de Dados

| # | Task | Descrição |
|---|------|-----------|
| 1.1 | ⬜ Migration SQL | Criar `migrations/005_auth_e_permissoes.sql`: tabela `users`, `permissions`, `user_permissions`; coluna `company_code` em `companies`; seed de 18 permissões |
| 1.2 | ⬜ Mock users | Adicionar `MOCK_USERS` em `db/mocks/mock-data.ts` (Admin owner + 2 funcionários de exemplo) |
| 1.3 | ⬜ Mock permissions | Adicionar `MOCK_PERMISSIONS` e `MOCK_USER_PERMISSIONS` em `db/mocks/mock-data.ts` |
| 1.4 | ⬜ Mock client | Registar novas tabelas em `db/mocks/mock-client.ts` e `db/mocks/query-builder.ts` |

---

## FASE 2 — Tipos e Lógica Central

| # | Task | Descrição |
|---|------|-----------|
| 2.1 | ⬜ Tipos TypeScript | Adicionar em `lib/types.ts`: `Sessao`, `Permission`, `UserPermissions`, `Utilizador` |
| 2.2 | ⬜ lib/permissions.ts | Criar: `ALL_PERMISSIONS`, `ROUTE_PERMISSIONS`, `can()`, `isAdmin()` |

---

## FASE 3 — Autenticação Própria

| # | Task | Descrição |
|---|------|-----------|
| 3.1 | ⬜ lib/auth.ts | Criar: `hashSenha()`, `verificarSenha()`, `criarSessao()`, `obterSessao()`, `terminarSessao()` — sessão via cookie criptografado |
| 3.2 | ⬜ API login | Criar `app/api/auth/login/route.ts` — POST: company_code + email + password → sessão |
| 3.3 | ⬜ API primeiro-acesso | Criar `app/api/auth/primeiro-acesso/route.ts` — POST: company_code + email + nova_senha → actualiza password_hash |
| 3.4 | ⬜ API permissions | Criar `app/api/auth/permissions/route.ts` — GET: devolve permissões finais (Admin: todas; Funcionário: lista) |

---

## FASE 4 — Páginas de Auth

| # | Task | Descrição |
|---|------|-----------|
| 4.1 | ⬜ /login (reescrita) | Reescrever `app/login/page.tsx`: campos código empresa + email + senha; link "primeiro acesso"; chamar `/api/auth/login` |
| 4.2 | ⬜ /primeiro-acesso | Criar `app/primeiro-acesso/page.tsx`: campos nova senha + confirmar; chamar `/api/auth/primeiro-acesso` |
| 4.3 | ⬜ app/page.tsx | Alterar redirect de `/dashboard` para `/login` |

---

## FASE 5 — Middleware

| # | Task | Descrição |
|---|------|-----------|
| 5.1 | ⬜ middleware.ts | Criar `middleware.ts`: verifica cookie `kima-session`; exclui rotas públicas; redirect para `/login` se não autenticado |

---

## FASE 6 — Sessão e Identificação

| # | Task | Descrição |
|---|------|-----------|
| 6.1 | ⬜ lib/session.ts | Reescrever: `obterSessao()` lê cookie criptografado; `usuarioAtual()` devolve dados da sessão |
| 6.2 | ⬜ lib/company.ts | Adicionar: `isAdmin(userId, companyId)`, `requirePermission(permission)` |

---

## FASE 7 — Páginas Novas

| # | Task | Descrição |
|---|------|-----------|
| 7.1 | ⬜ /acesso-negado | Criar `app/acesso-negado/page.tsx`: mensagem + botão voltar ao dashboard |

---

## FASE 8 — Componentes React

| # | Task | Descrição |
|---|------|-----------|
| 8.1 | ⬜ use-permissions | Criar `lib/use-permissions.ts`: hook que busca permissões via `/api/auth/permissions` |
| 8.2 | ⬜ protected-route | Criar `components/protected-route.tsx`: wrapper que redireciona sem permissão |

---

## FASE 9 — UI Existente

| # | Task | Descrição |
|---|------|-----------|
| 9.1 | ⬜ sidebar.tsx | Alterar `components/sidebar.tsx`: filtrar navItems por `can(permissions, item.permission)` |
| 9.2 | ⬜ profile-dropdown.tsx | Alterar `components/profile-dropdown.tsx`: mostrar "Admin" ou "Funcionário"; logout limpa cookie `kima-session` |
| 9.3 | ⬜ layout-client.tsx | Alterar `app/layout-client.tsx`: envolver com `ProtectedRoute`; excluir rotas de auth |

---

## FASE 10 — Gestão de Funcionários (Admin)

| # | Task | Descrição |
|---|------|-----------|
| 10.1 | ⬜ /utilizadores page | Criar `app/utilizadores/page.tsx`: lista de funcionários, modal de edição com checkboxes de permissões; acesso só Admin |
| 10.2 | ⬜ /utilizadores actions | Criar `app/utilizadores/actions.ts`: `adicionarFuncionario()`, `editarPermissoes()`, `desactivarFuncionario()` |

---

## FASE 11 — Integração com Login Existente

| # | Task | Descrição |
|---|------|-----------|
| 11.1 | ⬜ check-subscription | Alterar `app/api/auth/check-subscription/route.ts`: usar nossa tabela `users` em vez de Supabase Auth |
| 11.2 | ⬜ Remover dependência Supabase Auth | Remover chamadas `supabase.auth.signInWithPassword()` e `supabase.auth.getUser()` do login; substituir pelo nosso sistema |
| 11.3 | ⬜ Hooks e store | Alterar `hooks/use-store-init.ts` e `lib/store.ts`: usar nossa sessão em vez de Supabase Auth |

---

## FASE 12 — Testes

| # | Task | Descrição |
|---|------|-----------|
| 12.1 | ⬜ Teste: Admin login | Admin (owner) faz login → acesso total a todas as páginas |
| 12.2 | ⬜ Teste: Funcionário sem permissões | Funcionário sem permissões → redirecionado para /acesso-negado em páginas restritas |
| 12.3 | ⬜ Teste: Funcionário com permissões | Funcionário com permissões vê apenas itens permitidos na sidebar |
| 12.4 | ⬜ Teste: Primeiro acesso | Utilizador sem password → /primeiro-acesso → definir senha → login |
| 12.5 | ⬜ Teste: Admin atribui permissões | Admin marca/desmarca permissões em /utilizadores → funciona |
| 12.6 | ⬜ Teste: API 403 | API routes devolvem 403 sem permissão |
| 12.7 | ⬜ Teste: Middleware | Middleware bloqueia acessos sem cookie de sessão |

---

## Ordem de Execução

```
FASE 1 (BD) ──→ FASE 2 (Tipos) ──→ FASE 3 (Auth)
                                         │
                    ┌────────────────────┤
                    │                    │
                FASE 4 (Páginas)    FASE 5 (Middleware)
                    │                    │
                    └────────┬───────────┘
                             │
                       FASE 6 (Sessão)
                             │
                       FASE 7 (Páginas novas)
                             │
                       FASE 8 (Componentes)
                             │
                    ┌────────┴────────┐
                    │                 │
              FASE 9 (UI)      FASE 10 (Admin)
                    │                 │
                    └────────┬────────┘
                             │
                      FASE 11 (Integração)
                             │
                      FASE 12 (Testes)
```

---

**Total: 30 tasks em 12 fases**

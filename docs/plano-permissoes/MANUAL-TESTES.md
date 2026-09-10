# Manual de Testes — Sistema de Permissões Kima Facturação

## Pré-requisitos

1. Aplicação a correr (`npm run dev`)
2. Mock DB activo (`NEXT_PUBLIC_USE_MOCK_DB=true`)
3. Browser limpo (sem cookies `kima-session`)

## Credenciais de Teste (Mock)

| Utilizador | Email | Senha | Tipo | Estado |
|------------|-------|-------|------|--------|
| Admin | admin@kima.ao | mock:mock:admin@kima.ao | Admin (owner) | Ativo |
| Bruno | bruno@kima.ao | mock:mock:bruno@kima.ao | Funcionário | Ativo |
| Maria | maria@kima.ao | mock:mock:maria@kima.ao | Funcionário | Ativo |
| Rita | rita@kima.ao | *(sem senha)* | Funcionário | Pendente |

**Código da empresa:** `KIMA`

> **Nota sobre senhas no Mock:** O hash é gerado como `mock:${senha}`. Para fazer login no mock, use a senha `mock:${email}`. Exemplo: Admin = `mock:admin@kima.ao`.

---

## Teste 1: Login com Credenciais Válidas

**Objectivo:** Verificar que o login funciona com código + email + senha.

**Passos:**
1. Abrir `/login`
2. Preencher Código da Empresa: `KIMA`
3. Preencher Email: `admin@kima.ao`
4. Preencher Senha: `mock:admin@kima.ao`
5. Clicar "Entrar"

**Resultado esperado:**
- Redirecionamento para `/dashboard`
- Cookie `kima-session` presente no browser
- Sidebar mostra todas as opções (Admin tem todas as permissões)
- Profile dropdown mostra "Administrador"

---

## Teste 2: Login com Empresa Inexistente

**Objectivo:** Verificar mensagem de erro para código de empresa inválido.

**Passos:**
1. Abrir `/login`
2. Preencher Código da Empresa: `XYZ`
3. Preencher Email: `admin@kima.ao`
4. Preencher Senha: `qualquer`
5. Clicar "Entrar"

**Resultado esperado:**
- Mensagem de erro: "Empresa não encontrada"
- Permanece na página de login

---

## Teste 3: Login com Email Inexistente

**Objectivo:** Verificar mensagem de erro para email não registado.

**Passos:**
1. Abrir `/login`
2. Preencher Código: `KIMA`
3. Preencher Email: `naoexiste@kima.ao`
4. Preencher Senha: `qualquer`
5. Clicar "Entrar"

**Resultado esperado:**
- Mensagem de erro: "Colaborador não encontrado"
- Permanece na página de login

---

## Teste 4: Login com Senha Inválida

**Objectivo:** Verificar mensagem de erro para senha incorreta.

**Passos:**
1. Abrir `/login`
2. Preencher Código: `KIMA`
3. Preencher Email: `admin@kima.ao`
4. Preencher Senha: `senhaerrada`
5. Clicar "Entrar"

**Resultado esperado:**
- Mensagem de erro: "Senha inválida"
- Permanece na página de login

---

## Teste 5: Primeiro Acesso (Sem Senha)

**Objectivo:** Verificar fluxo de primeiro acesso para utilizador sem senha definida.

**Passos:**
1. Abrir `/login`
2. Preencher Código: `KIMA`
3. Preencher Email: `rita@kima.ao`
4. Preencher Senha: `qualquer`
5. Clicar "Entrar"

**Resultado esperado:**
- Redirecionamento para `/primeiro-acesso`
- Email e nome da empresa pré-preenchidos
- Formulário com 2 campos: Nova senha + Confirmar senha

**Passos adicionais:**
6. Preencher Nova senha: `minhasenha123`
7. Preencher Confirmar senha: `minhasenha123`
8. Clicar "Definir Senha"

**Resultado esperado:**
- Mensagem de sucesso: "Senha criada com sucesso!"
- Redirecionamento automático para `/login` após 3 segundos

---

## Teste 6: Acesso Negado (Rota Protegida)

**Objectivo:** Verificar queFuncionário sem permissão é bloqueado.

**Passos:**
1. Fazer login como Bruno (`bruno@kima.ao` / `mock:bruno@kima.ao`)
2. Navegar manualmente para `/utilizadores` (via URL)

**Resultado esperado:**
- Redirecionamento para `/acesso-negado`
- Página mostra "Acesso Negado" com botão "Voltar ao Dashboard"

---

## Teste 7: Sidebar Filtrada por Permissões

**Objectivo:** Verificar que a sidebar mostra apenas itens permitidos.

**Passos:**
1. Fazer login como Bruno (`bruno@kima.ao`)
2. Observar a sidebar

**Permissões do Bruno:**
- `dashboard.view`
- `invoices.view`
- `invoices.create`
- `customers.view`

**Resultado esperado:**
- Sidebar mostra: Dashboard, Documentos, Clientes
- Sidebar NÃO mostra: Fornecedores, Artigos, Despesas, Relatórios, Configurações, Utilizadores
- Secções "Financeiro" e "Sistema" não aparecem

---

## Teste 8: Profile Dropdown — Admin vs Funcionário

**Objectivo:** Verificar que o dropdown mostra o tipo correto.

**Passos:**
1. Fazer login como Admin → observar dropdown
2. Fazer logout
3. Fazer login como Bruno → observar dropdown

**Resultado esperado:**
- Admin: mostra "Administrador" com badge amber
- Bruno: mostra "Funcionário" com badge azul

---

## Teste 9: Gestão de Funcionários (Admin)

**Objectivo:** Verificar CRUD de funcionários.

**Passos:**
1. Fazer login como Admin (`admin@kima.ao`)
2. Navegar para `/utilizadores`
3. Clicar "Novo Funcionário"
4. Preencher Email: `teste@kima.ao`
5. Preencher Nome: `Teste User`
6. Clicar "Criar Funcionário"

**Resultado esperado:**
- Modal fecha
- Novo utilizador aparece na tabela com estado "Pendente"
- Métricas actualizam

---

## Teste 10: Gerir Permissões (Admin)

**Objectivo:** Verificar atribuição de permissões a funcionários.

**Passos:**
1. Em `/utilizadores`, clicar nos 3 pontos ao lado do Bruno
2. Clicar "Permissões"
3. Desmarcar a permissão "Ver clientes"
4. Marcar a permissão "Ver fornecedores"
5. Clicar "Guardar"

**Resultado esperado:**
- Modal fecha
- Contador de permissões actualiza na tabela
- Fazer logout e login como Bruno
- Sidebar mostra Fornecedores mas NÃO mostra Clientes

---

## Teste 11: Remover Funcionário (Admin)

**Objectivo:** Verificar remoção de funcionário.

**Passos:**
1. Em `/utilizadores`, clicar nos 3 pontos ao lado de um funcionário
2. Clicar "Remover"
3. Confirmar no modal

**Resultado esperado:**
- Funcionário removido da tabela
- Métricas actualizam
- Se tentar fazer login com email removido → "Colaborador não encontrado"

---

## Teste 12: Middleware — Sem Sessão

**Objectivo:** Verificar que o middleware bloqueia acesso sem cookie.

**Passos:**
1. Abrir browser limpo (sem cookies)
2. Navegar directamente para `/dashboard`

**Resultado esperado:**
- Redirect para `/login?redirect=%2Fdashboard`
- Não acede ao dashboard

---

## Teste 13: Logout

**Objectivo:** Verificar que o logout limpa a sessão.

**Passos:**
1. Fazer login
2. Clicar no profile dropdown
3. Clicar "Terminar Sessão"

**Resultado esperado:**
- Cookie `kima-session` removido
- Redirect para `/login`
- Tentar aceder `/dashboard` → redirect para `/login`

---

## Teste 14: Acesso Negado (Página)

**Objectivo:** Verificar a página de acesso negado.

**Passos:**
1. Navegar para `/acesso-negado`

**Resultado esperado:**
- Página mostra ícone de escudo vermelho
- Mensagem: "Não tem permissão para aceder a esta página"
- Botão "Voltar ao Dashboard" funciona

---

## Teste 15: Todas as Permissões do Admin

**Objectivo:** Verificar que Admin tem acesso a tudo.

**Passos:**
1. Fazer login como Admin
2. Navegar para cada secção da sidebar

**Resultado esperado:**
- Dashboard: acessível
- Documentos: acessível
- Clientes: acessível
- Fornecedores: acessível
- Artigos: acessível
- Despesas: acessível
- Relatórios: acessível
- Configurações: acessível
- Utilizadores: acessível

---

## Problemas Conhecidos

1. **Senhas no Mock:** O hash é `mock:${senha}`. Para login, use senha = `mock:${email}`
2. **Check-subscription:** Em mock, assume que sempre tem acesso (sem `company_modules`)
3. **KimaEventListener:** Só funciona em produção com Supabase configurado

---

## Checklist de Validação

- [ ] Login com credenciais válidas
- [ ] Login com empresa inexistente → erro
- [ ] Login com email inexistente → erro
- [ ] Login com senha inválida → erro
- [ ] Primeiro acesso (utilizador sem senha)
- [ ] Sidebar filtrada por permissões
- [ ] Profile dropdown mostra tipo correto
- [ ] Admin pode criar funcionários
- [ ] Admin pode gerir permissões
- [ ] Admin pode remover funcionários
- [ ] Funcionário sem permissão → acesso negado
- [ ] Middleware bloqueia sem sessão
- [ ] Logout limpa sessão
- [ ] Página acesso negado funciona
- [ ] Admin tem acesso a todas as secções

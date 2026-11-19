# Plano de Implementação — Níveis de Acesso noutra Aplicação

## 1. Objectivo

Replicar noutra aplicação o sistema de controlo de acesso usado no Kima Facturação, com uma implementação clara, segura, testável e adaptada à arquitectura já existente na aplicação de destino.

O modelo de referência tem dois perfis funcionais:

- **Administrador:** acesso total e gestão de utilizadores e permissões.
- **Utilizador/Funcionário:** acesso apenas às capacidades autorizadas pelo administrador.

O acesso não deve depender apenas do nome do perfil. A decisão efectiva é feita com permissões explícitas, verificadas no servidor. A interface usa essas permissões para apresentar menus e acções relevantes, mas não é a fronteira de segurança.

> **Nota de desenho:** no sistema de referência, “nível” não é uma hierarquia fixa de cargos. É um administrador com acesso total e utilizadores com permissões individuais. Se a aplicação de destino precisar de perfis pré-configurados (por exemplo, Operador e Supervisor), esses perfis podem ser adicionados como conjuntos de permissões, sem substituir as verificações por permissão.

## 2. Princípios

1. **Autorizar no servidor:** cada API, acção de servidor ou operação protegida verifica a sessão, o âmbito do utilizador e a permissão necessária.
2. **Negar por omissão:** uma rota ou operação sem regra explícita não deve ficar automaticamente aberta.
3. **Separar autenticação de autorização:** sessão válida confirma identidade; as permissões determinam o que essa identidade pode fazer.
4. **Aplicar menor privilégio:** utilizadores começam sem permissões administrativas e recebem apenas as necessárias.
5. **Respeitar o âmbito dos dados:** numa aplicação multiempresa, toda a leitura e alteração deve ser limitada à empresa/tenant da sessão.
6. **Manter a origem de verdade no servidor/BD:** permissões enviadas pelo browser não são prova de autorização.
7. **Dar feedback claro:** utilizador sem sessão é encaminhado para login; utilizador autenticado sem permissão recebe resposta 403 ou página de acesso negado.
8. **Preservar o login existente:** integrar o controlo de acesso com o mecanismo de autenticação actual, evitando criar um segundo sistema de sessões sem necessidade.

## 3. Decisões a confirmar durante a descoberta

Antes da implementação, registar estas decisões no repositório da aplicação de destino:

| Tema | Decisão necessária |
|---|---|
| Identidade | Qual é o mecanismo actual de login, sessão, logout e recuperação de conta? |
| Perfis | Há apenas Administrador e Utilizador, ou são necessários perfis predefinidos adicionais? |
| Âmbito | A aplicação tem uma organização/tenant ou várias? |
| Permissões | Quais são os módulos, páginas e operações que podem ser autorizados separadamente? |
| Administração | Quem pode convidar, activar, desactivar e remover utilizadores? |
| Persistência | Que BD, migrações, políticas RLS ou camada de dados já existem? |
| Cache | Como serão invalidadas permissões após alteração ou remoção de acesso? |
| Compatibilidade | Que rotas, integrações e contas actuais não podem perder acesso? |

Não se deve copiar cegamente nomes de tabelas, endpoints, cookies ou permissões do Kima Facturação; estes devem seguir as convenções da aplicação de destino.

## 4. Modelo funcional

### 4.1 Perfis e permissões

- **Administrador:** pode consultar e gerir as permissões da organização e tem acesso às funções administrativas definidas pelo produto.
- **Utilizador:** recebe uma lista de permissões atribuídas; não pode alterar as próprias permissões nem administrar utilizadores, salvo autorização explícita e cuidadosamente limitada.
- **Permissão:** código estável e legível que representa uma capacidade, por exemplo `orders.view`, `orders.create`, `orders.update` ou `users.manage`.
- **Regra de autorização:** associa uma rota/operação a uma permissão e, quando aplicável, a um âmbito de dados (por exemplo, apenas os registos próprios).

Permissões devem distinguir, quando o produto o exigir, leitura, criação, edição, eliminação e administração. Uma permissão de visualização não deve implicitamente conceder alteração ou eliminação.

### 4.2 Catálogo inicial de permissões

Criar o catálogo com base nas funcionalidades reais da aplicação. Exemplo a adaptar:

| Área | Permissões de exemplo |
|---|---|
| Painel | `dashboard.view` |
| Registos principais | `records.view`, `records.create`, `records.update`, `records.delete` |
| Clientes/entidades | `customers.view`, `customers.manage`, `customers.delete` |
| Relatórios | `reports.view`, `reports.export` |
| Configuração | `settings.manage` |
| Utilizadores | `users.view`, `users.manage`, `users.permissions.manage` |

Cada permissão terá descrição para a interface de gestão. O catálogo será versionado em código e sincronizado com a BD através de migrações ou mecanismo equivalente.

## 5. Arquitectura proposta

```text
Login existente
    │
    ▼
Sessão autenticada ── identidade + organização/tenant
    │
    ├── Interface: filtra menus e botões
    │
    ├── Camada de autorização: requirePermission(...)
    │       ├── Páginas/rotas
    │       ├── APIs/acções de servidor
    │       └── Operações de domínio
    │
    └── Persistência: utilizadores + catálogo + atribuições
            └── isolamento por organização/tenant
```

Responsabilidades recomendadas:

- **Camada de sessão/autenticação:** identifica o utilizador e valida a sessão de acordo com as práticas seguras do framework existente.
- **Catálogo de permissões:** define códigos, descrições e agrupamentos.
- **Serviço de autorização:** funções reutilizáveis como `hasPermission`, `requirePermission` e `requireRole` (se os perfis forem necessários).
- **Camada de dados:** consulta e actualiza atribuições, sempre com o âmbito de tenant aplicado.
- **Interface:** apresenta apenas opções permitidas, com estados de carregamento e erros tratados.
- **Auditoria:** regista alterações administrativas às permissões e à situação dos utilizadores, se a aplicação tiver requisitos de rastreabilidade.

## 6. Modelo de dados lógico

Adaptar nomes e tipos à BD existente. Modelo relacional de referência:

### `users`

- `id`
- identificador do tenant/organização, se aplicável
- email/nome e referência à identidade existente
- `status` (por exemplo, pendente, activo, inactivo)
- campos de auditoria (`created_at`, `updated_at`)

### `permissions`

- `code` — chave estável, única
- `description`
- `group` ou secção para a interface

### `user_permissions`

- `user_id`
- identificador do tenant/organização, se aplicável
- `permission_code`
- chave única que impeça atribuições duplicadas
- campos de auditoria, se necessários

Restrições:

- chaves estrangeiras e índices para utilizador, tenant e permissão;
- impedir que um administrador atribua permissões a utilizadores de outro tenant;
- impedir que utilizadores não administrativos alterem permissões;
- aplicar RLS/políticas da BD quando a tecnologia e o modelo actual o suportarem;
- não guardar permissões de administrador como um conjunto editável que possa removê-las acidentalmente; determinar o acesso administrativo a partir da fonte de autoridade escolhida.

## 7. Plano por fases

### Fase 0 — Levantamento e desenho

1. Mapear autenticação, sessões, utilizadores, organização/tenant, rotas, APIs e operações críticas.
2. Inventariar menus, botões, exports, tarefas agendadas e integrações que lêem ou alteram dados.
3. Definir o catálogo de permissões e quem será administrador inicial.
4. Decidir comportamento de utilizadores existentes sem permissões explícitas.
5. Registar matriz rota/operação → permissão e plano de migração/rollback.

**Saída:** documento de desenho aprovado, catálogo inicial e matriz de autorização.

### Fase 1 — Persistência e migração

1. Preparar migração versionada e reversível sempre que possível.
2. Criar ou adaptar catálogo de permissões e tabela de atribuições.
3. Definir constraints, índices e políticas de tenant/RLS.
4. Migrar utilizadores e administradores actuais sem bloquear o login existente.
5. Preparar dados de desenvolvimento/teste sem credenciais reais.

**Saída:** esquema aplicado num ambiente não produtivo e migração validada.

### Fase 2 — Lógica central de autorização

1. Definir tipos/constantes para as permissões e validar códigos desconhecidos.
2. Implementar um serviço único para consultar/verificar permissões.
3. Implementar guardas reutilizáveis para páginas, endpoints, acções e operações de domínio.
4. Garantir verificação de sessão antes da consulta às permissões.
5. Aplicar negação por omissão para recursos protegidos e tratamento explícito para recursos públicos.
6. Evitar confiar em `role`, `isAdmin` ou permissões enviados pelo cliente.

**Saída:** autorização central testável sem depender da interface.

### Fase 3 — Protecção das rotas e dados

1. Mapear cada rota/API para a permissão necessária.
2. Aplicar verificações no servidor em todas as operações de leitura e escrita relevantes.
3. Verificar sempre o tenant/organização associado à sessão e ao recurso.
4. Devolver `401` para sessão ausente/inválida e `403` para sessão válida sem autorização.
5. Não revelar dados do recurso quando o utilizador não tem acesso ao seu âmbito.
6. Rever exports, uploads, downloads e endpoints auxiliares, que podem não estar visíveis nos menus.

**Saída:** matriz de rotas implementada; acessos directos e pedidos API ficam protegidos.

### Fase 4 — Interface de utilizador

1. Filtrar menus e secções com o serviço de permissões do cliente.
2. Ocultar ou desactivar acções sem permissão, preservando mensagens acessíveis.
3. Criar página/estado de acesso negado com forma segura de regressar.
4. Criar ecrã administrativo para listar utilizadores e respectivos estados.
5. Criar formulário para atribuir permissões por grupos e permissões individuais.
6. Mostrar confirmação e erros reais ao guardar; não apresentar sucesso em caso de falha.
7. Tratar carregamento das permissões sem mostrar temporariamente conteúdo restrito.

**Saída:** interface consistente com as decisões reais do servidor.

### Fase 5 — Gestão de utilizadores e ciclo de vida

1. Implementar convite/criação conforme o fluxo de identidade já existente.
2. Implementar edição de permissões com validação e autorização administrativa.
3. Implementar activação, desactivação e remoção segundo as regras de negócio.
4. Revogar ou actualizar sessões quando uma conta é desactivada ou perde permissões sensíveis.
5. Registar quem alterou permissões, quando e quais alterações, caso requerido.

**Saída:** gestão administrativa funcional e rastreável.

### Fase 6 — Testes, rollout e operação

1. Executar testes unitários para cada permissão e perfil.
2. Executar testes de integração em APIs, rotas e isolamento de tenant.
3. Executar testes manuais com contas de administrador, utilizador autorizado e utilizador sem acesso.
4. Aplicar a migração em staging e verificar contas actuais.
5. Fazer rollout gradual com monitorização de respostas `401`/`403` e erros de sessão.
6. Preparar procedimento de rollback e conta administrativa de emergência protegida.
7. Actualizar documentação operacional e manual de testes.

**Saída:** funcionalidade validada em staging e pronta para produção.

## 8. Matriz de acesso a manter

Manter uma tabela deste tipo no repositório da aplicação:

| Recurso/operação | Permissão necessária | Público? | Verificação no servidor | Verificação de tenant |
|---|---|---:|---:|---:|
| Página principal | `dashboard.view` | Não | Sim | Se aplicável |
| Listar registos | `records.view` | Não | Sim | Sim |
| Criar registo | `records.create` | Não | Sim | Sim |
| Editar registo | `records.update` | Não | Sim | Sim |
| Apagar registo | `records.delete` | Não | Sim | Sim |
| Gerir utilizadores | `users.manage` | Não | Sim | Sim |

Adicionar uma linha para cada rota, endpoint, acção de servidor, exportação ou tarefa que aceda a dados protegidos.

## 9. Estratégia de testes

### 9.1 Casos obrigatórios

| Caso | Resultado esperado |
|---|---|
| Login válido como administrador | Sessão estabelecida e acesso administrativo permitido |
| Login válido como utilizador | Sessão estabelecida e apenas permissões atribuídas aplicadas |
| Credenciais inválidas | Login recusado com mensagem apropriada |
| Pedido sem sessão para recurso privado | `401` ou redireccionamento para login |
| Utilizador sem permissão abre URL directamente | Página de acesso negado; dados não são devolvidos |
| Utilizador sem permissão chama API directamente | `403`; operação não ocorre |
| Utilizador autorizado chama API | Operação permitida somente no âmbito autorizado |
| Menu e acções da interface | Só mostram opções permitidas; servidor continua a validar |
| Administrador atribui/remove permissão | Alteração persiste e passa a ser respeitada |
| Utilizador tenta gerir permissões | `403`; nenhuma alteração é feita |
| Utilizador desactivado ou removido | Login bloqueado e sessões existentes invalidadas conforme política |
| Tenant A consulta recurso do tenant B | Acesso negado sem revelar existência/dados indevidos |
| Permissão inexistente ou rota sem regra | Acesso negado para recursos protegidos |
| Logout | Sessão invalidada no cliente e, quando aplicável, no servidor |

### 9.2 Testes automatizados recomendados

- Testes unitários de `hasPermission`, perfil administrativo e casos sem permissões.
- Testes de integração de cada endpoint autorizado e recusado.
- Testes de regressão para login e logout existentes.
- Testes de isolamento multi-tenant com identificadores de outra organização.
- Testes que confirmem que a falha de BD/serviço não se transforma em autorização permissiva.
- Teste de cobertura da matriz: todas as rotas e operações protegidas têm regra e teste.

### 9.3 Registo manual

Criar um manual com colunas: ID do teste, pré-condições, passos, resultado esperado, resultado observado, data, executor e observações. Separar casos de autenticação, autorização, gestão administrativa e isolamento de dados.

## 10. Critérios de aceitação

- [ ] O modelo de perfis e permissões está documentado e aprovado.
- [ ] Todas as rotas e operações protegidas constam na matriz de acesso.
- [ ] A autorização é aplicada no servidor; a interface não é a única barreira.
- [ ] Acesso a dados é limitado ao tenant/organização da sessão.
- [ ] Utilizadores sem permissão recebem `403` ou página de acesso negado sem executar a operação.
- [ ] Alterações administrativas persistem e ficam efectivas no prazo definido pela política de cache/sessão.
- [ ] Utilizadores desactivados não mantêm acesso por sessões antigas além do prazo permitido.
- [ ] O login, logout e fluxos existentes continuam funcionais.
- [ ] Testes automatizados e manuais de sucesso e falha passam.
- [ ] Migração, rollout, observabilidade e rollback estão documentados.
- [ ] Não existem senhas ou tokens reais em documentação, fixtures ou código de teste.

## 11. Riscos e controlos

| Risco | Controlo |
|---|---|
| Proteger menus, mas esquecer a API | Inventário de endpoints e testes directos sem interface |
| Rota sem regra ficar acessível | Negação por omissão e teste de cobertura da matriz |
| Permissão concedida pelo cliente | Recalcular/verificar autorização no servidor |
| Acesso cruzado entre tenants | Filtro de tenant derivado da sessão, constraints/RLS e testes cruzados |
| Permissões antigas em cache | TTL curto, invalidação ou nova leitura para operações sensíveis |
| Migração bloquear utilizadores existentes | Faseamento, contas administrativas verificadas, staging e rollback |
| Erro de BD ser tratado como acesso permitido | Falhar em fechado, registar erro e não executar a operação |
| Conta administrativa comprometida | MFA conforme suporte da aplicação, auditoria e processo de recuperação |

## 12. Artefactos a entregar

1. Documento de decisões e matriz de acesso.
2. Migração de BD e instruções de aplicação/rollback.
3. Catálogo e serviço central de autorização.
4. Guardas nas rotas, APIs e operações de domínio.
5. Interface de gestão de utilizadores/permissões e estado de acesso negado.
6. Testes unitários, de integração e manual de execução.
7. Instruções de rollout, monitorização e recuperação.

## 13. Ordem resumida e dependências

```text
Levantamento
    → Matriz de acesso e decisões
    → Migração/modelo de dados
    → Serviço central de autorização
    → Protecção de APIs e operações
    → Interface e gestão administrativa
    → Testes de segurança funcional
    → Staging, rollout e monitorização
```

A protecção de servidor e de dados não deve ser adiada até ao fim da implementação da interface. A gestão visual pode avançar em paralelo com os testes depois de o catálogo e o serviço central estarem estabilizados.


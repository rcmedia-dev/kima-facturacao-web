# Manual de Teste - Integração SSO, Supabase e Kima Hub

Este manual valida a integração do sub-app Kima Faturas com o Kima Hub através do SDK `@rcmedia-dev/kima-sdk`.

## 1. Objetivo

Confirmar que:

- o utilizador não autenticado é encaminhado para o Hub;
- o callback SSO cria uma sessão Supabase real;
- a empresa ativa é guardada no cookie `kima-company-id`;
- o acesso é protegido pela licença do módulo `faturas`;
- os eventos Realtime de logout, troca de empresa e alteração de licença funcionam;
- o fluxo não entra em loop de redirecionamento.

## 2. Pré-requisitos

- Node.js e pnpm instalados;
- dependências instaladas com `pnpm install`;
- pacote `@rcmedia-dev/kima-sdk` instalado;
- conta ativa no Kima Hub;
- a empresa do utilizador com o módulo `faturas` ativo;
- variáveis configuradas no `.env.local` ou no ambiente de deployment.

As variáveis necessárias são:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<chave-publica>
NEXT_PUBLIC_KIMA_HUB_URL=https://kima-hub.vercel.app
NEXT_PUBLIC_KIMA_MODULE_KEY=faturas
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Nunca colocar tokens pessoais do GitHub, chaves secretas ou passwords neste manual, no `.env.local` commitado ou em screenshots.

## 3. Preparação

1. Na raiz do projeto, executar:

```bash
pnpm install
pnpm build
```

2. Confirmar que o build termina com `Compiled successfully`.
3. Iniciar o ambiente local:

```bash
pnpm dev
```

4. Abrir `http://localhost:3000` numa janela anónima ou limpar cookies do domínio local.
5. Abrir as ferramentas do browser em **Application > Cookies** e **Network**.

## 4. Casos de teste

### Caso SSO-001 - Redirecionamento de utilizador não autenticado

**Ação**

1. Aceder a `http://localhost:3000/dashboard` sem sessão Supabase.

**Resultado esperado**

- o pedido é interceptado pelo `proxy.ts`;
- o browser é redirecionado para o login do Hub;
- a URL contém `app=faturas`;
- o `redirect_uri` aponta para `/auth/callback`;
- não ocorre redirecionamento repetitivo entre Hub e sub-app.

### Caso SSO-002 - Login no Hub e retorno ao callback

**Ação**

1. No Hub, iniciar sessão com um utilizador válido.
2. Selecionar uma empresa com o módulo `faturas` ativo.
3. Aguardar o retorno ao sub-app.

**Resultado esperado**

- o Hub redireciona para `/auth/callback?token=...`;
- o callback é permitido pelo proxy;
- o token é validado pelo Hub;
- o callback chama `supabase.auth.setSession()`;
- o browser é redirecionado para `/` ou para o destino original;
- não aparece erro `401` no callback.

### Caso SSO-003 - Confirmação da sessão Supabase

**Ação**

1. Depois do login, abrir novamente `/dashboard`.
2. No DevTools, verificar os cookies do domínio local.
3. Atualizar a página.

**Resultado esperado**

- a página permanece autenticada após o refresh;
- existem cookies de sessão Supabase;
- o cookie `kima-company-id` contém o ID da empresa ativa, quando o Hub o fornece;
- o proxy não redireciona novamente para o login.

### Caso SSO-004 - Acesso sem licença do módulo

**Pré-condição**

A empresa autenticada não possui uma linha ativa em `company_modules` com:

- `module_key = faturas`;
- `status = Ativo`.

**Ação**

1. Aceder a `/dashboard`.

**Resultado esperado**

- o utilizador é redirecionado para `/marketplace` no Hub;
- a URL contém `required_module=faturas`;
- nenhuma página protegida do sub-app é apresentada.

### Caso SSO-005 - Logout no Hub

**Ação**

1. Abrir o sub-app autenticado.
2. Terminar a sessão no Hub ou emitir o evento `LOGOUT`.

**Resultado esperado**

- o `KimaEventListener` recebe o evento;
- a sessão Supabase local é terminada;
- o browser volta para o login do Hub com `app=faturas`.

### Caso SSO-006 - Troca de empresa

**Ação**

1. Com o sub-app aberto, trocar a empresa ativa no Hub.

**Resultado esperado**

- o evento `COMPANY_SWITCHED` é recebido;
- os dados do sub-app são atualizados através de reload/refresh;
- o cookie `kima-company-id` passa a representar a nova empresa;
- a licença da nova empresa é verificada.

### Caso SSO-007 - Alteração ou cancelamento da licença

**Ação**

1. Alterar no Hub o estado da licença `faturas` para diferente de `Ativo`.
2. Emitir `MODULE_STATUS_CHANGED`.

**Resultado esperado**

- o evento é recebido pelo listener;
- quando o evento corresponde a `faturas`, o utilizador é encaminhado para o marketplace;
- o sub-app não continua disponível para uma empresa sem licença ativa.

### Caso SSO-008 - Token inválido ou expirado

**Ação**

1. Abrir manualmente `/auth/callback?token=token-invalido`.

**Resultado esperado**

- o callback não lança erro 500;
- nenhum cookie de sessão inválido é criado;
- o utilizador é redirecionado para um destino seguro;
- os logs do servidor indicam token inválido.

### Caso SSO-009 - Acesso direto ao callback sem token

**Ação**

1. Abrir `/auth/callback` sem query string.

**Resultado esperado**

- não ocorre erro 500;
- o pedido termina num redirect seguro para a página inicial;
- não é criada sessão Supabase.

### Caso SSO-010 - Recursos estáticos

**Ação**

1. Abrir a aplicação e observar pedidos para CSS, JavaScript, imagens e fontes.

**Resultado esperado**

- recursos estáticos carregam sem redirect para o Hub;
- não existem respostas 307/308 inesperadas para ficheiros em `/_next` ou `public`.

## 5. Diagnóstico de falhas

### Loop de redirecionamento

Verificar:

1. `NEXT_PUBLIC_SUPABASE_URL` é igual ao projeto usado pelo Hub.
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` é a chave pública do mesmo projeto.
3. `NEXT_PUBLIC_APP_URL` corresponde ao endereço atual.
4. O callback usa `handleSsoCallback`.
5. O pedido com `/auth/callback?token=...` passa pelo proxy.
6. Não existe `Domain=.kima.ao` configurado manualmente em deployments `vercel.app`.

### Sessão não permanece após o callback

Verificar no log do servidor:

```text
setSession error: none
User após setSession: <id-do-utilizador>
```

Se o utilizador for `NULL`, confirmar se o token foi emitido pelo mesmo projeto Supabase configurado no sub-app.

### SDK não inicia

Verificar:

- `transpilePackages: ['@rcmedia-dev/kima-sdk']` em `next.config.mjs`;
- todas as variáveis obrigatórias existem;
- o servidor foi reiniciado depois de alterar `.env.local`;
- `pnpm list @rcmedia-dev/kima-sdk --depth 0` mostra a versão instalada.

## 6. Critérios de aceitação

- [ ] O build de produção termina com sucesso.
- [ ] Um utilizador não autenticado é encaminhado para o Hub.
- [ ] O callback cria sessão Supabase com `setSession`.
- [ ] A sessão permanece depois de atualizar a página.
- [ ] O cookie da empresa ativa é definido corretamente.
- [ ] Empresas sem licença são encaminhadas para o marketplace.
- [ ] Logout e troca de empresa são sincronizados por Realtime.
- [ ] Tokens inválidos não provocam erro 500 nem loop.
- [ ] Recursos estáticos carregam normalmente.

## 7. Evidências recomendadas

Para cada caso, guardar apenas:

- resultado: Passou ou Falhou;
- data e ambiente: local, preview ou produção;
- URL sem tokens ou cookies completos;
- screenshot sem dados pessoais;
- mensagem de erro sanitizada;
- commit ou versão testada.

Não guardar tokens SSO, refresh tokens, tokens GitHub ou valores completos de cookies nas evidências.

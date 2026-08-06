# TAREFAS - KIMA FINANCEIRO MVP (SEM AUTENTICAÇÃO) - 2 SEMANAS

## ⚠️ LEMBRE-SE: SEM AUTENTICAÇÃO! Sem login, sem senha, sem middleware de proteção.

---

## SEMANA 1: Fundação

### Dia 1-2: Setup e Banco de Dados
- [ ] Criar projeto Next.js com App Router: `npx create-next-app@latest`
- [ ] Instalar dependências: `npm install prisma @prisma/client sqlite3`
- [ ] Instalar Tailwind CSS e Shadcn UI
- [ ] Inicializar Prisma: `npx prisma init`
- [ ] Configurar SQLite no `schema.prisma`
- [ ] Criar modelos: Company, Client, Product, Invoice, InvoiceLine, Payment
- [ ] Rodar migração: `npx prisma migrate dev --name init`
- [ ] Criar arquivo `seed.ts` com dados iniciais da empresa
- [ ] Instalar e configurar `@react-pdf/renderer` (para PDFs)
- [ ] Criar estrutura de pastas: `/app`, `/components`, `/lib`, `/types`

**Entregável:** Projeto rodando com banco de dados configurado.

---

### Dia 3-4: CRUD Clientes e Artigos
- [ ] Criar página `/clientes/page.tsx` (listagem)
- [ ] Criar componente `ClientTable` (tabela com colunas: Nome, NIF, Telefone, Ações)
- [ ] Criar componente `ClientForm` (modal para criar/editar)
- [ ] Criar API Routes:
  - `GET /api/clients` (listar todos)
  - `POST /api/clients` (criar)
  - `PUT /api/clients/[id]` (editar)
  - `DELETE /api/clients/[id]` (remover)
- [ ] Validar NIF (algoritmo módulo 11) no front e no back
- [ ] Criar página `/artigos/page.tsx` (listagem)
- [ ] Criar componente `ProductTable` (colunas: Código, Descrição, Preço, IVA, Ações)
- [ ] Criar componente `ProductForm` (modal para criar/editar)
- [ ] Criar API Routes:
  - `GET /api/products` (listar)
  - `POST /api/products` (criar)
  - `PUT /api/products/[id]` (editar)
  - `DELETE /api/products/[id]` (remover)
- [ ] Adicionar autocomplete (pesquisa por nome/NIF para clientes e código/descrição para artigos)

**Entregável:** CRUD Clientes e Artigos funcionando.

---

### Dia 5: Configuração da Empresa
- [ ] Criar página `/configuracoes/page.tsx`
- [ ] Campos: nome, NIF, morada, telefone, email, logotipo
- [ ] Upload de logotipo (salvar em `/public/uploads` ou base64)
- [ ] API Route: `GET /api/company` e `PUT /api/company`
- [ ] Seed inicial com dados da empresa
- [ ] Configurar página inicial (`/page.tsx`) para redirecionar para `/dashboard`

**Entregável:** Configuração da empresa funcional.

---

## SEMANA 2: Faturação e Finalização

### Dia 6-7: Emissão de Fatura (3 Passos)
- [ ] Criar página `/faturas/nova/page.tsx`
- [ ] Implementar Passo 1: Selecionar Cliente
  - Autocomplete de clientes
  - Botão "Novo Cliente" (modal rápido)
- [ ] Implementar Passo 2: Adicionar Linhas
  - Autocomplete de artigos
  - Campos: quantidade (default 1)
  - Botão "Adicionar Linha"
  - Tabela com linhas adicionadas (colunas: Descrição, Qtd, Preço, Total, Remover)
  - Exibir: subtotal, IVA (total), total geral
- [ ] Implementar Passo 3: Resumo e Emitir
  - Resumo: cliente, linhas, totais
  - Forma de pagamento (select: numerário, transferência, multicaixa, POS, cheque)
  - Data de vencimento (default: +30 dias)
  - Observações (texto opcional)
  - Botão "Emitir Fatura"
- [ ] Criar API Route `POST /api/invoices`:
  - Validar cliente e linhas
  - Calcular subtotal, IVA por linha, total
  - Gerar número sequencial (buscar último número + 1)
  - Gravar Invoice e InvoiceLines
  - Gerar PDF em background ou síncrono
  - Retornar ID da fatura
- [ ] Criar serviço de geração de PDF (usando `@react-pdf/renderer`)
- [ ] Após emitir, redirecionar para `/faturas/[id]`

**Entregável:** Fluxo completo de emissão de faturas.

---

### Dia 8: Listagem e Visualização de Faturas
- [ ] Criar página `/faturas/page.tsx` (listagem)
- [ ] Tabela com colunas: Nº, Cliente, Data, Total, Status, Ações
- [ ] Filtros: período (data inicial/final), status (todos/pending/paid/cancelled)
- [ ] Criar página `/faturas/[id]/page.tsx` (detalhe)
- [ ] Exibir: dados completos, linhas, totais
- [ ] Botão "Baixar PDF" (gerar e baixar o PDF)
- [ ] Botão "Voltar" para a listagem
- [ ] Criar API Routes:
  - `GET /api/invoices` (listar com filtros)
  - `GET /api/invoices/[id]` (detalhe)
  - `GET /api/invoices/[id]/pdf` (gerar PDF)
- [ ] Adicionar paginação na listagem (10 itens por página)

**Entregável:** Listagem e visualização de faturas.

---

### Dia 9: Pagamentos e Dashboard
- [ ] Criar modal "Registrar Pagamento" na página de detalhe da fatura
- [ ] Modal com: valor (auto), data (hoje), método (select)
- [ ] Criar API Route `POST /api/payments`:
  - Validar valor ≤ saldo devedor
  - Criar Payment
  - Atualizar status da fatura: pending → paid (se valor total)
  - Atualizar status: pending → partially_paid (se valor parcial)
- [ ] Criar página `/dashboard/page.tsx`:
  - Card: Total Faturado no Mês (soma de todas as faturas emitidas no mês atual)
  - Card: Faturas Pendentes (contagem)
  - Card: Total de Clientes (contagem)
  - Tabela: Últimas 5 faturas emitidas
- [ ] Criar API Route `GET /api/dashboard/stats`

**Entregável:** Dashboard e pagamentos funcionando.

---

### Dia 10: Ajustes Finais e Deploy
- [ ] Testar todos os fluxos (clientes → artigos → faturas → pagamentos)
- [ ] Validar NIF (módulo 11) em todos os casos
- [ ] Ajustar formatação de moeda (AOA) em todas as telas
- [ ] Adicionar toasts de sucesso/erro (Shadcn Toast)
- [ ] Adicionar loading states em todos os botões
- [ ] Testar responsividade (mobile, tablet, desktop)
- [ ] Criar `.env.local` com variáveis (se necessário)
- [ ] Configurar `next.config.js` para produção
- [ ] Deploy na Vercel
- [ ] Testar em produção (URL pública)

**Entregável:** Sistema completo e no ar.

---

## Total: 10 Dias Úteis = 2 Semanas

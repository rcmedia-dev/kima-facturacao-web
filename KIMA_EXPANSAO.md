# Kima Financeiro - Expansão Profissional

Versão 2.0 - Sistema Avançado de Faturação para Angola

## Arquitetura da Expansão

### 1. Esquema de Dados Expandido

#### Novas Entidades

**Fornecedores**
- CRUD completo de fornecedores
- Dados bancários
- Rastreamento de atividade

**Artigos com Controle de Stock**
- Categorias de produtos
- Unidades de medida (UN, KG, M, M², L, H, DIA, MES)
- Stock real e stock mínimo
- Histórico de movimentos

**Movimentos de Stock**
- Entrada, Saída, Ajuste
- Rastreamento por documento/referência
- Auditoria completa

**Clientes Expandidos**
- Tipo de cliente (Pessoa Física/Jurídica)
- Campos específicos por tipo
- Status de atividade

#### Enums de Conformidade
- `TipoDocumento`: Fatura, FaturaRecibo, Simplificada, NotaCredito, NotaDebito, Orcamento, GuiaRemessa
- `StatusDocumento`: Pago, Pendente, Cancelado, Processado, Rascunho
- `FormaPagamento`: Acrescida "Crédito" como nova opção
- `UnidadeMedida`: Padrões internacionais

### 2. Múltiplos Tipos de Documentos

A arquitetura foi redesenhada para suportar vários tipos de documentos:

```
Documento (tipo genérico)
├── Fatura (venda standard)
├── FaturaRecibo (fatura + recibo de pagamento)
├── Simplificada (para vendas ao balcão)
├── NotaCredito (devoluções/abatimentos)
├── NotaDebito (custos adicionais)
├── Orcamento (pré-venda)
└── GuiaRemessa (separação de bens)
```

Cada tipo mantém série de numeração separada para conformidade fiscal.

### 3. Módulo SAF-T (Ficheiro de Auditoria Informatizado)

**Funcionalidades:**

- `gerarResumoSAFT()` - Exporta dados por período fiscal
- `exportarSAFTXML()` - Gera XML conformável
- `validarDocumentoSAFT()` - Valida campos obrigatórios

**Campos Exportados:**
- Documentos por tipo e série
- IVA desagregado por taxa (0%, 7%, 14%)
- Clientes que tiveram transações
- Log completo de movimentos

### 4. Relatórios Avançados & Dashboard KPIs

**KPIs Gerenciais:**
```
- Total Faturado (período)
- Faturas Pendentes e Valor
- Taxa de Cobrança (%)
- Dias Médio de Recebimento
- Ticket Médio
- Clientes Ativos
```

**Relatórios Disponíveis:**

1. **Relatório de Vendas**
   - Top 10 Clientes
   - Top 10 Produtos
   - Vendas por período
   - Análise de tendências

2. **Relatório de IVA**
   - Por taxa (0%, 7%, 14%)
   - Base imponível
   - Imposto devido
   - Pronto para declaração fiscal

3. **Aging de Clientes**
   - Dívidas vencidas
   - Dias de atraso
   - Análise de risco de crédito
   - Priorização de cobrança

### 5. Sistema de Autenticação & Auditoria

**Roles e Permissões:**

| Role | Clientes | Artigos | Documentos | Relatórios |
|------|----------|---------|------------|-----------|
| admin | CRUDX | CRUDX | CRUDX | CRUDX |
| gerente | CRUD | R | CRUDP | CRUDX |
| operador | R | R | CR | R |
| visualizador | R | R | R | R |

Legenda: C=Criar, R=Ler, U=Atualizar, D=Deletar, P=Pagamento, X=Exportar

**Auditoria Completa:**

- Log de cada ação (CRIAR, ATUALIZAR, DELETAR, PAGAMENTO, etc)
- Quem, quando, o quê e alterações antes/depois
- Detecção de atividades suspeitas
- Retenção configurável (ex: 7 anos para conformidade)

**Funcionalidades de Segurança:**

```typescript
criarLogAuditoria()           // Cria entrada de log
validarPermissao()             // Verifica role do utilizador
limparLogsAntigos()            // Conformidade de retenção
gerarRelatorioAuditoria()      // Análise e compliance
detectarAtividadeSuspeita()    // Alerta de fraude
exportarLogsAuditoria()        // SAF-T de auditoria
```

### 6. Migração para Neon PostgreSQL + Drizzle ORM

**Stack Recomendado:**
```
Neon (PostgreSQL Serverless)
    ↓
postgres.js (driver)
    ↓
Drizzle ORM (query builder)
    ↓
Next.js API Routes (server actions)
```

**Benefícios:**
- Consultas tipo-safe (ORM)
- Escalabilidade automática
- Conformidade com backups
- Segurança integrada
- Migrations automáticas

**Estrutura de Schema:**

```
/db/schema.ts      - Definições de tabelas e relações
/db/client.ts      - Configuração do cliente
/db/queries.ts     - Operações CRUD com auditoria
/drizzle.config.ts - Configuração de migrations
/db/migrations/    - Histórico de schema
```

**Tabelas Principais:**

- `empresas` - Multi-tenancy
- `usuarios` - Autenticação com roles
- `clientes` - Pessoa Física/Jurídica
- `fornecedores` - Gestão de supply
- `artigos` - Produtos com stock
- `documentos` - Fatura/Recibo/etc
- `documento_linhas` - Itens de documentos
- `movimentos_stock` - Histórico de entrada/saída
- `logs_auditoria` - Trilha de segurança
- `series_numeracao` - Controle de séries

**Queries Disponíveis:**

```typescript
// Clientes
obterClientes(empresaId)
criarCliente(empresaId, dados, usuario)
atualizarCliente(id, dados, usuario)
deletarCliente(id, usuario)

// Artigos
obterArtigos(empresaId)
criarArtigo(empresaId, dados, usuario)

// Documentos
obterDocumentos(empresaId, tipo?)
obterDocumentosPorPeriodo(empresaId, inicio, fim)
criarDocumento(empresaId, dados, usuario)
registrarPagamento(documentoId, data, usuario)

// Stock
registrarMovimentoStock(empresaId, movimento, usuario)

// Auditoria
obterLogsAuditoria(empresaId, filtros)

// KPIs
obterKPIsEmpresa(empresaId)
```

## Próximos Passos de Implementação

### Fase 1: Configuração do Database
1. Provisionar Neon project
2. Executar migrations: `pnpm drizzle-kit push`
3. Validar schema

### Fase 2: API Routes
1. Criar `/api/clientes` com CRUD
2. Criar `/api/documentos` com fluxo completo
3. Criar `/api/relatorios` para KPIs e SAF-T
4. Implementar middleware de autenticação

### Fase 3: Componentes UI Atualizados
1. Seletor de tipo de documento
2. Formulários de artigos com stock
3. Dashboards de KPIs com gráficos
4. Painel de auditoria para admin

### Fase 4: Conformidade
1. Validações SAF-T
2. Exportação XML
3. Testes de conformidade
4. Documentação fiscal

## Variáveis de Ambiente

```bash
# Database
DATABASE_URL=postgresql://user:password@host/dbname

# Autenticação (opcional para integração futura)
AUTH_SECRET=your-secret-key
AUTH_URL=http://localhost:3000

# SAF-T (opcional)
SAFT_ENABLED=true
SAFT_RETENTION_DAYS=2555  # 7 anos
```

## Estrutura de Arquivos

```
lib/
  ├── types.ts              # Tipos TypeScript expandidos
  ├── store.ts              # Zustand store (compat localStorage)
  ├── saft-generator.ts     # Geração de SAF-T XML
  ├── reports-engine.ts     # KPIs e relatórios
  ├── audit-system.ts       # Auditoria e logs
  └── constants.ts          # Enums e configurações

db/
  ├── schema.ts             # Schema Drizzle
  ├── client.ts             # Cliente postgres
  ├── queries.ts            # Operações CRUD
  ├── migrations/           # Histórico de schema
  └── migrations.sql        # SQL bruto (backup)

api/                        # (A implementar)
  ├── clientes/
  ├── documentos/
  ├── artigos/
  ├── fornecedores/
  └── relatorios/

components/                 # UI a atualizar
  ├── documento-tipo-selector.tsx
  ├── relatorios-dashboard.tsx
  ├── audit-logs-viewer.tsx
  └── kpis-card.tsx
```

## Compatibilidade

A implementação mantém **compatibilidade 100%** com código existente:
- localStorage ainda funciona (migração gradual)
- Tipos `Cliente`, `Artigo`, `Fatura` mantêm aliases
- Queries podem usar Zustand OU Drizzle
- Transição sem downtime

## Conformidade Regulatória

✓ SAF-T (Ficheiro de Auditoria Informatizado)
✓ IVA por taxa (0%, 7%, 14%)
✓ Auditoria completa (RGPD compliance)
✓ Retenção de 7 anos
✓ Múltiplos tipos de documento
✓ Series de numeração conformes
✓ Rastreabilidade completa

## Roadmap Futuro

1. **Integração com SAP/Tópico** - Sincronização fiscal
2. **Assinatura Digital** - Documentos com validade fiscal
3. **Pagamentos Online** - Stripe/Multicaixa API
4. **Faturação por Email** - Automatização
5. **BI & Analytics** - Dashboard avançado
6. **Sincronização com Banco** - Reconciliação automática

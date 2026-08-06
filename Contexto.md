# CONTEXTO DO PROJETO - KIMA FINANCEIRO MVP

## Resumo
Sistema de faturação profissional para empresas de todos os portes em Angola. Desde pequenos negócios até grandes corporações. Foco em emitir faturas, gerir clientes, artigos, controlar recebimentos e obrigações fiscais.

## Moeda
**Kwanza (AOA)** - todos os valores em AOA.

## ⚠️ IMPORTANTE: SEM AUTENTICAÇÃO (Fase 1)
- Não há login, senha ou perfis de acesso.
- O sistema é aberto e acessível a qualquer pessoa com a URL.
- Apenas 1 empresa/configuração por instalação.
- Proteger a URL com senha via .htaccess ou middleware simples se necessário (opcional).

## Stack Técnica
- **Framework:** Next.js 14+ (App Router)
- **ORM:** Prisma
- **Banco de Dados:** SQLite (desenvolvimento) / PostgreSQL (produção - Supabase)
- **Estilização:** Tailwind CSS + Shadcn UI
- **PDF:** @react-pdf/renderer
- **Formulários:** React Hook Form + Zod
- **Estado:** TanStack Query + Zustand
- **Deploy:** Vercel

## Modelos de Dados (Prisma)
| Modelo | Descrição |
| :--- | :--- |
| `Company` | Dados da empresa (nome, NIF, morada, logotipo) |
| `Client` | Clientes (nome, NIF validado, contacto) |
| `Supplier` | Fornecedores (nome, NIF, contacto) |
| `Product` | Artigos/Serviços (código, descrição, preço, IVA) |
| `Category` | Categorias de produtos |
| `TaxTable` | Tabelas de IVA configuráveis |
| `Invoice` | Faturas (número sequencial, status, totais) |
| `InvoiceLine` | Linhas da fatura (produto, quantidade, preço, IVA) |
| `Payment` | Pagamentos (valor, data, método) |
| `AuditLog` | Logs de auditoria (quem fez o quê) |

## Regras de Negócio (Core)
1. **NIF Angolano:** Validação obrigatória com algoritmo módulo 11 (clientes e fornecedores).
2. **Cálculo de Fatura:** Subtotal → IVA por linha → Total líquido.
3. **Numeração Sequencial:** Automática por tipo de documento e série.
4. **Status da Fatura:** pending → paid / partially_paid / cancelled.
5. **Multi-Empresa (Futuro):** Preparado para multi-tenant via `company_id`.
6. **Auditoria:** Log imutável de todas as ações críticas.

## API Routes Planejadas
| Rota | Métodos | Descrição |
| :--- | :--- | :--- |
| `/api/clientes` | GET, POST | Listar, criar cliente |
| `/api/clientes/[id]` | GET, PUT, DELETE | Detalhe, editar, remover |
| `/api/fornecedores` | GET, POST | Listar, criar fornecedor |
| `/api/fornecedores/[id]` | GET, PUT, DELETE | Detalhe, editar, remover |
| `/api/artigos` | GET, POST | Listar, criar artigo |
| `/api/artigos/[id]` | GET, PUT, DELETE | Detalhe, editar, remover |
| `/api/categorias` | GET, POST | Listar, criar categoria |
| `/api/faturas` | GET, POST | Listar, criar fatura |
| `/api/faturas/[id]` | GET, PUT | Detalhe, cancelar |
| `/api/faturas/[id]/pdf` | GET | Gerar PDF |
| `/api/pagamentos` | POST | Registrar pagamento |
| `/api/dashboard` | GET | Estatísticas |
| `/api/configuracoes` | GET, PUT | Dados da empresa |

## Escopo do MVP (Fase 1)
- ✅ Gestão de Clientes (CRUD)
- ✅ Gestão de Fornecedores (CRUD)
- ✅ Gestão de Artigos/Serviços (CRUD)
- ✅ Gestão de Categorias (CRUD)
- ✅ Emissão de Faturas (com cálculo de IVA)
- ✅ Listagem de Faturas (com filtros)
- ✅ Visualização de Fatura (com PDF)
- ✅ Registro de Pagamentos
- ✅ Dashboard (KPIs)
- ✅ Configuração da Empresa
- ✅ Logs de Auditoria (básico)

## Fora de Escopo (Fase 1)
- ❌ Autenticação (login, perfis)
- ❌ SAF-T (Fase 2)
- ❌ Notas de Crédito/Débito (Fase 2)
- ❌ Orçamentos e Guias de Remessa (Fase 2)
- ❌ Multi-tenant (Fase 3)
- ❌ Gestão de Stock Avançada (Fase 2)
- ❌ Envio Automático de Email (Fase 2)
- ❌ Relatórios Avançados (Fase 2)
- ❌ Integração com AGT (Fase 3)

## Arquivos SDD Relevantes para o Backend
| Arquivo | Conteúdo |
| :--- | :--- |
| `00_visao_geral.md` | Propósito, princípios, escopo |
| `01_modelo_dominio.md` | Estrutura das tabelas e relacionamentos |
| `05_requisitos.md` | Requisitos funcionais e não-funcionais |
| `06_tarefas.md` | Lista de tarefas (2 semanas) |

---
**Próximo Passo:** Execute a TAREFA: Dia 1-2 (Setup e Banco de Dados)

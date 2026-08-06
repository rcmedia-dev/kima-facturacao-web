Metas Semanais & Planejamento Estratégico
Roadmap de Entrega MVP — Kima Financeiro
Técnico Responsável: Estélvio Baltazar Foco: MVP v1.0 (Faturação & Gestão Financeira) Metodologia: SDD & DDD
OBJETIVO GERAL
Desenvolver o MVP do Kima Financeiro (Faturação) integrado à Kima Platform, estabelecendo a arquitetura base, a
interface de utilizador, o ciclo completo de emissão de documentos comerciais, gestão de clientes/fornecedores/
artigos, exportação do arquivo SAF-T e integração backend segura em conformidade com a legislação fiscal angolana
(AGT).
SEMANA 1: Fundação & Módulos Base
Período: 03/08/2026 a 07/08/2026
Status: Pendente
Objetivo Estratégico: Construir toda a estrutura do projeto (Monorepo), componentes visuais base e as interfaces
operacionais dos módulos de Entidades, Artigos/Serviços, Faturação e Dashboard inicial.
PRINCIPAIS ENTREGÁVEIS DA SEMANA
Bootstrap & Monorepo: Estrutura de pastas unificada (apps/web, apps/api, packages/ui, packages/domains/finance),
integração do Next.js, FastAPI, Tailwind CSS e Shadcn UI.
Platform Shell & Multi-Tenant: Navegação unificada da Kima Platform, seleção de contexto por company_id, suporte
Dark/Light mode e perfis de acesso (RBAC).
Dashboard Financeiro (UI): Mockup do painel executivo com KPIs de faturação, IVA a pagar, faturas vencidas, top
clientes e gráficos de evolução.
Gestão de Entidades (Clientes & Fornecedores): Telas de cadastro, edição e listagem (TanStack Table) com validação
de NIF angolano e filtros avançados por tipo/saldo.
Cadastro de Artigos & Serviços: Interfaces de gestão de produtos e serviços, tabelas de IVA configuráveis, categorias e
controle de stock mínimo.
Emissão de Faturas (Interface Base): Fluxo UI de criação de documentos (Faturas, Faturas-Recibo e Faturas
Simplificadas) em até 3 passos com adição de múltiplas linhas e pré-visualização.
•
•
•
•
•
•
SEMANA 2: Operação, Documentos & SAF-T
Período: 10/08/2026 a 14/08/2026
Status: Pendente
Objetivo Estratégico: Concluir as telas e funcionalidades de documentos retificativos/comerciais, gestão de
pagamentos, relatórios fiscais e o motor do arquivo SAF-T.
PRINCIPAIS ENTREGÁVEIS DA SEMANA
Documentos Comerciais & Retificativos: Interfaces para emissão e gestão de Notas de Crédito, Notas de Débito,
Orçamentos e Guias de Remessa.
Gestão de Pagamentos & Cobranças: Registro de pagamentos (numerário, transferência, multicaixa, POS), estados do
documento (pendente, pago, anulado) e conversão direta de orçamentos em faturas.
Motor SAF-T (Legislação AGT): Módulo de validação de campos obrigatórios e exportação do ficheiro SAF-T em formato
XML relativo ao período fiscal.
Relatórios Fiscais & Financeiros: Interfaces e exportação (PDF/Excel) para vendas por período/cliente/artigo,
apuramento de IVA e mapa de dívidas (aging de clientes).
Configurações da Empresa: Telas para dados do emitente (NIF, morada, logotipo), séries de documentos e
gerenciamento do certificado digital para comunicação fiscal.
SEMANA 3: Arquitetura, Banco de Dados, Auth & API
Período: 17/08/2026 a 21/08/2026
Status: Pendente
Objetivo Estratégico: Conectar a camada de interface construída aos serviços do domínio financeiro no backend
(FastAPI), banco de dados PostgreSQL com RLS e autenticação via Supabase Auth.
PRINCIPAIS ENTREGÁVEIS DA SEMANA
PostgreSQL & Schemas de Domínio: Criação das tabelas e migrações Alembic (clients, suppliers, products, invoices,
invoice_lines, payments, saft_exports, audit_logs).
Autenticação & Permissões (RBAC): Supabase Auth no FastAPI com validação JWT e papéis específicos
(financeiro.admin, financeiro.contabilista, financeiro.operador, financeiro.consulta).
Isolamento Multi-Tenant (RLS): Aplicação estrita de Row Level Security (RLS) por company_id diretamente no
Supabase/PostgreSQL.
Conexão Fullstack via TanStack Query: Integração das telas com a API REST FastAPI, incluindo cache de servidor,
estados de loading, revalidação e tratamentos de erro.
Cálculos e Regras de Negócio do Backend: Validação e cálculo automático de totais brutos, descontos, retenções e
bases de IVA no servidor via Pydantic/SQLAlchemy.
•
•
•
•
•
•
•
•
•
•
SEMANA 4: Auditoria, Hardening, Deploy VPS & Lançamento MVP
Período: 24/08/2026 a 28/08/2026
Status: Pendente
Objetivo Estratégico: Finalizar o sistema de auditoria imutável, alimentar os dashboards com aggregations reais,
executar validações de segurança/desempenho e colocar o MVP v1.0 em produção.
PRINCIPAIS ENTREGÁVEIS DA SEMANA
Motor de Auditoria Imutável: Interceptor backend para registro imutável de criação, alteração, visualização e anulação
(com motivo) de documentos.
Dashboard Real & Aggregations: Substituição dos mockups por dados consolidados em tempo real no banco de dados
e envio de notificações fiscais/vencimentos.
Geração & Emissão de PDF: Impressão/Geração de PDFs formatados para impressoras térmicas (80mm) e formato A4,
além de envio automático por e-mail.
Hardening & Segurança: Testes de penetração em isolamento RLS, prevenção CSRF/XSS, limites de tentativas de login
e otimização de TTFB (< 400ms).
Deploy VPS & Lançamento (MVP v1.0): Containerização via Docker, automação de deploy no Coolify em VPS e
configuração de DNS/CDN com HTTPS no Cloudflare.
Resultado Esperado (MVP v1.0 Operational)
Kima Platform © 2026 — Planejamento de Metas Semanais (Domínio Financeiro & Faturação)
•
•
•
•
Sistema de Faturação Unificado: Interface moderna, responsiva (desktop/tablet) e totalmente integrada à Kima
Platform com suporte a modo claro e escuro.
✓
Fluxo Comercial Completo: Emissão acelerada em até 3 passos de Faturas, Faturas-Recibo, Notas de Crédito,
Orçamentos e Guias de Remessa.
✓
Conformidade Fiscal AGT: Exportação de ficheiros SAF-T XML validados e suporte à configuração de certificados
digitais e tabelas de IVA.
✓
Controle Multi-Tenant & RLS: Dados segregados rigorosamente por empresa via Supabase e suporte a perfis de
acesso detalhados (RBAC).
✓
Auditoria & Métrica Executiva: Rastreamento imutável de todas as ações e Dashboard executivo atualizado em tempo
real.
✓
Infraestrutura em Produção ✓ : Ambiente hospedado em VPS self-hosted via Docker, Coolify e protegido via Cloudflare.

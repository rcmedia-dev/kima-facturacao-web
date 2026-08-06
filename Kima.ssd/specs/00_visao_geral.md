# VISÃO GERAL - KIMA FINANCEIRO MVP

## Propósito
Sistema de faturação simples e rápido para pequenas empresas em Angola. Foco em emitir faturas, gerir clientes e artigos, e controlar recebimentos.

## Moeda
**Kwanza (AOA)** - todos os valores em AOA.

## Público-Alvo
Pequenas e médias empresas que precisam de um sistema de faturação básico, sem complexidade fiscal avançada.

## ⚠️ IMPORTANTE: SEM AUTENTICAÇÃO
- **Não há login, senha ou perfis de acesso.**
- O sistema é aberto e acessível a qualquer pessoa com a URL.
- Apenas 1 empresa/configuração por instalação.
- Proteger a URL com senha via .htaccess ou middleware simples se necessário (opcional).

## Princípios
1. **Simplicidade:** Máximo 3 telas principais (Clientes, Artigos, Faturas).
2. **Velocidade:** Emitir uma fatura em menos de 30 segundos.
3. **Baixo Custo:** SQLite (arquivo local) ou Supabase free tier. Deploy na Vercel (gratuito).
4. **Valor Imediato:** O cliente consegue faturar no primeiro dia.

## Escopo (MVP)
- ✅ Gestão de Clientes (CRUD)
- ✅ Gestão de Artigos (CRUD)
- ✅ Emissão de Faturas (com cálculo de IVA)
- ✅ Listagem de Faturas (com filtros básicos)
- ✅ Visualização de Fatura (com PDF)
- ✅ Registro de Pagamentos (simples)
- ✅ Dashboard básico (totais)
- ✅ Configuração da empresa

## Fora de Escopo (MVP)
- ❌ Autenticação (login, senha, perfis)
- ❌ SAF-T
- ❌ Notas de Crédito/Débito
- ❌ Orçamentos e Guias de Remessa
- ❌ Relatórios avançados
- ❌ Multi-tenant (uma empresa por instalação)
- ❌ Gestão de stock (apenas preço)
- ❌ Envio automático de email

# 🏛️ Análise AGT — Certificação do Kima Facturação Web
> **Referência Legal:** Decreto Presidencial n.º 71/25 · Decreto Executivo n.º 683/25 · Decreto Presidencial n.º 312/18  
> **Data da Análise:** 13 de Agosto de 2026  
> **Sistema:** Kima Facturação Web · RC Media

---

## ⚠️ Resumo Executivo

O Kima Facturação Web está **parcialmente preparado** para a certificação AGT.  
O sistema possui uma **base sólida** (NIF validado, numeração sequencial, IVA correcto, auditoria) mas **faltam requisitos obrigatórios críticos** que bloqueiam a certificação hoje.

**Prazo de obrigatoriedade:**
- 🔴 **1 Jan 2026** — Grandes Contribuintes e fornecedores do Estado (JÁ EM VIGOR)
- 🟡 **1 Jan 2027** — Todos os restantes contribuintes (PME, Regime Geral e Simplificado)

---

## 📋 Requisitos AGT vs. Estado Actual do Sistema

### 1. REQUISITOS OBRIGATÓRIOS (Certificação)

| # | Requisito AGT | Estado Actual | Prioridade |
|---|---|---|---|
| **R1** | **NIF Angolano validado** (Algoritmo Módulo 11 / BI) | ✅ **Implementado** (`validarNIFAngolano`) | — |
| **R2** | **Numeração sequencial** por tipo e série | ✅ **Implementado** (`series_numeracao`) | — |
| **R3** | **Cálculo correcto de IVA** (0%, 7%, 14%) | ✅ **Implementado** | — |
| **R4** | **Tipos de documento**: Fatura, FaturaRecibo, Simplificada, NC, ND | ✅ **Implementado** | — |
| **R5** | **PDF com layout profissional** e dados completos | ✅ **Implementado** (jsPDF) | — |
| **R6** | **Log de Auditoria** de ações críticas | ✅ **Tabela existe** (`logs_auditoria`) | — |
| **R7** | **Identificação da empresa** (Nome, NIF, Morada) nas faturas | ✅ **Implementado** | — |
| **R8** | **Código QR obrigatório** nas faturas (rastreabilidade AGT) | ❌ **NÃO implementado** | 🔴 CRÍTICO |
| **R9** | **Assinatura Digital (JWS)** nos documentos emitidos | ❌ **NÃO implementado** | 🔴 CRÍTICO |
| **R10** | **Comunicação em tempo real com AGT** via API REST | ❌ **NÃO implementado** | 🔴 CRÍTICO |
| **R11** | **Ficheiro SAF-T (AO)** — exportação mensal para AGT | ❌ **NÃO implementado** | 🔴 CRÍTICO |
| **R12** | **Hash de integridade** nos documentos (imutabilidade) | ❌ **NÃO implementado** | 🔴 CRÍTICO |
| **R13** | **Imutabilidade dos documentos** — fatura emitida não pode ser editada | ⚠️ **Parcial** (cancelamento existe, mas sem hash criptográfico) | 🟠 ALTO |
| **R14** | **Registo do utilizador** que emitiu cada documento | ⚠️ **Parcial** (company_id existe, mas sem user_id) | 🟠 ALTO |
| **R15** | **Identificação do contribuinte** via número de certificação AGT | ❌ **NÃO implementado** | 🔴 CRÍTICO |

---

### 2. REQUISITOS FUNCIONAIS (Conformidade Fiscal)

| # | Requisito | Estado Actual | Notas |
|---|---|---|---|
| **F1** | Notas de Crédito / Débito com referência ao documento original | ⚠️ **Tipo existe** no schema, mas wizard não implementado | 🟠 Implementar |
| **F2** | Orçamentos / Propostas (não contabilizados no IVA) | ⚠️ **Tipo existe** no schema, sem interface | 🟡 Médio |
| **F3** | Guia de Remessa | ⚠️ **Tipo existe** no schema, sem interface | 🟡 Médio |
| **F4** | Formas de pagamento completas (Multicaixa, POS, TPA) | ✅ **Implementado** | — |
| **F5** | Controlo de Stock (entrada/saída por fatura) | ⚠️ **Tabela existe**, lógica não automatizada | 🟡 Médio |
| **F6** | Relatórios fiscais (Balancete de IVA, Declaração Periódica) | ❌ **NÃO implementado** | 🟠 Alto |
| **F7** | Exportação de dados contabilísticos | ❌ **NÃO implementado** | 🟠 Alto |

---

## 📊 Score de Conformidade Actual

```
Requisitos Obrigatórios (R1–R15):
  ✅ Implementado:    7 / 15  (47%)
  ⚠️ Parcial:        2 / 15  (13%)
  ❌ Em falta:        6 / 15  (40%)

Requisitos Funcionais (F1–F7):
  ✅ Implementado:    2 / 7   (29%)
  ⚠️ Parcial:        4 / 7   (57%)
  ❌ Em falta:        1 / 7   (14%)

SCORE GLOBAL CERTIFICAÇÃO AGT: ~47%
```

> [!CAUTION]
> **O sistema NÃO está pronto para a certificação AGT hoje.**  
> Os 6 requisitos obrigatórios em falta (R8–R12, R15) são **bloqueantes** — sem eles, a AGT não certifica o software.

---

## 🗺️ Roadmap de Certificação

### FASE 1 — Requisitos Bloqueantes *(3–4 semanas)*
> Sem esta fase, a certificação é impossível.

| Task | Descrição | Complexidade |
|---|---|---|
| **1.1** | **Código QR nas faturas** — geração de QR com URL de validação AGT no PDF | Médio |
| **1.2** | **Hash de integridade dos documentos** — SHA-256 ou equivalente ao emitir cada fatura | Médio |
| **1.3** | **Assinatura Digital JWS** — assinar documentos com chave privada certificada | Alto |
| **1.4** | **Número de Certificação AGT** — campo de registo no cabeçalho das faturas | Baixo |
| **1.5** | **User tracking** — registar `user_id` em cada documento e no log de auditoria | Baixo |

### FASE 2 — Integração com AGT *(4–6 semanas)*
> Comunicação directa com os servidores da AGT.

| Task | Descrição | Complexidade |
|---|---|---|
| **2.1** | **API de Comunicação AGT** — integração com o portal de submissão em tempo real | Alto |
| **2.2** | **Fila de envio assíncrono** — retry em caso de falha de comunicação | Alto |
| **2.3** | **Polling/Callback de confirmação** — aguardar confirmação da AGT | Alto |
| **2.4** | **Status de comunicação** na listagem de faturas (Enviado/Pendente/Rejeitado) | Médio |

### FASE 3 — SAF-T e Relatórios *(2–3 semanas)*
> Conformidade com obrigações de reporte periódico.

| Task | Descrição | Complexidade |
|---|---|---|
| **3.1** | **Ficheiro SAF-T (AO)** — geração do XML mensal conforme especificações AGT | Alto |
| **3.2** | **Relatório de IVA** — Balancete de IVA por período | Médio |
| **3.3** | **Declaração Periódica de IVA** (Modelo DP-IVA) | Alto |
| **3.4** | **Exportação para contabilidade** (CSV/XLSX estruturado) | Médio |

### FASE 4 — Notas de Crédito/Débito e Documentos Complementares *(1–2 semanas)*

| Task | Descrição | Complexidade |
|---|---|---|
| **4.1** | **Wizard de Nota de Crédito** com referência ao documento original | Médio |
| **4.2** | **Wizard de Nota de Débito** | Médio |
| **4.3** | **Orçamentos / Propostas** (tipo não contabilizável) | Baixo |

---

## 🔧 O que já está bem feito (Base Sólida)

O sistema tem uma **arquitectura excelente** para construir em cima:

- ✅ **Multi-tenant** via `company_id` — cada empresa isolada
- ✅ **Schema robusto** no Supabase com todas as tabelas necessárias
- ✅ **Numeração sequencial** por série e tipo — conforme AGT
- ✅ **Validação de NIF** com algoritmo Módulo 11 — conforme AGT
- ✅ **IVA multi-taxa** (0%, 7%, 14%) com cálculo por linha — conforme AGT
- ✅ **PDF profissional** com todos os campos obrigatórios
- ✅ **Tabela de auditoria** (`logs_auditoria`) — base para compliance
- ✅ **Autenticação** via Supabase Auth — rastreabilidade por utilizador
- ✅ **Imutabilidade parcial** — documentos cancelados em vez de eliminados

---

## 📌 Próximos Passos Concretos (Ordem de Prioridade)

1. **Registar o Kima no Portal da AGT** como produtor de software
   - URL: [https://agt.minfin.gov.ao](https://agt.minfin.gov.ao)
   - Obter as especificações técnicas da API de integração
   - Obter o número de certificação (necessário para as faturas)

2. **Implementar QR Code** — funcionalidade mais rápida e visível (1 semana)

3. **Implementar Hash de Integridade** — campo `hash_documento` em cada fatura

4. **Solicitar especificações técnicas da API AGT** — o processo de certificação exige testes em ambiente sandbox

5. **Contratar um consultor fiscal angolano** — para orientação legal do processo de certificação

---

> [!NOTE]
> O prazo de **1 de Janeiro de 2027** para os restantes contribuintes dá aproximadamente **5 meses** para implementar todas as fases acima. É um prazo apertado mas **alcançável** com execução faseada.

---

*Análise técnica baseada em: Decreto Presidencial n.º 71/25 · Portal AGT · Cegid Angola · Vendus.ao · PwC Angola*  
*Kima Facturação Web · RC Media · Agosto 2026*

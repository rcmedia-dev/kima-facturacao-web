# 🎫 Guia de Credenciação AGT — Kima Facturação Web

> **Fase 5 (T5.3)** · Submissão Formal para Credenciação junto da Administração Geral Tributária (AGT — Angola)
> **Referência Legal:** Decreto Presidencial n.º 71/25 · Decreto Executivo n.º 683/25 · Decreto Presidencial n.º 312/18

---

## 1. Objetivo

Este guia documenta o **processo formal de credenciação/certificação** do software
de facturação junto da AGT, bem como os artefactos de submissão gerados pelo
projecto (`output/credenciacao/`).

> [!NOTE]
> A submissão final é um **acto legal/administrativo** realizado no Portal do
> Contribuinte da AGT. O sistema gera toda a documentação técnica de suporte,
> mas o pedido formal depende da equipa responsável e da homologação da AGT.

---

## 2. Estado da Conformidade (score actual)

| Categoria | Conforme | Total |
|---|---|---|
| Requisitos Obrigatórios (R1–R15) | 14 | 15 |
| Requisitos Funcionais (F1–F7) | 6 | 7 |
| **Score global** | **~92%** | — |

**Bloqueante identificado:** R10 (comunicação em tempo real com a AGT via API REST)
— corresponde à **FASE 2** do cronograma, ainda não implementada.

---

## 3. Artefactos de Submissão (gerados por `npm run agt:credenciacao`)

| Ficheiro | Conteúdo | Requisito |
|---|---|---|
| `SAFT-AMOSTRA.xml` | Ficheiro SAF-T (AO) de exemplo (Header, MasterFiles, TaxTable, SalesInvoices) | R11 |
| `CHAVE_PUBLICA.pem` | Chave pública RSA-2048 (SPKI/PEM) para verificação das assinaturas JWS | R9 |
| `MANIFESTO.json` | Dados da empresa, versão do software e referências legais | — |
| `CHECKLIST_CREDENCIACAO.txt` | Passo-a-passo do processo no Portal da AGT | — |

---

## 4. Passos no Portal da AGT

1. **Registo no Portal do Contribuinte** (`www.agt.minfin.gov.ao`) com o NIF da empresa.
2. **Documentação legal:** Certidão de Registo Comercial, alvará/declaração de
   início de atividade e identificação do responsável técnico do software.
3. **Dados do software:** nome comercial, versão, arquitectura técnica (Next.js +
   PostgreSQL/Supabase) e número de certificação AGT.
4. **Amostras:** submeter `SAFT-AMOSTRA.xml`, `CHAVE_PUBLICA.pem` e relatórios
   de IVA (DP-IVA) do período de demonstração.
5. **Ambiente Sandbox:** a AGT disponibiliza ambiente de testes (necessário para
   a **FASE 2** — comunicação REST); submeter e validar ficheiros de teste.
6. **Acompanhamento:** aguardar avaliação da Direcção de Serviços de TIC da AGT
   e resolver eventuais não conformidades.

---

## 5. Pré-requisitos antes da submissão

- [x] **R1** NIF Angolano validado (Módulo 11 / BI).
- [x] **R2** Numeração sequencial por tipo e série.
- [x] **R3** Cálculo correcto do IVA (0%, 7%, 14%).
- [x] **R8** QR Code regulamentar nos documentos.
- [x] **R9** Assinatura digital JWS (RS256).
- [x] **R11** Ficheiro SAF-T (AO) com validador estrutural.
- [x] **R12/R13** Hash encadeado e imutabilidade (trigger SQL).
- [x] **R14/R15** User tracking e número de certificação AGT.
- [ ] **R10** Comunicação em tempo real com a AGT (FASE 2 — **pendente**).

---

*Kima Facturação Web · RC Media · Agosto 2026*

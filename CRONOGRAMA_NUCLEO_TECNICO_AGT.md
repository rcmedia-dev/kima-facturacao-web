# 📅 Cronograma de Implementação — Núcleo Técnico para Certificação AGT

> **Projeto:** Kima Facturação Web  
> **Objetivo:** Implementação integral do núcleo técnico para credenciação e certificação a 100% junto da Administração Geral Tributária (AGT - Angola).  
> **Referência Legal:** Decreto Presidencial n.º 71/25 · Decreto Executivo n.º 683/25 · Decreto Presidencial n.º 312/18  
> **Data de Início:** Agosto de 2026  
> **Duração Estimada:** 13 Semanas (~3 Meses)  

---

## 🎯 Meta & Indicadores de Sucesso

- **Score de Certificação:** Transição de **47%** para **100%** de conformidade técnica.
- **Requisitos Críticos Atendidos:** 15/15 Requisitos Obrigatórios (R1 a R15) e 7/7 Requisitos Funcionais (F1 a F7).
- **Homologação AGT:** Aprovação nos testes em ambiente *Sandbox* e geração válida do SAF-T (AO).

---

## 🗓️ Cronograma Detalhado por Fases e Semanas

```
+-----------------------------------------------------------------------------------+
| FASE 1: Segurança, Criptografia & Imutabilidade         [Semanas 1 - 3]  (Crítico) |
| FASE 2: Comunicação em Tempo Real & API AGT             [Semanas 4 - 7]  (Crítico) |
| FASE 3: Exportador SAF-T (AO) & Relatórios Fiscais      [Semanas 8 - 10] (Crítico) |
| FASE 4: Documentos Rectificativos & Complementares     [Semanas 11 - 12](Essencial)|
| FASE 5: Testes de Conformidade & Credenciação AGT       [Semana 13]      (Final)  |
+-----------------------------------------------------------------------------------+
```

---

### 🟢 FASE 1: Segurança, Criptografia & Imutabilidade (Semanas 1 a 3)
> **Objetivo:** Implementar o motor de imutabilidade criptográfica, geração de hash encadeado, assinatura JWS e QR Code regulamentar.

| Semana | Cód. | Tarefa Técnica | Detalhes de Implementação | Requisito AGT | Estado |
|---|---|---|---|---|---|
| **Semana 1** | T1.1 | **Algoritmo de Hash Encadeado (SHA-256)** | Gerar hash criptográfico de cada documento incluindo o hash do documento anterior (chaining/imutabilidade). | **R12, R13** | ✅ Concluída |
| **Semana 1** | T1.2 | **Assinatura Digital JWS (JSON Web Signature)** | Assinar o hash do documento com a chave privada RSA/ECDSA da empresa/software. | **R9** | ✅ Concluída |
| **Semana 2** | T1.3 | **Geração de QR Code Regulamentar AGT** | Construir o payload de validação (NIF, Data, Total, IVA, Hash) e gerar imagem do QR Code para inserção no PDF. | **R8** | ✅ Concluída |
| **Semana 2** | T1.4 | **Inclusão do N.º de Certificação AGT** | Adicionar campos de configuração de empresa para guardar e exibir o N.º do Certificado AGT no cabeçalho dos documentos. | **R15** | ✅ Concluída |
| **Semana 3** | T1.5 | **User Tracking & Auditoria Avançada** | Associar obrigatoriamente `user_id` em todas as emissões e acções na tabela `logs_auditoria`. | **R14, R6** | ✅ Concluída |
| **Semana 3** | T1.6 | **Atualização do Gerador de PDF (jsPDF)** | Incorporar QR Code, Assinatura resumida, Hash SHA-256 e N.º do Certificado AGT no layout impresso. | **R5, R8, R9** | ✅ Concluída |

> **Nota (revisão):** implementação verificada no código — `lib/crypto-engine.ts` (T1.1/T1.2/T1.3), `lib/qrcode.ts`, `lib/queries-agt-fase1.ts` (T1.4/T1.5), `lib/pdf-generator-agt.ts` (T1.6) e integração na emissão em `app/api/invoices/route.ts`, com trigger SQL `trg_imutabilidade_documento` (R13). Validação em Sandbox AGT fica bloqueada pela FASE 2 (R10).

---

### 🔵 FASE 2: Comunicação em Tempo Real & API AGT (Semanas 4 a 7)
> **Objetivo:** Estabelecer a comunicação bidirecional em tempo real com os Web Services da AGT para validação e comunicação de documentos.

| Semana | Cód. | Tarefa Técnica | Detalhes de Implementação | Requisito AGT | Estado |
|---|---|---|---|---|---|
| **Semana 4** | T2.1 | **Cliente de Integração API REST AGT** | Criar módulo REST/HTTPS para consumir os endpoints da AGT (Sandbox/Produção). | **R10** | ⬜ Pendente |
| **Semana 5** | T2.2 | **Sistema de Fila Assíncrona (Queue & Retry)** | Criar fila de submissão via Supabase Edge Functions / Workers com retry automático em caso de indisponibilidade de rede. | **R10** | ⬜ Pendente |
| **Semana 6** | T2.3 | **Gestão de Contingência (Modo Offline)** | Marcar documentos emitidos offline/sem comunicação para envio diferido dentro do prazo legal da AGT. | **R10** | ⬜ Pendente |
| **Semana 7** | T2.4 | **Painel & Badges de Status AGT na UI** | Exibir estado da submissão na listagem de faturas (Transmitido, Pendente, Rejeitado) com mensagens de erro detalhadas. | **R10** | ⬜ Pendente |

---

### 🟡 FASE 3: SAF-T (AO) & Relatórios Fiscais (Semanas 8 a 10)
> **Objetivo:** Desenvolver o gerador do ficheiro XML SAF-T (AO) mensal conforme estrutura legal angolana e criar os relatórios de IVA.

| Semana | Cód. | Tarefa Técnica | Detalhes de Implementação | Requisito AGT | Estado |
|---|---|---|---|---|---|
| **Semana 8** | T3.1 | **Mapeamento de Dados para o Schema SAF-T (AO)** | Mapear tabelas de Clientes, Artigos, Tabela de Impostos e Faturas para o formato XML do SAF-T (AO). | **R11** | ✅ Concluída |
| **Semana 8** | T3.2 | **Motor Gerador do Ficheiro XML SAF-T** | Desenvolver rotina de exportação XML otimizada para mensalidades com milhares de registos. | **R11** | ✅ Concluída |
| **Semana 9** | T3.3 | **Validador de Esquema XSD SAF-T** | Implementar validação sintática e estrutural prévia do XML gerado contra a especificação oficial da AGT. | **R11** | ✅ Concluída |
| **Semana 10**| T3.4 | **Módulo de Relatórios de IVA (Balancete & Modelo DP-IVA)** | Relatório detalhado de IVA cobrado (14%, 7%, Isento) por período e dados para a Declaração Periódica. | **F6, F7** | ✅ Concluída |

---

### 🟠 FASE 4: Documentos Rectificativos & Complementares (Semanas 11 a 12)
> **Objetivo:** Finalizar os fluxos de trabalho de emissão de Notas de Crédito, Notas de Débito, Guias de Remessa e Orçamentos.

| Semana | Cód. | Tarefa Técnica | Detalhes de Implementação | Requisito AGT | Estado |
|---|---|---|---|---|---|
| **Semana 11**| T4.1 | **Wizard de Notas de Crédito** | Interface e lógica backend para anulação/retificação total ou parcial de faturas, com vinculação ao doc. original. | **F1, R4** | ✅ Concluída |
| **Semana 11**| T4.2 | **Wizard de Notas de Débito** | Interface e lógica backend para encargos adicionais associados a faturas previamente emitidas. | **F1, R4** | ✅ Concluída |
| **Semana 12**| T4.3 | **Módulo de Guias de Remessa / Transporte** | Fluxo de emissão e impresso de Guias de Transporte de mercadorias. | **F3** | ✅ Concluída |
| **Semana 12**| T4.4 | **Módulo de Orçamentos / Propostas** | Fluxo de emissão de Propostas Comerciais sem impacto contabilístico ou fiscal. | **F2** | ✅ Concluída |

---

### 🔴 FASE 5: Testes de Conformidade & Credenciação (Semana 13)
> **Objetivo:** Executar a bateria final de validações, auditar o sistema e submeter o processo formal de certificação à AGT.

| Semana | Cód. | Tarefa Técnica | Detalhes de Implementação | Requisito AGT | Estado |
|---|---|---|---|---|---|
| **Semana 13**| T5.1 | **Suíte de Testes de Carga e Integridade** | Executar testes automatizados verificando a imutabilidade, sequência sem lacunas e consistência do SAF-T. | **R1-R15** | ✅ Concluída |
| **Semana 13**| T5.2 | **Simulação de Auditoria AGT** | Validar todos os cenários de teste exigidos pelo manual de validação de software da AGT. | **R1-R15** | ✅ Concluída |
| **Semana 13**| T5.3 | **Submissão Formal para Credenciação** | Submeter amostras de ficheiros SAF-T e credenciais do sistema no Portal da AGT. | **Processo Legal** | ✅ Concluída* |

> **\*Nota:** a submissão formal no Portal da AGT é um acto legal/administrativo (GUIA_CREDENCIACAO_AGT.md). O pacote de artefactos (SAF-T amostra, chave pública, manifesto, checklist) é gerado por `npm run agt:credenciacao`. **Bloqueante restante: R10 — FASE 2 (comunicação API AGT).**

> **Nota (revisão):** a simulação de auditoria (`lib/agt-auditoria.ts`) agora avalia R4 (cancelamento documentado), R5 (conteúdo legal dos emitidos) e R13 (recomposição da cadeia de hashes via suíte T5.1) com verificações reais; F2/F3 sem verificação permissiva.

---

## 📋 Estado Consolidado (Revisão)

```
+-----------------------------------------------------------------------------------+
| FASE 1: Segurança, Criptografia & Imutabilidade         [Semanas 1 - 3]  ✅ 100%   |
| FASE 2: Comunicação em Tempo Real & API AGT             [Semanas 4 - 7]  ❌ 0%     |
| FASE 3: Exportador SAF-T (AO) & Relatórios Fiscais      [Semanas 8 - 10] ✅ 100%   |
| FASE 4: Documentos Rectificativos & Complementares     [Semanas 11 - 12]✅ 100%    |
| FASE 5: Testes de Conformidade & Credenciação AGT       [Semana 13]      ✅ 100%   |
+-----------------------------------------------------------------------------------+
```

**Única fase ainda não implementada:** a **FASE 2 (0%)** — cliente REST AGT, fila/retry, contingência offline e badges de status (bloqueante R10 para a validação em Sandbox e credenciação final).

---

## 🛠️ Arquitetura Técnica dos Novos Componentes

```
                                  [ Kima Facturação Web ]
                                             │
      ┌──────────────────────────────────────┼──────────────────────────────────────┐
      ▼                                      ▼                                      ▼
[ Módulo Criptográfico ]           [ Engine de Envio AGT ]                 [ Gerador SAF-T (AO) ]
 - SHA-256 Chaining                - Edge Function Queue                   - Mapping de BD para XML
 - Assinatura JWS                   - Submissão REST                        - Validador XSD
 - QR Code Payload                  - Tratamento de Contingência            - Exportação Mensal
```

---

## 📋 Matriz de Acompanhamento (Definition of Done)

Para cada funcionalidade ser considerada **Concluída**:
1. [ ] Código escrito, tipado (TypeScript) e testado.
2. [ ] Schema da BD atualizado e migrações executadas no Supabase.
3. [ ] Regras RLS (Row Level Security) e auditoria válidas.
4. [ ] Testado com sucesso em ambiente de simulação/Sandbox AGT.
5. [ ] Documentação de testes atualizada nos manuais do projeto.

---
*Cronograma elaborado com base nos requisitos do Decreto Presidencial n.º 71/25 e especificações técnicas da AGT (Angola).*  
*Kima Facturação Web · RC Media · Agosto 2026*

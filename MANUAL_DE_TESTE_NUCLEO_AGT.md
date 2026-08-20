# 🧪 Manual de Teste — Núcleo Técnico para Certificação AGT

> **Projeto:** Kima Facturação Web
> **Âmbito:** Testes funcionais e de conformidade das fases **100% implementadas** do núcleo AGT:
> **Fase 1** (Segurança, Criptografia & Imutabilidade) · **Fase 3** (SAF-T & Relatórios Fiscais) ·
> **Fase 4** (Documentos Rectificativos & Complementares) · **Fase 5** (Testes de Conformidade & Credenciação).
> **Referência Legal:** Decreto Presidencial n.º 71/25 · Decreto Executivo n.º 683/25 · Decreto Presidencial n.º 312/18

---

## 1. Informação Geral

| Campo | Valor |
|---|---|
| **Aplicação** | Kima Facturação Web (Next.js · Supabase · Tailwind) |
| **Ambiente de teste** | Local (`npm run dev`) e/ou produção (`npm run build && npm run start`) |
| **Base de dados** | Supabase — schema `kima_facturas` |
| **Comandos de teste** | `npm run test:agt` · `npm run agt:credenciacao` |
| **Navegadores** | Chrome / Edge (últimas versões) |

### 1.1 Pré-condições
- [ ] `npm install` executado com sucesso.
- [ ] `.env.local` com `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] **Migração 001** executada no Supabase: `migrations/001_fase1_criptografia_agt.sql`.
- [ ] `npm run build` compila sem erros.
- [ ] Empresa configurada em **Configurações** (nome, NIF válido, morada) e com **N.º de Certificado AGT** (ex.: `999/AGT/2026`).
- [ ] Existem clientes e artigos para os testes.

### 1.2 Mapa de testes por fase

| Fase | Requisitos | Como testar | Critério de aceitação |
|---|---|---|---|
| **F1 · Criptografia & Imutabilidade** | R5, R6, R8, R9, R12–R15 | UI + BD + PDF + `test:agt` | Hash/JWS/QR nos docs emitidos; edição de emitido bloqueada |
| **F3 · SAF-T & Relatórios** | R11, F6, F7 | UI `/relatorios` + `lib` | Exportação XML/JSON/CSV válida e sem erros |
| **F4 · Documentos Rectificativos** | F1–F4, R4 | UI `/faturas/nova` + API | NC/ND/GR/Orçamento com regras fiscais verificadas |
| **F5 · Conformidade & Credenciação** | R1–R15, F1–F7 | CLI `test:agt` + `agt:credenciacao` | Integridade 100%; auditoria 14/15 obrigatórios |

---

## 2. FASE 1 — Segurança, Criptografia & Imutabilidade (T1.1–T1.6)

### 2.1 Configuração do N.º de Certificado AGT (T1.4 · R15)
**Como testar:**
1. Aceda a **Configurações** → secção **Dados da Empresa**.
2. Preencha o campo **N.º de Certificado AGT** com `999/AGT/2026` e guarde.

**Resultado esperado:**
- ✅ Mensagem de sucesso e dados persistidos.
- ✅ Em **Configurações → Séries** é possível criar séries por tipo de documento.

### 2.2 Emissão com motor criptográfico (T1.1/T1.2/T1.3 · R8/R9/R12)
**Como testar:**
1. **Nova Fatura** (`/faturas/nova`).
2. **Passo 1:** selecione um cliente; tipo **Factura**.
3. **Passo 2:** adicione 2 linhas (ex.: artigo a 14% e outro a 7% de IVA).
4. **Passo 3:** escolha forma de pagamento e clique **Emitir**.

**Resultado esperado:**
- ✅ Documento criado com número completo (ex.: `A/000001`).
- ✅ Redirecionamento para `/faturas/[id]` com **Hash fiscal** exibido.

**Validação profunda (BD — SQL Editor):**
```sql
SELECT numero_completo, tipo, serie, status,
       hash, hash_anterior, assinatura_jws, qr_payload, assinado_por, cert_agt_numero
FROM kima_facturas.documentos
ORDER BY created_at DESC LIMIT 5;
```
- ✅ `hash` = 64 caracteres hex (SHA-256).
- ✅ `assinatura_jws` preenchida (`header.payload.sig`).
- ✅ `qr_payload` preenchido (começa por `AGT|`).
- ✅ `assinado_por` = utilizador logado (R14).
- ✅ `cert_agt_numero` = `999/AGT/2026` (R15).
- ✅ `hash_anterior` = **null** no primeiro documento da série.

### 2.3 Cadeia de hashes encadeada (T1.1 · chaining/R12)
**Como testar:** emita **3 faturas consecutivas** da série A e consulte a BD.

**Resultado esperado:**
- ✅ Fat. 1: `hash_anterior = null`.
- ✅ Fat. 2: `hash_anterior = hash da fatura 1`.
- ✅ Fat. 3: `hash_anterior = hash da fatura 2`.

**Teste de imutabilidade (R13):**
```sql
-- Deve FALHAR com mensagem de imutabilidade
UPDATE kima_facturas.documentos SET total = '1.00' WHERE numero_completo = 'A/000001';
```
> ⚠️ Erro esperado: `Immutabilidade (R13): valores de um documento emitido não podem ser alterados`.

### 2.4 PDF com elementos AGT (T1.6 · R5/R8/R9/R15)
**Como testar:** na página de detalhe da fatura, clique **Baixar PDF A4** e abra o ficheiro.

**Resultado esperado (verificação visual):**
- ✅ Cabeçalho com dados da empresa (nome, NIF, morada) e número completo do documento.
- ✅ **QR Code** legível (payload `AGT|...`).
- ✅ **Hash (SHA-256)** e **Hash anterior** visíveis.
- ✅ **Assinatura digital** resumida (JWS) e **Emitido por** (email).
- ✅ Rodapé: `Processado por Kima Facturação · Certificado AGT Nº 999/AGT/2026`.
- ✅ **Valor por extenso** do total.
- ✅ Menção **«Original»** na primeira impressão.

### 2.5 Reimpressão (2.ª via)
**Como testar:** na página de detalhe, clique **Reimprimir (2.ª via)**.

**Resultado esperado:**
- ✅ PDF com a menção **«2.ª via, em conformidade com a original»**.

### 2.6 Auditoria e cancelamento (T1.5 · R6/R14)
**Como testar:**
1. Emita um documento; depois cancele-o no detalhe (indicando motivo).

**Resultado esperado:**
- ✅ O documento permanece na listagem com status **Cancelado** (não é eliminado — R4).
- ✅ `logs_auditoria` regista `EMITIR_DOCUMENTO` e o cancelamento com o utilizador associado (R6/R14).

---

## 3. FASE 3 — SAF-T (AO) & Relatórios Fiscais (T3.1–T3.4)

### 3.1 Exportação do ficheiro SAF-T (T3.1/T3.2 · R11)
**Como testar:**
1. Aceda a **Relatórios** (`/relatorios`).
2. Selecione **Mês** e **Ano** de um período com documentos.
3. Clique **Exportar XML**.

**Resultado esperado:**
- ✅ Descarrega `SAFT_AAAA-MM.xml`.
- ✅ Contém `<Header>` (NIF/empresa/período), `<Documents>`, `<TaxSummary>` (0/7/14), `<Customers>` e `<SalesInvoices>` com detalhe por documento.
- ✅ NIFs e totais coincidem com os documentos do período.
- ✅ Secção de problemas de validação vazia.

### 3.2 Exportações JSON e CSV
**Como testar:** clique **Exportar JSON** e **Exportar CSV**.

**Resultado esperado:**
- ✅ `SAFT_AAAA-MM.json` com `periodo`, `empresa`, `documentos`, `totalIVA`, `clientes`, `documentosDetalhe`.
- ✅ `SAFT_AAAA-MM.csv` com linhas `Tipo;Série;Quantidade;Total`.

### 3.3 Validação estrutural (T3.3)
**Como testar:**
1. Force um documento com linha de IVA fora de {0,7,14} ou quantidade ≤ 0 (via API ou BD).
2. Aceda a **Relatórios** e observe a secção de problemas.

**Resultado esperado:**
- ✅ O documento problemático é listado com o nº do documento e o erro da linha.
- ✅ Documentos válidos não geram problemas.

### 3.4 Balancete de IVA / Modelo DP-IVA (T3.4 · F6/F7)
**Como testar:** o módulo `gerarRelatorioDPIVA` é exercitado pela suíte da Fase 5.

**Resultado esperado:**
- ✅ Base tributável segregada por taxa (0%, 7%, 14%).
- ✅ Imposto apurado por taxa e `totalImposto` correto.
- ✅ `baseTributavel = soma das bases` e `faturacaoGlobal = soma dos totais`.

> **Nota:** a UI dedicada do DP-IVA será consolidada com a Fase 2; o motor está implementado e testado em `lib/saft-generator.ts`.

---

## 4. FASE 4 — Documentos Rectificativos & Complementares (T4.1–T4.4)

> **Pré-requisito para os testes:** tenha pelo menos **1 fatura emitida** (ex.: `A/000001`) não cancelada para usar como documento de origem.

### 4.1 Atalhos de emissão rápida no Dashboard
**Como testar:** no Dashboard, verifique os atalhos de criação.

**Resultado esperado:**
- ✅ Disponíveis os atalhos: **Factura**, **Factura-Recibo**, **Talão de Venda**, **Nota de Crédito**, **Nota de Débito**, **Guia de Remessa**, **Factura pro-forma** e **Recibo**.
- ✅ Clicar em cada atalho abre `/faturas/nova?tipo=<tipo>` com o tipo pré-selecionado.

### 4.2 Nota de Crédito (T4.1 · F1/R4)
**Como testar:**
1. **Nova Fatura** → tipo **Nota de Crédito**.
2. **Passo 1:** selecione o mesmo cliente da fatura original; escolha a **Fatura de Origem** (dropdown mostra apenas faturas válidas) e preencha o **Motivo** (ex.: "Devolução de mercadoria").
3. **Passo 2:** as linhas da fatura original são importadas automaticamente; ajuste as quantidades (retificação parcial) ou remova linhas.
4. **Passo 3:** confirme os valores e emita.

**Resultado esperado:**
- ✅ As linhas da fatura original aparecem pré-carregadas.
- ✅ O documento é criado com `documento_referenciado` = nº da fatura original e `motivo` preenchido (visível no detalhe como "Fatura de Origem").
- ✅ O PDF apresenta a caixa **"DOCUMENTO DE RETIFICAÇÃO REFERENTE À FATURA: ..."** e total **"TOTAL A CREDITAR (AOA)"**.

**Cenários negativos (regras fiscais — devem falhar com erro 400):**
- ❌ Emitir **sem selecionar fatura de origem** → erro "documento de origem é obrigatório".
- ❌ Emitir **sem motivo** → erro "motivo da retificação é obrigatório".
- ❌ Referenciar **fatura cancelada** → erro "não é possível referenciar... está cancelado".
- ❌ Referenciar **cliente diferente** do da fatura original → erro "o cliente da retificação deve ser o mesmo".
- ❌ **Valor da Nota de Crédito > valor da fatura original** → erro "não pode exceder o valor da fatura original".

### 4.3 Nota de Débito (T4.2 · F1/R4)
**Como testar:**
1. **Nova Fatura** → tipo **Nota de Débito**.
2. **Passo 1:** cliente + **Fatura de Origem** + **Motivo** (ex.: "Juros de mora / Frete adicional").
3. **Passo 2:** ajuste/adicione linhas dos encargos adicionais.
4. **Passo 3:** emita.

**Resultado esperado:**
- ✅ Referência e motivo persistidos.
- ✅ PDF com caixa de retificação e total **"TOTAL A DEBITAR (AOA)"**.

### 4.4 Guia de Remessa / Transporte (T4.3 · F3)
**Como testar:**
1. **Nova Fatura** → tipo **Guia de Remessa** (atalho "Guia de Remessa").
2. Selecione cliente e adicione as linhas de mercadoria transportada.
3. Emita.

**Resultado esperado:**
- ✅ Documento criado com série própria de GuiaRemessa.
- ✅ PDF com título **"GUIA DE REMESSA OU TRANSPORTE"** e total **"TOTAL MERCADORIA (AOA)"**.

### 4.5 Orçamento / Factura Pro-forma (T4.4 · F2)
**Como testar:**
1. **Nova Fatura** → tipo **Factura pro-forma** (atalho "Factura pro-forma").
2. Preencha cliente, linhas e defina **data de vencimento** (= validade da proposta).
3. Emita.

**Resultado esperado:**
- ✅ PDF com título **"FACTURA PRO-FORMA"**, **"Validade da Proposta: ..."** e total **"TOTAL ESTIMADO (AOA)"**.
- ✅ Sem impacto fiscal: o orçamento **não** entra como factura fiscal (distinguível por tipo).

### 4.6 Recibo (documento de liquidação)
**Como testar:**
1. **Nova Fatura** → tipo **Recibo**.
2. Selecione a **Fatura a liquidar** (dropdown mostra Fatura/Fatura-Recibo válidas).
3. Emita.

**Resultado esperado:**
- ✅ Status inicial **Pago** e `data_pagamento` = data de emissão.
- ✅ PDF com **"RECIBO REFERENTE À FATURA: ..."** e total **"TOTAL RECEBIDO (AOA)"**.


---

## 5. FASE 5 — Testes de Conformidade & Credenciação (T5.1–T5.3)

### 5.1 Suíte de Testes de Carga e Integridade (T5.1)
**Como testar:**
```bash
npm run test:agt
```

**Resultado esperado (ambiente local com dados demo):**
```
✅ [SEQ]  Sequência numérica sem lacunas          — PASSOU
✅ [HASH] Cadeia de hashes encadeada (R12)         — PASSOU
✅ [TOT]  Consistência de totais e IVA (SAF-T)     — PASSOU
✅ [IMU]  Imutabilidade e rastreio do emitente     — PASSOU
Score de integridade: 100%
```
- ✅ Exit code `0` (sucesso).
- ✅ Relatório gravado em `output/fase5/relatorio-fase5.json`.

**Testar também com dados reais da BD (opcional):**
```bash
# Preencha NEXT_PUBLIC_COMPANY_ID (ou DEMO_COMPANY_ID) com o id da empresa
node scripts/agt-fase5-teste.mts --real
```
- ✅ A suíte corre sobre os documentos reais do Supabase e reporta falhas, se existirem.

### 5.2 Simulação de Auditoria AGT (T5.2)
**Como testar:** incluída no `npm run test:agt`.

**Resultado esperado:**
- ✅ **Obrigatórios conformes: 14/15** (R10 — Fase 2 — é o único não conforme, esperado).
- ✅ **Funcionais conformes: 6/7** (F5 — stock parcial).
- ✅ **SCORE GLOBAL: 92%** com os R1–R9, R11–R15 todos **✅ Conforme**.

### 5.3 Pacote de Submissão para Credenciação (T5.3)
**Como testar:**
```bash
npm run agt:credenciacao
```

**Resultado esperado:** é gerada a pasta `output/credenciacao/` com:
- ✅ `SAFT-AMOSTRA.xml` — ficheiro SAF-T (AO) de exemplo com `<Header>`, `<MasterFiles>`, `<TaxTable>` e `<SourceDocuments>`.
- ✅ `CHAVE_PUBLICA.pem` — chave pública RSA-2048 (SPKI/PEM) para verificação JWS.
- ✅ `MANIFESTO.json` — dados da empresa, versão do software e referências legais.
- ✅ `CHECKLIST_CREDENCIACAO.txt` — passo-a-passo do processo no Portal da AGT.

> **Nota:** substituir o nº de certificação de exemplo (`999/AGT/2026`) pelo nº real antes da submissão formal (ver `GUIA_CREDENCIACAO_AGT.md`).

### 5.4 Mapa de requisitos verificados pela suíte

| Req. | Descrição | Resultado esperado na auditoria |
|---|---|---|
| R1 | NIF Angolano validado (Módulo 11/BI) | ✅ Conforme |
| R2 | Numeração sequencial por tipo/série | ✅ Conforme |
| R3 | Cálculo correcto do IVA (0/7/14) | ✅ Conforme |
| R4 | Cancelamento documentado | ✅ Conforme |
| R5 | Layout e conteúdo legal dos documentos | ✅ Conforme |
| R6 | Log de auditoria de acções críticas | ✅ Conforme |
| R7 | Identificação da empresa nos documentos | ✅ Conforme |
| R8 | Código QR regulamentar nas faturas | ✅ Conforme |
| R9 | Assinatura digital JWS (RS256) | ✅ Conforme |
| R10 | Comunicação tempo real com AGT | ❌ **Não conforme (Fase 2 — pendente)** |
| R11 | Ficheiro SAF-T (AO) | ✅ Conforme |
| R12 | Hash de integridade (imutabilidade) | ✅ Conforme |
| R13 | Imutabilidade dos documentos emitidos | ✅ Conforme |
| R14 | Registo do utilizador emitente | ✅ Conforme |
| R15 | N.º de certificação AGT nos documentos | ✅ Conforme |
| F1–F4 | Tipos de documento / NC / ND / GR / Orçamento | ✅ Conforme |
| F5 | Controlo de stock | ⚠️ Parcial |
| F6–F7 | Relatórios fiscais / exportação contabilística | ✅ Conforme |


---

## 6. Cenários de erro e regras de negócio (testes negativos)

| # | Cenário | Passos | Resultado esperado |
|---|---|---|---|
| N1 | **Editar fatura emitida** | Tenta alterar valores de um doc `Pago/Pendente` (UI ou `UPDATE` no SQL) | Bloqueado — mensagem de imutabilidade (R13) |
| N2 | **Eliminar fatura emitida** | Tenta apagar documento emitido | Preservado; apenas cancelamento com motivo (R4) |
| N3 | **NC sem fatura de origem** | Emitir Nota de Crédito sem referência | Erro 400: "documento de origem é obrigatório" |
| N4 | **NC sem motivo** | Emitir Nota de Crédito sem motivo | Erro 400: "motivo da retificação é obrigatório" |
| N5 | **NC acima do valor original** | Nota de Crédito com total > fatura original | Erro 400: "não pode exceder o valor da fatura original" |
| N6 | **NC com cliente diferente** | Retificação com cliente ≠ fatura original | Erro 400: "o cliente da retificação deve ser o mesmo" |
| N7 | **Referenciar fatura cancelada** | NC/Recibo a referenciar doc cancelado | Erro 400: "não é possível referenciar... cancelado" |
| N8 | **NIF inválido no cadastro** | Criar cliente/empresa com NIF inválido | Erro de validação do formulário (Módulo 11/BI) |
| N9 | **IVA fora de {0,7,14}** | Documento com taxa de IVA inválida | Falha na validação SAF-T (`validarDocumentoSAFT`/`validarEsquemaSAFT`) |
| N10 | **Sequência com lacuna** | Criar documentos com números fora de ordem | Suíte `test:agt` → teste `SEQ` FALHA com detalhe |

---

## 7. Registo de resultados de teste

> Preencha a tabela abaixo durante a execução.

| ID | Caso | Data | Executor | Resultado (✅/❌/⚠️) | Observações |
|---|---|---|---|---|---|
| F1-01 | Config. certificado AGT (T1.4) | | | | |
| F1-02 | Emissão com hash/JWS/QR | | | | |
| F1-03 | Cadeia de hashes (3 faturas) | | | | |
| F1-04 | Imutabilidade (UPDATE bloqueado) | | | | |
| F1-05 | PDF com elementos AGT | | | | |
| F1-06 | Reimpressão 2.ª via | | | | |
| F1-07 | Cancelamento + auditoria | | | | |
| F3-01 | Exportação SAF-T XML | | | | |
| F3-02 | Exportação JSON | | | | |
| F3-03 | Exportação CSV | | | | |
| F3-04 | Validação estrutural | | | | |
| F3-05 | DP-IVA (motor T3.4) | | | | |
| F4-01 | Atalhos dashboard | | | | |
| F4-02 | Nota de Crédito (fluxo feliz) | | | | |
| F4-03 | Nota de Crédito (regras N3–N6) | | | | |
| F4-04 | Nota de Débito | | | | |
| F4-05 | Guia de Remessa | | | | |
| F4-06 | Orçamento / pro-forma | | | | |
| F4-07 | Recibo | | | | |
| F5-01 | `npm run test:agt` (integridade) | | | | |
| F5-02 | `npm run test:agt` (auditoria) | | | | |
| F5-03 | `npm run agt:credenciacao` | | | | |

---

## 8. Critérios de aceitação global

O núcleo técnico é considerado **conforme** quando:

1. **Fase 1:** todos os documentos emitidos têm hash (64 hex), JWS, QR payload e `assinado_por`; edição de emitidos é bloqueada; PDF contém QR, hash, assinatura e nº de certificado.
2. **Fase 3:** SAF-T exportável em XML/JSON/CSV sem problemas de validação; motor DP-IVA correto.
3. **Fase 4:** NC/ND/GR/Orçamento/Recibo emitíveis com as regras fiscais (referência, motivo, valor ≤ original, cliente coerente) aplicadas.
4. **Fase 5:** `npm run test:agt` → integridade **100%** e auditoria **14/15 obrigatórios + 6/7 funcionais**; `npm run agt:credenciacao` gera os 4 artefactos.
5. `npm run build` sem erros.

> **Bloqueante conhecido:** R10 (comunicação AGT em tempo real) — **Fase 2** ainda não implementada. Os testes acima validam todo o núcleo já entregue.

---

*Manual elaborado com base no `CRONOGRAMA_NUCLEO_TECNICO_AGT.md` e nas implementações reais do repositório.*
*Kima Facturação Web · RC Media · Agosto 2026*



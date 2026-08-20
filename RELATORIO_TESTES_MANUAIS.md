# 📋 Relatório de Testes Manuais — Revisão do Núcleo AGT

> **Projeto:** Kima Facturação Web
> **Âmbito da revisão:** funcionalidades novas/corrigidas após o checkup das fases (Agosto 2026)
> - **Fase 3:** MasterFiles no SAF-T (T3.1) · Validação XSD no export (T3.3) · UI do Modelo DP-IVA (T3.4)
> - **Fase 4:** Dados de Transporte na Guia de Remessa (T4.3)
> - **Fase 5:** Auditoria com verificações reais, sem hardcodes (T5.2)

---

## 1. Informação Geral

| Campo | Valor |
|---|---|
| **Aplicação** | Kima Facturação Web (Next.js · Supabase) |
| **Ambiente** | Local (`npm run dev`) |
| **Data de execução** | 19/08/2026 |
| **Executor** | __________ |
| **Navegador** | Chrome / Edge |

### 1.1 Pré-condições
- [ ] `npx tsc --noEmit` sem erros.
- [ ] **Migração 002 executada** no Supabase SQL Editor: `migrations/002_fase4_transporte_agt.sql` (colunas `transporte_viatura`, `transporte_matricula`, `transporte_motorista`).
- [ ] Empresa configurada com NIF e N.º de Certificado AGT (ex.: `999/AGT/2026`).
- [ ] Existem clientes, artigos e **pelo menos 2 faturas emitidas no mês corrente**.

---

## 2. FASE 3 — SAF-T & Relatórios Fiscais

### T3.1 · MasterFiles no SAF-T (Artigos + Tabela de Impostos)

**M-T31-01 · XML contém TaxTable e Products**
1. Emita 2 faturas: uma com artigo a 14% e outra com artigo a 7%.
2. Aceda a **Relatórios** (`/relatorios`), selecione o mês corrente → **Exportar XML**.
3. Abra o ficheiro `SAFT_AAAA-MM.xml` num editor.

**Esperado:**
- ✅ Existe secção `<MasterFiles>` com `<TaxTable>` contendo `<Tax>` para **IVA-14** e **IVA-7** (apenas taxas usadas no período).
- ✅ Existe `<Products>` com `<Product>` por artigo usado no período: `ProductCode`, `ProductDescription`, `UnitOfMeasure`, `UnitPrice`, `TaxCode` (ex.: `IVA-14`).
- ✅ Ordem das secções: `Header` → `MasterFiles` → `Documents` → `TaxSummary` → `Customers` → `SalesInvoices`.

**M-T31-02 · Sem artigos usados no período**
1. Selecione um mês **sem documentos** e exporte XML.

**Esperado:**
- ✅ `<MasterFiles>` presente; `<Products>` vazio/ausente (artigos não usados no período não são listados).
- ⚠️ Toasts: o export bloqueia com mensagem de validação (TaxTable vazia) — comportamento aceite se o período não tiver documentos.

### T3.3 · Validação XSD no export

**M-T33-01 · Export válido**
1. Com documentos válidos no período, clique **Exportar XML**.

**Esperado:**
- ✅ Toast de sucesso: "SAF-T exportado — XML válido (XSD) — N artigo(s), M taxa(s)".
- ✅ Ficheiro descarregado normalmente.

**M-T33-02 · Export bloqueado com dados inválidos**
1. Crie via API/SQL um documento com linha de IVA `20` (taxa inválida) OU quantidade ≤ 0.
2. Volte a **Relatórios** e clique **Exportar XML**.

**Esperado:**
- ❌ Nenhum ficheiro é descarregado.
- ✅ Toast de erro: "SAF-T com problemas — N erro(s): …" (menciona taxa de IVA inválida).
- ✅ A secção "Documentos com problemas de conformidade" lista o documento com o erro.

**M-T33-03 · Estrutura XML (inspeção manual)**
1. Abra o XML exportado e valide a bem-formação (ex.: colar em validator.w3.org ou abrir no browser).

**Esperado:**
- ✅ Sem erros de sintaxe; todos os elementos fechados; atributos entre aspas.

### T3.4 · UI do Modelo DP-IVA

**M-T34-01 · Secção DP-IVA na página Relatórios**
1. Em `/relatorios`, selecione o mês com faturas a 14% e 7%.

**Esperado:**
- ✅ Bloco "Modelo DP-IVA — Declaração Periódica de IVA" visível.
- ✅ Tabela com 3 linhas (14%, 7%, Isento 0%):
  - Incidência tributável 14% = soma das bases das linhas a 14%.
  - Imposto apurado 14% = base × 14%.
  - O mesmo para 7%; linha Isento com imposto "—".
- ✅ Linha final: "Total de imposto" = base tributável total e imposto total (14% + 7%).
- ✅ "Faturação global do período" = soma dos totais dos documentos.

**Validação cruzada:**
```sql
SELECT tipo, subtotal, total_iva, total FROM kima_facturas.documentos
WHERE EXTRACT(MONTH FROM data_emissao) = <mes> AND EXTRACT(YEAR FROM data_emissao) = <ano>;
```

**M-T34-02 · Export CSV do DP-IVA**
1. Clique **Exportar CSV** no bloco DP-IVA.

**Esperado:**
- ✅ Descarrega `DP-IVA_AAAA-MM.csv` com linhas `Campo;Valor` e os 9 campos do relatório.

**M-T34-03 · Período sem documentos**
1. Selecione um mês vazio.

**Esperado:**
- ✅ Secção DP-IVA visível com todos os valores a `0,00` (sem erro/NaN).

---

## 3. FASE 4 — Guia de Remessa com Dados de Transporte (T4.3)

### M-T43-01 · Campos de transporte no wizard
1. **Nova Fatura** → tipo **Guia de Remessa**.
2. Avance até o **Passo 3 — Rever e emitir**.

**Esperado:**
- ✅ Bloco "Dados de Transporte" visível com 3 campos: **Viatura**, **Matrícula**, **Motorista / Transportador**.
- ✅ Os campos **não** aparecem para outros tipos (ex.: Fatura, Nota de Crédito).

### M-T43-02 · Emissão e persistência
1. Preencha: Viatura "Camião 3.5t", Matrícula "LD-12-34-AB", Motorista "João dos Santos".
2. Emita a guia.

**Esperado:**
- ✅ Documento criado com status inicial (Pendente/Processado).
- ✅ Verificação na BD:
```sql
SELECT numero_completo, transporte_viatura, transporte_matricula, transporte_motorista
FROM kima_facturas.documentos
WHERE tipo = 'GuiaRemessa' ORDER BY created_at DESC LIMIT 1;
```
- ✅ Colunas preenchidas com os valores (não `null`).

### M-T43-03 · PDF com dados de transporte
1. No detalhe da guia, **Baixar PDF**.

**Esperado (verificação visual):**
- ✅ Caixa **"DADOS DE TRANSPORTE"** com `Viatura: … · Matrícula: … · Motorista: …`.
- ✅ Título "GUIA DE REMESSA OU TRANSPORTE" e total "TOTAL MERCADORIA (AOA)".

### M-T43-04 · Guia sem transporte (opcional)
1. Emita uma guia sem preencher os campos.

**Esperado:**
- ✅ Emissão normal; PDF **sem** caixa de transporte (bloco omitido); colunas BD = `null`.

### M-T43-05 · Validação da API (cenário negativo)
1. Envie via `POST /api/invoices` uma GuiaRemessa com `transporteMatricula` de tipo inválido (ex.: número) — ou apenas confirme que o tipo aceite `transporteViatura/Matricula/Motorista` como strings opcionais.

**Esperado:**
- ✅ Campos opcionais aceites (string); sem erro de schema.
- ✅ Outros tipos ignoram os campos (gravados como `null`).

---

## 4. FASE 5 — Auditoria com verificações reais (T5.2)

### M-T52-01 · R4 — Cancelamento documentado
1. Emita uma fatura; cancele-a no detalhe com **motivo** preenchido.
2. Execute `npm run test:agt` (ou `node scripts/agt-fase5-teste.mts --real` com dados reais).

**Esperado:**
- ✅ R4 = **✅ Conforme** quando: documento cancelado preservado + motivo presente + registo de cancelamento em `logs_auditoria`.
- ✅ R4 = **⚠️ Parcial** se existirem cancelados sem registo de auditoria (já não é fixo "Conforme").

### M-T52-02 · R5 — Conteúdo legal dos emitidos
1. Corra a auditoria com dados reais.

**Esperado:**
- ✅ R5 = **✅ Conforme** se todos os emitidos têm `numeroCompleto`, série, forma de pagamento, totais > 0 e ≥ 1 linha.
- ✅ R5 = **⚠️ Parcial** e detalhe com contagem caso algum emitido não cumpra (já não é fixo).

### M-T52-03 · R13 — Imutabilidade via cadeia de hashes
1. Corra `npm run test:agt`.

**Esperado:**
- ✅ R13 = **✅ Conforme** apenas se a recomposição SHA-256 da cadeia (teste HASH da T5.1) passa em todos os emitidos.
- ✅ Relatório da auditoria detalha quebras de cadeia se existirem (ex.: "cadeia quebrada — hashAnterior=…").

### M-T52-04 · F2/F3 — Sem verificação permissiva
1. Corra a auditoria sobre o dataset demo (`npm run test:agt`).

**Esperado:**
- ✅ F2/F3 = **✅ Conforme** (dataset demo tem Orçamento e GuiaRemessa nas séries/documentos).
- ✅ F2/F3 = **⚠️ Parcial** com mensagem "Fluxo disponível no wizard mas sem documentos deste tipo no período" se o contexto não tiver esses tipos (já não usam `|| true`).

### M-T52-05 · Mapa completo esperado (demo)

| Req. | Estado esperado |
|---|---|
| R1–R9 | ✅ Conforme |
| R10 | ❌ Não conforme (Fase 2 — pendente) |
| R11–R15 | ✅ Conforme |
| F1–F4 | ✅ Conforme |
| F5 | ⚠️ Parcial (stock) |
| F6–F7 | ✅ Conforme |
| **Score** | **~92%** (14/15 obrigatórios · 6/7 funcionais) |

---

## 5. Registo de Resultados

> Preencha durante a execução.

| ID | Caso | Data | Executor | Resultado ✅/❌/⚠️ | Observações |
|---|---|---|---|---|---|
| M-T31-01 | XML com TaxTable + Products | | | | |
| M-T31-02 | Mês sem artigos usados | | | | |
| M-T33-01 | Export XML válido | | | | |
| M-T33-02 | Export bloqueado (taxa inválida) | | | | |
| M-T33-03 | Bem-formação do XML | | | | |
| M-T34-01 | Secção DP-IVA / valores cruzados | | | | |
| M-T34-02 | Export CSV DP-IVA | | | | |
| M-T34-03 | Mês vazio (zeros) | | | | |
| M-T43-01 | Campos de transporte no wizard | | | | |
| M-T43-02 | Persistência na BD | | | | |
| M-T43-03 | PDF com dados de transporte | | | | |
| M-T43-04 | Guia sem transporte | | | | |
| M-T43-05 | API aceita campos | | | | |
| M-T52-01 | R4 cancelamento documentado | | | | |
| M-T52-02 | R5 conteúdo legal | | | | |
| M-T52-03 | R13 cadeia de hashes | | | | |
| M-T52-04 | F2/F3 sem permissivo | | | | |
| M-T52-05 | Score ~92% demo | | | | |

---

## 6. Critérios de Aceitação

1. Export XML **bloqueado** sempre que a validação XSD/estrutural falhar; nunca descarrega ficheiro inválido.
2. DP-IVA na UI com valores coincidentes com a BD (cruzamento por SQL).
3. Guia de Remessa com viatura/matrícula/motorista persistidos e impressos no PDF; outros tipos não afetados.
4. Auditoria sem hardcodes: R4/R5/R13 e F2/F3/F6 refletem os dados reais do contexto.
5. `npx tsc --noEmit` sem erros; `npm run test:agt` exit code 0 no demo.

---

*Relatório elaborado a partir da revisão das implementações de Agosto 2026 (Fase 3/4/5 do `CRONOGRAMA_NUCLEO_TECNICO_AGT.md`).*
*Kima Facturação Web · RC Media · 19/08/2026*
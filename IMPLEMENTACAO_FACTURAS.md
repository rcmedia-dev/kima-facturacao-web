# Guia de Implementação — Conformidade Fiscal (Decreto Presidencial nº 71/25)

> **Base legal**: `FACTURAS_GUIDE.md` — Decreto Presidencial nº 71/25, de 20 de Março de 2025 (Regime Jurídico das Facturas).
> Este guia traduz as obrigações legais em tarefas de implementação concretas para a **Kima Facturação**, por prioridade.

---

## Fase 1 — Conformidade de Emissão (crítica)

### A1 · Gestão de séries por tipo de documento *(Art. 10º, alínea b)*
A numeração deve ser **sequencial e cronológica por tipo de documento, série e ano económico**.
Hoje a série é fixa `"A"` e sem ecrã de gestão.

- [x] Tipos: manter `SerieNumeracao` (`lib/types.ts:122`) — adicionado `ano` e `predefinida`.
- [x] API `app/api/series/route.ts` — GET/POST/PUT/DELETE sobre `series_numeracao` (isolado por `company_id`).
- [x] UI em `app/configuracoes/page.tsx` — secção "Séries e Numeração": criar/editar série por tipo de documento, definir série predefinida.
- [x] Emissão (`app/api/invoices/route.ts`): usa a série predefinida do tipo; cria a série "A" automaticamente se não existir.

### A2 · Hash fiscal + identificação do software AGT *(Art. 10º, alínea j)*
As facturas devem identificar o **software de facturação validado** e o **código hash**. Hoje são hard-coded falsos
(`nº 999/AGT/2026` em `pdf-generator.ts:336`; `Hash: a8f9-2c41-9901-kima` em `faturas/[id]/page.tsx:391`).

- [x] `lib/fiscal-hash.ts` — SHA-256 determinístico sobre conteúdo fiscal (tipo, número completo, NIFs, datas, linhas, totais).
- [x] `ConfiguracaoEmpresa` + settings: `softwareNome`, `softwareCertificacaoNumero`.
- [x] Emissão: hash gerado no POST `/api/invoices` e persistido (coluna `documentos.hash`).
- [x] PDF e página de detalhe: mostram hash real + certificação configurada.

### A3 · Menção "Original" / "2.ª via" *(Art. 7º, n.ºs 4 e 5)*
A primeira impressão deve conter «original»; a reimpressão «2.ª via, em conformidade com a original».

- [x] `gerarPDFFatura(..., { via: "original" | "2via" })` — menção no documento A4 e talão térmico.
- [x] Botão "Reimprimir (2.ª via)" na página de detalhe.

### A4 · Valor por extenso + motivo de não liquidação do IVA *(Art. 10º, alíneas d e f)*
Preço/total por extenso e, quando não há IVA liquidado, o motivo justificativo com a norma legal.

- [x] `lib/formatters.ts` — `valorPorExtenso(valor)` (Kwanzas).
- [x] PDF: total por extenso; campo `motivoIsencaoIVA` na emissão, persistido e impresso.

---

## Fase 2 — Obrigações Periódicas

### B1 · Relatório SAF-T *(Art. 25º)*
Ficheiro SAF-T até 10 de Abril do exercício seguinte. O gerador existe (`lib/saft-generator.ts`) mas **não tem UI**.

- [x] Página `/relatorios`: escolha de mês/ano → resumo + exportação XML/JSON/CSV.
- [x] Validação dos documentos antes de exportar (`validarDocumentoSAFT`).
- [x] `saft-generator.ts` enriquecido com detalhe por documento (`<SalesInvoices>`).

### B2 · Prazo de emissão — 5.º dia útil *(Art. 8º)*
A factura deve ser emitida até ao 5.º dia útil seguinte à operação.

- [x] `lib/utils.ts` — `diasUteisEntre` / `emissaoForaDoPrazo`.
- [x] Campo "Data da Operação" na emissão + alerta "Prazo" na listagem de documentos.

---

## Fase 3 — Documentos adicionais *(Art. 3º)*

### C1 · Novos tipos de documento
- **Aviso de Cobrança-Recibo** (seguros)
- **Fatura Genérica** (instituições financeiras, mensal)
- **Fatura Global** (mensal, engloba várias operações)

- [x] `TipoDocumento` + constantes + título oficial no PDF (A4 e talão térmico).
- [x] Wizard (Passo 1) com os novos tipos; listagem mostra todos os tipos de documento.

### C2 · Fatura de Adiantamento *(Art. 3º, alínea g)*
Documento que comprova financeiramente adiantamentos ou antecipações de pagamento de uma operação futura.
- [x] Tipo `FaturaAdiantamento`, rótulo oficial "Fatura de Adiantamento" (`LABELS_DOCUMENTO`).
- [x] Série própria, status inicial **Pago** (adiantamento recebido), pronto-pagamento no PDF.
- [x] PDF: título "FATURA DE ADIANTAMENTO", cor índigo, total "TOTAL ADIANTADO (AOA)".

### C3 · Recibo *(Art. 3º, alínea o e Art. 6º)*
Documento que comprova o pagamento parcial ou total de um bem ou serviço facturado.
- [x] Tipo `Recibo`, rótulo oficial "Recibo" (`LABELS_DOCUMENTO`).
- [x] Wizard: obrigatória a seleção da **fatura a liquidar** (campo `documentoReferenciado`, filtrado a Fatura/Fatura-Recibo).
- [x] `documentoReferenciado`/`motivo` agora persistidos na BD (via `/api/invoices`).
- [x] PDF: título "RECIBO", cor verde, caixa "RECIBO REFERENTE À FATURA", total "TOTAL RECEBIDO (AOA)".
- [x] Status inicial **Pago**; detalhe mostra "Fatura Liquidada".
- ⚠️ *Pendente (melhoria futura)*: campo de **retenções / impostos cativos** que o Art. 6º, nº 3 exige indicar quando aplicável.

---

## Critérios de aceitação globais

1. Nenhuma factura emitida sem **número completo único** (série/tipo/ano).
2. Todo PDF de emissão contém **hash real**, **identificação do software AGT**, **valor por extenso** e **menção «original»**.
3. Reimpressões assinaladas como **«2.ª via, em conformidade com a original»**.
4. SAF-T exportável por período a partir da UI.
5. As alterações não quebram os fluxos existentes (wizard de emissão, CRUD, PDF, pagamentos).
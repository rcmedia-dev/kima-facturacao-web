/**
 * T5.1 · Suíte de Testes de Carga e Integridade — Certificação AGT
 *
 * Executa testes automatizados sobre os documentos emitidos verificando:
 *  - Sequência numérica sem lacunas (R1/R2 — numeração sequencial por tipo/série);
 *  - Cadeia de hashes encadeada (R12 — hash de integridade + chaining T1.1);
 *  - Consistência dos totais e do IVA (R3 — 0%, 7%, 14%) para o SAF-T (R11);
 *  - Imutabilidade e rastreio do emitente (R13/R14 — hash, assinatura JWS,
 *    payload QR, utilizador assinante) em documentos emitidos.
 *
 * Módulo autocontido (sem dependências de runtime) — corre em Node.js
 * (Node ≥ 20, Web Crypto global) e no browser.
 */

// ─── Tipos (estruturais, compatíveis com `lib/types.ts` Documento) ──────────

export interface LinhaIntegridade {
  descricao: string;
  quantidade: number;
  preco: number;
  taxaIVA: number;
  total: number;
}

export interface DocumentoIntegridade {
  id: string;
  companyId?: string;
  tipo: string;
  serie: string;
  numero: string | number;
  numeroCompleto?: string;
  dataEmissao?: Date | string;
  formaPagamento?: string;
  status: string;
  subtotal: number;
  totalIVA: number;
  total: number;
  hash?: string | null;
  hashAnterior?: string | null;
  assinaturaJWS?: string | null;
  qrPayload?: string | null;
  assinadoPor?: string | null;
  certAgtNumero?: string | null;
  clienteNif?: string;
  linhas: LinhaIntegridade[];
}

export interface ResultadoTesteIntegridade {
  codigo: string;
  nome: string;
  passou: boolean;
  detalhes: string[];
}

export interface RelatorioIntegridade {
  executadoEm: string;
  totalDocumentosAnalisados: number;
  testes: ResultadoTesteIntegridade[];
  testesPassaram: number;
  testesFalharam: number;
  score: number; // 0–100
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function normalizarNumero(v: number | string): string {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return (isNaN(n) ? 0 : n).toFixed(2);
}

function round2(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

async function sha256Hex(texto: string): Promise<string> {
  const data = new TextEncoder().encode(texto);
  const buffer = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(buffer));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Conteúdo canónico do documento (igual a `fiscal-hash.ts` / `crypto-engine.ts`). */
export function construirConteudoFiscal(doc: DocumentoIntegridade): string {
  const data = doc.dataEmissao ? new Date(doc.dataEmissao).toISOString() : "";
  const linhas = (doc.linhas || [])
    .map((l) =>
      [
        l.descricao || "",
        normalizarNumero(l.quantidade),
        normalizarNumero(l.preco),
        String(l.taxaIVA),
        normalizarNumero(l.total),
      ].join("|")
    )
    .join(";");

  return [
    doc.tipo || "",
    doc.serie || "",
    String(doc.numero || ""),
    doc.numeroCompleto || "",
    data,
    doc.clienteNif || "",
    "",
    normalizarNumero(doc.subtotal),
    normalizarNumero(doc.totalIVA),
    normalizarNumero(doc.total),
    doc.formaPagamento || "",
    linhas,
  ].join("#");
}


/** Conteúdo canónico com chaining (igual a `crypto-engine.ts` T1.1). */
function construirConteudoEncadeado(doc: DocumentoIntegridade, hashAnterior?: string | null): string {
  return `${construirConteudoFiscal(doc)}#HASH_ANTERIOR#${(hashAnterior || "").toUpperCase()}`;
}

export async function recalcularHashEncadeado(
  doc: DocumentoIntegridade,
  hashAnterior?: string | null
): Promise<string> {
  const hex = await sha256Hex(construirConteudoEncadeado(doc, hashAnterior));
  return hex.toUpperCase();
}

const EMITIDO = (doc: DocumentoIntegridade) =>
  doc.status !== "Rascunho" && doc.status !== "Cancelado";

const HEX64 = /^[0-9A-F]{64}$/;

// ─── T1.5.1 · Sequência numérica sem lacunas ────────────────────────────────

export function verificarSequenciaSemLacunas(documentos: DocumentoIntegridade[]): ResultadoTesteIntegridade {
  const detalhes: string[] = [];
  let ok = true;

  const grupos = new Map<string, DocumentoIntegridade[]>();
  for (const doc of documentos) {
    const chave = `${doc.companyId || "?"}|${doc.tipo}|${doc.serie || "A"}`;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave)!.push(doc);
  }

  if (grupos.size === 0) {
    return { codigo: "SEQ", nome: "Sequência numérica sem lacunas", passou: true, detalhes: ["Sem documentos emitidos — nada a verificar."] };
  }

  for (const [chave, docs] of grupos) {
    const ordenados = docs.sort((a, b) => parseInt(String(a.numero), 10) - parseInt(String(b.numero), 10));
    let grupoOk = true;
    for (let i = 0; i < ordenados.length; i++) {
      const esperado = i + 1;
      const atual = parseInt(String(ordenados[i].numero), 10);
      if (atual !== esperado) {
        ok = false;
        grupoOk = false;
        detalhes.push(`${chave}: lacuna ou duplicado — esperado nº ${esperado}, encontrado nº ${atual} (${ordenados[i].numeroCompleto || ordenados[i].id})`);
      }
    }
    detalhes.push(`${chave}: ${ordenados.length} documento(s) — sequência 1..${ordenados.length} ${grupoOk ? "sem lacunas" : "COM PROBLEMAS"}`);
  }

  return { codigo: "SEQ", nome: "Sequência numérica sem lacunas", passou: ok, detalhes };
}


// ─── T1.5.2 · Cadeia de hashes encadeada (imutabilidade R12/T1.1) ──────────

export async function verificarCadeiaHash(documentos: DocumentoIntegridade[]): Promise<ResultadoTesteIntegridade> {
  const detalhes: string[] = [];
  let ok = true;

  const grupos = new Map<string, DocumentoIntegridade[]>();
  for (const doc of documentos) {
    if (!EMITIDO(doc)) continue;
    const chave = `${doc.companyId || "?"}|${doc.tipo}|${doc.serie || "A"}`;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave)!.push(doc);
  }

  if (grupos.size === 0) {
    return { codigo: "HASH", nome: "Cadeia de hashes encadeada (R12)", passou: true, detalhes: ["Sem documentos emitidos — nada a verificar."] };
  }

  for (const [chave, docs] of grupos) {
    const ordenados = docs.sort((a, b) => parseInt(String(a.numero), 10) - parseInt(String(b.numero), 10));
    let hashEsperado: string | null = null;

    for (const doc of ordenados) {
      // 1) Hash presente e no formato SHA-256
      if (!doc.hash || !HEX64.test(doc.hash)) {
        ok = false;
        detalhes.push(`${chave} · ${doc.numeroCompleto || doc.id}: hash ausente ou formato inválido`);
        continue;
      }

      // 2) Chaining — o hash anterior deve coincidir com o hash do documento anterior da série
      const hashAnteriorReal = doc.hashAnterior || null;
      if (hashEsperado !== hashAnteriorReal) {
        ok = false;
        detalhes.push(`${chave} · ${doc.numeroCompleto || doc.id}: cadeia quebrada — hashAnterior=${(hashAnteriorReal || "—").slice(0, 16)}, esperado=${(hashEsperado || "—").slice(0, 16)}`);
      }

      // 3) Recompor o hash a partir do conteúdo canónico + hash anterior
      try {
        const recomputado = await recalcularHashEncadeado(doc, hashAnteriorReal);
        if (recomputado !== doc.hash) {
          ok = false;
          detalhes.push(`${chave} · ${doc.numeroCompleto || doc.id}: hash não corresponde ao conteúdo fiscal`);
        }
      } catch (e: unknown) {
        ok = false;
        detalhes.push(`${chave} · ${doc.numeroCompleto || doc.id}: erro ao recompor hash (${e instanceof Error ? e.message : String(e)})`);
      }

      hashEsperado = doc.hash;
    }
    detalhes.push(`${chave}: ${ordenados.length} documento(s) validado(s)`);
  }

  return { codigo: "HASH", nome: "Cadeia de hashes encadeada (R12)", passou: ok, detalhes };
}

// ─── T1.5.3 · Consistência de totais e IVA (SAF-T / R3 / R11) ──────────────

export function verificarConsistenciaTotais(documentos: DocumentoIntegridade[]): ResultadoTesteIntegridade {
  const detalhes: string[] = [];
  let ok = true;

  if (documentos.length === 0) {
    return { codigo: "TOT", nome: "Consistência de totais e IVA (SAF-T)", passou: true, detalhes: ["Sem documentos — nada a verificar."] };
  }

  for (const doc of documentos) {
    let somaSubtotal = 0;
    let somaIVA = 0;
    let taxasValidas = true;

    for (const l of doc.linhas || []) {
      if (![0, 7, 14].includes(l.taxaIVA)) taxasValidas = false;
      const totalLinha = round2(l.quantidade * l.preco);
      if (Math.abs(totalLinha - l.total) > 0.011) {
        ok = false;
        detalhes.push(`${doc.numeroCompleto || doc.id}: linha "${l.descricao}" — total calculado ${totalLinha} ≠ total registado ${l.total}`);
      }
      somaSubtotal += totalLinha;
      somaIVA += round2(totalLinha * (l.taxaIVA / 100));
    }

    if (!taxasValidas) {
      ok = false;
      detalhes.push(`${doc.numeroCompleto || doc.id}: taxas de IVA fora de {0, 7, 14}`);
    }
    if (Math.abs(somaSubtotal - doc.subtotal) > 0.011) {
      ok = false;
      detalhes.push(`${doc.numeroCompleto || doc.id}: subtotal ${doc.subtotal} ≠ soma das linhas ${somaSubtotal}`);
    }
    if (Math.abs(somaIVA - doc.totalIVA) > 0.011) {
      ok = false;
      detalhes.push(`${doc.numeroCompleto || doc.id}: IVA ${doc.totalIVA} ≠ soma do IVA das linhas ${somaIVA}`);
    }
    if (Math.abs(round2(doc.subtotal + doc.totalIVA) - doc.total) > 0.011) {
      ok = false;
      detalhes.push(`${doc.numeroCompleto || doc.id}: total ${doc.total} ≠ subtotal + IVA (${round2(doc.subtotal + doc.totalIVA)})`);
    }
  }

  detalhes.push(`${documentos.length} documento(s) verificados`);
  return { codigo: "TOT", nome: "Consistência de totais e IVA (SAF-T)", passou: ok, detalhes };
}


// ─── T1.5.4 · Imutabilidade e rastreio (R13/R14) ───────────────────────────

export function verificarImutabilidadeDocumentos(documentos: DocumentoIntegridade[]): ResultadoTesteIntegridade {
  const detalhes: string[] = [];
  let ok = true;

  const emitidos = documentos.filter(EMITIDO);
  if (emitidos.length === 0) {
    return { codigo: "IMU", nome: "Imutabilidade e rastreio do emitente (R13/R14)", passou: true, detalhes: ["Sem documentos emitidos — nada a verificar."] };
  }

  let semHash = 0, semJws = 0, semQr = 0, semAssinado = 0;
  for (const doc of emitidos) {
    if (!doc.hash || !HEX64.test(doc.hash)) semHash++;
    if (!doc.assinaturaJWS) semJws++;
    if (!doc.qrPayload) semQr++;
    if (!doc.assinadoPor) semAssinado++;
  }

  if (semHash > 0) { ok = false; detalhes.push(`${semHash} documento(s) emitido(s) sem hash (R12)`); }
  if (semJws > 0) { ok = false; detalhes.push(`${semJws} documento(s) emitido(s) sem assinatura JWS (R9)`); }
  if (semQr > 0) { ok = false; detalhes.push(`${semQr} documento(s) emitido(s) sem payload QR (R8)`); }
  if (semAssinado > 0) { ok = false; detalhes.push(`${semAssinado} documento(s) emitido(s) sem identificação do utilizador (R14)`); }

  detalhes.push(`${emitidos.length} documento(s) emitido(s) analisado(s)`);
  return { codigo: "IMU", nome: "Imutabilidade e rastreio do emitente (R13/R14)", passou: ok, detalhes };
}

// ─── Executor da suíte ─────────────────────────────────────────────────────

export async function executarSuiteIntegridade(
  documentos: DocumentoIntegridade[]
): Promise<RelatorioIntegridade> {
  const testes: ResultadoTesteIntegridade[] = [
    verificarSequenciaSemLacunas(documentos),
    await verificarCadeiaHash(documentos),
    verificarConsistenciaTotais(documentos),
    verificarImutabilidadeDocumentos(documentos),
  ];

  const testesPassaram = testes.filter((t) => t.passou).length;
  const testesFalharam = testes.filter((t) => !t.passou).length;

  return {
    executadoEm: new Date().toISOString(),
    totalDocumentosAnalisados: documentos.length,
    testes,
    testesPassaram,
    testesFalharam,
    score: testes.length === 0 ? 100 : Math.round((testesPassaram / testes.length) * 100),
  };
}


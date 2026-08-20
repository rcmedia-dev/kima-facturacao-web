/**
 * T5.1 + T5.2 · Runner da Fase 5 — Testes de Conformidade & Simulação de Auditoria AGT
 *
 * Executa:
 *  1. Suíte de Testes de Carga e Integridade (T5.1) — sobre dados de demonstração
 *     realistas E (opcional) sobre os dados reais do Supabase, se configurado.
 *  2. Simulação de Auditoria AGT (T5.2) — checklist R1–R15 + F1–F7 com score.
 *
 * Uso:
 *  npm run test:agt
 *  node scripts/agt-fase5-teste.mts --real        # inclui dados reais do Supabase
 */

import { webcrypto } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  executarSuiteIntegridade,
  recalcularHashEncadeado,
  type DocumentoIntegridade,
} from "../lib/agt-conformidade.ts";
import { executarAuditoriaAGT, type ContextoAuditoriaAGT } from "../lib/agt-auditoria.ts";

type ChaveCripto = webcrypto.CryptoKey;

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "..", "output", "fase5");

// ─── Helpers criptográficos (RS256 autêntico — T1.2) ─────────────────────────

function base64Url(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlStr(texto: string): string {
  return base64Url(new TextEncoder().encode(texto));
}

async function gerarJWS(hash: string, numeroCompleto: string, privateKey: ChaveCripto): Promise<string> {
  const header = base64UrlStr(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64UrlStr(
    JSON.stringify({ hash, numeroCompleto, software: "Kima Fatura", emitidoEm: new Date().toISOString() })
  );
  const dados = new TextEncoder().encode(`${header}.${payload}`);
  const assinatura = await webcrypto.subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, privateKey, dados);
  return `${header}.${payload}.${base64Url(new Uint8Array(assinatura))}`;
}

async function gerarParChaves(): Promise<{ privateKey: ChaveCripto; publicKeyPem: string }> {
  const { publicKey, privateKey } = await webcrypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"]
  );
  const spki = await webcrypto.subtle.exportKey("spki", publicKey);
  const b64 = Buffer.from(spki).toString("base64");
  const linhas = b64.match(/.{1,64}/g)?.join("\n") || b64;
  return { privateKey, publicKeyPem: `-----BEGIN PUBLIC KEY-----\n${linhas}\n-----END PUBLIC KEY-----` };
}
// ─── Dados de demonstração (simulam uma emissão real — T1.1/T1.2/T1.3) ──────

async function gerarDatasetDemo(): Promise<{ docs: DocumentoIntegridade[]; ctx: ContextoAuditoriaAGT }> {
  const { privateKey } = await gerarParChaves();

  const docs: DocumentoIntegridade[] = [];
  // Cadeias de hash por tipo+série (igual à aplicação real — obterUltimoHashCadeia)
  const cadeias = new Map<string, string | null>();

  const criarDoc = async (dados: {
    tipo: string; serie: string; numero: number; dataEmissao: Date; status: string;
    formaPagamento: string; clienteNif?: string; linhas: { descricao: string; quantidade: number; preco: number; taxaIVA: number }[];
  }): Promise<DocumentoIntegridade> => {
    const linhas = dados.linhas.map((l) => ({
      descricao: l.descricao,
      quantidade: l.quantidade,
      preco: l.preco,
      taxaIVA: l.taxaIVA,
      total: l.quantidade * l.preco,
    }));
    const subtotal = linhas.reduce((s, l) => s + l.total, 0);
    const totalIVA = linhas.reduce((s, l) => s + l.total * (l.taxaIVA / 100), 0);
    const total = subtotal + totalIVA;
    const numeroCompleto = `${dados.serie}/${String(dados.numero).padStart(6, "0")}`;

    const chaveCadeia = `${dados.tipo}|${dados.serie}`;
    const hashAnteriorAtual = cadeias.get(chaveCadeia) || null;

    const docBase: DocumentoIntegridade = {
      id: `demo-${dados.tipo}-${dados.numero}`,
      companyId: "demo-company",
      tipo: dados.tipo,
      serie: dados.serie,
      numero: dados.numero,
      numeroCompleto,
      dataEmissao: dados.dataEmissao,
      formaPagamento: dados.formaPagamento,
      status: dados.status,
      subtotal,
      totalIVA,
      total,
      clienteNif: dados.clienteNif,
      hashAnterior: hashAnteriorAtual,
      linhas,
    };

    const hash = await recalcularHashEncadeado(docBase, hashAnteriorAtual);
    const assinaturaJWS = await gerarJWS(hash, numeroCompleto, privateKey);

    // Actualiza a cadeia DESTE tipo+série (chaining T1.1)
    cadeias.set(chaveCadeia, hash);

    return {
      ...docBase,
      hash,
      hashAnterior: hashAnteriorAtual,
      assinaturaJWS,
      qrPayload: `AGT|5418456688|${dados.tipo}|${dados.serie}|${dados.numero}|${numeroCompleto}|${new Date(dados.dataEmissao).toISOString()}|${subtotal.toFixed(2)}|${totalIVA.toFixed(2)}|${total.toFixed(2)}|${hash}|999/AGT/2026`,
      assinadoPor: "estelvio@rcmedia.ao",
      certAgtNumero: "999/AGT/2026",
    };
  };

  const hoje = new Date();
  docs.push(await criarDoc({
    tipo: "Fatura", serie: "A", numero: 1, dataEmissao: hoje,
    status: "Pago", formaPagamento: "Multicaixa", clienteNif: "5401123456",
    linhas: [
      { descricao: "Licenciamento Kima POS (mensal)", quantidade: 1, preco: 50000, taxaIVA: 14 },
      { descricao: "Serviço de suporte técnico", quantidade: 2, preco: 15000, taxaIVA: 14 },
    ],
  }));
  docs.push(await criarDoc({
    tipo: "Fatura", serie: "A", numero: 2, dataEmissao: hoje,
    status: "Pendente", formaPagamento: "Transferência", clienteNif: "005432198LA042",
    linhas: [
      { descricao: "Leitor de código de barras", quantidade: 3, preco: 8500, taxaIVA: 7 },
    ],
  }));
  docs.push(await criarDoc({
    tipo: "Fatura", serie: "A", numero: 3, dataEmissao: hoje,
    status: "Pago", formaPagamento: "POS", clienteNif: "5401123456",
    linhas: [
      { descricao: "Manutenção anual do sistema", quantidade: 1, preco: 120000, taxaIVA: 14 },
    ],
  }));
  docs.push(await criarDoc({
    tipo: "Orcamento", serie: "A", numero: 1, dataEmissao: hoje,
    status: "Pendente", formaPagamento: "Transferência", clienteNif: "5401123456",
    linhas: [{ descricao: "Instalação completa (proposta)", quantidade: 1, preco: 250000, taxaIVA: 14 }],
  }));
  docs.push(await criarDoc({
    tipo: "GuiaRemessa", serie: "A", numero: 1, dataEmissao: hoje,
    status: "Processado", formaPagamento: "Crédito", clienteNif: "5401123456",
    linhas: [{ descricao: "Transporte de mercadoria — lote 2026/08", quantidade: 10, preco: 2000, taxaIVA: 0 }],
  }));
  docs.push(await criarDoc({
    tipo: "NotaCredito", serie: "A", numero: 1, dataEmissao: hoje,
    status: "Pendente", formaPagamento: "Multicaixa", clienteNif: "5401123456",
    linhas: [{ descricao: "Devolução parcial — licenciamento", quantidade: 1, preco: 10000, taxaIVA: 14 }],
  }));

  const ctx: ContextoAuditoriaAGT = {
    empresa: {
      nome: "RC Media, Lda",
      nif: "5418456688",
      morada: "Luanda, Angola",
      softwareCertificacaoNumero: "999/AGT/2026",
    },
    documentos: docs,
    series: [
      { tipo: "Fatura", serie: "A", proximoNumero: 4 },
      { tipo: "Orcamento", serie: "A", proximoNumero: 2 },
      { tipo: "GuiaRemessa", serie: "A", proximoNumero: 2 },
      { tipo: "NotaCredito", serie: "A", proximoNumero: 2 },
    ],
    logsAuditoria: [
      { acao: "EMITIR_DOCUMENTO", entidade: "Documento" },
      { acao: "CRIAR", entidade: "Cliente" },
      { acao: "ATUALIZAR", entidade: "Documento" },
    ],
  };

  return { docs, ctx };
}

// ─── Modo real (Supabase) — dados reais da empresa ───────────────────────────

async function carregarDadosReais(companyId: string): Promise<ContextoAuditoriaAGT | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chave || !companyId) return null;

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, chave);

  const { data: docs, error } = await supabase
    .from("documentos")
    .select("id, tipo, serie, numero, numero_completo, data_emissao, forma_pagamento, status, subtotal, total_iva, total, hash, hash_anterior, assinatura_jws, qr_payload, assinado_por, cert_agt_numero, cliente:clientes!inner(nif)")
    .eq("company_id", companyId);

  if (error) {
    console.error("Supabase (documentos):", error.message);
    return null;
  }

  const documentos: DocumentoIntegridade[] = [];
  for (const d of docs || []) {
    const { data: linhas, error: eL } = await supabase
      .from("documento_linhas")
      .select("descricao, quantidade, preco, taxa_iva, total")
      .eq("documento_id", d.id);
    if (eL) console.warn("linhas:", eL.message);

    documentos.push({
      id: d.id,
      companyId,
      tipo: d.tipo,
      serie: d.serie || "A",
      numero: d.numero,
      numeroCompleto: d.numero_completo,
      dataEmissao: d.data_emissao,
      formaPagamento: d.forma_pagamento,
      status: d.status,
      subtotal: Number(d.subtotal),
      totalIVA: Number(d.total_iva),
      total: Number(d.total),
      hash: d.hash,
      hashAnterior: d.hash_anterior,
      assinaturaJWS: d.assinatura_jws,
      qrPayload: d.qr_payload,
      assinadoPor: d.assinado_por,
      certAgtNumero: d.cert_agt_numero,
      clienteNif: (d as { cliente?: { nif?: string | null } }).cliente?.nif,
      linhas: (linhas || []).map((l: { descricao: string; quantidade?: number | string; preco?: number | string; taxa_iva?: number | string; total?: number | string }) => ({
        descricao: l.descricao,
        quantidade: Number(l.quantidade),
        preco: Number(l.preco),
        taxaIVA: Number(l.taxa_iva),
        total: Number(l.total),
      })),
    });
  }

  const { data: empresa } = await supabase
    .from("company_settings")
    .select("settings")
    .eq("company_id", companyId)
    .maybeSingle();

  const { data: series } = await supabase
    .from("series_numeracao")
    .select("tipo_documento, serie, proximo_numero")
    .eq("company_id", companyId);

  const { count: logs } = await supabase
    .from("logs_auditoria")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  const settings = (empresa?.settings || {}) as Record<string, unknown>;
  return {
    empresa: {
      nome: (settings.nome_empresa as string) || "Empresa",
      nif: (settings.nif as string) || "",
      morada: (settings.morada as string) || undefined,
      softwareCertificacaoNumero: (settings.software_certificacao_numero as string) || null,
    },
    documentos,
    series: (series || []).map((s: { tipo_documento: string; serie: string; proximo_numero: number }) => ({ tipo: s.tipo_documento, serie: s.serie, proximoNumero: s.proximo_numero })),
    logsAuditoria: logs ? Array.from({ length: logs }) : [],
  };
}
// ─── Impressão de relatórios ─────────────────────────────────────────────────

function pintarBarra(score: number): string {
  const largura = 40;
  const preenchido = Math.round((score / 100) * largura);
  return "█".repeat(preenchido) + "░".repeat(Math.max(0, largura - preenchido));
}

function imprimirSuiteIntegridade(
  titulo: string,
  docs: DocumentoIntegridade[]
): Promise<import("../lib/agt-conformidade.ts").RelatorioIntegridade> {
  return executarSuiteIntegridade(docs).then((rel) => {
    console.log(`\n${"=".repeat(72)}`);
    console.log(`  🧪 T5.1 · ${titulo} — Suíte de Testes de Carga e Integridade`);
    console.log(`  ${rel.executadoEm}`);
    console.log(`  Documentos analisados: ${rel.totalDocumentosAnalisados}`);
    console.log(`${"=".repeat(72)}`);

    for (const t of rel.testes) {
      console.log(`\n  ${t.passou ? "✅" : "❌"} [${t.codigo}] ${t.nome} — ${t.passou ? "PASSOU" : "FALHOU"}`);
      for (const det of t.detalhes) console.log(`      · ${det}`);
    }

    console.log(`\n  Score de integridade: ${rel.score}%`);
    console.log(`  ${pintarBarra(rel.score)}`);
    return rel;
  });
}

async function imprimirAuditoria(titulo: string, ctx: ContextoAuditoriaAGT) {
  const rel = await executarAuditoriaAGT(ctx);
  console.log(`\n${"=".repeat(72)}`);
  console.log(`  🕵️  T5.2 · ${titulo} — Simulação de Auditoria AGT`);
  console.log(`  ${rel.executadoEm}`);
  console.log(`${"=".repeat(72)}`);

  for (const res of rel.resultados) {
    const prioridade = res.prioridade === "Crítico" ? "🔴" : res.prioridade === "Alto" ? "🟠" : "🟡";
    console.log(`  ${res.estado} ${prioridade} ${res.codigo} · ${res.nome}`);
    console.log(`      ${res.detalhe}`);
  }

  console.log(`\n  Obrigatórios conformes: ${rel.obrigatoriosConformes}/${rel.obrigatoriosTotais}`);
  console.log(`  Funcionais conformes:   ${rel.funcionaisConformes}/${rel.funcionaisTotais}`);
  console.log(`  SCORE GLOBAL: ${rel.score}%`);
  console.log(`  ${pintarBarra(rel.score)}`);
  return rel;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const usaReal = process.argv.includes("--real");
  const resultado: Record<string, unknown> = {};

  // 1) Dados de demonstração
  console.log("🎯 FASE 5 · Testes de Conformidade & Credenciação AGT");
  const { docs, ctx } = await gerarDatasetDemo();
  const relDemo = await imprimirSuiteIntegridade("DEMONSTRAÇÃO", docs);
  const audDemo = await imprimirAuditoria("DEMONSTRAÇÃO", ctx);
  resultado.demo = { integridade: relDemo, auditoria: audDemo };

  // 2) Dados reais (opcional)
  if (usaReal) {
    const companyId = process.env.NEXT_PUBLIC_COMPANY_ID || process.env.DEMO_COMPANY_ID;
    if (companyId) {
      const ctxReal = await carregarDadosReais(companyId);
      if (ctxReal) {
        const relReal = await imprimirSuiteIntegridade("DADOS REAIS (Supabase)", ctxReal.documentos);
        const audReal = await imprimirAuditoria("DADOS REAIS (Supabase)", ctxReal);
        resultado.real = { integridade: relReal, auditoria: audReal };
      } else {
        console.log("\n⚠️  Modo --real: não foi possível carregar dados do Supabase (verifique env vars).");
      }
    } else {
      console.log("\n⚠️  Modo --real: indique a empresa via NEXT_PUBLIC_COMPANY_ID ou DEMO_COMPANY_ID.");
    }
  }

  // 3) Persistir relatório
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const fich = join(OUTPUT_DIR, "relatorio-fase5.json");
  writeFileSync(fich, JSON.stringify(resultado, null, 2), "utf-8");
  console.log(`\n📄 Relatório guardado em: ${fich}`);

  // Exit code: 0 se todas as suítes de integridade passarem
  const sucesso = Object.values(resultado).every(
    (r: { integridade?: { testesFalharam: number } }) => r?.integridade?.testesFalharam === 0
  );
  process.exit(sucesso ? 0 : 1);
}

main().catch((e) => {
  console.error("Erro fatal:", e);
  process.exit(1);
});

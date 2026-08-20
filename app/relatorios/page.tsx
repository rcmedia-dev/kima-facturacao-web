"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useAppStore } from "@/lib/store";
import { useToastContext } from "@/components/ui/toast";
import { formatMoedaAOA, formatData } from "@/lib/formatters";
import { gerarResumoSAFT, exportarSAFTXML, validarDocumentoSAFT, validarEsquemaSAFT, gerarRelatorioDPIVA } from "@/lib/saft-generator";
import { validarXMLSAFT } from "@/lib/xsd-validator";
import { FileDown, FileJson, FileSpreadsheet, AlertTriangle, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Documento } from "@/lib/types";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function downloadFicheiro(conteudo: string, nome: string, tipo: string) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RelatoriosPage() {
  const store = useAppStore();
  const { success, error } = useToastContext();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  const hoje = new Date();
  const mesAnterior = hoje.getMonth() === 0 ? 12 : hoje.getMonth();
  const anoAnterior = hoje.getMonth() === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear();

  const [mes, setMes] = useState(mesAnterior);
  const [ano, setAno] = useState(anoAnterior);

  const resumo = useMemo(() => {
    if (!mounted) return null;
    return gerarResumoSAFT(
      store.documentos,
      store.clientes,
      store.logs,
      { nif: store.empresa?.nif || "", nome: store.empresa?.nomeEmpresa || "" },
      mes,
      ano,
      store.artigos
    );
  }, [mounted, store.documentos, store.clientes, store.logs, store.empresa, store.artigos, mes, ano]);

  const documentosDoPeriodo = useMemo(() => {
    if (!mounted) return [];
    return store.documentos.filter((d) => {
      const data = new Date(d.dataEmissao);
      return data.getMonth() + 1 === mes && data.getFullYear() === ano;
    });
  }, [mounted, store.documentos, mes, ano]);

  const problemasValidacao = useMemo(() => {
    if (!documentosDoPeriodo.length) return [];
    const problemas: { doc: Documento; erros: string[] }[] = [];
    documentosDoPeriodo.forEach((d) => {
      const v = validarDocumentoSAFT(d);
      if (!v.valido) problemas.push({ doc: d, erros: v.erros });
    });
    return problemas;
  }, [documentosDoPeriodo]);

  // T3.4 — Modelo DP-IVA (Declaração Periódica de IVA)
  const relatorioDPIVA = useMemo(() => {
    if (!mounted) return null;
    return gerarRelatorioDPIVA(store.documentos, mes, ano);
  }, [mounted, store.documentos, mes, ano]);

  const exportarDPIVACSV = () => {
    if (!relatorioDPIVA) return;
    const linhas = [
      ["Campo", "Valor"],
      ["Período", `${String(relatorioDPIVA.periodo.mes).padStart(2, "0")}/${relatorioDPIVA.periodo.ano}`],
      ["Incidência tributável IVA 14%", relatorioDPIVA.incidenciaTributavel.taxa14.toFixed(2)],
      ["Incidência tributável IVA 7%", relatorioDPIVA.incidenciaTributavel.taxa7.toFixed(2)],
      ["Incidência tributável IVA 0% (Isento)", relatorioDPIVA.incidenciaTributavel.taxa0.toFixed(2)],
      ["Imposto apurado 14%", relatorioDPIVA.impostoApurado.taxa14.toFixed(2)],
      ["Imposto apurado 7%", relatorioDPIVA.impostoApurado.taxa7.toFixed(2)],
      ["Total de imposto", relatorioDPIVA.impostoApurado.totalImposto.toFixed(2)],
      ["Base tributável global", relatorioDPIVA.totalGeral.baseTributavel.toFixed(2)],
      ["Faturação global do período", relatorioDPIVA.totalGeral.faturacaoGlobal.toFixed(2)],
    ];
    const csv = linhas.map((l) => l.join(";")).join("\n");
    downloadFicheiro(csv, `DP-IVA_${ano}-${String(mes).padStart(2, "0")}.csv`, "text/csv");
    success("DP-IVA exportado", "Dados para a Declaração Periódica gerados em CSV.");
  };

  if (!mounted || !resumo) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-5 animate-pulse">
        <div className="h-8 w-56 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  const exportarXML = () => {
    // T3.3 — validação sintática/estrutural (XSD) e semântica antes de exportar
    const esquema = validarEsquemaSAFT(resumo);
    const xml = exportarSAFTXML(resumo);
    const estrutural = validarXMLSAFT(xml);

    if (!esquema.valido || !estrutural.valido) {
      const falhas = [...esquema.erros, ...estrutural.erros];
      error("SAF-T com problemas", `${falhas.length} erro(s): ${falhas.slice(0, 3).join(" · ")}${falhas.length > 3 ? "…" : ""}`);
      return;
    }

    downloadFicheiro(xml, `SAFT_${ano}-${String(mes).padStart(2, "0")}.xml`, "application/xml");
    success("SAF-T exportado", `XML válido (XSD) — ${resumo.artigos?.length || 0} artigo(s), ${resumo.tabelaImpostos?.length || 0} taxa(s).`);
  };

  const exportarJSON = () => {
    downloadFicheiro(JSON.stringify(resumo, null, 2), `SAFT_${ano}-${String(mes).padStart(2, "0")}.json`, "application/json");
    success("SAF-T exportado", "Ficheiro JSON gerado com sucesso.");
  };

  const exportarCSV = () => {
    const linhas = [
      ["Tipo", "Série", "Quantidade", "Total"],
      ...resumo.documentos.map((d) => [d.tipo, d.serie, String(d.quantidade), d.total.toFixed(2)]),
    ];
    const csv = linhas.map((l) => l.join(";")).join("\n");
    downloadFicheiro(csv, `SAFT_${ano}-${String(mes).padStart(2, "0")}.csv`, "text/csv");
    success("SAF-T exportado", "Ficheiro CSV gerado com sucesso.");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950">
          <ShieldCheck size={20} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Relatórios & SAF-T</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ficheiro Normativo de Inspeção Tributária (Art. 25º — DP 71/25)
          </p>
        </div>
      </div>

      {/* Seleção de período */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-end gap-4">
        <div className="w-full sm:w-64">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Mês</label>
          <select
            value={mes}
            onChange={(e) => setMes(parseInt(e.target.value, 10))}
            className="input-kima"
          >
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-44">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Ano</label>
          <input
            type="number"
            min={2020}
            max={2100}
            value={ano}
            onChange={(e) => setAno(parseInt(e.target.value, 10) || new Date().getFullYear())}
            className="input-kima"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exportarXML} className="btn-primary h-10 px-4 text-xs">
            <FileDown className="w-4 h-4 mr-1.5" /> Exportar XML
          </button>
          <button onClick={exportarJSON} className="btn-outline h-10 px-4 text-xs">
            <FileJson className="w-4 h-4 mr-1.5" /> JSON
          </button>
          <button onClick={exportarCSV} className="btn-outline h-10 px-4 text-xs">
            <FileSpreadsheet className="w-4 h-4 mr-1.5" /> CSV
          </button>
        </div>
      </div>

      {/* Resumo do período */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Documentos</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {resumo.documentos.reduce((s, d) => s + d.quantidade, 0)}
          </p>
          <p className="text-xs text-slate-400 mt-1">{MESES[mes - 1]} {ano}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Faturado</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
            {formatMoedaAOA(resumo.totalIVA.total)}
          </p>
          <p className="text-xs text-slate-400 mt-1">IVA incluído</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">IVA Liquidado</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
            {formatMoedaAOA(resumo.totalIVA.taxa14 + resumo.totalIVA.taxa7)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            IVA 7%: {formatMoedaAOA(resumo.totalIVA.taxa7)} · IVA 14%: {formatMoedaAOA(resumo.totalIVA.taxa14)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Clientes</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{resumo.clientes.length}</p>
          <p className="text-xs text-slate-400 mt-1">com faturas no período</p>
        </div>
      </div>

      {/* Detalhe por tipo */}
      {resumo.documentos.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white text-sm">
            Documentos por tipo
          </div>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr className="text-slate-500 dark:text-slate-400 text-[11px]">
                <th className="text-left px-5 py-2.5 font-semibold">Tipo</th>
                <th className="text-left px-5 py-2.5 font-semibold">Série</th>
                <th className="text-center px-5 py-2.5 font-semibold">Quantidade</th>
                <th className="text-right px-5 py-2.5 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {resumo.documentos.map((d, i) => (
                <tr key={i}>
                  <td className="px-5 py-2.5 font-medium text-slate-900 dark:text-white">{d.tipo}</td>
                  <td className="px-5 py-2.5 font-mono">{d.serie}</td>
                  <td className="px-5 py-2.5 text-center font-mono">{d.quantidade}</td>
                  <td className="px-5 py-2.5 text-right font-mono">{formatMoedaAOA(d.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* T3.4 — Relatório DP-IVA (Declaração Periódica de IVA) */}
      {relatorioDPIVA && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
              <FileSpreadsheet className="w-4 h-4 text-blue-500" />
              Modelo DP-IVA — Declaração Periódica de IVA
            </div>
            <button onClick={exportarDPIVACSV} className="btn-outline h-8 px-3 text-[11px]">
              <FileDown className="w-3.5 h-3.5 mr-1" /> Exportar CSV
            </button>
          </div>
          <div className="p-5">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Dados para a Declaração Periódica de IVA · {MESES[mes - 1]} {ano} · Imposto cobrado (14%, 7% e isento)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr className="text-slate-500 dark:text-slate-400 text-[11px]">
                    <th className="text-left px-4 py-2.5 font-semibold">Taxa</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Incidência Tributável</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Imposto Apurado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">IVA 14%</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatMoedaAOA(relatorioDPIVA.incidenciaTributavel.taxa14)}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatMoedaAOA(relatorioDPIVA.impostoApurado.taxa14)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">IVA 7%</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatMoedaAOA(relatorioDPIVA.incidenciaTributavel.taxa7)}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatMoedaAOA(relatorioDPIVA.impostoApurado.taxa7)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">Isento (0%)</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatMoedaAOA(relatorioDPIVA.incidenciaTributavel.taxa0)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-400">—</td>
                  </tr>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold">
                    <td className="px-4 py-2.5 text-slate-900 dark:text-white">Total de imposto</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatMoedaAOA(relatorioDPIVA.totalGeral.baseTributavel)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-blue-600 dark:text-blue-400">{formatMoedaAOA(relatorioDPIVA.totalGeral.imposto)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-400 mt-3">
              Faturação global do período: {formatMoedaAOA(relatorioDPIVA.totalGeral.faturacaoGlobal)}
            </p>
          </div>
        </div>
      )}

      {/* Validação / problemas */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
          {problemasValidacao.length === 0 ? (
            <><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Documentos do período</>
          ) : (
            <><AlertTriangle className="w-4 h-4 text-amber-500" /> Documentos com problemas de conformidade</>
          )}
        </div>
        <div className="p-5">
          {documentosDoPeriodo.length === 0 ? (
            <p className="text-sm text-slate-400">Sem documentos no período selecionado.</p>
          ) : problemasValidacao.length === 0 ? (
            <p className="text-sm text-slate-500">
              Todos os {documentosDoPeriodo.length} documentos do período passaram na validação SAF-T
              (número, cliente/fornecedor, data, linhas e taxas de IVA).
            </p>
          ) : (
            <div className="space-y-3">
              {problemasValidacao.map((p) => (
                <div key={p.doc.id} className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 text-xs">
                  <p className="font-bold text-amber-900 dark:text-amber-300">
                    {p.doc.numeroCompleto || p.doc.numero} · {p.doc.tipo} · {formatData(new Date(p.doc.dataEmissao))}
                  </p>
                  <ul className="mt-1 list-disc list-inside text-amber-800 dark:text-amber-400 space-y-0.5">
                    {p.erros.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
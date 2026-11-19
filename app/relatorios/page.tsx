"use client";

import { useMemo, useState, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { useToastContext } from "@/components/ui/toast";
import { usePermissions } from "@/hooks/use-permissions";
import { formatMoedaAOA, formatData } from "@/lib/formatters";
import { gerarResumoSAFT, exportarSAFTXML, validarDocumentoSAFT, validarEsquemaSAFT, gerarRelatorioDPIVA } from "@/lib/saft-generator";
import { validarXMLSAFT } from "@/lib/xsd-validator";
import { FileDown, FileJson, FileSpreadsheet, AlertTriangle, ShieldCheck, CheckCircle2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
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
  const router = useRouter();
  const { can, loaded: permsLoaded } = usePermissions();
  const store = useAppStore();
  const { success, error } = useToastContext();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  // Verificar permissão
  useEffect(() => {
    if (permsLoaded && !can("reports.view")) {
      router.replace("/acesso-negado");
    }
  }, [permsLoaded, can, router]);

  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();

  const [mes, setMes] = useState(mesAtual);
  const [ano, setAno] = useState(anoAtual);
  const [activeTab, setActiveTab] = useState<"documentos" | "dpiva" | "validacao">("documentos");

  const navegarMes = (direcao: -1 | 1) => {
    let novoMes = mes + direcao;
    let novoAno = ano;
    if (novoMes < 1) { novoMes = 12; novoAno--; }
    if (novoMes > 12) { novoMes = 1; novoAno++; }
    setMes(novoMes);
    setAno(novoAno);
  };

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

  const totalDocumentos = resumo?.documentos.reduce((s, d) => s + d.quantidade, 0) ?? 0;
  const totalFaturado = resumo?.totalIVA.total ?? 0;
  const totalIVA = (resumo?.totalIVA.taxa14 ?? 0) + (resumo?.totalIVA.taxa7 ?? 0);
  const totalClientes = resumo?.clientes.length ?? 0;

  const abreviarValor = (v: number): string => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".0", "")}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
    return String(v);
  };

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

  if (!permsLoaded || !can("reports.view")) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={24} className="animate-spin text-blue-600" />
      </div>
    );
  }

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
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">

      {/* ═══════════════════════════════════════════════════════════════
          ALL MOBILE CONTENT
          ═══════════════════════════════════════════════════════════════ */}
      <div className="sm:hidden space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-[800] text-slate-900 dark:text-white">Relatórios & SAF-T</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Art. 25, DP 71/25</p>
          </div>
          <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
            <ShieldCheck size={18} />
          </div>
        </div>

        {/* Period Selector */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[12px] p-3 shadow-sm flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500 shrink-0"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <select
            value={mes}
            onChange={(e) => setMes(parseInt(e.target.value, 10))}
            className="flex-1 text-[12px] font-[600] text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 font-[inherit]"
          >
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>{m} {ano}</option>
            ))}
          </select>
          <div className="flex gap-1">
            <button onClick={() => navegarMes(-1)} className="w-7 h-7 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => navegarMes(1)} className="w-7 h-7 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Compact Stats Bar */}
        <div className="flex gap-px bg-slate-200 dark:bg-slate-700 rounded-[10px] overflow-hidden">
          <div className="flex-1 bg-white dark:bg-slate-900 py-2.5 text-center">
            <p className="text-[16px] font-[800] text-slate-900 dark:text-white">{totalDocumentos}</p>
            <p className="text-[9px] font-[600] uppercase tracking-wider text-slate-400">Docs</p>
          </div>
          <div className="flex-1 bg-white dark:bg-slate-900 py-2.5 text-center">
            <p className="text-[14px] font-[800] text-slate-900 dark:text-white font-mono">{abreviarValor(totalFaturado)}</p>
            <p className="text-[9px] font-[600] uppercase tracking-wider text-slate-400">Faturado</p>
          </div>
          <div className="flex-1 bg-white dark:bg-slate-900 py-2.5 text-center">
            <p className="text-[14px] font-[800] text-violet-600 dark:text-violet-400 font-mono">{abreviarValor(totalIVA)}</p>
            <p className="text-[9px] font-[600] uppercase tracking-wider text-slate-400">IVA</p>
          </div>
          <div className="flex-1 bg-white dark:bg-slate-900 py-2.5 text-center">
            <p className="text-[16px] font-[800] text-teal-600 dark:text-teal-400">{totalClientes}</p>
            <p className="text-[9px] font-[600] uppercase tracking-wider text-slate-400">Clientes</p>
          </div>
        </div>

        {/* Segmented Tabs */}
        <div className="flex gap-1.5">
          <button onClick={() => setActiveTab("documentos")} className={`flex-1 py-2.5 px-2 rounded-[10px] text-[11px] font-[700] border-[1.5px] text-center transition-all ${activeTab === "documentos" ? "bg-blue-600 text-white border-blue-600 shadow-[0_2px_8px_rgba(59,130,246,0.25)]" : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"}`}>Documentos</button>
          <button onClick={() => setActiveTab("dpiva")} className={`flex-1 py-2.5 px-2 rounded-[10px] text-[11px] font-[700] border-[1.5px] text-center transition-all ${activeTab === "dpiva" ? "bg-blue-600 text-white border-blue-600 shadow-[0_2px_8px_rgba(59,130,246,0.25)]" : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"}`}>DP-IVA</button>
          <button onClick={() => setActiveTab("validacao")} className={`flex-1 py-2.5 px-2 rounded-[10px] text-[11px] font-[700] border-[1.5px] text-center transition-all ${activeTab === "validacao" ? "bg-blue-600 text-white border-blue-600 shadow-[0_2px_8px_rgba(59,130,246,0.25)]" : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"}`}>Validação</button>
        </div>

        {/* Export Buttons */}
        <div className="flex gap-1.5">
          <button onClick={exportarXML} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-[8px] bg-blue-600 text-white text-[11px] font-[700] border-none cursor-pointer font-[inherit]">
            <FileDown size={12} /> XML
          </button>
          <button onClick={exportarJSON} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-[8px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-[700] cursor-pointer font-[inherit]">
            <FileJson size={12} /> JSON
          </button>
          <button onClick={exportarCSV} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-[8px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-[700] cursor-pointer font-[inherit]">
            <FileSpreadsheet size={12} /> CSV
          </button>
        </div>

        {/* Tab: Documentos */}
        {activeTab === "documentos" && (
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-[500] mb-2">
              {resumo.documentos.length} tipos de documento
            </p>
            {resumo.documentos.map((d, i) => {
              const pct = totalDocumentos > 0 ? (d.quantidade / totalDocumentos) * 100 : 0;
              const colors = ["blue", "emerald", "amber", "violet", "rose"];
              const color = colors[i % colors.length];
              return (
                <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[12px] p-3.5 shadow-sm mb-2 border-l-[3px] border-l-blue-500">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-[700] bg-${color}-50 text-${color}-700 dark:bg-${color}-950/60 dark:text-${color}-400`}>{d.serie}</span>
                      <p className="text-[13px] font-[600] text-slate-900 dark:text-white">{d.tipo}</p>
                    </div>
                    <p className={`text-[14px] font-[800] text-${color}-600 dark:text-${color}-400 font-mono`}>{formatMoedaAOA(d.total)}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-400">{d.quantidade} documentos</p>
                    <div className="w-20 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full bg-${color}-500 rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab: DP-IVA */}
        {activeTab === "dpiva" && relatorioDPIVA && (
          <div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[12px] shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-3.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet size={14} className="text-blue-500" />
                  <p className="text-[12px] font-[700] text-slate-900 dark:text-white">DP-IVA</p>
                </div>
                <button onClick={exportarDPIVACSV} className="flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[10px] font-[600] text-slate-500 cursor-pointer font-[inherit]">
                  <FileDown size={10} /> CSV
                </button>
              </div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-left px-3.5 py-2 font-[700] text-slate-500 uppercase tracking-wider">Taxa</th>
                    <th className="text-right px-3.5 py-2 font-[700] text-slate-500 uppercase tracking-wider">Incidência</th>
                    <th className="text-right px-3.5 py-2 font-[700] text-slate-500 uppercase tracking-wider">Imposto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-3.5 py-2.5 font-[600] text-slate-900 dark:text-white">IVA 14%</td>
                    <td className="px-3.5 py-2.5 text-right font-mono">{formatMoedaAOA(relatorioDPIVA.incidenciaTributavel.taxa14)}</td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-violet-600 dark:text-violet-400">{formatMoedaAOA(relatorioDPIVA.impostoApurado.taxa14)}</td>
                  </tr>
                  <tr className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-3.5 py-2.5 font-[600] text-slate-900 dark:text-white">IVA 7%</td>
                    <td className="px-3.5 py-2.5 text-right font-mono">{formatMoedaAOA(relatorioDPIVA.incidenciaTributavel.taxa7)}</td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-violet-600 dark:text-violet-400">{formatMoedaAOA(relatorioDPIVA.impostoApurado.taxa7)}</td>
                  </tr>
                  <tr className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-3.5 py-2.5 font-[600] text-slate-900 dark:text-white">Isento</td>
                    <td className="px-3.5 py-2.5 text-right font-mono">{formatMoedaAOA(relatorioDPIVA.incidenciaTributavel.taxa0)}</td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-slate-400">—</td>
                  </tr>
                  <tr className="bg-blue-50 dark:bg-blue-950/20 border-t border-blue-100 dark:border-blue-900/40">
                    <td className="px-3.5 py-2.5 font-[800] text-blue-700 dark:text-blue-400">Total</td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-[800] text-blue-700 dark:text-blue-400">{formatMoedaAOA(relatorioDPIVA.totalGeral.baseTributavel)}</td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-[800] text-blue-700 dark:text-blue-400">{formatMoedaAOA(relatorioDPIVA.totalGeral.imposto)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 px-1">
              Faturação global: {formatMoedaAOA(relatorioDPIVA.totalGeral.faturacaoGlobal)}
            </p>
          </div>
        )}

        {/* Tab: Validação */}
        {activeTab === "validacao" && (
          <div>
            {documentosDoPeriodo.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[12px] p-6 text-center shadow-sm">
                <p className="text-[13px] text-slate-400">Sem documentos no período</p>
              </div>
            ) : problemasValidacao.length === 0 ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-[12px] p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white shrink-0">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <p className="text-[12px] font-[700] text-emerald-700 dark:text-emerald-400">Todos válidos</p>
                  <p className="text-[10px] text-emerald-600/70">{documentosDoPeriodo.length}/{documentosDoPeriodo.length} documentos verificados</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-[12px] p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white shrink-0">
                    <AlertTriangle size={16} />
                  </div>
                  <div>
                    <p className="text-[12px] font-[700] text-amber-700 dark:text-amber-400">{problemasValidacao.length} com problemas</p>
                    <p className="text-[10px] text-amber-600/70">{documentosDoPeriodo.length - problemasValidacao.length} válidos de {documentosDoPeriodo.length}</p>
                  </div>
                </div>
                {problemasValidacao.map((p) => (
                  <div key={p.doc.id} className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 rounded-[12px] p-3 shadow-sm">
                    <p className="text-[11px] font-[700] text-slate-900 dark:text-white">
                      {p.doc.numeroCompleto || p.doc.numero} · {p.doc.tipo}
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {p.erros.map((e, i) => (
                        <li key={i} className="text-[10px] text-amber-700 dark:text-amber-400">• {e}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ALL DESKTOP CONTENT (original, unchanged)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="hidden sm:block space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30">
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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-end gap-4">
          <div className="w-full sm:w-64">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Mês</label>
            <select value={mes} onChange={(e) => setMes(parseInt(e.target.value, 10))} className="input-kima">
              {MESES.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-44">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Ano</label>
            <input type="number" min={2020} max={2100} value={ano} onChange={(e) => setAno(parseInt(e.target.value, 10) || new Date().getFullYear())} className="input-kima" />
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Documentos</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {resumo.documentos.reduce((s, d) => s + d.quantidade, 0)}
            </p>
            <p className="text-xs text-slate-400 mt-1">{MESES[mes - 1]} {ano}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Faturado</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
              {formatMoedaAOA(resumo.totalIVA.total)}
            </p>
            <p className="text-xs text-slate-400 mt-1">IVA incluído</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">IVA Liquidado</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
              {formatMoedaAOA(resumo.totalIVA.taxa14 + resumo.totalIVA.taxa7)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              IVA 7%: {formatMoedaAOA(resumo.totalIVA.taxa7)} · IVA 14%: {formatMoedaAOA(resumo.totalIVA.taxa14)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Clientes</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{resumo.clientes.length}</p>
            <p className="text-xs text-slate-400 mt-1">com documentos no período</p>
          </div>
        </div>

        {/* Detalhe por tipo */}
        {resumo.documentos.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white text-sm">
              Documentos por tipo
            </div>
            <div className="overflow-x-auto pb-2">
              <table className="w-full text-xs min-w-[500px] sm:min-w-full">
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
          </div>
        )}

        {/* DP-IVA */}
        {relatorioDPIVA && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
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
              <div className="overflow-x-auto pb-2">
                <table className="w-full text-xs min-w-[500px] sm:min-w-full">
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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
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
    </div>
  );
}
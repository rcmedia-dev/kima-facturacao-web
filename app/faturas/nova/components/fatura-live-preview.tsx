"use client";

import { Cliente, FaturaLinha, TipoDocumento } from "@/lib/types";
import { formatMoedaAOA, formatData } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { FileText, Building2, User, Sparkles, ShieldCheck } from "lucide-react";

interface FaturaLivePreviewProps {
  tipoDocumento: TipoDocumento;
  clienteSelecionado: Cliente | null;
  linhas: FaturaLinha[];
  subtotal: number;
  totalIVA: number;
  total: number;
  empresa?: {
    nome?: string;
    nif?: string;
    morada?: string;
    telefone?: string;
    email?: string;
  };
}

export function FaturaLivePreview({
  tipoDocumento,
  clienteSelecionado,
  linhas,
  subtotal,
  totalIVA,
  total,
  empresa,
}: FaturaLivePreviewProps) {
  const nomeEmpresa = empresa?.nome || "Kima Financeiro, Lda";
  const nifEmpresa = empresa?.nif || "5000123456";
  const moradaEmpresa = empresa?.morada || "Av. 4 de Fevereiro, Luanda, Angola";

  const getDocTheme = (tipo: TipoDocumento) => {
    switch (tipo) {
      case "Fatura":
        return { accent: "from-blue-600 to-indigo-600", badgeBg: "bg-blue-50 text-blue-700 border-blue-200", border: "border-blue-500", glow: "shadow-blue-500/10" };
      case "FaturaRecibo":
        return { accent: "from-emerald-600 to-teal-600", badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200", border: "border-emerald-500", glow: "shadow-emerald-500/10" };
      case "NotaCredito":
        return { accent: "from-amber-500 to-orange-600", badgeBg: "bg-amber-50 text-amber-700 border-amber-200", border: "border-amber-500", glow: "shadow-amber-500/10" };
      case "NotaDebito":
        return { accent: "from-rose-600 to-pink-600", badgeBg: "bg-rose-50 text-rose-700 border-rose-200", border: "border-rose-500", glow: "shadow-rose-500/10" };
      case "Orcamento":
        return { accent: "from-slate-700 to-zinc-800", badgeBg: "bg-slate-100 text-slate-800 border-slate-300", border: "border-slate-500", glow: "shadow-slate-500/10" };
      case "Recibo":
        return { accent: "from-emerald-600 to-green-700", badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200", border: "border-emerald-500", glow: "shadow-emerald-500/10" };
      default:
        return { accent: "from-blue-600 to-indigo-600", badgeBg: "bg-blue-50 text-blue-700 border-blue-200", border: "border-blue-500", glow: "shadow-blue-500/10" };
    }
  };

  const theme = getDocTheme(tipoDocumento);

  return (
    <div className={`bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden text-slate-800 text-xs font-sans transition-all duration-300 ${theme.glow}`}>
      {/* Barra superior estilo Glassmorphism / Minimalista moderno */}
      <div className="bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-400/30">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
          </div>
          <div>
            <p className="font-semibold tracking-wide uppercase text-[11px] text-slate-200">Live Invoice Preview</p>
            <p className="text-[9px] text-slate-400">Sincronizado em tempo real</p>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border shadow-sm ${theme.badgeBg}`}>
          {tipoDocumento}
        </span>
      </div>

      {/* Papel Digital / Layout A4 Moderno */}
      <div className="p-6 sm:p-7 space-y-6 bg-gradient-to-b from-white via-slate-50/40 to-slate-100/50 min-h-[500px] flex flex-col justify-between">
        <div className="space-y-6">
          {/* Header da Empresa & Marca d'água de Estética */}
          <div className="flex justify-between items-start pb-5 border-b border-slate-200/60 relative">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${theme.accent}`} />
                <h2 className="font-extrabold text-slate-900 text-sm tracking-tight">{nomeEmpresa}</h2>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">NIF: <span className="font-mono text-slate-700">{nifEmpresa}</span></p>
              <p className="text-[11px] text-slate-500 max-w-[210px] leading-relaxed">{moradaEmpresa}</p>
            </div>
            <div className="text-right bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Documento</span>
              <span className="font-black text-slate-900 text-xs tracking-tight uppercase block mt-0.5">{tipoDocumento}</span>
              <div className="mt-1.5 inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-[9px] font-mono text-slate-600 font-semibold">
                Série A • Rascunho
              </div>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">{formatData(new Date())}</p>
            </div>
          </div>

          {/* Dados do Cliente - Cartão Moderno */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/70 shadow-sm relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${theme.accent}`} />
            <div className="flex items-center gap-2 text-slate-700 font-bold mb-1.5 text-[11px] uppercase tracking-wider">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Entidade / Cliente</span>
            </div>
            {clienteSelecionado ? (
              <div className="space-y-1 pl-1">
                <p className="font-bold text-slate-900 text-sm">{clienteSelecionado.nome}</p>
                <div className="flex items-center gap-3 text-[11px] text-slate-600">
                  <span>NIF: <strong className="font-mono text-slate-900">{clienteSelecionado.nif}</strong></span>
                  {clienteSelecionado.telefone && <span>Tel: {clienteSelecionado.telefone}</span>}
                </div>
                {clienteSelecionado.morada && <p className="text-[11px] text-slate-500 truncate">{clienteSelecionado.morada}</p>}
              </div>
            ) : (
              <div className="py-2 pl-1">
                <p className="text-slate-400 italic text-[11px]">Nenhum cliente selecionado. Selecione no Passo 1...</p>
              </div>
            )}
          </div>

          {/* Tabela de Linhas - Estilo Minimalista Pinterest */}
          <div>
            <div className="rounded-2xl border border-slate-200/80 overflow-hidden bg-white shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b border-slate-200/80">
                    <th className="py-2.5 px-3">Artigo / Descrição</th>
                    <th className="py-2.5 px-2 text-center">Qtd</th>
                    <th className="py-2.5 px-2 text-right">Preço</th>
                    <th className="py-2.5 px-2 text-right">IVA</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {linhas.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400 italic">
                        Adicione artigos no Passo 2 para ver a tabela preenchida...
                      </td>
                    </tr>
                  ) : (
                    linhas.map((linha, idx) => {
                      const base = linha.quantidade * linha.preco;
                      const valIva = (base * linha.taxaIVA) / 100;
                      const totLinha = base + valIva;
                      return (
                        <tr key={linha.id || idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 font-medium text-slate-900 max-w-[140px] truncate">
                            {linha.descricao}
                          </td>
                          <td className="py-2.5 px-2 text-center font-semibold text-slate-700">{linha.quantidade}</td>
                          <td className="py-2.5 px-2 text-right text-slate-600 font-mono">{formatMoedaAOA(linha.preco)}</td>
                          <td className="py-2.5 px-2 text-right text-slate-500 font-medium">{linha.taxaIVA}%</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">{formatMoedaAOA(totLinha)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Rodapé e Totais - Destaque Visual */}
        <div className="pt-4 border-t border-slate-200/80 space-y-2 bg-slate-50/70 p-4 rounded-2xl border">
          <div className="flex justify-between text-[11px] text-slate-600">
            <span>Subtotal (Incidência):</span>
            <span className="font-semibold font-mono text-slate-800">{formatMoedaAOA(subtotal)}</span>
          </div>
          <div className="flex justify-between text-[11px] text-slate-600">
            <span>Total IVA:</span>
            <span className="font-semibold font-mono text-slate-800">{formatMoedaAOA(totalIVA)}</span>
          </div>
          <div className="flex justify-between items-center text-xs font-black text-slate-900 pt-2.5 border-t border-slate-200">
            <span className="tracking-wide uppercase text-[11px]">Total a Pagar:</span>
            <span className="text-blue-600 text-base font-mono font-black">{formatMoedaAOA(total)}</span>
          </div>

          <div className="pt-2 flex items-center justify-center gap-1.5 text-[9px] text-slate-400 font-medium border-t border-slate-200/60 mt-2">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Processado por Kima Financeiro • Certificado para Angola</span>
          </div>
        </div>
      </div>
    </div>
  );
}

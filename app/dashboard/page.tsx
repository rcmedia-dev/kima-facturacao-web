"use client";

import { useAppStore } from "@/lib/store";
import { formatMoedaAOA } from "@/lib/formatters";
import { ArrowRight, FileText, FileMinus, FileClock, HandCoins, FilePlus2, Receipt, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { TipoDocumento } from "@/lib/types";
import { DashboardFaturaTable } from "./components/dashboard-fatura-table";
import { DashboardGraficoFaturacao } from "./components/dashboard-grafico-faturacao";

const QUICK_TIPOS: {
  tipo: TipoDocumento;
  label: string;
  Icon: LucideIcon;
  icon: string;
}[] = [
  {
    tipo: "Fatura",
    label: "Factura",
    Icon: FileText,
    icon: "bg-blue-600",
  },
  {
    tipo: "FaturaRecibo",
    label: "Factura-Recibo",
    Icon: Receipt,
    icon: "bg-emerald-600",
  },
  {
    tipo: "NotaCredito",
    label: "Nota de Crédito",
    Icon: FileMinus,
    icon: "bg-rose-600",
  },
  {
    tipo: "NotaDebito",
    label: "Nota de Débito",
    Icon: FilePlus2,
    icon: "bg-orange-500",
  },
  {
    tipo: "Orcamento",
    label: "Factura pro-forma",
    Icon: FileClock,
    icon: "bg-violet-600",
  },
  {
    tipo: "Recibo",
    label: "Recibo",
    Icon: HandCoins,
    icon: "bg-green-600",
  },
];

export default function DashboardPage() {
  const documentos = useAppStore((s) => s.documentos);
  const clientes = useAppStore((s) => s.clientes);

  // Filtrar apenas faturas ativas (não canceladas)
  const todasFaturas = documentos.filter(
    (d) => d.tipo === "Fatura" || d.tipo === "FaturaRecibo"
  );
  const faturasValidas = todasFaturas.filter((f) => f.status !== "Cancelado");

  // Métricas do Mês Atual
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999);

  const faturasEsteMes = faturasValidas.filter((f) => {
    const d = new Date(f.dataEmissao);
    return d >= inicioMes && d <= fimMes;
  });

  const totalFaturadoMes = faturasEsteMes.reduce((sum, f) => sum + (f.total || 0), 0);
  const faturasPendentes = faturasValidas.filter((f) => f.status === "Pendente");
  const totalClientes = clientes.length;
  const totalFaturas = faturasValidas.length;

  const ultimasFaturas = [...todasFaturas]
    .sort((a, b) => new Date(b.dataEmissao).getTime() - new Date(a.dataEmissao).getTime())
    .slice(0, 6);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-slide-up">

      {/* ════════════════════════════════════════════════════════
          MOBILE — < sm
          ════════════════════════════════════════════════════════ */}

      {/* ── MO: SAUDAÇÃO + MÉTRICA DESTAQUE ── */}
      <div className="sm:hidden relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 rounded-2xl p-5 text-white">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-base font-bold text-white">Bom dia, Km</p>
              <p className="text-xs text-blue-200/70 mt-0.5">Gerir factuação simplificado</p>
            </div>
            <div className="inline-block bg-white/15 backdrop-blur-sm rounded-lg px-3 py-1 text-[11px] font-semibold">
              Set 2026
            </div>
          </div>
          <p className="text-[11px] font-medium text-blue-200 uppercase tracking-wider">Faturado este mês</p>
          <p className="text-3xl font-extrabold tracking-tight mt-1">{formatMoedaAOA(totalFaturadoMes)}</p>
          <p className="text-[12px] text-blue-100 mt-1">
            {faturasEsteMes.length} {faturasEsteMes.length === 1 ? "documento emitido" : "documentos emitidos"}
          </p>
        </div>
      </div>

      {/* ── MO: MINI STATS ── */}
      <div className="sm:hidden grid grid-cols-3 gap-2.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Pendentes</span>
          </div>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white">{faturasPendentes.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Clientes</span>
          </div>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white">{totalClientes}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Faturas</span>
          </div>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white">{totalFaturas}</p>
        </div>
      </div>

      {/* ── MO: CRIAÇÃO RÁPIDA — scroll horizontal ── */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h3 className="font-bold text-slate-900 dark:text-white text-base">Criação Rápida</h3>
          <Link href="/faturas/nova" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
            Ver todas <ArrowRight size={13} />
          </Link>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
          {QUICK_TIPOS.map(({ tipo, label, Icon, icon }) => (
            <Link
              key={tipo}
              href={`/faturas/nova?tipo=${tipo}`}
              className="flex items-center gap-3 flex-shrink-0 snap-start bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-all duration-150 active:scale-[0.97]"
            >
              <span className={`w-9 h-9 rounded-lg ${icon} text-white flex items-center justify-center shadow-sm`}>
                <Icon size={17} />
              </span>
              <span className="text-[13px] font-semibold text-slate-900 dark:text-white whitespace-nowrap">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── MO: ÚLTIMAS FATURAS ── */}
      <div className="sm:hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Últimas Faturas</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Documentos emitidos recentemente</p>
          </div>
          <Link href="/faturas" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
            Ver Todas <ArrowRight size={15} />
          </Link>
        </div>
        <div className="p-0">
          <DashboardFaturaTable faturas={ultimasFaturas} />
        </div>
      </div>

      {/* ── MO: GRÁFICO ── */}
      <div className="sm:hidden">
        <DashboardGraficoFaturacao />
      </div>

      {/* ════════════════════════════════════════════════════════
          DESKTOP — ≥ sm (original)
          ════════════════════════════════════════════════════════ */}

      {/* ── DESKTOP: 4 CARDS DE MÉTRICA ── */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturado Este Mês */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Faturado Este Mês</p>
            <span className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{formatMoedaAOA(totalFaturadoMes)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{faturasEsteMes.length} doc. emitidos</p>
        </div>

        {/* Faturas Pendentes */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Faturas Pendentes</p>
            <span className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-500 dark:text-amber-400 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{faturasPendentes.length}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Aguardam pagamento</p>
        </div>

        {/* Clientes Activos */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Clientes Activos</p>
            <span className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalClientes}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Base de clientes</p>
        </div>

        {/* Total de Faturas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total de Faturas</p>
            <span className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalFaturas}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Documentos emitidos</p>
        </div>
      </div>

      {/* ── DESKTOP: CRIAÇÃO RÁPIDA — grid 2×3 ── */}
      <div className="hidden sm:block">
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Criação Rápida de Documentos</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Emite um documento em segundos — o tipo já vem selecionado
            </p>
          </div>
          <Link
            href="/faturas/nova"
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            Todas as opções <ArrowRight size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_TIPOS.map(({ tipo, label, Icon, icon }) => (
            <Link
              key={tipo}
              href={`/faturas/nova?tipo=${tipo}`}
              className="flex flex-col items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-150 active:scale-[0.97]"
            >
              <span className={`w-11 h-11 rounded-xl ${icon} text-white flex items-center justify-center shadow-sm`}>
                <Icon size={20} />
              </span>
              <span className="text-[13px] font-semibold text-slate-900 dark:text-white text-center">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── DESKTOP: ÚLTIMAS FATURAS ── */}
      <div className="hidden sm:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Últimas Faturas</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Documentos emitidos recentemente</p>
          </div>
          <Link
            href="/faturas"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            Ver Todas <ArrowRight size={15} />
          </Link>
        </div>
        <div className="p-0">
          <DashboardFaturaTable faturas={ultimasFaturas} />
        </div>
      </div>

      {/* ── DESKTOP: GRÁFICO DE EVOLUÇÃO ── */}
      <div className="hidden sm:block">
        <DashboardGraficoFaturacao />
      </div>

    </div>
  );
}

"use client";

import { useAppStore } from "@/lib/store";
import { formatMoedaAOA } from "@/lib/formatters";
import { ArrowRight, TrendingUp, Clock, Users, Receipt, FileText, FileMinus, FileClock, HandCoins, FilePlus2, Plus, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { TipoDocumento } from "@/lib/types";
import { DashboardFaturaTable } from "./components/dashboard-fatura-table";

const QUICK_TIPOS: {
  tipo: TipoDocumento;
  label: string;
  Icon: LucideIcon;
  btn: string;
  icon: string;
}[] = [
  {
    tipo: "Fatura",
    label: "Factura",
    Icon: FileText,
    btn: "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40",
    icon: "bg-blue-600",
  },
  {
    tipo: "FaturaRecibo",
    label: "Factura-Recibo",
    Icon: Receipt,
    btn: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40",
    icon: "bg-emerald-600",
  },
  {
    tipo: "NotaCredito",
    label: "Nota de Crédito",
    Icon: FileMinus,
    btn: "bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900 text-rose-800 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40",
    icon: "bg-rose-600",
  },
  {
    tipo: "NotaDebito",
    label: "Nota de Débito",
    Icon: FilePlus2,
    btn: "bg-orange-50 dark:bg-orange-950/30 border-orange-100 dark:border-orange-900 text-orange-800 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/40",
    icon: "bg-orange-500",
  },
  {
    tipo: "Orcamento",
    label: "Factura pro-forma",
    Icon: FileClock,
    btn: "bg-violet-50 dark:bg-violet-950/30 border-violet-100 dark:border-violet-900 text-violet-800 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40",
    icon: "bg-violet-600",
  },
  {
    tipo: "Recibo",
    label: "Recibo",
    Icon: HandCoins,
    btn: "bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900 text-green-800 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40",
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
    <div className="max-w-7xl mx-auto px-2 py-2 space-y-6 animate-slide-up">

      {/* ── MÉTRICAS ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Faturado este Mês
            </span>
            <span className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <TrendingUp size={16} />
            </span>
          </div>
          <p className="text-[22px] font-extrabold leading-tight text-slate-900 dark:text-white mt-1.5">
            {formatMoedaAOA(totalFaturadoMes)}
          </p>
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            {faturasEsteMes.length} {faturasEsteMes.length === 1 ? "doc. emitido" : "doc. emitidos"}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Faturas Pendentes
            </span>
            <span className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock size={16} />
            </span>
          </div>
          <p className="text-[22px] font-extrabold leading-tight text-slate-900 dark:text-white mt-1.5">
            {faturasPendentes.length}
          </p>
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Aguardam pagamento
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Clientes Activos
            </span>
            <span className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Users size={16} />
            </span>
          </div>
          <p className="text-[22px] font-extrabold leading-tight text-slate-900 dark:text-white mt-1.5">
            {totalClientes}
          </p>
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Base de clientes
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total de Faturas
            </span>
            <span className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Receipt size={16} />
            </span>
          </div>
          <p className="text-[22px] font-extrabold leading-tight text-slate-900 dark:text-white mt-1.5">
            {totalFaturas}
          </p>
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Documentos emitidos
          </p>
        </div>
      </div>

      {/* ── CRIAÇÃO RÁPIDA ──────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Criação Rápida de Documentos
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Emita um documento em segundos — o tipo já vem selecionado
            </p>
          </div>
          <Link
            href="/faturas/nova"
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            Todas as opções
            <ArrowRight size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {QUICK_TIPOS.map(({ tipo, label, Icon, btn, icon }) => (
            <Link
              key={tipo}
              href={`/faturas/nova?tipo=${tipo}`}
              className={`flex flex-col items-start gap-2 p-3 rounded-xl border transition-all duration-150 ${btn}`}
            >
              <span className={`w-8 h-8 rounded-lg ${icon} text-white flex items-center justify-center shadow-sm`}>
                <Icon size={16} />
              </span>
              <span className="text-xs font-bold leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── ÚLTIMAS FATURAS ──────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Últimas Faturas
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Documentos emitidos recentemente
            </p>
          </div>
          <Link
            href="/faturas"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            Ver Todas
            <ArrowRight size={15} />
          </Link>
        </div>

        {/* Tabela */}
        <div className="p-0">
          <DashboardFaturaTable faturas={ultimasFaturas} />
        </div>
      </div>

      {/* ── CTA NOVA FATURA ──────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 rounded-xl p-6 shadow-md">
        {/* Círculo decorativo */}
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-white/10 rounded-full" />

        <div className="relative z-10">
          <h3 className="text-lg font-bold text-white mb-1">
            Pronto para emitir uma fatura?
          </h3>
          <p className="text-blue-100 text-sm mb-5">
            Adicione clientes e artigos, depois emita a sua fatura em segundos.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/clientes">
              <button
                id="dashboard-btn-clientes"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-blue-700 bg-white hover:bg-blue-50 shadow-sm transition-all duration-200"
              >
                <Users size={15} />
                Gerir Clientes
              </button>
            </Link>
            <Link href="/faturas/nova">
              <button
                id="dashboard-btn-nova-fatura"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-white/20 hover:bg-white/30 border border-white/30 shadow-sm transition-all duration-200"
              >
                <Receipt size={15} />
                Nova Fatura
              </button>
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}

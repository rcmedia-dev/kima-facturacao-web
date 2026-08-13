"use client";

import { useAppStore } from "@/lib/store";
import { formatMoedaAOA } from "@/lib/formatters";
import { ArrowRight, TrendingUp, Clock, Users, Receipt } from "lucide-react";
import Link from "next/link";
import { DashboardFaturaTable } from "./components/dashboard-fatura-table";

export default function DashboardPage() {
  const documentos = useAppStore((s) => s.documentos);
  const clientes = useAppStore((s) => s.clientes);

  // Filtrar apenas faturas ativas (não canceladas)
  const todasFaturas = documentos.filter(
    (d) => d.tipo === "Fatura" || d.tipo === "FaturaRecibo" || d.tipo === "Simplificada"
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

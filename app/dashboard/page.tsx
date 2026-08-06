"use client";

import { useAppStore } from "@/lib/store";
import { formatMoedaAOA } from "@/lib/formatters";
import { ArrowRight, TrendingUp, Clock, Users, Receipt } from "lucide-react";
import Link from "next/link";
import { DashboardMetric } from "./components/dashboard-metric";
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <DashboardMetric
          title="Faturado este Mês"
          value={formatMoedaAOA(totalFaturadoMes)}
          icon={TrendingUp}
          color="blue"
          detail={`${faturasEsteMes.length} ${faturasEsteMes.length === 1 ? "doc. emitido" : "doc. emitidos"}`}
        />
        <DashboardMetric
          title="Faturas Pendentes"
          value={faturasPendentes.length.toString()}
          icon={Clock}
          color="amber"
          detail="Aguardam pagamento"
        />
        <DashboardMetric
          title="Clientes Activos"
          value={totalClientes.toString()}
          icon={Users}
          color="teal"
          detail="Base de clientes"
        />
        <DashboardMetric
          title="Total de Faturas"
          value={totalFaturas.toString()}
          icon={Receipt}
          color="indigo"
          detail="Documentos emitidos"
        />
      </div>

      {/* ── ÚLTIMAS FATURAS ──────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
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
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 rounded-2xl p-6 shadow-md">
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

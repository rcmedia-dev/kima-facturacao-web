"use client";

import { useAppStore } from "@/lib/store";
import { Plus, FileText, TrendingUp, Clock, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { FaturaFilters } from "./components/fatura-filters";
import { FaturaTable } from "./components/fatura-table";
import { formatMoedaAOA } from "@/lib/formatters";
import { useState } from "react";

export default function FaturasPage() {
  // Seletores individuais para garantir reatividade correcta no Zustand
  const documentos = useAppStore((s) => s.documentos);
  const getClientePorId = useAppStore((s) => s.getClientePorId);

  const [dataInicio, setDataInicio] = useState<Date | null>(null);
  const [dataFim, setDataFim] = useState<Date | null>(null);
  const [statusFiltro, setStatusFiltro] = useState<string>("Todos");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Calcular faturas diretamente de documentos (evita o bug do getter Zustand)
  const todasFaturas = documentos.filter(
    (d) => d.tipo === "Fatura" || d.tipo === "FaturaRecibo" || d.tipo === "Simplificada"
  );

  // Listagem completa de todos os tipos de documento (faturas, notas, avisos, etc.)
  const todosDocumentos = documentos;

  const filteredFaturas = todosDocumentos.filter((fatura) => {
    if (statusFiltro !== "Todos" && fatura.status !== statusFiltro) return false;

    if (dataInicio && new Date(fatura.dataEmissao) < dataInicio) return false;

    if (dataFim) {
      const fim = new Date(dataFim);
      fim.setHours(23, 59, 59, 999);
      if (new Date(fatura.dataEmissao) > fim) return false;
    }

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      const cliente = fatura.clienteId ? getClientePorId(fatura.clienteId) : undefined;
      const numCompleto = (fatura.numeroCompleto || `${fatura.serie}/${String(fatura.numero).padStart(6, "0")}`).toLowerCase();
      const matchNum = numCompleto.includes(term) || String(fatura.numero).includes(term);
      const matchCliente = (cliente?.nome || "").toLowerCase().includes(term) || (cliente?.nif || "").toLowerCase().includes(term);
      if (!matchNum && !matchCliente) return false;
    }

    return true;
  });

  const faturasOrdenadas = [...filteredFaturas].sort(
    (a, b) => new Date(b.dataEmissao).getTime() - new Date(a.dataEmissao).getTime()
  );

  // Métricas do Mês Atual
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999);

  const faturasValidasMes = todasFaturas.filter((f) => {
    const d = new Date(f.dataEmissao);
    return f.status !== "Cancelado" && d >= inicioMes && d <= fimMes;
  });

  const totalFaturadoMes = faturasValidasMes.reduce((sum, f) => sum + (f.total || 0), 0);
  const faturasPendentes = todasFaturas.filter((f) => f.status === "Pendente");
  const totalPendente = faturasPendentes.reduce((sum, f) => sum + (f.total || 0), 0);
  const faturasPagas = todasFaturas.filter((f) => f.status === "Pago");
  const faturasCanceladas = todasFaturas.filter((f) => f.status === "Cancelado");

  return (
    <div className="max-w-7xl mx-auto px-2 py-2 space-y-5 animate-slide-up">

      {/* ── HEADER ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30">
            <FileText size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Faturas & Documentos</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {todosDocumentos.length} {todosDocumentos.length === 1 ? "documento emitido" : "documentos emitidos"}
            </p>
          </div>
        </div>

        <Link href="/faturas/nova">
          <button id="faturas-btn-nova" className="btn-primary">
            <Plus size={16} />
            Nova Fatura
          </button>
        </Link>
      </div>

      {/* ── MÉTRICAS ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Faturado (mês)
            </span>
            <span className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <TrendingUp size={16} />
            </span>
          </div>
          <p className="text-[22px] font-extrabold leading-tight text-slate-900 dark:text-white mt-1.5">
            {formatMoedaAOA(totalFaturadoMes)}
          </p>
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            {faturasValidasMes.length} {faturasValidasMes.length === 1 ? "documento emitido" : "documentos emitidos"}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pendentes
            </span>
            <span className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock size={16} />
            </span>
          </div>
          <p className="text-[22px] font-extrabold leading-tight text-slate-900 dark:text-white mt-1.5">
            {faturasPendentes.length}
          </p>
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            {formatMoedaAOA(totalPendente)} em aberto
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pagas
            </span>
            <span className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <p className="text-[22px] font-extrabold leading-tight text-slate-900 dark:text-white mt-1.5">
            {faturasPagas.length}
          </p>
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            {faturasPagas.length === 1 ? "Fatura recebida" : "Faturas recebidas"}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Canceladas
            </span>
            <span className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center">
              <XCircle size={16} />
            </span>
          </div>
          <p className="text-[22px] font-extrabold leading-tight text-slate-900 dark:text-white mt-1.5">
            {faturasCanceladas.length}
          </p>
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Este mês (todas)
          </p>
        </div>
      </div>

      {/* ── FILTROS ──────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <FaturaFilters
          statusFiltro={statusFiltro}
          onStatusChange={setStatusFiltro}
          dataInicio={dataInicio}
          onDataInicioChange={setDataInicio}
          dataFim={dataFim}
          onDataFimChange={setDataFim}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
        />
      </div>

      {/* ── TABELA ───────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <FaturaTable faturas={faturasOrdenadas} itemsPerPage={20} />
      </div>

    </div>
  );
}

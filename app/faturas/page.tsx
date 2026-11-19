"use client";

import { useAppStore } from "@/lib/store";
import { Plus, FileText, TrendingUp, Clock, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { FaturaFilters } from "./components/fatura-filters";
import { FaturaTable } from "./components/fatura-table";
import { formatMoedaAOA } from "@/lib/formatters";
import { useState } from "react";

const TIPOS_TAB = [
  { value: "Todos", label: "Todos os Documentos" },
  { value: "Fatura", label: "Facturas" },
  { value: "FaturaRecibo", label: "Facturas-Recibo" },
  { value: "NotaCredito", label: "Notas de Crédito" },
  { value: "NotaDebito", label: "Notas de Débito" },
  { value: "Orcamento", label: "Facturas pro-forma" },
  { value: "Recibo", label: "Recibos" },
];

export default function FaturasPage() {
  // Seletores individuais para garantir reatividade correcta no Zustand
  const documentos = useAppStore((s) => s.documentos);
  const getClientePorId = useAppStore((s) => s.getClientePorId);

  const [dataInicio, setDataInicio] = useState<Date | null>(null);
  const [dataFim, setDataFim] = useState<Date | null>(null);
  const [statusFiltro, setStatusFiltro] = useState<string>("Todos");
  const [tipoFiltro, setTipoFiltro] = useState<string>("Todos");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Base dinâmica: filtra por tipo seleccionado na aba (ou todos)
  const documentosBase = tipoFiltro === "Todos"
    ? documentos
    : documentos.filter((d) => d.tipo === tipoFiltro);

  // Label dinâmico para os cards
  const tipoLabel = tipoFiltro === "Todos"
    ? "documentos"
    : TIPOS_TAB.find((t) => t.value === tipoFiltro)?.label.toLowerCase() || "documentos";

  const todosDocumentos = documentos;

  const filteredFaturas = todosDocumentos.filter((fatura) => {
    if (tipoFiltro !== "Todos" && fatura.tipo !== tipoFiltro) return false;
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

  // Métricas Dinâmicas — baseadas no tipo seleccionado na aba
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999);

  const documentosValidosMes = documentosBase.filter((f) => {
    const d = new Date(f.dataEmissao);
    return f.status !== "Cancelado" && d >= inicioMes && d <= fimMes;
  });

  const totalFaturadoMes = documentosValidosMes.reduce((sum, f) => sum + (f.total || 0), 0);
  const documentosPendentes = documentosBase.filter((f) => f.status === "Pendente");
  const totalPendente = documentosPendentes.reduce((sum, f) => sum + (f.total || 0), 0);
  const documentosPagos = documentosBase.filter((f) => f.status === "Pago");
  const documentosCancelados = documentosBase.filter((f) => f.status === "Cancelado");

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-slide-up">

      {/* ═══════════════════════════════════════════════════
          MOBILE — < sm  (Segmented + Timeline)
          ═══════════════════════════════════════════════════ */}

      {/* ── MO: HEADER ── */}
      <div className="sm:hidden flex items-center gap-3">
        <div className="flex-1">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Faturas & Documentos</h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {todosDocumentos.length} {todosDocumentos.length === 1 ? "documento" : "documentos"}
          </p>
        </div>
        <Link href="/faturas/nova">
          <button className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
            <Plus size={18} />
          </button>
        </Link>
      </div>

      {/* ── MO: SEGMENTED STATUS FILTER ── */}
      <div className="sm:hidden flex gap-2 px-4">
        <button
          onClick={() => { setStatusFiltro("Todos"); setTipoFiltro("Todos"); }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
            statusFiltro === "Todos" && tipoFiltro === "Todos"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
              : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
          }`}
        >
          Todos ({todosDocumentos.length})
        </button>
        <button
          onClick={() => { setStatusFiltro(statusFiltro === "Pendente" ? "Todos" : "Pendente"); setTipoFiltro("Todos"); }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
            statusFiltro === "Pendente"
              ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
              : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
          }`}
        >
          Pendentes ({documentosPendentes.length})
        </button>
        <button
          onClick={() => { setStatusFiltro(statusFiltro === "Pago" ? "Todos" : "Pago"); setTipoFiltro("Todos"); }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
            statusFiltro === "Pago"
              ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
              : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
          }`}
        >
          Pagos ({documentosPagos.length})
        </button>
      </div>

      {/* ── MO: COMPACT SEARCH ── */}
      <div className="sm:hidden flex items-center gap-2 px-4">
        <div className="flex-1 flex items-center gap-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 shadow-sm">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400 shrink-0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Nº documento ou cliente..."
            className="flex-1 border-none outline-none text-xs text-slate-900 dark:text-white bg-transparent placeholder-slate-400 dark:placeholder-slate-500"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-all ${
            showMobileFilters || dataInicio || dataFim
              ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500"
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/></svg>
        </button>
      </div>

      {/* ── MO: FILTROS EXPANSÍVEIS (DATAS) ── */}
      <div className={`sm:hidden overflow-hidden transition-all duration-300 ${showMobileFilters ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="mx-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Data Inicial
              </label>
              <input
                type="date"
                value={dataInicio ? dataInicio.toISOString().split("T")[0] : ""}
                onChange={(e) => setDataInicio(e.target.value ? new Date(e.target.value) : null)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Data Final
              </label>
              <input
                type="date"
                value={dataFim ? dataFim.toISOString().split("T")[0] : ""}
                onChange={(e) => setDataFim(e.target.value ? new Date(e.target.value) : null)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
          </div>
          {(dataInicio || dataFim) && (
            <button
              onClick={() => { setDataInicio(null); setDataFim(null); }}
              className="w-full py-2 rounded-lg text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 transition-colors"
            >
              Limpar datas
            </button>
          )}
        </div>
      </div>

      {/* ── MO: TIPO TABS ── */}
      <div className="sm:hidden flex items-center gap-2 overflow-x-auto pb-1 px-4 scrollbar-none">
        {TIPOS_TAB.map((tab) => {
          const count = tab.value === "Todos"
            ? todosDocumentos.length
            : todosDocumentos.filter((d) => d.tipo === tab.value).length;
          const isActive = tipoFiltro === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => { setTipoFiltro(tab.value); setStatusFiltro("Todos"); }}
              className={`flex items-center gap-1.5 shrink-0 px-3.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                isActive ? "bg-blue-700 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── MO: RESULTados COUNT ── */}
      <div className="sm:hidden flex items-center justify-between px-4">
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          {faturasOrdenadas.length} {faturasOrdenadas.length === 1 ? "resultado" : "resultados"}
        </span>
        {(searchTerm || dataInicio || dataFim || statusFiltro !== "Todos" || tipoFiltro !== "Todos") && (
          <button
            onClick={() => { setSearchTerm(""); setDataInicio(null); setDataFim(null); setStatusFiltro("Todos"); setTipoFiltro("Todos"); setShowMobileFilters(false); }}
            className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* ── MO: TABELA (cards) ── */}
      <div className="sm:hidden">
        <FaturaTable faturas={faturasOrdenadas} itemsPerPage={20} />
      </div>

      {/* ═══════════════════════════════════════════════════
          DESKTOP — ≥ sm  (original)
          ═══════════════════════════════════════════════════ */}

      {/* ── DESKTOP: HEADER ── */}
      <div className="hidden sm:flex items-center justify-between">
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
            Novo Documento
          </button>
        </Link>
      </div>

      {/* ── DESKTOP: MÉTRICA / CARTÕES CLICÁVEIS ── */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFiltro("Todos")}
          className={`bg-white dark:bg-slate-900 border rounded-xl p-4 cursor-pointer transition-all shadow-sm ${
            statusFiltro === "Todos"
              ? "border-blue-500 ring-2 ring-blue-500/20"
              : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Emitidos (mês) {statusFiltro !== "Todos" && <span className="text-blue-600 font-normal lowercase">(filtro ativo)</span>}
            </span>
            <span className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <TrendingUp size={16} />
            </span>
          </div>
          <p className="text-[22px] font-extrabold leading-tight text-slate-900 dark:text-white mt-1.5">
            {formatMoedaAOA(totalFaturadoMes)}
          </p>
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            {documentosValidosMes.length} {tipoLabel} {documentosValidosMes.length === 1 ? "emitido" : "emitidos"}
          </p>
        </div>

        <div
          onClick={() => setStatusFiltro(statusFiltro === "Pendente" ? "Todos" : "Pendente")}
          className={`bg-white dark:bg-slate-900 border rounded-xl p-4 cursor-pointer transition-all shadow-sm ${
            statusFiltro === "Pendente"
              ? "border-amber-500 ring-2 ring-amber-500/20"
              : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pendentes {statusFiltro === "Pendente" && <span className="text-amber-600 font-normal lowercase">(ativo)</span>}
            </span>
            <span className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock size={16} />
            </span>
          </div>
          <p className="text-[22px] font-extrabold leading-tight text-slate-900 dark:text-white mt-1.5">
            {documentosPendentes.length}
          </p>
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            {formatMoedaAOA(totalPendente)} em aberto
          </p>
        </div>

        <div
          onClick={() => setStatusFiltro(statusFiltro === "Pago" ? "Todos" : "Pago")}
          className={`bg-white dark:bg-slate-900 border rounded-xl p-4 cursor-pointer transition-all shadow-sm ${
            statusFiltro === "Pago"
              ? "border-emerald-500 ring-2 ring-emerald-500/20"
              : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pagos {statusFiltro === "Pago" && <span className="text-emerald-600 font-normal lowercase">(ativo)</span>}
            </span>
            <span className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <p className="text-[22px] font-extrabold leading-tight text-slate-900 dark:text-white mt-1.5">
            {documentosPagos.length}
          </p>
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            {tipoLabel} {documentosPagos.length === 1 ? "recebido" : "recebidos"}
          </p>
        </div>

        <div
          onClick={() => setStatusFiltro(statusFiltro === "Cancelado" ? "Todos" : "Cancelado")}
          className={`bg-white dark:bg-slate-900 border rounded-xl p-4 cursor-pointer transition-all shadow-sm ${
            statusFiltro === "Cancelado"
              ? "border-red-500 ring-2 ring-red-500/20"
              : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Cancelados {statusFiltro === "Cancelado" && <span className="text-red-600 font-normal lowercase">(ativo)</span>}
            </span>
            <span className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center">
              <XCircle size={16} />
            </span>
          </div>
          <p className="text-[22px] font-extrabold leading-tight text-slate-900 dark:text-white mt-1.5">
            {documentosCancelados.length}
          </p>
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            {tipoLabel} cancelados este mês
          </p>
        </div>
      </div>

      {/* ── DESKTOP: ABAS DE TIPO ── */}
      <div className="hidden sm:flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {TIPOS_TAB.map((tab) => {
          const count = tab.value === "Todos"
            ? todosDocumentos.length
            : todosDocumentos.filter((d) => d.tipo === tab.value).length;
          const isActive = tipoFiltro === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => { setTipoFiltro(tab.value); setStatusFiltro("Todos"); }}
              className={
                isActive
                  ? "bg-blue-600 text-white font-semibold rounded-xl px-4 py-2 text-xs shadow-sm transition-all flex items-center gap-2 shrink-0"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl px-4 py-2 text-xs font-medium transition-all flex items-center gap-2 shrink-0 shadow-2xs"
              }
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                isActive
                  ? "bg-blue-700 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── DESKTOP: FILTROS ── */}
      <div className="hidden sm:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <FaturaFilters
          statusFiltro={statusFiltro}
          onResetStatus={() => setStatusFiltro("Todos")}
          dataInicio={dataInicio}
          onDataInicioChange={setDataInicio}
          dataFim={dataFim}
          onDataFimChange={setDataFim}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
        />
      </div>

      {/* ── DESKTOP: TABELA ── */}
      <div className="hidden sm:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <FaturaTable faturas={faturasOrdenadas} itemsPerPage={20} />
      </div>

    </div>
  );
}

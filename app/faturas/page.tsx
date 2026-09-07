"use client";

import { useAppStore } from "@/lib/store";
import { Plus, FileText, TrendingUp, Clock, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { FaturaFilters } from "./components/fatura-filters";
import { FaturaTable } from "./components/fatura-table";
import { formatMoedaAOA } from "@/lib/formatters";
import { useState, useEffect } from "react";

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
  const loadAll = useAppStore((s) => s.loadAll);

  // Refresh documentos every time this page is mounted
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const [dataInicio, setDataInicio] = useState<Date | null>(null);
  const [dataFim, setDataFim] = useState<Date | null>(null);
  const [statusFiltro, setStatusFiltro] = useState<string>("Todos");
  const [tipoFiltro, setTipoFiltro] = useState<string>("Todos");
  const [searchTerm, setSearchTerm] = useState<string>("");

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
            Novo Documento
          </button>
        </Link>
      </div>

      {/* ── MÉTRICA / CARTÕES CLICÁVEIS (FILTROS DE ESTADO) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card: Emitidos (mês) */}
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

        {/* Card: Pendentes */}
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

        {/* Card: Pagos */}
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

        {/* Card: Cancelados */}
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

      {/* ── ABAS DE TIPO DE DOCUMENTO (PILLS NÍTIDAS) ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {TIPOS_TAB.map((tab) => {
          const count = tab.value === "Todos" 
            ? todosDocumentos.length 
            : todosDocumentos.filter((d) => d.tipo === tab.value).length;
          
          const isActive = tipoFiltro === tab.value;

          return (
            <button
              key={tab.value}
              onClick={() => {
                setTipoFiltro(tab.value);
                setStatusFiltro("Todos");
              }}
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

      {/* ── FILTROS (PESQUISA & DATAS) ───────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
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

      {/* ── TABELA ───────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <FaturaTable faturas={faturasOrdenadas} itemsPerPage={20} />
      </div>

    </div>
  );
}

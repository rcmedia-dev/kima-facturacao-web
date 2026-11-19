"use client";

import { useSyncExternalStore, useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { useToastContext } from "@/components/ui/toast";
import { Plus, Wallet, CheckCircle2, Clock, TrendingDown, Search, SlidersHorizontal } from "lucide-react";
import { DespesaTable } from "./components/despesa-table";
import { DespesaFilters } from "./components/despesa-filters";
import { DespesaFormModal } from "./components/despesa-form-modal";
import { ConfirmModal } from "@/components/confirm-modal";
import { formatAOA } from "@/lib/formatters";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function DespesasPage() {
  const store = useAppStore();
  const { success, error } = useToastContext();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("Todos");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("Todas");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await store.deleteDespesa(deleteId);
        success("Sucesso", "Despesa removida com sucesso.");
      } catch (e) {
        error("Erro", `Falha ao remover despesa: ${(e as Error).message}`);
      }
      setDeleteId(null);
    }
  };

  if (!mounted) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5 animate-pulse">
        <div className="h-8 w-40 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="h-14 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  const categorias = Array.from(new Set(store.despesas.map((d) => d.categoria).filter(Boolean))).sort();

  const filteredDespesas = store.despesas.filter((d) => {
    if (estadoFiltro !== "Todos" && d.estado !== estadoFiltro) return false;
    if (categoriaFiltro !== "Todas" && d.categoria !== categoriaFiltro) return false;

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      const matchDescricao = d.descricao.toLowerCase().includes(term);
      const matchCategoria = d.categoria.toLowerCase().includes(term);
      const fornecedor = d.fornecedorId ? store.getFornecedorPorId(d.fornecedorId) : undefined;
      const matchFornecedor = (fornecedor?.nome || "").toLowerCase().includes(term);
      if (!matchDescricao && !matchCategoria && !matchFornecedor) {
        return false;
      }
    }

    return true;
  });

  const hasActiveFilters =
    searchTerm !== "" || estadoFiltro !== "Todos" || categoriaFiltro !== "Todas";

  const despesaParaEditar = editingId ? store.getDespesaPorId(editingId) : undefined;

  const totalDespesas = store.despesas.length;
  const valorTotal = store.despesas.reduce((sum, d) => sum + Number(d.total), 0);
  const despesasPagas = store.despesas.filter((d) => d.estado === "Paga");
  const despesasPendentes = store.despesas.filter((d) => d.estado === "Pendente");
  const valorPendente = despesasPendentes.reduce((sum, d) => sum + Number(d.total), 0);

  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const despesasPorCategoria = useMemo(() => {
    const grupos: Record<string, { despesas: typeof filteredDespesas; total: number }> = {};
    for (const d of filteredDespesas) {
      const cat = d.categoria || "Sem categoria";
      if (!grupos[cat]) grupos[cat] = { despesas: [], total: 0 };
      grupos[cat].despesas.push(d);
      grupos[cat].total += Number(d.total);
    }
    return grupos;
  }, [filteredDespesas]);

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-slide-up">
      {/* ── MOBILE HEADER ───────────────────────────── */}
      <div className="flex items-center justify-between sm:hidden">
        <div>
          <h2 className="text-[18px] font-[800] text-slate-900 dark:text-white">Despesas</h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {store.despesas.length} despesas registadas
          </p>
        </div>
        <button
          onClick={() => { setEditingId(null); setShowModal(true); }}
          className="w-10 h-10 rounded-[12px] bg-blue-600 text-white flex items-center justify-center shadow-[0_2px_8px_rgba(59,130,246,0.3)]"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* ── DESKTOP HEADER ──────────────────────────── */}
      <div className="hidden sm:flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30">
            <Wallet size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Despesas</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {store.despesas.length} {store.despesas.length === 1 ? "despesa registada" : "despesas registadas"}
            </p>
          </div>
        </div>

        <button
          id="despesas-btn-nova"
          onClick={() => { setEditingId(null); setShowModal(true); }}
          className="btn-primary"
        >
          <Plus size={16} />
          Nova Despesa
        </button>
      </div>

      {/* ── MOBILE SEGMENTED FILTER ──────────────────── */}
      <div className="flex gap-1.5 sm:hidden">
        <button
          onClick={() => setEstadoFiltro("Todos")}
          className={`flex-1 py-2.5 px-2 rounded-[10px] text-[11px] font-[700] border-[1.5px] text-center transition-all ${
            estadoFiltro === "Todos"
              ? "bg-blue-600 text-white border-blue-600 shadow-[0_2px_8px_rgba(59,130,246,0.25)]"
              : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
          }`}
        >
          Todos ({totalDespesas})
        </button>
        <button
          onClick={() => setEstadoFiltro("Paga")}
          className={`flex-1 py-2.5 px-2 rounded-[10px] text-[11px] font-[700] border-[1.5px] text-center transition-all ${
            estadoFiltro === "Paga"
              ? "bg-teal-500 text-white border-teal-500 shadow-[0_2px_8px_rgba(16,185,129,0.25)]"
              : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
          }`}
        >
          Pagas ({despesasPagas.length})
        </button>
        <button
          onClick={() => setEstadoFiltro("Pendente")}
          className={`flex-1 py-2.5 px-2 rounded-[10px] text-[11px] font-[700] border-[1.5px] text-center transition-all ${
            estadoFiltro === "Pendente"
              ? "bg-amber-500 text-white border-amber-500 shadow-[0_2px_8px_rgba(245,158,11,0.25)]"
              : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
          }`}
        >
          Pendentes ({despesasPendentes.length})
        </button>
      </div>

      {/* ── MOBILE SEARCH + FILTER TOGGLE ────────────── */}
      <div className="flex gap-2 sm:hidden">
        <div className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[12px] px-3 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <Search size={15} className="text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar despesas…"
            className="flex-1 border-none outline-none text-[12px] text-slate-900 dark:text-white bg-transparent font-[inherit] placeholder:text-slate-400"
          />
        </div>
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className={`w-9 h-9 rounded-[12px] border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 transition-all ${
            showMobileFilters ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700" : "bg-white dark:bg-slate-900 text-slate-400"
          }`}
        >
          <SlidersHorizontal size={15} />
        </button>
      </div>

      {/* ── MOBILE EXPANDABLE FILTERS ────────────────── */}
      {showMobileFilters && (
        <div className="sm:hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[12px] p-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="space-y-2">
            <label className="block text-[11px] font-[600] text-slate-700 dark:text-slate-300">Categoria</label>
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[12px] text-slate-900 dark:text-white font-[inherit]"
            >
              <option value="Todas">Todas as Categorias</option>
              {categorias.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ── MOBILE RESULT COUNT ──────────────────────── */}
      <div className="flex items-center justify-between sm:hidden">
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-[500]">
          {filteredDespesas.length} resultados
        </span>
        {hasActiveFilters && (
          <button
            onClick={() => { setSearchTerm(""); setEstadoFiltro("Todos"); setCategoriaFiltro("Todas"); }}
            className="text-[11px] text-blue-600 dark:text-blue-400 font-[600] bg-transparent border-none cursor-pointer font-[inherit]"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* ── MÉTRICAS ─────────────────────────────────── */}
      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total de Despesas
            </span>
            <span className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Wallet size={16} />
            </span>
          </div>
          <p className="text-[22px] font-extrabold leading-tight text-slate-900 dark:text-white mt-1.5">
            {totalDespesas}
          </p>
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            {totalDespesas === 1 ? "Despesa registada" : "Despesas registadas"}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Valor Total
            </span>
            <span className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center">
              <TrendingDown size={16} />
            </span>
          </div>
          <p className="text-[22px] font-extrabold leading-tight text-slate-900 dark:text-white mt-1.5">
            {formatAOA(valorTotal)}
          </p>
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Todas as despesas
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pagas
            </span>
            <span className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <p className="text-[22px] font-extrabold leading-tight text-slate-900 dark:text-white mt-1.5">
            {despesasPagas.length}
          </p>
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            {formatAOA(despesasPagas.reduce((sum, d) => sum + Number(d.total), 0))}
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
            {despesasPendentes.length}
          </p>
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            {formatAOA(valorPendente)}
          </p>
        </div>
      </div>

      {/* ── FILTROS ──────────────────────────────────── */}
      <div className="hidden sm:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <DespesaFilters
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          estadoFiltro={estadoFiltro}
          onEstadoChange={setEstadoFiltro}
          categoriaFiltro={categoriaFiltro}
          onCategoriaChange={setCategoriaFiltro}
          categorias={categorias}
        />
      </div>

      {/* ── TABELA ───────────────────────────────────── */}
      <div className="sm:bg-white sm:dark:bg-slate-900 sm:border sm:border-slate-200 sm:dark:border-slate-800 sm:rounded-xl sm:shadow-sm sm:overflow-hidden">
        <DespesaTable
          despesas={filteredDespesas}
          onEdit={(id) => { setEditingId(id); setShowModal(true); }}
          onDelete={(id) => setDeleteId(id)}
          hasQuery={hasActiveFilters}
        />
      </div>

      {/* ── MODAL ────────────────────────────────────── */}
      {showModal && (
        <DespesaFormModal
          despesa={despesaParaEditar}
          onClose={() => { setShowModal(false); setEditingId(null); }}
          onSave={() => { setShowModal(false); setEditingId(null); }}
        />
      )}

      {/* ── MODAL DE CONFIRMAÇÃO ─────────────────────── */}
      {deleteId && (
        <ConfirmModal
          title="Remover Despesa"
          description="Tem certeza de que deseja remover esta despesa? Esta ação é irreversível."
          confirmText="Remover"
          variant="danger"
          onClose={() => setDeleteId(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
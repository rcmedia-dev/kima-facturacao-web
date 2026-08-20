"use client";

import { useSyncExternalStore, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useToastContext } from "@/components/ui/toast";
import { Plus, Wallet, CheckCircle2, Clock, TrendingDown } from "lucide-react";
import { DespesaTable } from "./components/despesa-table";
import { DespesaFilters } from "./components/despesa-filters";
import { DespesaFormModal } from "./components/despesa-form-modal";
import { ConfirmModal } from "@/components/confirm-modal";
import { formatAOA } from "@/lib/formatters";

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
      <div className="max-w-7xl mx-auto px-2 py-6 space-y-5 animate-pulse">
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

  return (
    <div className="max-w-7xl mx-auto px-2 py-2 space-y-5 animate-slide-up">
      {/* ── HEADER ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
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

      {/* ── MÉTRICAS ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
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
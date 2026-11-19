"use client";

import { useSyncExternalStore, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useToastContext } from "@/components/ui/toast";
import { Plus, Truck, UserCheck, UserX, Banknote, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { FornecedorTable } from "./components/fornecedor-table";
import { FornecedorFilters } from "./components/fornecedor-filters";
import { FornecedorFormModal } from "./components/fornecedor-form-modal";
import { ConfirmModal } from "@/components/confirm-modal";

export default function FornecedoresPage() {
  const store = useAppStore();
  const { success, error } = useToastContext();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("Todos");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await store.deleteFornecedor(deleteId);
        success("Sucesso", "Fornecedor removido com sucesso.");
      } catch (e) {
        error("Erro", `Falha ao remover fornecedor: ${(e as Error).message}`);
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

  const filteredFornecedores = store.fornecedores.filter((f) => {
    if (estadoFiltro === "Ativos" && !f.ativo) return false;
    if (estadoFiltro === "Inativos" && f.ativo) return false;

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      const matchNome = f.nome.toLowerCase().includes(term);
      const matchNif = f.nif.toLowerCase().includes(term);
      const matchTelefone = f.telefone.toLowerCase().includes(term);
      const matchEmail = f.email.toLowerCase().includes(term);
      const matchMorada = f.morada.toLowerCase().includes(term);
      const matchBancaria = (f.bancaria || "").toLowerCase().includes(term);
      if (!matchNome && !matchNif && !matchTelefone && !matchEmail && !matchMorada && !matchBancaria) {
        return false;
      }
    }

    return true;
  });

  const hasActiveFilters =
    searchTerm !== "" || estadoFiltro !== "Todos";

  const fornecedorParaEditar = editingId ? store.getFornecedorPorId(editingId) : undefined;

  const totalFornecedores = store.fornecedores.length;
  const fornecedoresAtivos = store.fornecedores.filter((f) => f.ativo).length;
  const fornecedoresInativos = store.fornecedores.filter((f) => !f.ativo).length;
  const fornecedoresComConta = store.fornecedores.filter((f) => (f.bancaria || "").trim() !== "").length;

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-slide-up">
      {/* ═══════════════════════════════════════════════════
          MOBILE — < sm  (Segmented + Timeline)
          ═══════════════════════════════════════════════════ */}

      {/* ── MO: HEADER ── */}
      <div className="sm:hidden flex items-center gap-3 px-4 pt-4">
        <div className="flex-1">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Fornecedores</h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {store.fornecedores.length} {store.fornecedores.length === 1 ? "fornecedor registado" : "fornecedores registados"}
          </p>
        </div>
        <button
          onClick={() => { setEditingId(null); setShowModal(true); }}
          className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* ── MO: SEGMENTED ESTADO FILTER ── */}
      <div className="sm:hidden flex gap-2 px-4">
        {([
          { label: "Todos", value: "Todos", count: totalFornecedores },
          { label: "Ativos", value: "Ativos", count: fornecedoresAtivos },
          { label: "Inativos", value: "Inativos", count: fornecedoresInativos },
        ] as const).map((t) => (
          <button
            key={t.value}
            onClick={() => setEstadoFiltro(estadoFiltro === t.value ? "Todos" : t.value)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              estadoFiltro === t.value
                ? t.value === "Ativos"
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                  : t.value === "Inativos"
                    ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                    : "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* ── MO: SEARCH + FILTER TOGGLE ── */}
      <div className="sm:hidden flex items-center gap-2 px-4">
        <div className="flex-1 flex items-center gap-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 shadow-sm">
          <Search size={15} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Pesquisar fornecedores…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
            showMobileFilters
              ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500"
          }`}
        >
          <SlidersHorizontal size={15} />
        </button>
      </div>

      {/* ── MO: RESULT COUNT ── */}
      <div className="sm:hidden flex items-center justify-between px-4">
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          {filteredFornecedores.length} {filteredFornecedores.length === 1 ? "resultado" : "resultados"}
        </span>
        {hasActiveFilters && (
          <button
            onClick={() => { setSearchTerm(""); setEstadoFiltro("Todos"); setShowMobileFilters(false); }}
            className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* ── MO: TABELA (cards) ── */}
      <div className="sm:hidden">
        <FornecedorTable
          fornecedores={filteredFornecedores}
          allFornecedores={store.fornecedores}
          onEdit={(id) => { setEditingId(id); setShowModal(true); }}
          onDelete={(id) => setDeleteId(id)}
          hasQuery={hasActiveFilters}
        />
      </div>

      {/* ═══════════════════════════════════════════════════
          DESKTOP — ≥ sm  (original)
          ═══════════════════════════════════════════════════ */}

      {/* ── DESKTOP: HEADER ── */}
      <div className="hidden sm:flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30">
            <Truck size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Fornecedores</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {store.fornecedores.length} {store.fornecedores.length === 1 ? "fornecedor registado" : "fornecedores registados"}
            </p>
          </div>
        </div>

        <button
          id="fornecedores-btn-novo"
          onClick={() => { setEditingId(null); setShowModal(true); }}
          className="btn-primary"
        >
          <Plus size={16} />
          Novo Fornecedor
        </button>
      </div>

      {/* ── DESKTOP: MÉTRICAS ── */}
      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total de Fornecedores
            </span>
            <span className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Truck size={16} />
            </span>
          </div>
          <p className="text-[22px] font-extrabold leading-tight text-slate-900 dark:text-white mt-1.5">
            {totalFornecedores}
          </p>
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            {totalFornecedores === 1 ? "Fornecedor registado" : "Fornecedores registados"}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Ativos
            </span>
            <span className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <UserCheck size={16} />
            </span>
          </div>
          <p className="text-[22px] font-extrabold leading-tight text-slate-900 dark:text-white mt-1.5">
            {fornecedoresAtivos}
          </p>
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Em estado ativo
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Inativos
            </span>
            <span className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center">
              <UserX size={16} />
            </span>
          </div>
          <p className="text-[22px] font-extrabold leading-tight text-slate-900 dark:text-white mt-1.5">
            {fornecedoresInativos}
          </p>
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Sem atividade
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Com dados bancários
            </span>
            <span className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Banknote size={16} />
            </span>
          </div>
          <p className="text-[22px] font-extrabold leading-tight text-slate-900 dark:text-white mt-1.5">
            {fornecedoresComConta}
          </p>
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Conta/IBAN registado
          </p>
        </div>
      </div>

      {/* ── DESKTOP: FILTROS ── */}
      <div className="hidden sm:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <FornecedorFilters
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          estadoFiltro={estadoFiltro}
          onEstadoChange={setEstadoFiltro}
        />
      </div>

      {/* ── DESKTOP: TABELA ── */}
      <div className="hidden sm:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <FornecedorTable
          fornecedores={filteredFornecedores}
          onEdit={(id) => { setEditingId(id); setShowModal(true); }}
          onDelete={(id) => setDeleteId(id)}
          hasQuery={hasActiveFilters}
        />
      </div>

      {/* ── MODAL ────────────────────────────────────── */}
      {showModal && (
        <FornecedorFormModal
          fornecedor={fornecedorParaEditar}
          onClose={() => { setShowModal(false); setEditingId(null); }}
          onSave={() => { setShowModal(false); setEditingId(null); }}
        />
      )}

      {/* ── MODAL DE CONFIRMAÇÃO ─────────────────────── */}
      {deleteId && (
        <ConfirmModal
          title="Remover Fornecedor"
          description="Tem certeza de que deseja remover este fornecedor? Esta ação é irreversível."
          confirmText="Remover"
          variant="danger"
          onClose={() => setDeleteId(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
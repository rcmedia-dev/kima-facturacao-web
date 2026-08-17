"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useToastContext } from "@/components/ui/toast";
import { Plus, Truck, UserCheck, UserX, Banknote } from "lucide-react";
import { FornecedorTable } from "./components/fornecedor-table";
import { FornecedorFilters } from "./components/fornecedor-filters";
import { FornecedorFormModal } from "./components/fornecedor-form-modal";
import { ConfirmModal } from "@/components/confirm-modal";

export default function FornecedoresPage() {
  const store = useAppStore();
  const { success, error } = useToastContext();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("Todos");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      <div className="max-w-7xl mx-auto px-2 py-6 space-y-5 animate-pulse">
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
    <div className="max-w-7xl mx-auto px-2 py-2 space-y-5 animate-slide-up">
      {/* ── HEADER ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
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

      {/* ── MÉTRICAS ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* ── FILTROS ──────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <FornecedorFilters
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          estadoFiltro={estadoFiltro}
          onEstadoChange={setEstadoFiltro}
        />
      </div>

      {/* ── TABELA ───────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
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
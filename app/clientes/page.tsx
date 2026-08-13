"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useToastContext } from "@/components/ui/toast";
import { Plus, Users, UserCheck, UserX, Building2 } from "lucide-react";
import { ClienteTable } from "./components/cliente-table";
import { ClienteFilters } from "./components/cliente-filters";
import { ClienteFormModal } from "./components/cliente-form-modal";
import { ConfirmModal } from "@/components/confirm-modal";

export default function ClientesPage() {
  const store = useAppStore();
  const { success, error } = useToastContext();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("Todos");
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
        await store.deleteCliente(deleteId);
        success("Sucesso", "Cliente removido com sucesso.");
      } catch (e) {
        error("Erro", `Falha ao remover cliente: ${(e as Error).message}`);
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

  const filteredClientes = store.clientes.filter((c) => {
    if (tipoFiltro !== "Todos" && c.tipo !== tipoFiltro) return false;

    if (estadoFiltro === "Ativos" && !c.ativo) return false;
    if (estadoFiltro === "Inativos" && c.ativo) return false;

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      const matchNome = c.nome.toLowerCase().includes(term);
      const matchNif = c.nif.toLowerCase().includes(term);
      const matchTelefone = c.telefone.toLowerCase().includes(term);
      const matchEmail = c.email.toLowerCase().includes(term);
      const matchMorada = c.morada.toLowerCase().includes(term);
      const matchResponsavel = (c.responsavel || "").toLowerCase().includes(term);
      if (!matchNome && !matchNif && !matchTelefone && !matchEmail && !matchMorada && !matchResponsavel) {
        return false;
      }
    }

    return true;
  });

  const hasActiveFilters =
    searchTerm !== "" || tipoFiltro !== "Todos" || estadoFiltro !== "Todos";

  const clienteParaEditar = editingId ? store.getClientePorId(editingId) : undefined;

  const totalClientes = store.clientes.length;
  const clientesAtivos = store.clientes.filter((c) => c.ativo).length;
  const clientesInativos = store.clientes.filter((c) => !c.ativo).length;
  const clientesPJ = store.clientes.filter((c) => c.tipo === "PJ").length;

  return (
    <div className="max-w-7xl mx-auto px-2 py-2 space-y-5 animate-slide-up">
      {/* ── HEADER ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30">
            <Users size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Clientes</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {store.clientes.length} {store.clientes.length === 1 ? "cliente registado" : "clientes registados"}
            </p>
          </div>
        </div>

        <button
          id="clientes-btn-novo"
          onClick={() => { setEditingId(null); setShowModal(true); }}
          className="btn-primary"
        >
          <Plus size={16} />
          Novo Cliente
        </button>
      </div>

      {/* ── MÉTRICAS ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total de Clientes
            </span>
            <span className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users size={16} />
            </span>
          </div>
          <p className="text-[22px] font-extrabold leading-tight text-slate-900 dark:text-white mt-1.5">
            {totalClientes}
          </p>
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            {totalClientes === 1 ? "Cliente registado" : "Clientes registados"}
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
            {clientesAtivos}
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
            {clientesInativos}
          </p>
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Sem atividade
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Empresas (PJ)
            </span>
            <span className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Building2 size={16} />
            </span>
          </div>
          <p className="text-[22px] font-extrabold leading-tight text-slate-900 dark:text-white mt-1.5">
            {clientesPJ}
          </p>
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Pessoa jurídica
          </p>
        </div>
      </div>

      {/* ── FILTROS ──────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <ClienteFilters
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          tipoFiltro={tipoFiltro}
          onTipoChange={setTipoFiltro}
          estadoFiltro={estadoFiltro}
          onEstadoChange={setEstadoFiltro}
        />
      </div>

      {/* ── TABELA ───────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <ClienteTable
          clientes={filteredClientes}
          onEdit={(id) => { setEditingId(id); setShowModal(true); }}
          onDelete={(id) => setDeleteId(id)}
          hasQuery={hasActiveFilters}
        />
      </div>

      {/* ── MODAL ────────────────────────────────────── */}
      {showModal && (
        <ClienteFormModal
          cliente={clienteParaEditar}
          onClose={() => { setShowModal(false); setEditingId(null); }}
          onSave={() => { setShowModal(false); setEditingId(null); }}
        />
      )}

      {/* ── MODAL DE CONFIRMAÇÃO ─────────────────────── */}
      {deleteId && (
        <ConfirmModal
          title="Remover Cliente"
          description="Tem certeza de que deseja remover este cliente? Esta ação é irreversível."
          confirmText="Remover"
          variant="danger"
          onClose={() => setDeleteId(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

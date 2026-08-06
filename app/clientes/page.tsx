"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useToastContext } from "@/components/ui/toast";
import { Plus, Search, Users } from "lucide-react";
import { ClienteTable } from "./components/cliente-table";
import { ClienteFormModal } from "./components/cliente-form-modal";
import { ConfirmModal } from "@/components/confirm-modal";

export default function ClientesPage() {
  const store = useAppStore();
  const { success, error } = useToastContext();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDelete = () => {
    if (deleteId) {
      try {
        store.deleteCliente(deleteId);
        success("Sucesso", "Cliente removido com sucesso.");
      } catch (e) {
        error("Erro", "Falha ao remover cliente.");
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

  const filteredClientes = store.clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.nif.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const clienteParaEditar = editingId ? store.getClientePorId(editingId) : undefined;

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

      {/* ── BARRA DE PESQUISA ────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3">
        <Search size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
        <input
          id="clientes-search"
          type="text"
          placeholder="Pesquisar por nome ou NIF..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
        />
        {searchTerm && (
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">
            {filteredClientes.length} resultado{filteredClientes.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── TABELA ───────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <ClienteTable
          clientes={filteredClientes}
          onEdit={(id) => { setEditingId(id); setShowModal(true); }}
          onDelete={(id) => setDeleteId(id)}
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

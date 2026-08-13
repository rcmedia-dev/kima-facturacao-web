"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useToastContext } from "@/components/ui/toast";
import { Plus, Package, Boxes, AlertTriangle, CheckCircle2 } from "lucide-react";
import { ArtigoTable } from "./components/artigo-table";
import { ArtigoFilters } from "./components/artigo-filters";
import { ArtigoFormModal } from "./components/artigo-form-modal";
import { ConfirmModal } from "@/components/confirm-modal";

export default function ArtigosPage() {
  const store = useAppStore();
  const { success, error } = useToastContext();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [ivaFiltro, setIvaFiltro] = useState<string>("Todos");
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
        await store.deleteArtigo(deleteId);
        success("Sucesso", "Artigo removido com sucesso.");
      } catch (e) {
        error("Erro", `Falha ao remover artigo: ${(e as Error).message}`);
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

  const filteredArtigos = store.artigos.filter((a) => {
    if (ivaFiltro !== "Todos" && String(a.taxaIVA) !== ivaFiltro) return false;

    if (estadoFiltro === "Ativos" && !a.ativo) return false;
    if (estadoFiltro === "Inativos" && a.ativo) return false;

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      const matchCodigo = a.codigo.toLowerCase().includes(term);
      const matchDescricao = a.descricao.toLowerCase().includes(term);
      const matchCategoria = a.categoria.toLowerCase().includes(term);
      if (!matchCodigo && !matchDescricao && !matchCategoria) {
        return false;
      }
    }

    return true;
  });

  const hasActiveFilters =
    searchTerm !== "" || ivaFiltro !== "Todos" || estadoFiltro !== "Todos";

  const artigoParaEditar = editingId ? store.getArtigoPorId(editingId) : undefined;

  const totalArtigos = store.artigos.length;
  const stockDisponivel = store.artigos.reduce((sum, a) => sum + (a.stock || 0), 0);
  const artigosStockBaixo = store.artigos.filter(
    (a) => a.stockMinimo > 0 && a.stock <= a.stockMinimo
  ).length;
  const artigosAtivos = store.artigos.filter((a) => a.ativo).length;

  return (
    <div className="max-w-7xl mx-auto px-2 py-2 space-y-5 animate-slide-up">
      {/* ── HEADER ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/30">
            <Package size={20} className="text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Artigos & Serviços</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {store.artigos.length} {store.artigos.length === 1 ? "artigo catalogado" : "artigos catalogados"}
            </p>
          </div>
        </div>

        <button
          id="artigos-btn-novo"
          onClick={() => { setEditingId(null); setShowModal(true); }}
          className="btn-primary"
        >
          <Plus size={16} />
          Novo Artigo
        </button>
      </div>

      {/* ── MÉTRICAS ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total de Artigos
            </span>
            <span className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Package size={16} />
            </span>
          </div>
          <p className="text-[22px] font-extrabold leading-tight text-slate-900 dark:text-white mt-1.5">
            {totalArtigos}
          </p>
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            {totalArtigos === 1 ? "Artigo catalogado" : "Artigos catalogados"}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Stock Disponível
            </span>
            <span className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Boxes size={16} />
            </span>
          </div>
          <p className="text-[22px] font-extrabold leading-tight text-slate-900 dark:text-white mt-1.5">
            {stockDisponivel.toLocaleString("pt-PT")}
          </p>
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Unidades em armazém
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Stock Baixo
            </span>
            <span className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle size={16} />
            </span>
          </div>
          <p className="text-[22px] font-extrabold leading-tight text-slate-900 dark:text-white mt-1.5">
            {artigosStockBaixo}
          </p>
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Precisam de reabastecer
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Artigos Ativos
            </span>
            <span className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <p className="text-[22px] font-extrabold leading-tight text-slate-900 dark:text-white mt-1.5">
            {artigosAtivos}
          </p>
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Em catálogo ativo
          </p>
        </div>
      </div>

      {/* ── FILTROS ──────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <ArtigoFilters
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          ivaFiltro={ivaFiltro}
          onIvaChange={setIvaFiltro}
          estadoFiltro={estadoFiltro}
          onEstadoChange={setEstadoFiltro}
        />
      </div>

      {/* ── TABELA ───────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <ArtigoTable
          artigos={filteredArtigos}
          onEdit={(id) => { setEditingId(id); setShowModal(true); }}
          onDelete={(id) => setDeleteId(id)}
          hasQuery={hasActiveFilters}
        />
      </div>

      {/* ── MODAL ────────────────────────────────────── */}
      {showModal && (
        <ArtigoFormModal
          artigo={artigoParaEditar}
          onClose={() => { setShowModal(false); setEditingId(null); }}
          onSave={() => { setShowModal(false); setEditingId(null); }}
        />
      )}

      {/* ── MODAL DE CONFIRMAÇÃO ─────────────────────── */}
      {deleteId && (
        <ConfirmModal
          title="Remover Artigo"
          description="Tem certeza de que deseja remover este artigo? Esta ação é irreversível."
          confirmText="Remover"
          variant="danger"
          onClose={() => setDeleteId(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

"use client";

import { useSyncExternalStore, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useToastContext } from "@/components/ui/toast";
import { Plus, Package, Boxes, AlertTriangle, CheckCircle2, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { ArtigoTable } from "./components/artigo-table";
import { ArtigoFilters } from "./components/artigo-filters";
import { ArtigoFormModal } from "./components/artigo-form-modal";
import { ConfirmModal } from "@/components/confirm-modal";

export default function ArtigosPage() {
  const store = useAppStore();
  const { success, error } = useToastContext();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [searchTerm, setSearchTerm] = useState("");
  const [ivaFiltro, setIvaFiltro] = useState<string>("Todos");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("Todos");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [tipoFiltro, setTipoFiltro] = useState<string>("Todos");

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
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5 animate-pulse">
        <div className="h-8 w-40 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="h-14 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  const filteredArtigos = store.artigos.filter((a) => {
    if (tipoFiltro === "Produtos" && a.tipo !== "Produto") return false;
    if (tipoFiltro === "Serviços" && a.tipo !== "Serviço") return false;
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
  const totalProdutos = store.artigos.filter((a) => a.tipo === "Produto").length;
  const totalServicos = store.artigos.filter((a) => a.tipo === "Serviço").length;

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-slide-up">
      {/* ═══════════════════════════════════════════════════
          MOBILE — < sm  (Segmented + Stock Focus)
          ═══════════════════════════════════════════════════ */}

      {/* ── MO: HEADER ── */}
      <div className="sm:hidden flex items-center gap-3 px-4 pt-4">
        <div className="flex-1">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Artigos</h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {store.artigos.length} {store.artigos.length === 1 ? "artigo registado" : "artigos registados"}
          </p>
        </div>
        <button
          onClick={() => { setEditingId(null); setShowModal(true); }}
          className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* ── MO: SEGMENTED TIPO FILTER ── */}
      <div className="sm:hidden flex gap-2 px-4">
        {([
          { label: "Todos", value: "Todos", count: totalArtigos },
          { label: "Produtos", value: "Produtos", count: totalProdutos },
          { label: "Serviços", value: "Serviços", count: totalServicos },
        ] as const).map((t) => (
          <button
            key={t.value}
            onClick={() => setTipoFiltro(tipoFiltro === t.value ? "Todos" : t.value)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              tipoFiltro === t.value
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
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
            placeholder="Pesquisar artigos…"
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
            showMobileFilters || ivaFiltro !== "Todos" || estadoFiltro !== "Todos"
              ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500"
          }`}
        >
          <SlidersHorizontal size={15} />
        </button>
      </div>

      {/* ── MO: EXPANDABLE IVA + ESTADO FILTERS ── */}
      <div className={`sm:hidden overflow-hidden transition-all duration-300 ${showMobileFilters ? "max-h-60 opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="mx-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm space-y-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Taxa IVA</p>
            <div className="grid grid-cols-4 gap-1.5">
              {(["Todos", "0", "7", "14"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setIvaFiltro(v)}
                  className={`h-9 rounded-xl text-[11px] font-semibold transition-all ${
                    ivaFiltro === v
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {v === "Todos" ? "Todos" : v === "0" ? "Isento" : `${v}%`}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Estado</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(["Todos", "Ativos", "Inativos"] as const).map((e) => (
                <button
                  key={e}
                  onClick={() => setEstadoFiltro(e)}
                  className={`h-9 rounded-xl text-[11px] font-semibold transition-all ${
                    estadoFiltro === e
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          {hasActiveFilters && (
            <button
              onClick={() => { setSearchTerm(""); setIvaFiltro("Todos"); setEstadoFiltro("Todos"); setTipoFiltro("Todos"); setShowMobileFilters(false); }}
              className="w-full py-2 rounded-lg text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 transition-colors"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* ── MO: RESULT COUNT ── */}
      <div className="sm:hidden flex items-center justify-between px-4">
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          {filteredArtigos.length} {filteredArtigos.length === 1 ? "resultado" : "resultados"}
        </span>
        {hasActiveFilters && (
          <button
            onClick={() => { setSearchTerm(""); setIvaFiltro("Todos"); setEstadoFiltro("Todos"); setTipoFiltro("Todos"); setShowMobileFilters(false); }}
            className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* ── MO: TABELA (cards) ── */}
      <div className="sm:hidden">
        <ArtigoTable
          artigos={filteredArtigos}
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

      {/* ── DESKTOP: MÉTRICAS ── */}
      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* ── DESKTOP: FILTROS ── */}
      <div className="hidden sm:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <ArtigoFilters
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          ivaFiltro={ivaFiltro}
          onIvaChange={setIvaFiltro}
          estadoFiltro={estadoFiltro}
          onEstadoChange={setEstadoFiltro}
        />
      </div>

      {/* ── DESKTOP: TABELA ── */}
      <div className="hidden sm:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
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

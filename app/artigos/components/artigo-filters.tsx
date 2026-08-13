"use client";

import { Search, X, FilterX, Percent } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface ArtigoFiltersProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  ivaFiltro: string;
  onIvaChange: (iva: string) => void;
  estadoFiltro: string;
  onEstadoChange: (estado: string) => void;
}

export function ArtigoFilters({
  searchTerm,
  onSearchTermChange,
  ivaFiltro,
  onIvaChange,
  estadoFiltro,
  onEstadoChange,
}: ArtigoFiltersProps) {
  const hasActiveFilters =
    searchTerm !== "" || ivaFiltro !== "Todos" || estadoFiltro !== "Todos";

  const handleClear = () => {
    onSearchTermChange("");
    onIvaChange("Todos");
    onEstadoChange("Todos");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
        {/* Pesquisa Geral */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Pesquisa
          </label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              placeholder="Código, descrição ou categoria..."
              className="pl-10 pr-8"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => onSearchTermChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Taxa de IVA */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            IVA
          </label>
          <Select value={ivaFiltro} onValueChange={(v) => onIvaChange(v ?? "Todos")}>
            <SelectTrigger className="w-full !h-11">
              <SelectValue placeholder="Todos os IVAs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os IVAs</SelectItem>
              <SelectItem value="0">
                <span className="inline-flex items-center gap-2">
                  <Percent size={14} />
                  0% (Isento)
                </span>
              </SelectItem>
              <SelectItem value="7">
                <span className="inline-flex items-center gap-2">
                  <Percent size={14} />
                  7%
                </span>
              </SelectItem>
              <SelectItem value="14">
                <span className="inline-flex items-center gap-2">
                  <Percent size={14} />
                  14%
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Estado do Artigo */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Estado
          </label>
          <Select value={estadoFiltro} onValueChange={(v) => onEstadoChange(v ?? "Todos")}>
            <SelectTrigger className="w-full !h-11">
              <SelectValue placeholder="Todos os Estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os Estados</SelectItem>
              <SelectItem value="Ativos">Ativos</SelectItem>
              <SelectItem value="Inativos">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Limpar filtros */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 invisible">
            Ações
          </label>
          <div className="flex gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 flex items-center gap-1.5"
                title="Limpar filtros"
              >
                <FilterX size={13} />
                Limpar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
"use client";

import { Search, X, CalendarDays, FilterX } from "lucide-react";
import { Input } from "@/components/ui/input";

interface FaturaFiltersProps {
  dataInicio: Date | null;
  onDataInicioChange: (data: Date | null) => void;
  dataFim: Date | null;
  onDataFimChange: (data: Date | null) => void;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onResetStatus: () => void;
  statusFiltro: string;
}

export function FaturaFilters({
  dataInicio,
  onDataInicioChange,
  dataFim,
  onDataFimChange,
  searchTerm,
  onSearchTermChange,
  onResetStatus,
  statusFiltro,
}: FaturaFiltersProps) {
  const hasActiveFilters =
    statusFiltro !== "Todos" || dataInicio !== null || dataFim !== null || searchTerm !== "";

  const handleClear = () => {
    onResetStatus();
    onDataInicioChange(null);
    onDataFimChange(null);
    onSearchTermChange("");
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
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
              placeholder="Nº do documento ou cliente..."
              className="pl-10 pr-8 h-10 text-xs"
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

        {/* Data Inicial */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Data Inicial
          </label>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <Input
              type="date"
              value={dataInicio ? dataInicio.toISOString().split("T")[0] : ""}
              onChange={(e) =>
                onDataInicioChange(e.target.value ? new Date(e.target.value) : null)
              }
              className="pl-10 h-10 text-xs [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
        </div>

        {/* Data Final e Limpar */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Data Final
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <Input
                type="date"
                value={dataFim ? dataFim.toISOString().split("T")[0] : ""}
                onChange={(e) =>
                  onDataFimChange(e.target.value ? new Date(e.target.value) : null)
                }
                className="pl-10 h-10 text-xs [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 h-10 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 flex items-center gap-1.5"
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

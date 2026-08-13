"use client";

import { Search, X, CalendarDays, FilterX } from "lucide-react";
import { STATUS_DOCUMENTO } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface FaturaFiltersProps {
  statusFiltro: string;
  onStatusChange: (status: string) => void;
  dataInicio: Date | null;
  onDataInicioChange: (data: Date | null) => void;
  dataFim: Date | null;
  onDataFimChange: (data: Date | null) => void;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
}

export function FaturaFilters({
  statusFiltro,
  onStatusChange,
  dataInicio,
  onDataInicioChange,
  dataFim,
  onDataFimChange,
  searchTerm,
  onSearchTermChange,
}: FaturaFiltersProps) {
  const hasActiveFilters =
    statusFiltro !== "Todos" || dataInicio !== null || dataFim !== null || searchTerm !== "";

  const handleClear = () => {
    onStatusChange("Todos");
    onDataInicioChange(null);
    onDataFimChange(null);
    onSearchTermChange("");
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
              placeholder="Nº da fatura ou cliente..."
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

        {/* Estado da Fatura */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Estado
          </label>
          <Select value={statusFiltro} onValueChange={(v) => onStatusChange(v ?? "Todos")}>
            <SelectTrigger className="w-full !h-11">
              <SelectValue placeholder="Todos os Estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os Estados</SelectItem>
              <SelectItem value={STATUS_DOCUMENTO.PENDENTE}>{STATUS_DOCUMENTO.PENDENTE}</SelectItem>
              <SelectItem value={STATUS_DOCUMENTO.PAGO}>{STATUS_DOCUMENTO.PAGO}</SelectItem>
              <SelectItem value={STATUS_DOCUMENTO.CANCELADO}>{STATUS_DOCUMENTO.CANCELADO}</SelectItem>
            </SelectContent>
          </Select>
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
              className="pl-10 [color-scheme:light] dark:[color-scheme:dark]"
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
                className="pl-10 [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 flex items-center gap-1.5"
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

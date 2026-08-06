"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Loader2, Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isSearching?: boolean;
  count?: number;
  countLabel?: { singular: string; plural: string };
  className?: string;
}

/**
 * Barra de pesquisa com feedback visual:
 * - Spinner animado enquanto o debounce está pendente
 * - Contador de resultados com badge
 * - Botão de limpar quando há texto
 * - Borda animada ao receber foco
 */
export function SearchBar({
  value,
  onChange,
  placeholder = "Pesquisar...",
  isSearching = false,
  count,
  countLabel = { singular: "resultado", plural: "resultados" },
  className,
}: SearchBarProps) {
  const hasValue = value.length > 0;

  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      {/* Campo de pesquisa */}
      <div className="relative flex-1 group">
        {/* Ícone esquerdo: spinner ou lupa */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 transition-all duration-200">
          {isSearching ? (
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          ) : (
            <Search
              className={cn(
                "w-4 h-4 transition-colors duration-200",
                hasValue ? "text-blue-500" : "text-gray-400 group-focus-within:text-blue-400"
              )}
            />
          )}
        </div>

        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "pl-10 pr-10 border-0 bg-transparent",
            "focus-visible:ring-0 focus-visible:ring-offset-0",
            "transition-all duration-200",
            "placeholder:text-gray-400"
          )}
        />

        {/* Botão limpar */}
        {hasValue && (
          <button
            type="button"
            onClick={() => onChange("")}
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2",
              "text-gray-400 hover:text-gray-600",
              "transition-all duration-150",
              "rounded-full hover:bg-gray-100 p-0.5"
            )}
            aria-label="Limpar pesquisa"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Linha de foco animada */}
        <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-blue-500 group-focus-within:w-full transition-all duration-300 rounded-full" />
      </div>

      {/* Badge de contagem */}
      {count !== undefined && (
        <div
          className={cn(
            "flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-xs font-medium",
            "transition-all duration-300",
            isSearching
              ? "bg-blue-50 text-blue-500 border border-blue-100"
              : hasValue && count === 0
              ? "bg-red-50 text-red-500 border border-red-100"
              : hasValue
              ? "bg-green-50 text-green-600 border border-green-100"
              : "bg-gray-100 text-gray-500 border border-gray-200"
          )}
        >
          {isSearching ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>A pesquisar…</span>
            </>
          ) : (
            <span>
              {count} {count === 1 ? countLabel.singular : countLabel.plural}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

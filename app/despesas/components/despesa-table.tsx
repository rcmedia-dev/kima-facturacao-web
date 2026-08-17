"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Despesa } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { Wallet, MoreVertical, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatAOA, formatData } from "@/lib/formatters";
import { useAppStore } from "@/lib/store";
import { DespesaDrawer } from "./despesa-drawer";

interface DespesaTableProps {
  despesas: Despesa[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  hasQuery?: boolean;
  isSearching?: boolean;
  itemsPerPage?: number;
}

const ESTADO_BADGE = {
  Paga: "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400 border border-teal-200 dark:border-teal-800",
  Pendente: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
};

export function DespesaTable({
  despesas,
  onEdit,
  onDelete,
  hasQuery = false,
  isSearching = false,
  itemsPerPage = 20,
}: DespesaTableProps) {
  const store = useAppStore();
  const [selectedDespesa, setSelectedDespesa] = useState<Despesa | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(despesas.length / itemsPerPage) || 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, despesas.length);
  const currentDespesas = despesas.slice(startIndex, endIndex);

  if (isSearching) {
    return (
      <div className="p-12 text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-sm text-gray-400">A pesquisar despesas…</p>
      </div>
    );
  }

  if (despesas.length === 0) {
    return (
      <div className="p-12 text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-gray-400" />
          </div>
        </div>
        {hasQuery ? (
          <>
            <p className="text-sm font-medium text-gray-600">Sem resultados</p>
            <p className="text-xs text-gray-400">Tente pesquisar por outro termo ou categoria.</p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-600">Nenhuma despesa registada</p>
            <p className="text-xs text-gray-400">Clique em "Nova Despesa" para começar.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-blue-600 text-white">
            <TableRow className="border-b border-blue-700">
              <TableHead className="font-semibold text-xs text-white uppercase tracking-wider">Descrição</TableHead>
              <TableHead className="font-semibold text-xs text-white uppercase tracking-wider">Categoria</TableHead>
              <TableHead className="font-semibold text-xs text-white uppercase tracking-wider">Fornecedor</TableHead>
              <TableHead className="font-semibold text-xs text-white uppercase tracking-wider">Data</TableHead>
              <TableHead className="font-semibold text-xs text-white uppercase tracking-wider text-right">Valor Total</TableHead>
              <TableHead className="font-semibold text-xs text-white uppercase tracking-wider">Estado</TableHead>
              <TableHead className="font-semibold text-xs text-white uppercase tracking-wider text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentDespesas.map((despesa, index) => {
              const fornecedor = despesa.fornecedorId ? store.getFornecedorPorId(despesa.fornecedorId) : undefined;
              return (
                <TableRow
                  key={despesa.id}
                  onClick={() => setSelectedDespesa(despesa)}
                  className={cn(
                    "cursor-pointer transition-colors duration-150 border-b border-slate-100 dark:border-slate-800/80",
                    index % 2 !== 0 && "bg-slate-50/60 dark:bg-slate-800/20",
                    "hover:bg-blue-50/40 dark:hover:bg-slate-800/50",
                    "animate-in fade-in slide-in-from-bottom-1"
                  )}
                  style={{ animationDelay: `${index * 30}ms`, animationFillMode: "both" }}
                >
                  <TableCell className="font-medium">{despesa.descricao}</TableCell>
                  <TableCell className="text-gray-600">{despesa.categoria}</TableCell>
                  <TableCell className="text-gray-600">{fornecedor?.nome || "-"}</TableCell>
                  <TableCell className="text-gray-600">{formatData(despesa.data)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {formatAOA(despesa.total)}
                  </TableCell>
                  <TableCell>
                    <Badge className={ESTADO_BADGE[despesa.estado]}>
                      {despesa.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <MenuPrimitive.Root>
                      <MenuPrimitive.Trigger
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Ações da despesa"
                      >
                        <MoreVertical size={16} />
                      </MenuPrimitive.Trigger>
                      <MenuPrimitive.Portal>
                        <MenuPrimitive.Positioner side="bottom" align="end" sideOffset={6} className="isolate z-50">
                          <MenuPrimitive.Popup className="relative min-w-[180px] origin-(--transform-origin) rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg p-1.5 animate-scale-in">
                            <MenuPrimitive.Item
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(despesa.id);
                                setSelectedDespesa(null);
                              }}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none select-none cursor-pointer transition-colors",
                                "data-highlighted:bg-slate-100 dark:data-highlighted:bg-slate-800"
                              )}
                            >
                              <Pencil size={16} className="text-slate-400 shrink-0" />
                              Editar
                            </MenuPrimitive.Item>

                            <MenuPrimitive.Separator className="my-1 h-px bg-slate-100 dark:bg-slate-800" />

                            <MenuPrimitive.Item
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(despesa.id);
                                setSelectedDespesa(null);
                              }}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 outline-none select-none cursor-pointer transition-colors",
                                "data-highlighted:bg-red-50 dark:data-highlighted:bg-red-950/40"
                              )}
                            >
                              <Trash2 size={16} className="shrink-0" />
                              Remover
                            </MenuPrimitive.Item>
                          </MenuPrimitive.Popup>
                        </MenuPrimitive.Positioner>
                      </MenuPrimitive.Portal>
                    </MenuPrimitive.Root>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Controles de Paginação (20 itens por página) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          A exibir <strong className="font-semibold text-slate-800 dark:text-slate-200">{startIndex + 1}</strong> a{" "}
          <strong className="font-semibold text-slate-800 dark:text-slate-200">{endIndex}</strong> de{" "}
          <strong className="font-semibold text-slate-800 dark:text-slate-200">{despesas.length}</strong> despesas
        </p>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safePage === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Página Anterior"
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                  pageNum === safePage
                    ? "bg-blue-600 text-white shadow-sm"
                    : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safePage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Próxima Página"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Drawer de detalhes da despesa */}
      <DespesaDrawer despesa={selectedDespesa} onClose={() => setSelectedDespesa(null)} onEdit={(id) => { setSelectedDespesa(null); onEdit(id); }} />
    </>
  );
}
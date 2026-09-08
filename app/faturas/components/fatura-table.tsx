"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Fatura } from "@/lib/types";
import { formatMoedaAOA, formatDataCompleta } from "@/lib/formatters";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { MoreVertical, CheckCircle2, Clock, Trash2, ChevronLeft, ChevronRight, FileText, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useToastContext } from "@/components/ui/toast";
import { FaturaDrawer } from "./fatura-drawer";
import { emissaoForaDoPrazo } from "@/lib/utils";
import { AGTStatusBadge } from "@/components/agt-status-badge";

interface FaturaTableProps {
  faturas: Fatura[];
  itemsPerPage?: number;
}

export function FaturaTable({ faturas, itemsPerPage = 20 }: FaturaTableProps) {
  const getClientePorId = useAppStore((s) => s.getClientePorId);
  const deleteFatura = useAppStore((s) => s.deleteFatura);
  const updateFatura = useAppStore((s) => s.updateFatura);
  const { success, error } = useToastContext();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFatura, setSelectedFatura] = useState<Fatura | null>(null);

  const totalPages = Math.ceil(faturas.length / itemsPerPage) || 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, faturas.length);
  const currentFaturas = faturas.slice(startIndex, endIndex);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pago":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
            Pago
          </span>
        );
      case "Pendente":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            Pendente
          </span>
        );
      case "Parcial":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            Parcial
          </span>
        );
      case "Cancelado":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-800">
            Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  if (faturas.length === 0) {
    return (
      <div className="p-12 text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <FileText className="w-5 h-5 text-slate-400" />
          </div>
        </div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Nenhuma fatura encontrada</p>
        <p className="text-xs text-slate-400">Tente ajustar os filtros ou emita uma nova fatura.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Tabela de Faturas */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-blue-600 text-white">
            <TableRow className="border-b border-blue-700">
              <TableHead className="font-semibold text-xs text-white uppercase tracking-wider">Nº Documento</TableHead>
              <TableHead className="font-semibold text-xs text-white uppercase tracking-wider">Cliente</TableHead>
              <TableHead className="font-semibold text-xs text-white uppercase tracking-wider">Data Emissão</TableHead>
              <TableHead className="font-semibold text-xs text-white uppercase tracking-wider">Vencimento</TableHead>
              <TableHead className="font-semibold text-xs text-white uppercase tracking-wider text-right">Total (AOA)</TableHead>
              <TableHead className="font-semibold text-xs text-white uppercase tracking-wider text-center">Status</TableHead>
              <TableHead className="font-semibold text-xs text-white uppercase tracking-wider text-center">AGT</TableHead>
              <TableHead className="font-semibold text-xs text-white uppercase tracking-wider text-center w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentFaturas.map((fatura, index) => {
              const cliente = fatura.clienteId ? getClientePorId(fatura.clienteId) : undefined;
              const numFaturaDisplay = fatura.numeroCompleto || `${fatura.serie}/${String(fatura.numero).padStart(6, "0")}`;

              return (
                <TableRow
                  key={fatura.id}
                  onClick={() => setSelectedFatura(fatura)}
                  className={cn(
                    "cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-800/80",
                    index % 2 !== 0 && "bg-slate-50/60 dark:bg-slate-800/20",
                    "hover:bg-blue-50/30 dark:hover:bg-slate-800/50",
                    "animate-in fade-in slide-in-from-bottom-1"
                  )}
                  style={{ animationDelay: `${index * 30}ms`, animationFillMode: "both" }}
                >
                  <TableCell className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                    {numFaturaDisplay}
                    {fatura.dataOperacao && fatura.status !== "Cancelado" && emissaoForaDoPrazo(fatura.dataOperacao, fatura.dataEmissao) && (
                      <span
                        className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 border border-red-200 dark:border-red-800"
                        title="Emitido fora do prazo legal de 5 dias úteis após a operação (Art. 8º — DP 71/25)"
                      >
                        <AlertTriangle className="w-2.5 h-2.5" /> Prazo
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    {cliente?.nome || "Consumidor Final"}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {formatDataCompleta(new Date(fatura.dataEmissao))}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {formatDataCompleta(new Date(fatura.dataVencimento))}
                  </TableCell>
                  <TableCell className="text-xs font-bold font-mono text-slate-900 dark:text-white text-right">
                    {formatMoedaAOA(fatura.total)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(fatura.status)}
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap">
                    <AGTStatusBadge estado={fatura.statusAGT as any} />
                  </TableCell>
                  <TableCell className="text-center">
                    <MenuPrimitive.Root>
                      <MenuPrimitive.Trigger
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Ações da fatura"
                      >
                        <MoreVertical size={16} />
                      </MenuPrimitive.Trigger>
                      <MenuPrimitive.Portal>
                        <MenuPrimitive.Positioner
                          side="bottom"
                          align="end"
                          sideOffset={6}
                          className="isolate z-50"
                        >
                          <MenuPrimitive.Popup className="relative min-w-[190px] origin-(--transform-origin) rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg p-1.5 animate-scale-in">
                            <MenuPrimitive.Item
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await updateFatura(fatura.id, { status: "Pago" });
                                  success("Fatura marcada como paga", `Fatura ${fatura.numeroCompleto || ""} atualizada.`);
                                } catch (err) {
                                  error("Erro", `Falha ao marcar fatura como paga: ${(err as Error).message}`);
                                }
                              }}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 outline-none select-none cursor-pointer transition-colors",
                                "data-highlighted:bg-emerald-50 dark:data-highlighted:bg-emerald-950/40"
                              )}
                            >
                              <CheckCircle2 size={16} className="shrink-0" />
                              Fatura paga
                            </MenuPrimitive.Item>
                            <MenuPrimitive.Item
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await updateFatura(fatura.id, { status: "Pendente" });
                                  success("Fatura marcada como pendente", `Fatura ${fatura.numeroCompleto || ""} atualizada.`);
                                } catch (err) {
                                  error("Erro", `Falha ao marcar fatura como pendente: ${(err as Error).message}`);
                                }
                              }}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-amber-700 dark:text-amber-400 outline-none select-none cursor-pointer transition-colors",
                                "data-highlighted:bg-amber-50 dark:data-highlighted:bg-amber-950/40"
                              )}
                            >
                              <Clock size={16} className="shrink-0" />
                              Fatura pendente
                            </MenuPrimitive.Item>

                            <MenuPrimitive.Separator className="my-1 h-px bg-slate-100 dark:bg-slate-800" />

                            <MenuPrimitive.Item
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm(`Eliminar a fatura ${fatura.numeroCompleto || ""}? Esta ação não pode ser revertida.`)) {
                                  try {
                                    await deleteFatura(fatura.id);
                                    success("Fatura eliminada", `Fatura ${fatura.numeroCompleto || ""} removida.`);
                                  } catch (err) {
                                    error("Erro", `Falha ao eliminar fatura: ${(err as Error).message}`);
                                  }
                                }
                              }}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 outline-none select-none cursor-pointer transition-colors",
                                "data-highlighted:bg-red-50 dark:data-highlighted:bg-red-950/40"
                              )}
                            >
                              <Trash2 size={16} className="shrink-0" />
                              Eliminar fatura
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
          <strong className="font-semibold text-slate-800 dark:text-slate-200">{faturas.length}</strong> faturas
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

      {/* Drawer de detalhes da fatura */}
      <FaturaDrawer fatura={selectedFatura} onClose={() => setSelectedFatura(null)} />
    </div>
  );
}

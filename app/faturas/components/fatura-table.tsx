"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Fatura } from "@/lib/types";
import { formatMoedaAOA, formatData } from "@/lib/formatters";
import { useAppStore } from "@/lib/store";
import { Eye, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { useState } from "react";

interface FaturaTableProps {
  faturas: Fatura[];
  itemsPerPage?: number;
}

export function FaturaTable({ faturas, itemsPerPage = 10 }: FaturaTableProps) {
  const getClientePorId = useAppStore((s) => s.getClientePorId);
  const [currentPage, setCurrentPage] = useState(1);

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
              <TableHead className="font-semibold text-xs text-white">Nº Fatura</TableHead>
              <TableHead className="font-semibold text-xs text-white">Cliente</TableHead>
              <TableHead className="font-semibold text-xs text-white">Data Emissão</TableHead>
              <TableHead className="font-semibold text-xs text-white">Vencimento</TableHead>
              <TableHead className="font-semibold text-xs text-white text-right">Total (AOA)</TableHead>
              <TableHead className="font-semibold text-xs text-white text-center">Status</TableHead>
              <TableHead className="font-semibold text-xs text-white text-center w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentFaturas.map((fatura, index) => {
              const cliente = fatura.clienteId ? getClientePorId(fatura.clienteId) : undefined;
              const numFaturaDisplay = fatura.numeroCompleto || `${fatura.serie}/${String(fatura.numero).padStart(6, "0")}`;

              return (
                <TableRow
                  key={fatura.id}
                  className="hover:bg-blue-50/30 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800/80"
                >
                  <TableCell className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                    {numFaturaDisplay}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    {cliente?.nome || "Consumidor Final"}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                    {formatData(new Date(fatura.dataEmissao))}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                    {formatData(new Date(fatura.dataVencimento))}
                  </TableCell>
                  <TableCell className="text-xs font-bold font-mono text-slate-900 dark:text-white text-right">
                    {formatMoedaAOA(fatura.total)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(fatura.status)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Link href={`/faturas/${fatura.id}`}>
                      <button
                        type="button"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                        title="Ver detalhes da fatura"
                      >
                        <Eye size={16} />
                      </button>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Controles de Paginação (10 itens por página) */}
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
    </div>
  );
}

import Link from "next/link";
import { Fatura } from "@/lib/types";
import { formatMoedaAOA, formatData } from "@/lib/formatters";
import { useAppStore } from "@/lib/store";
import { FileText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface DashboardFaturaTableProps {
  faturas: Fatura[];
}

function StatusBadge({ status }: { status: string }) {
  if (status === "Pago")
    return (
      <span className="badge-success">
        Pago
      </span>
    );
  if (status === "Pendente")
    return (
      <span className="badge-warning">
        Pendente
      </span>
    );
  if (status === "Cancelado")
    return (
      <span className="badge-danger">
        Cancelado
      </span>
    );
  return <span className="badge-primary">{status}</span>;
}

export function DashboardFaturaTable({ faturas }: DashboardFaturaTableProps) {
  const getClientePorId = useAppStore((s) => s.getClientePorId);

  if (faturas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
        <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-3 sm:mb-4">
          <FileText size={22} className="text-slate-400 dark:text-slate-500" />
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nenhuma fatura emitida ainda</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          As faturas emitidas aparecerão aqui
        </p>
      </div>
    );
  }

  return (
    <>
      {/* ── MOBILE: Card Layout ──────────────────────────── */}
      <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
        {faturas.map((fatura) => {
          const cliente = fatura.clienteId
            ? getClientePorId(fatura.clienteId)
            : undefined;

          return (
            <Link
              key={fatura.id}
              href={`/faturas/${fatura.id}`}
              className="flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-slate-50 dark:active:bg-slate-800/30"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex-shrink-0">
                <FileText size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{fatura.numero}</span>
                  <StatusBadge status={fatura.status} />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {cliente?.nome || "Cliente desconhecido"}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {formatMoedaAOA(fatura.total)}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  {formatData(fatura.dataEmissao)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── DESKTOP: Table Layout ──────────────────────────── */}
      <div className="hidden sm:block overflow-x-auto">
        <Table>
          <TableHeader className="bg-blue-600 text-white">
            <TableRow className="border-b border-blue-700">
              <TableHead className="font-semibold text-xs text-white uppercase tracking-wider">Nº Fatura</TableHead>
              <TableHead className="font-semibold text-xs text-white uppercase tracking-wider">Cliente</TableHead>
              <TableHead className="font-semibold text-xs text-white uppercase tracking-wider">Data</TableHead>
              <TableHead className="font-semibold text-xs text-white uppercase tracking-wider text-right">Total</TableHead>
              <TableHead className="font-semibold text-xs text-white uppercase tracking-wider">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {faturas.map((fatura, index) => {
              const cliente = fatura.clienteId
                ? getClientePorId(fatura.clienteId)
                : undefined;

              return (
                <TableRow
                  key={fatura.id}
                  className={cn(
                    "cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-800/80",
                    index % 2 !== 0 && "bg-slate-50/60 dark:bg-slate-800/20",
                    "hover:bg-blue-50/30 dark:hover:bg-slate-800/50"
                  )}
                >
                  <TableCell>
                    <Link
                      href={`/faturas/${fatura.id}`}
                      className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    >
                      {fatura.numero}
                    </Link>
                  </TableCell>
                  <TableCell className="text-slate-700 dark:text-slate-300">
                    {cliente?.nome || "Cliente desconhecido"}
                  </TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-400">
                    {formatData(fatura.dataEmissao)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-slate-800 dark:text-slate-200">
                    {formatMoedaAOA(fatura.total)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={fatura.status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

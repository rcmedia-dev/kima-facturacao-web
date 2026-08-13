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
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
          <FileText size={24} className="text-slate-400 dark:text-slate-500" />
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nenhuma fatura emitida ainda</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          As faturas emitidas aparecerão aqui
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
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
  );
}

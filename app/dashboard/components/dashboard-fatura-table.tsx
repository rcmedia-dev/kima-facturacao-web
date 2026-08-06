import Link from "next/link";
import { Fatura } from "@/lib/types";
import { formatMoedaAOA, formatData } from "@/lib/formatters";
import { useAppStore } from "@/lib/store";
import { FileText } from "lucide-react";

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
      <table className="w-full table-kima">
        <thead>
          <tr>
            <th>Nº Fatura</th>
            <th>Cliente</th>
            <th>Data</th>
            <th className="text-right">Total</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {faturas.map((fatura) => {
            const cliente = fatura.clienteId
              ? getClientePorId(fatura.clienteId)
              : undefined;

            return (
              <tr key={fatura.id} className="cursor-pointer">
                <td>
                  <Link
                    href={`/faturas/${fatura.id}`}
                    className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    {fatura.numero}
                  </Link>
                </td>
                <td className="text-slate-700 dark:text-slate-300">
                  {cliente?.nome || "Cliente desconhecido"}
                </td>
                <td className="text-slate-500 dark:text-slate-400">
                  {formatData(fatura.dataEmissao)}
                </td>
                <td className="text-right font-semibold text-slate-800 dark:text-slate-200">
                  {formatMoedaAOA(fatura.total)}
                </td>
                <td>
                  <StatusBadge status={fatura.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

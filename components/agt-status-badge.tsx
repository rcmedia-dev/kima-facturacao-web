"use client";

import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle, RefreshCw, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type EstadoAGT = "Pendente" | "Processando" | "Transmitido" | "Rejeitado" | "Erro" | undefined;

/**
 * T2.4 · Badge de status de comunicação AGT na listagem/detalhe dos documentos.
 * Exibe Transmitido / Pendente / Rejeitado / Erro com cor e ícone próprios.
 */
export function AGTStatusBadge({ estado }: { estado: EstadoAGT }) {
  if (!estado) {
    return (
      <Badge variant="outline" className="text-slate-400 border-slate-200 dark:border-slate-700 gap-1">
        <AlertTriangle className="w-3 h-3" />
        Sem envio
      </Badge>
    );
  }

  const config: Record<string, { label: string; cls: string; Icon: any }> = {
    Transmitido: {
      label: "Transmitido",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
      Icon: CheckCircle2,
    },
    Pendente: {
      label: "Pendente",
      cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
      Icon: Clock,
    },
    Processando: {
      label: "A enviar…",
      cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
      Icon: RefreshCw,
    },
    Rejeitado: {
      label: "Rejeitado",
      cls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
      Icon: XCircle,
    },
    Erro: {
      label: "Erro",
      cls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
      Icon: AlertTriangle,
    },
  };

  const c = config[estado];
  return (
    <Badge variant="outline" className={cn("gap-1", c.cls)}>
      <c.Icon className="w-3 h-3" />
      {c.label}
    </Badge>
  );
}
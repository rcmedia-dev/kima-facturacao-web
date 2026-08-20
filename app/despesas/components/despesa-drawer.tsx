"use client";

import { useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { Despesa } from "@/lib/types";
import { formatAOA, formatDataCompleta } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { InfoCell } from "@/components/info-cell";

interface DespesaDrawerProps {
  despesa: Despesa | null;
  onClose: () => void;
  onEdit?: (id: string) => void;
}

const sidebarBadge = {
  Paga: "bg-teal-500/15 text-teal-300 ring-teal-400/30",
  Pendente: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
};

function getInitials(descricao: string): string {
  return descricao
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function DespesaDrawer({ despesa, onClose, onEdit }: DespesaDrawerProps) {
  const store = useAppStore();
  // Retém a última despesa durante a animação de fecho
  const [open, setOpen] = useState(false);
  const [displayDespesa, setDisplayDespesa] = useState<Despesa | null>(null);
  const [prevDespesa, setPrevDespesa] = useState<Despesa | null>(despesa);

  if (despesa !== prevDespesa) {
    setPrevDespesa(despesa);
    if (despesa) {
      setDisplayDespesa(despesa);
      setOpen(true);
    } else {
      setOpen(false);
    }
  }

  const d = displayDespesa;
  const fornecedor = d?.fornecedorId ? store.getFornecedorPorId(d.fornecedorId) : undefined;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
          onClick={onClose}
        />
        <DialogPrimitive.Popup
          className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[720px] bg-white dark:bg-slate-900 shadow-2xl outline-none transition-transform duration-300 ease-in-out translate-x-full data-open:translate-x-0 data-closed:translate-x-full"
          aria-label="Detalhes da despesa"
        >
          {d && (
            <div className="flex h-full w-full">
              {/* ── Resumo fixo (sidebar escura) ── */}
              <aside className="hidden md:flex w-[220px] shrink-0 flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-5 text-white">
                <div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-xl font-extrabold">
                    {getInitials(d.descricao) || "?"}
                  </div>
                  <p className="mt-3.5 text-[15px] font-extrabold leading-snug">{d.descricao}</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <Badge className={`ring-1 ${sidebarBadge[d.estado]}`}>
                      {d.estado}
                    </Badge>
                  </div>

                  <p className="mt-5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-400">Valor</p>
                  <div className="mt-2 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Total</span>
                      <span className="font-mono font-bold text-teal-300">{formatAOA(d.total)}</span>
                    </div>
                  </div>

                  <p className="mt-5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-400">Registo</p>
                  <div className="mt-2 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Criado</span>
                      <span className="font-semibold text-slate-200">{formatDataCompleta(d.dataCriacao)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Atualizado</span>
                      <span className="text-right font-semibold text-slate-200">{formatDataCompleta(d.ultimaAtualizacao)}</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="w-full bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
                >
                  Fechar
                </Button>
              </aside>

              {/* ── Detalhes roláveis ── */}
              <div className="flex min-w-0 flex-1 flex-col">
                {/* Cabeçalho móvel */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 md:hidden dark:border-slate-800">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/30">
                      <span className="text-sm font-extrabold text-red-500 dark:text-red-400">{getInitials(d.descricao) || "?"}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{d.descricao}</p>
                      <Badge className={d.estado === "Paga" ? "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400 border border-teal-200 dark:border-teal-800" : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800"}>
                        {d.estado}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Fechar">
                    <X className="size-4" />
                  </Button>
                </div>

                {/* Cabeçalho desktop */}
                <div className="hidden items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 md:flex dark:border-slate-800">
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white">Ficha da Despesa</p>
                    <p className="text-xs text-slate-400">Valores, pagamento e detalhes</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {onEdit && (
                      <Button variant="outline" size="sm" onClick={() => onEdit(d.id)}>
                        Editar
                      </Button>
                    )}
                    <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Fechar">
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>

                {/* Conteúdo scrollável (vertical) */}
                <div className="w-full min-w-0 flex-1 space-y-5 overflow-y-auto p-5">
                  {/* Valores */}
                  <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Valores</h3>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                      <InfoCell label="Valor (base)" value={formatAOA(d.valor)} mono />
                      <InfoCell label="IVA" value={`${d.taxaIVA}%`} />
                      <InfoCell label="Total" value={formatAOA(d.total)} mono />
                    </div>
                  </section>

                  {/* Categoria & Fornecedor */}
                  <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Categoria &amp; Fornecedor</h3>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <InfoCell label="Categoria" value={d.categoria} />
                      <InfoCell label="Fornecedor" value={fornecedor?.nome || "-"} />
                    </div>
                  </section>

                  {/* Pagamento */}
                  <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Pagamento</h3>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                      <InfoCell label="Data" value={formatDataCompleta(d.data)} />
                      <InfoCell label="Forma de Pagamento" value={d.formaPagamento} />
                      <InfoCell label="Estado" value={d.estado} />
                    </div>
                  </section>

                  {/* Observações */}
                  <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Observações</h3>
                    <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                      {d.observacoes || "Sem observações registadas."}
                    </p>
                  </section>

                  {/* Registo */}
                  <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <InfoCell label="Data de criação" value={formatDataCompleta(d.dataCriacao)} />
                    <InfoCell label="Última atualização" value={formatDataCompleta(d.ultimaAtualizacao)} />
                  </section>
                </div>
              </div>
            </div>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
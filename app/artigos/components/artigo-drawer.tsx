"use client";

import { useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X, Package } from "lucide-react";
import { Artigo } from "@/lib/types";
import { formatMoedaAOA, formatDataCompleta } from "@/lib/formatters";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InfoCell } from "@/components/info-cell";

interface ArtigoDrawerProps {
  artigo: Artigo | null;
  onClose: () => void;
  onEdit?: (id: string) => void;
}

function IVABadge({ taxa }: { taxa: number }) {
  if (taxa === 0)
    return (
      <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-500 font-mono">
        Isento
      </Badge>
    );
  if (taxa === 7)
    return (
      <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-600 border border-amber-100 font-mono">
        7%
      </Badge>
    );
  return (
    <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-600 border border-blue-100 font-mono">
      14%
    </Badge>
  );
}

const sidebarBadge = {
  ativo: "bg-teal-500/15 text-teal-300 ring-teal-400/30",
  inativo: "bg-red-500/15 text-red-300 ring-red-400/30",
  iva7: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
  iva14: "bg-blue-500/15 text-blue-300 ring-blue-400/30",
};

const UNIDADE_MEDIDA_LABEL: Record<string, string> = {
  UN: "Unidade",
  KG: "Kilogramas",
  M: "Metros",
  M2: "Metros Quadrados",
  L: "Litros",
  H: "Horas",
  DIA: "Dias",
  MES: "Meses",
};

export function ArtigoDrawer({ artigo, onClose, onEdit }: ArtigoDrawerProps) {
  // Retém o último artigo durante a animação de fecho
  const [open, setOpen] = useState(false);
  const [displayArtigo, setDisplayArtigo] = useState<Artigo | null>(null);
  const [prevArtigo, setPrevArtigo] = useState<Artigo | null>(artigo);
  const getFornecedorPorId = useAppStore((s) => s.getFornecedorPorId);

  if (artigo !== prevArtigo) {
    setPrevArtigo(artigo);
    if (artigo) {
      setDisplayArtigo(artigo);
      setOpen(true);
    } else {
      setOpen(false);
    }
  }

  const a = displayArtigo;
  const fornecedor = a?.fornecedorId ? getFornecedorPorId(a.fornecedorId) : undefined;
  const stockBaixo = a ? a.stockMinimo > 0 && a.stock <= a.stockMinimo : false;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
          onClick={onClose}
        />
        <DialogPrimitive.Popup
          className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[720px] bg-white dark:bg-slate-900 shadow-2xl outline-none transition-transform duration-300 ease-in-out translate-x-full data-open:translate-x-0 data-closed:translate-x-full"
          aria-label="Detalhes do artigo"
        >
          {a && (
            <div className="flex h-full w-full">
              {/* ── Resumo fixo (sidebar escura) ── */}
              <aside className="hidden md:flex w-[220px] shrink-0 flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-5 text-white">
                <div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                    <Package size={24} className="text-teal-300" />
                  </div>
                  <p className="mt-3.5 text-[15px] font-extrabold leading-snug">{a.descricao}</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <Badge className={`ring-1 ${a.ativo ? sidebarBadge.ativo : sidebarBadge.inativo}`}>
                      {a.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                    {a.taxaIVA !== 0 && (
                      <Badge className={`ring-1 ${a.taxaIVA === 7 ? sidebarBadge.iva7 : sidebarBadge.iva14}`}>
                        IVA {a.taxaIVA}%
                      </Badge>
                    )}
                  </div>

                  <p className="mt-5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-400">Preço</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-blue-400">{formatMoedaAOA(a.preco)}</p>
                  {a.taxaIVA === 0 && <p className="mt-1 text-xs text-slate-400">Isento de IVA</p>}

                  <p className="mt-5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-400">Stock</p>
                  <div className="mt-2 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Atual</span>
                      <span className="font-mono font-semibold text-slate-200">{a.stock}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Mínimo</span>
                      <span className="font-mono font-semibold text-slate-200">{a.stockMinimo}</span>
                    </div>
                    {stockBaixo && (
                      <p className="rounded-lg bg-red-500/15 px-2 py-1 text-[11px] font-bold text-red-300 ring-1 ring-red-400/30">
                        ⚠ Stock baixo
                      </p>
                    )}
                  </div>

                  <p className="mt-5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-400">Identificação</p>
                  <div className="mt-2 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Tipo</span>
                      <span className="text-right font-semibold text-slate-200">{a.tipo || "Produto"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Unidade</span>
                      <span className="text-right font-semibold text-slate-200">{UNIDADE_MEDIDA_LABEL[a.unidadeMedida] || a.unidadeMedida}</span>
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
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-900/30">
                      <Package size={18} className="text-teal-600 dark:text-teal-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{a.descricao}</p>
                      <IVABadge taxa={a.taxaIVA} />
                    </div>
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Fechar">
                    <X className="size-4" />
                  </Button>
                </div>

                {/* Cabeçalho desktop */}
                <div className="hidden items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 md:flex dark:border-slate-800">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{a.descricao}</p>
                    <p className="text-xs text-slate-400">Preço, stock e registo</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {onEdit && (
                      <Button variant="outline" size="sm" onClick={() => onEdit(a.id)}>
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
                  {/* Identificação */}
                  <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Identificação</h3>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                      <InfoCell label="Descrição" value={a.descricao || "-"} />
                      <InfoCell label="Tipo" value={a.tipo || "Produto"} />
                      <InfoCell label="Unidade de Medida" value={UNIDADE_MEDIDA_LABEL[a.unidadeMedida] || a.unidadeMedida} />
                    </div>
                  </section>

                  {/* Preço & IVA */}
                  <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Preço &amp; IVA</h3>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                      <InfoCell label="Preço" value={formatMoedaAOA(a.preco)} mono />
                      <InfoCell label="IVA" value={a.taxaIVA === 0 ? "Isento" : `${a.taxaIVA}%`} />
                      {fornecedor ? <InfoCell label="Fornecedor" value={fornecedor.nome} /> : null}
                    </div>
                  </section>

                  {/* Stock */}
                  <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Stock</h3>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                      <InfoCell label="Stock Atual" value={String(a.stock)} mono />
                      <InfoCell label="Stock Mínimo" value={String(a.stockMinimo)} mono />
                      {stockBaixo && (
                        <div className="flex items-center justify-center rounded-xl border border-red-100 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/40">
                          <Badge variant="secondary" className="bg-red-50 text-red-600 border-red-100 text-xs dark:bg-red-950/60 dark:text-red-300 dark:border-red-800">
                            ⚠ Stock baixo
                          </Badge>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Registo */}
                  <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <InfoCell label="Data de criação" value={formatDataCompleta(a.dataCriacao)} />
                    <InfoCell label="Última atualização" value={formatDataCompleta(a.ultimaAtualizacao)} />
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
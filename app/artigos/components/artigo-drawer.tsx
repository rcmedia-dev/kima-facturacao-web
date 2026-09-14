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
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[92vh] w-full max-w-[420px] translate-y-full bg-white shadow-2xl outline-none transition-transform duration-300 ease-in-out data-open:translate-y-0 data-closed:translate-y-full md:inset-y-0 md:left-auto md:right-0 md:h-full md:max-w-[720px] md:translate-x-full md:translate-y-0 md:data-open:translate-x-0 md:data-closed:translate-x-full dark:bg-slate-900"
          aria-label="Detalhes do artigo"
        >
          {a && (
            <div className="flex h-full w-full flex-col md:flex-row">
              <div className="relative flex w-full flex-1 flex-col bg-[#f5f7fa] md:hidden dark:bg-slate-950">
                {/* Sheet header */}
                <div className="shrink-0 rounded-t-[16px] bg-white px-4 pt-3 dark:bg-slate-900">
                  <div className="mx-auto mb-3 h-1 w-9 rounded-[2px] bg-slate-300 dark:bg-slate-600" />
                  <div className="mb-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[17px] font-extrabold text-slate-900 dark:text-white">{a.descricao}</p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-400 dark:text-slate-500">
                        {a.codigo || a.id.slice(0, 8).toUpperCase()} · {a.tipo || "Produto"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Fechar"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
                  {/* Price hero */}
                  <div
                    className="rounded-[16px] p-5 text-white"
                    style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)", boxShadow: "0 4px 16px rgba(59,130,246,0.3)" }}
                  >
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[1px] opacity-70">Preço de Venda</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[32px] font-black leading-none tracking-tight">
                        {Math.round(a.preco).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                      </span>
                      <span className="text-[13px] font-semibold opacity-70">AOA</span>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <span className="rounded-md bg-white/20 px-2.5 py-1 text-[11px] font-semibold">
                        {a.taxaIVA === 0 ? "Isento" : `IVA ${a.taxaIVA}%`}
                      </span>
                      <span className="rounded-md bg-white/20 px-2.5 py-1 text-[11px] font-semibold">
                        {a.categoria || "Geral"}
                      </span>
                      <span className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${a.ativo ? "bg-emerald-500/40" : "bg-red-500/40"}`}>
                        {a.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </div>

                  {/* All info — one flat iOS card */}
                  <div className="mt-3.5 overflow-hidden rounded-[16px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:bg-slate-900 dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
                    <div className="flex min-h-[48px] items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800/80">
                      <span className="shrink-0 text-[14px] font-medium text-slate-500 dark:text-slate-400">Código</span>
                      <span className="truncate text-right font-mono text-[13px] font-bold text-slate-900 dark:text-slate-100">
                        {a.codigo || a.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex min-h-[48px] items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800/80">
                      <span className="shrink-0 text-[14px] font-medium text-slate-500 dark:text-slate-400">Tipo</span>
                      <span className="text-right text-[14px] font-bold text-slate-900 dark:text-slate-100">{a.tipo || "Produto"}</span>
                    </div>
                    <div className="flex min-h-[48px] items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800/80">
                      <span className="shrink-0 text-[14px] font-medium text-slate-500 dark:text-slate-400">Unidade</span>
                      <span className="text-right text-[14px] font-bold text-slate-900 dark:text-slate-100">
                        {UNIDADE_MEDIDA_LABEL[a.unidadeMedida] || a.unidadeMedida}
                      </span>
                    </div>
                    <div className="flex min-h-[48px] items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800/80">
                      <span className="shrink-0 text-[14px] font-medium text-slate-500 dark:text-slate-400">Categoria</span>
                      <span className="truncate text-right text-[14px] font-bold text-slate-900 dark:text-slate-100">{a.categoria || "Geral"}</span>
                    </div>
                    <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-3.5">
                      <span className="shrink-0 text-[14px] font-medium text-slate-500 dark:text-slate-400">Fornecedor</span>
                      <span className="max-w-[170px] truncate text-right text-[13px] font-bold text-slate-900 dark:text-slate-100">
                        {fornecedor?.nome || "-"}
                      </span>
                    </div>
                  </div>

                  {/* Stock with progress — only for Produto */}
                  {(a.tipo || "Produto") === "Produto" ? (
                    <div className="mt-3 overflow-hidden rounded-[16px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:bg-slate-900 dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
                      <div className="flex items-center justify-between px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-amber-500 stroke-2" aria-hidden="true">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                          </svg>
                          <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100">Stock</span>
                        </div>
                        <span className="text-[20px] font-black text-amber-500">{a.stock}</span>
                      </div>
                      <div className="px-4 pb-3.5">
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">Mínimo: {a.stockMinimo}</span>
                          <span className={`text-[11px] font-semibold ${stockBaixo ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                            {stockBaixo ? "Stock baixo" : "Suficiente"}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className={`h-full rounded-full ${stockBaixo ? "bg-amber-500" : "bg-emerald-500"}`}
                            style={{ width: `${Math.min(100, Math.round((a.stock / Math.max(a.stock, a.stockMinimo * 10, 1)) * 100))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center gap-2.5 rounded-[16px] border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                      Serviços não controlam stock.
                    </div>
                  )}

                  <p className="mt-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
                    Criado em {formatDataCompleta(a.dataCriacao)} · Atualizado em {formatDataCompleta(a.ultimaAtualizacao)}
                  </p>
                </div>

                {/* Sticky footer — single action */}
                <div className="shrink-0 border-t border-slate-200 bg-white/95 px-4 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-[12px] dark:border-slate-800 dark:bg-slate-900/95">
                  <button
                    type="button"
                    onClick={() => onEdit?.(a.id)}
                    className="flex w-full items-center justify-center gap-2 rounded-[14px] border-0 bg-blue-600 py-3.5 text-[14px] font-bold text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)] transition-all duration-150 active:scale-[0.98] active:brightness-95"
                  >
                    <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2" aria-hidden="true">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                    </svg>
                    Editar {a.tipo || "Produto"}
                  </button>
                </div>
              </div>

              <aside className="hidden w-[220px] shrink-0 flex-col justify-between bg-gradient-to-br from-blue-600 via-blue-600 to-blue-700 p-5 text-white md:flex">
                <div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                    <Package size={24} className="text-blue-200" />
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

                  <p className="mt-5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-blue-200">Registo</p>
                  <div className="mt-2 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-blue-200">Criado</span>
                      <span className="font-semibold text-white">{formatDataCompleta(a.dataCriacao)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-blue-200">Atualizado</span>
                      <span className="text-right font-semibold text-white">{formatDataCompleta(a.ultimaAtualizacao)}</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="w-full bg-blue-700/50 text-white hover:bg-blue-700 hover:text-white"
                >
                  Fechar
                </Button>
              </aside>

              <div className="hidden min-w-0 flex-1 flex-col md:flex">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
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

                <div className="w-full min-w-0 flex-1 space-y-5 overflow-y-auto p-5">
                  <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Identificação</h3>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                      <InfoCell label="Descrição" value={a.descricao || "-"} />
                      <InfoCell label="Tipo" value={a.tipo || "Produto"} />
                      <InfoCell label="Unidade de Medida" value={UNIDADE_MEDIDA_LABEL[a.unidadeMedida] || a.unidadeMedida} />
                    </div>
                  </section>

                  <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Preço &amp; IVA</h3>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                      <InfoCell label="Preço" value={formatMoedaAOA(a.preco)} mono />
                      <InfoCell label="IVA" value={a.taxaIVA === 0 ? "Isento" : `${a.taxaIVA}%`} />
                      {fornecedor ? <InfoCell label="Fornecedor" value={fornecedor.nome} /> : null}
                    </div>
                  </section>

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
                </div>
              </div>
            </div>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
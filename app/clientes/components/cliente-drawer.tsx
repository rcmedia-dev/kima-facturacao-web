"use client";

import { useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { Cliente } from "@/lib/types";
import { formatDataCompleta } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InfoCell } from "@/components/info-cell";

interface ClienteDrawerProps {
  cliente: Cliente | null;
  onClose: () => void;
  onEdit?: (id: string) => void;
}

const sidebarBadge = {
  PJ: "bg-blue-500/15 text-blue-300 ring-blue-400/30",
  PF: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
  Ativo: "bg-teal-500/15 text-teal-300 ring-teal-400/30",
  Inativo: "bg-red-500/15 text-red-300 ring-red-400/30",
};

function getInitials(nome: string): string {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ClienteDrawer({ cliente, onClose, onEdit }: ClienteDrawerProps) {
  // Retém o último cliente durante a animação de fecho
  const [open, setOpen] = useState(false);
  const [displayCliente, setDisplayCliente] = useState<Cliente | null>(null);
  const [prevCliente, setPrevCliente] = useState<Cliente | null>(cliente);

  if (cliente !== prevCliente) {
    setPrevCliente(cliente);
    if (cliente) {
      setDisplayCliente(cliente);
      setOpen(true);
    } else {
      setOpen(false);
    }
  }

  const c = displayCliente;

  const tipoLabel = c?.tipo === "PJ" ? "Pessoa Jurídica" : "Pessoa Física";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
          onClick={onClose}
        />

        {/* ═══ MOBILE: V2 PRICE-STYLE BOTTOM SHEET (fiel às drawers de artigos) ═══ */}
        <DialogPrimitive.Popup
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92vh] w-full max-w-[420px] flex-col bg-[#f5f7fa] shadow-2xl outline-none transition-transform duration-300 ease-in-out translate-y-full data-open:translate-y-0 data-closed:translate-y-full rounded-t-[16px] sm:hidden dark:bg-slate-950"
          aria-label="Detalhes do cliente"
        >
          {c && (
            <>
              {/* Sheet header */}
              <div className="shrink-0 rounded-t-[16px] bg-white px-4 pt-3 dark:bg-slate-900">
                <div className="mx-auto mb-3 h-1 w-9 rounded-[2px] bg-slate-300 dark:bg-slate-600" />
                <div className="mb-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[17px] font-extrabold text-slate-900 dark:text-white">{c.nome}</p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400 dark:text-slate-500">
                      {c.nif} · {c.tipo}
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
                {/* Identity hero */}
                <div
                  className="rounded-[16px] p-5 text-white"
                  style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)", boxShadow: "0 4px 16px rgba(59,130,246,0.3)" }}
                >
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[1px] opacity-70">Cliente</p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/15 text-[15px] font-extrabold">
                      {getInitials(c.nome) || "?"}
                    </div>
                    <p className="min-w-0 flex-1 text-[19px] font-extrabold leading-snug">{c.nome}</p>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <span className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${c.ativo ? "bg-emerald-500/40" : "bg-red-500/40"}`}>
                      {c.ativo ? "Ativo" : "Inativo"}
                    </span>
                    <span className="rounded-md bg-white/20 px-2.5 py-1 text-[11px] font-semibold">{tipoLabel}</span>
                  </div>
                </div>

                {/* All info — one flat iOS card */}
                <div className="mt-3.5 overflow-hidden rounded-[16px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:bg-slate-900 dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
                  <div className="flex min-h-[48px] items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800/80">
                    <span className="shrink-0 text-[14px] font-medium text-slate-500 dark:text-slate-400">NIF</span>
                    <span className="truncate text-right font-mono text-[13px] font-bold text-slate-900 dark:text-slate-100">{c.nif}</span>
                  </div>
                  <div className="flex min-h-[48px] items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800/80">
                    <span className="shrink-0 text-[14px] font-medium text-slate-500 dark:text-slate-400">Telefone</span>
                    <span className="text-right text-[14px] font-bold text-slate-900 dark:text-slate-100">{c.telefone || "-"}</span>
                  </div>
                  <div className="flex min-h-[48px] items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800/80">
                    <span className="shrink-0 text-[14px] font-medium text-slate-500 dark:text-slate-400">Email</span>
                    <span className="max-w-[190px] truncate text-right text-[13px] font-bold text-slate-900 dark:text-slate-100">{c.email || "-"}</span>
                  </div>
                  <div className="flex min-h-[48px] items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800/80">
                    <span className="shrink-0 text-[14px] font-medium text-slate-500 dark:text-slate-400">Morada</span>
                    <span className="max-w-[190px] truncate text-right text-[13px] font-bold text-slate-900 dark:text-slate-100">{c.morada || "-"}</span>
                  </div>
                  {c.tipo === "PJ" && c.responsavel ? (
                    <div className="flex min-h-[48px] items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800/80">
                      <span className="shrink-0 text-[14px] font-medium text-slate-500 dark:text-slate-400">Responsável</span>
                      <span className="max-w-[170px] truncate text-right text-[13px] font-bold text-slate-900 dark:text-slate-100">{c.responsavel}</span>
                    </div>
                  ) : null}
                  {c.tipo === "PJ" && c.inscricaoSocial ? (
                    <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-3.5">
                      <span className="shrink-0 text-[14px] font-medium text-slate-500 dark:text-slate-400">Insc. Social</span>
                      <span className="truncate text-right font-mono text-[13px] font-bold text-slate-900 dark:text-slate-100">{c.inscricaoSocial}</span>
                    </div>
                  ) : (
                    <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-3.5">
                      <span className="shrink-0 text-[14px] font-medium text-slate-500 dark:text-slate-400">Tipo</span>
                      <span className="text-right text-[14px] font-bold text-slate-900 dark:text-slate-100">{tipoLabel}</span>
                    </div>
                  )}
                </div>

                <p className="mt-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
                  Criado em {formatDataCompleta(c.dataCriacao)} · Atualizado em {formatDataCompleta(c.ultimaAtualizacao)}
                </p>
              </div>

              {/* Sticky footer — single action */}
              <div className="shrink-0 border-t border-slate-200 bg-white/95 px-4 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-[12px] dark:border-slate-800 dark:bg-slate-900/95">
                <button
                  type="button"
                  onClick={() => onEdit?.(c.id)}
                  className="flex w-full items-center justify-center gap-2 rounded-[14px] border-0 bg-blue-600 py-3.5 text-[14px] font-bold text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)] transition-all duration-150 active:scale-[0.98] active:brightness-95"
                >
                  <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2" aria-hidden="true">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                  </svg>
                  Editar Cliente
                </button>
              </div>
            </>
          )}
        </DialogPrimitive.Popup>

        {/* ═══ DESKTOP: EXISTING RIGHT DRAWER (inalterado) ═══ */}
        <DialogPrimitive.Popup
          className="hidden sm:flex fixed right-0 top-0 z-50 h-full w-full max-w-[720px] flex-col bg-white dark:bg-slate-900 shadow-2xl outline-none transition-transform duration-300 ease-in-out translate-x-full data-open:translate-x-0 data-closed:translate-x-full"
          aria-label="Detalhes do cliente"
        >
          {c && (
            <div className="flex h-full w-full">
              {/* ── Resumo fixo (sidebar escura) ── */}
              <aside className="hidden md:flex w-[220px] shrink-0 flex-col justify-between bg-gradient-to-br from-blue-600 via-blue-600 to-blue-700 p-5 text-white">
                <div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-xl font-extrabold">
                    {getInitials(c.nome) || "?"}
                  </div>
                  <p className="mt-3.5 text-[15px] font-extrabold leading-snug">{c.nome}</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <Badge className={`ring-1 ${c.ativo ? sidebarBadge.Ativo : sidebarBadge.Inativo}`}>
                      {c.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                    <Badge className={`ring-1 ${c.tipo === "PJ" ? sidebarBadge.PJ : sidebarBadge.PF}`}>
                      {c.tipo === "PJ" ? "PJ" : "PF"}
                    </Badge>
                  </div>

                  <p className="mt-5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-blue-200">Registo</p>
                  <div className="mt-2 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-blue-200">Criado</span>
                      <span className="font-semibold text-white">{formatDataCompleta(c.dataCriacao)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-blue-200">Atualizado</span>
                      <span className="text-right font-semibold text-white">{formatDataCompleta(c.ultimaAtualizacao)}</span>
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

              {/* ── Detalhes roláveis ── */}
              <div className="flex min-w-0 flex-1 flex-col">
                {/* Cabeçalho desktop */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white">Ficha do Cliente</p>
                    <p className="text-xs text-slate-400">Dados pessoais / empresa e contactos</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {onEdit && (
                      <Button variant="outline" size="sm" onClick={() => onEdit(c.id)}>
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
                  {/* Documentos & Empresa */}
                  <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Documentos &amp; Empresa</h3>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                      {c.tipo === "PJ" && c.responsavel ? <InfoCell label="Responsável" value={c.responsavel} /> : null}
                      {c.tipo === "PJ" && c.inscricaoSocial ? <InfoCell label="Inscrição Social" value={c.inscricaoSocial} mono /> : null}
                      <InfoCell label="NIF" value={c.nif} mono />
                      <InfoCell label="Tipo" value={tipoLabel} />
                    </div>
                  </section>

                  {/* Contactos */}
                  <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Contactos</h3>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                      <InfoCell label="Telefone" value={c.telefone || "-"} />
                      <InfoCell label="Email" value={c.email || "-"} />
                      <InfoCell label="Morada" value={c.morada || "-"} />
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

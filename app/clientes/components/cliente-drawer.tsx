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
        <DialogPrimitive.Popup
          className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[720px] bg-white dark:bg-slate-900 shadow-2xl outline-none transition-transform duration-300 ease-in-out translate-x-full data-open:translate-x-0 data-closed:translate-x-full"
          aria-label="Detalhes do cliente"
        >
          {c && (
            <div className="flex h-full w-full">
              {/* ── Resumo fixo (sidebar escura) ── */}
              <aside className="hidden md:flex w-[220px] shrink-0 flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-5 text-white">
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

                  <p className="mt-5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-400">Identificação</p>
                  <div className="mt-2 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">NIF</span>
                      <span className="font-mono font-semibold text-slate-200">{c.nif}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Tipo</span>
                      <span className="text-right font-semibold text-slate-200">{tipoLabel}</span>
                    </div>
                  </div>

                  <p className="mt-5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-400">Registo</p>
                  <div className="mt-2 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Criado</span>
                      <span className="font-semibold text-slate-200">{formatDataCompleta(c.dataCriacao)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Atualizado</span>
                      <span className="text-right font-semibold text-slate-200">{formatDataCompleta(c.ultimaAtualizacao)}</span>
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
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30">
                      <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">{getInitials(c.nome) || "?"}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{c.nome}</p>
                      <Badge className={c.ativo ? "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400 border border-teal-200 dark:border-teal-800" : "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-800"}>
                        {c.ativo ? "Ativo" : "Inativo"}
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

                  {/* Registo */}
                  <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <InfoCell label="Data de criação" value={formatDataCompleta(c.dataCriacao)} />
                    <InfoCell label="Última atualização" value={formatDataCompleta(c.ultimaAtualizacao)} />
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

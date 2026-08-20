"use client";

import { useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { Fornecedor } from "@/lib/types";
import { formatDataCompleta } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InfoCell } from "@/components/info-cell";

interface FornecedorDrawerProps {
  fornecedor: Fornecedor | null;
  onClose: () => void;
  onEdit?: (id: string) => void;
}

const sidebarBadge = {
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

export function FornecedorDrawer({ fornecedor, onClose, onEdit }: FornecedorDrawerProps) {
  // Retém o último fornecedor durante a animação de fecho
  const [open, setOpen] = useState(false);
  const [displayFornecedor, setDisplayFornecedor] = useState<Fornecedor | null>(null);
  const [prevFornecedor, setPrevFornecedor] = useState<Fornecedor | null>(fornecedor);

  if (fornecedor !== prevFornecedor) {
    setPrevFornecedor(fornecedor);
    if (fornecedor) {
      setDisplayFornecedor(fornecedor);
      setOpen(true);
    } else {
      setOpen(false);
    }
  }

  const f = displayFornecedor;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
          onClick={onClose}
        />
        <DialogPrimitive.Popup
          className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[720px] bg-white dark:bg-slate-900 shadow-2xl outline-none transition-transform duration-300 ease-in-out translate-x-full data-open:translate-x-0 data-closed:translate-x-full"
          aria-label="Detalhes do fornecedor"
        >
          {f && (
            <div className="flex h-full w-full">
              {/* ── Resumo fixo (sidebar escura) ── */}
              <aside className="hidden md:flex w-[220px] shrink-0 flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-5 text-white">
                <div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-xl font-extrabold">
                    {getInitials(f.nome) || "?"}
                  </div>
                  <p className="mt-3.5 text-[15px] font-extrabold leading-snug">{f.nome}</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <Badge className={`ring-1 ${f.ativo ? sidebarBadge.Ativo : sidebarBadge.Inativo}`}>
                      {f.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>

                  <p className="mt-5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-400">Identificação</p>
                  <div className="mt-2 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">NIF</span>
                      <span className="font-mono font-semibold text-slate-200">{f.nif}</span>
                    </div>
                  </div>

                  <p className="mt-5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-400">Registo</p>
                  <div className="mt-2 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Criado</span>
                      <span className="font-semibold text-slate-200">{formatDataCompleta(f.dataCriacao)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Atualizado</span>
                      <span className="text-right font-semibold text-slate-200">{formatDataCompleta(f.ultimaAtualizacao)}</span>
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
                      <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">{getInitials(f.nome) || "?"}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{f.nome}</p>
                      <Badge className={f.ativo ? "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400 border border-teal-200 dark:border-teal-800" : "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-800"}>
                        {f.ativo ? "Ativo" : "Inativo"}
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
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white">Ficha do Fornecedor</p>
                    <p className="text-xs text-slate-400">Dados da empresa e contactos</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {onEdit && (
                      <Button variant="outline" size="sm" onClick={() => onEdit(f.id)}>
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
                      <InfoCell label="NIF" value={f.nif} mono />
                      <InfoCell label="Estado" value={f.ativo ? "Ativo" : "Inativo"} />
                    </div>
                  </section>

                  {/* Contactos */}
                  <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Contactos</h3>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                      <InfoCell label="Telefone" value={f.telefone || "-"} />
                      <InfoCell label="Email" value={f.email || "-"} />
                      <InfoCell label="Morada" value={f.morada || "-"} />
                    </div>
                  </section>

                  {/* Dados Bancários */}
                  <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Dados Bancários</h3>
                    <InfoCell label="Conta / IBAN" value={f.bancaria || "-"} mono />
                  </section>

                  {/* Registo */}
                  <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <InfoCell label="Data de criação" value={formatDataCompleta(f.dataCriacao)} />
                    <InfoCell label="Última atualização" value={formatDataCompleta(f.ultimaAtualizacao)} />
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
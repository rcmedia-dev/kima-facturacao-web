"use client";

import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Fornecedor } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { Truck, MoreVertical, Pencil, Trash2, ChevronLeft, ChevronRight, Phone, Mail, ChevronRight as ChevronRightIcon } from "lucide-react";
import { FornecedorDrawer } from "./fornecedor-drawer";

interface FornecedorTableProps {
  fornecedores: Fornecedor[];
  allFornecedores?: Fornecedor[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  hasQuery?: boolean;
  isSearching?: boolean;
  itemsPerPage?: number;
}

export function FornecedorTable({
  fornecedores,
  allFornecedores,
  onEdit,
  onDelete,
  hasQuery = false,
  isSearching = false,
  itemsPerPage = 20,
}: FornecedorTableProps) {
  const [selectedFornecedor, setSelectedFornecedor] = useState<Fornecedor | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(fornecedores.length / itemsPerPage) || 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, fornecedores.length);
  const currentFornecedores = fornecedores.slice(startIndex, endIndex);

  if (isSearching) {
    return (
      <div className="p-12 text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-sm text-gray-400">A pesquisar fornecedores…</p>
      </div>
    );
  }

  if (fornecedores.length === 0) {
    return (
      <div className="p-12 text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <Truck className="w-5 h-5 text-gray-400" />
          </div>
        </div>
        {hasQuery ? (
          <>
            <p className="text-sm font-medium text-gray-600">Sem resultados</p>
            <p className="text-xs text-gray-400">Tente pesquisar por outro nome ou NIF.</p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-600">Nenhum fornecedor cadastrado</p>
            <p className="text-xs text-gray-400">Clique em &quot;Novo Fornecedor&quot; para começar.</p>
          </>
        )}
      </div>
    );
  }

  const fornecedoresPorStatus = useMemo(() => {
    if (!allFornecedores) return [];
    const source = fornecedores;
    const ativos = source.filter((f) => f.ativo);
    const inativos = source.filter((f) => !f.ativo);
    const groups: { label: string; items: Fornecedor[]; color: string }[] = [];
    if (ativos.length > 0) groups.push({ label: `Ativos — ${ativos.length} fornecedor${ativos.length !== 1 ? "es" : ""}`, items: ativos, color: "emerald" });
    if (inativos.length > 0) groups.push({ label: `Inativos — ${inativos.length} fornecedor${inativos.length !== 1 ? "es" : ""}`, items: inativos, color: "rose" });
    return groups;
  }, [fornecedores, allFornecedores]);

  return (
    <>
      {/* ── MOBILE CARD LIST ────────────────────────────── */}
      {allFornecedores && (
        <div className="sm:hidden">
          {fornecedoresPorStatus.map((grupo) => (
            <div key={grupo.label}>
              <div className="px-4 pt-4 pb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {grupo.label}
                </span>
              </div>
              {grupo.items.map((fornecedor, index) => (
                <div
                  key={fornecedor.id}
                  onClick={() => setSelectedFornecedor(fornecedor)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 active:bg-slate-50 dark:active:bg-slate-800/30 transition-colors cursor-pointer animate-in fade-in slide-in-from-bottom-1 border-l-[3px]",
                    fornecedor.ativo ? "border-l-emerald-500" : "border-l-rose-400"
                  )}
                  style={{ animationDelay: `${index * 30}ms`, animationFillMode: "both" }}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {fornecedor.nome.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-semibold text-slate-900 dark:text-white truncate">
                        {fornecedor.nome}
                      </p>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0",
                        fornecedor.ativo
                          ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                          : "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
                      )}>
                        {fornecedor.ativo ? "ATIVO" : "INATIVO"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      NIF: {fornecedor.nif} · {fornecedor.telefone || "Sem telefone"}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {fornecedor.telefone && (
                      <a
                        href={`tel:${fornecedor.telefone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="w-9 h-9 rounded-full bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center"
                      >
                        <Phone size={15} className="text-teal-600 dark:text-teal-400" />
                      </a>
                    )}
                    {fornecedor.email && (
                      <a
                        href={`mailto:${fornecedor.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center"
                      >
                        <Mail size={15} className="text-blue-600 dark:text-blue-400" />
                      </a>
                    )}
                    <ChevronRightIcon size={16} className="text-slate-300 dark:text-slate-600 ml-1" />
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Mobile pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Página {safePage} de {totalPages}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={safePage === 1}
                  className="px-3 h-8 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={safePage === totalPages}
                  className="px-3 h-8 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 disabled:opacity-40"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DESKTOP TABLE ───────────────────────────────── */}
      <div className="hidden sm:block">
        <div className="overflow-x-auto">
          <Table>
          <TableHeader className="bg-blue-600 text-white">
            <TableRow className="border-b border-blue-700">
              <TableHead className="font-semibold text-xs text-white uppercase tracking-wider">Nome</TableHead>
              <TableHead className="font-semibold text-xs text-white uppercase tracking-wider">NIF</TableHead>
              <TableHead className="font-semibold text-xs text-white uppercase tracking-wider">Telefone</TableHead>
              <TableHead className="font-semibold text-xs text-white uppercase tracking-wider">Email</TableHead>
              <TableHead className="font-semibold text-xs text-white uppercase tracking-wider text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentFornecedores.map((fornecedor, index) => (
              <TableRow
                key={fornecedor.id}
                onClick={() => setSelectedFornecedor(fornecedor)}
                className={cn(
                  "cursor-pointer transition-colors duration-150 border-b border-slate-100 dark:border-slate-800/80",
                  index % 2 !== 0 && "bg-slate-50/60 dark:bg-slate-800/20",
                  "hover:bg-blue-50/40 dark:hover:bg-slate-800/50",
                  "animate-in fade-in slide-in-from-bottom-1"
                )}
                style={{ animationDelay: `${index * 30}ms`, animationFillMode: "both" }}
              >
                <TableCell className="font-medium">{fornecedor.nome}</TableCell>
                <TableCell>
                  <span className="font-mono text-sm tracking-wide">{fornecedor.nif}</span>
                </TableCell>
                <TableCell className="text-gray-600">{fornecedor.telefone}</TableCell>
                <TableCell className="text-gray-600">{fornecedor.email}</TableCell>
                <TableCell className="text-right">
                  <MenuPrimitive.Root>
                    <MenuPrimitive.Trigger
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                      aria-label="Ações do fornecedor"
                    >
                      <MoreVertical size={16} />
                    </MenuPrimitive.Trigger>
                    <MenuPrimitive.Portal>
                      <MenuPrimitive.Positioner side="bottom" align="end" sideOffset={6} className="isolate z-50">
                        <MenuPrimitive.Popup className="relative min-w-[180px] origin-(--transform-origin) rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg p-1.5 animate-scale-in">
                          <MenuPrimitive.Item
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(fornecedor.id);
                              setSelectedFornecedor(null);
                            }}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none select-none cursor-pointer transition-colors",
                              "data-highlighted:bg-slate-100 dark:data-highlighted:bg-slate-800"
                            )}
                          >
                            <Pencil size={16} className="text-slate-400 shrink-0" />
                            Editar
                          </MenuPrimitive.Item>

                          <MenuPrimitive.Separator className="my-1 h-px bg-slate-100 dark:bg-slate-800" />

                          <MenuPrimitive.Item
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(fornecedor.id);
                              setSelectedFornecedor(null);
                            }}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 outline-none select-none cursor-pointer transition-colors",
                              "data-highlighted:bg-red-50 dark:data-highlighted:bg-red-950/40"
                            )}
                          >
                            <Trash2 size={16} className="shrink-0" />
                            Remover
                          </MenuPrimitive.Item>
                        </MenuPrimitive.Popup>
                      </MenuPrimitive.Positioner>
                    </MenuPrimitive.Portal>
                  </MenuPrimitive.Root>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>

        {/* Controles de Paginação (20 itens por página) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            A exibir <strong className="font-semibold text-slate-800 dark:text-slate-200">{startIndex + 1}</strong> a{" "}
            <strong className="font-semibold text-slate-800 dark:text-slate-200">{endIndex}</strong> de{" "}
            <strong className="font-semibold text-slate-800 dark:text-slate-200">{fornecedores.length}</strong> fornecedores
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={safePage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Página Anterior"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                    pageNum === safePage
                      ? "bg-blue-600 text-white shadow-sm"
                      : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={safePage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Próxima Página"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Drawer de detalhes do fornecedor */}
      <FornecedorDrawer fornecedor={selectedFornecedor} onClose={() => setSelectedFornecedor(null)} onEdit={(id) => { setSelectedFornecedor(null); onEdit(id); }} />
    </>
  );
}
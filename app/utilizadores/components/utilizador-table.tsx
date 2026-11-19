"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import {
  UserCog,
  MoreVertical,
  Shield,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { UtilizadorData } from "../types";

interface UtilizadorTableProps {
  utilizadores: UtilizadorData[];
  onManagePermissions: (utilizador: UtilizadorData) => void;
  onToggleStatus: (utilizador: UtilizadorData) => void;
  itemsPerPage?: number;
}

export function StatusBadge({ status }: { status: string }) {
  if (status === "ativo") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        <CheckCircle2 size={11} />
        Ativo
      </span>
    );
  }
  if (status === "pendente") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        <Clock size={11} />
        Pendente
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400">
      <XCircle size={11} />
      Inativo
    </span>
  );
}

export function getInitials(name: string | null, email: string) {
  const source = (name || "").trim() || email;
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (source[0] || "U").toUpperCase();
}

export function UtilizadorTable({
  utilizadores,
  onManagePermissions,
  onToggleStatus,
  itemsPerPage = 20,
}: UtilizadorTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(utilizadores.length / itemsPerPage) || 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, utilizadores.length);
  const currentItems = utilizadores.slice(startIndex, endIndex);

  if (utilizadores.length === 0) {
    return (
      <div className="p-12 text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <UserCog className="w-5 h-5 text-slate-400" />
          </div>
        </div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Nenhum funcionário cadastrado
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Clique em &quot;Novo Funcionário&quot; para começar.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-blue-600 text-white">
            <TableRow className="border-b border-blue-700">
              <TableHead className="font-semibold text-xs text-white uppercase tracking-wider">
                Utilizador
              </TableHead>
              <TableHead className="font-semibold text-xs text-white uppercase tracking-wider">
                Tipo
              </TableHead>
              <TableHead className="font-semibold text-xs text-white uppercase tracking-wider">
                Estado
              </TableHead>
              <TableHead className="font-semibold text-xs text-white uppercase tracking-wider text-center">
                Permissões
              </TableHead>
              <TableHead className="font-semibold text-xs text-white uppercase tracking-wider text-right w-[60px]">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentItems.map((user) => (
              <TableRow
                key={user.id}
                className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold shrink-0",
                        user.isOwner
                          ? "bg-gradient-to-tr from-amber-500 to-orange-500 text-white"
                          : "bg-gradient-to-tr from-blue-600 to-indigo-500 text-white"
                      )}
                    >
                      {getInitials(user.fullName, user.email)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {user.fullName || user.email.split("@")[0]}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full",
                      user.isOwner
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    )}
                  >
                    {user.isOwner ? (
                      <ShieldCheck size={11} />
                    ) : (
                      <Shield size={11} />
                    )}
                    {user.isOwner ? "Admin" : "Funcionário"}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={user.status} />
                </TableCell>
                <TableCell className="text-center">
                  {user.isOwner ? (
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      Todas
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      {user.permissions.length}{" "}
                      {user.permissions.length === 1 ? "permissão" : "permissões"}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {user.isOwner ? (
                    <span className="text-xs text-slate-400">—</span>
                  ) : (
                    <MenuPrimitive.Root>
                      <MenuPrimitive.Trigger className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors">
                        <MoreVertical size={16} />
                      </MenuPrimitive.Trigger>
                      <MenuPrimitive.Portal>
                        <MenuPrimitive.Positioner side="bottom" align="end" sideOffset={4}>
                          <MenuPrimitive.Popup className="min-w-[160px] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg p-1.5 z-50 animate-scale-in">
                            <MenuPrimitive.Item
                              onClick={() => onManagePermissions(user)}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none cursor-pointer transition-colors data-highlighted:bg-slate-100 dark:data-highlighted:bg-slate-800"
                            >
                              <Shield size={14} className="text-slate-400" />
                              Permissões
                            </MenuPrimitive.Item>
                            <MenuPrimitive.Item
                              onClick={() => onToggleStatus(user)}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none cursor-pointer transition-colors data-highlighted:bg-slate-100 dark:data-highlighted:bg-slate-800"
                            >
                              {user.status === "ativo" ? "Desativar acesso" : "Reativar acesso"}
                            </MenuPrimitive.Item>
                          </MenuPrimitive.Popup>
                        </MenuPrimitive.Positioner>
                      </MenuPrimitive.Portal>
                    </MenuPrimitive.Root>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            A mostrar {startIndex + 1}–{endIndex} de {utilizadores.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300 px-2">
              {safePage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

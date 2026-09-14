"use client";

import { useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X, Shield, Save, Loader2, Check } from "lucide-react";
import { useToastContext } from "@/components/ui/toast";
import type { UtilizadorData } from "../types";
import {
  PERMISSION_GROUPS,
  getPermissionLabel,
} from "@/lib/permissions";
import type { Permission } from "@/lib/types";

interface UtilizadorPermissionsModalProps {
  utilizador: UtilizadorData;
  onClose: () => void;
  onSave: () => void;
}

export function UtilizadorPermissionsModal({
  utilizador,
  onClose,
  onSave,
}: UtilizadorPermissionsModalProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(utilizador.permissions)
  );
  const [isSaving, setIsSaving] = useState(false);
  const { success, error } = useToastContext();

  const togglePermission = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const toggleGroup = (permissions: Permission[]) => {
    const allSelected = permissions.every((p) => selected.has(p));
    setSelected((prev) => {
      const next = new Set(prev);
      permissions.forEach((p) => {
        if (allSelected) {
          next.delete(p);
        } else {
          next.add(p);
        }
      });
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/utilizadores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: utilizador.id,
          permissions: Array.from(selected),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        error("Erro", data.error || "Erro ao guardar permissões.");
        return;
      }
      success("Sucesso", "Permissões atualizadas com sucesso.");
      onSave();
    } catch (e) {
      error("Erro", `Falha ao guardar permissões: ${(e as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-sm animate-fade-in" />
        <DialogPrimitive.Popup className="fixed z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-0 animate-scale-in overflow-hidden flex flex-col
          inset-x-0 bottom-0 top-auto translate-x-0 translate-y-0 rounded-t-2xl
          sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:inset-x-auto sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl max-h-[90vh] sm:max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30">
                <Shield size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Gerir Permissões
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {utilizador.fullName || utilizador.email}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Permissions */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
            {PERMISSION_GROUPS.map((group) => {
              const allSelected = group.permissions.every((p) =>
                selected.has(p)
              );
              const someSelected = group.permissions.some((p) =>
                selected.has(p)
              );

              return (
                <div key={group.label}>
                  {/* Group header */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.permissions)}
                    className="flex items-center gap-3 w-full text-left mb-2.5 sm:mb-3 group"
                  >
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 ${
                        allSelected
                          ? "bg-blue-600 border-blue-600"
                          : someSelected
                          ? "bg-blue-600/20 border-blue-600"
                          : "border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {allSelected && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                      {someSelected && !allSelected && (
                        <div className="w-2 h-0.5 bg-blue-600 rounded" />
                      )}
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {group.label}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded ml-auto">
                      {group.permissions.filter((p) => selected.has(p)).length}/{group.permissions.length}
                    </span>
                  </button>

                  {/* Permissions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 ml-7 sm:ml-8">
                    {group.permissions.map((perm) => {
                      const isSelected = selected.has(perm);
                      return (
                        <button
                          key={perm}
                          type="button"
                          onClick={() => togglePermission(perm)}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] text-left transition-all ${
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 active:bg-slate-100 dark:active:bg-slate-700"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? "bg-blue-600 border-blue-600"
                                : "border-slate-300 dark:border-slate-600"
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="w-2.5 h-2.5 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                          <span className="truncate">
                            {getPermissionLabel(perm)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Footer */}
          <div className="hidden sm:flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selected.size} de 18 permissões selecionadas
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-4 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="h-10 px-5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? (
                  <><Loader2 size={14} className="animate-spin" /> A guardar...</>
                ) : (
                  <><Save size={14} /> Guardar</>
                )}
              </button>
            </div>
          </div>

          {/* Mobile sticky footer */}
          <div className="sm:hidden flex items-stretch gap-3 px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={onClose}
              className="h-12 px-4 text-[13px] font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 active:scale-[0.97] transition-all shrink-0"
            >
              Cancelar
            </button>
            <div className="flex-1 flex items-center gap-2">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium shrink-0 tabular-nums">
                {selected.size}/18
              </span>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 h-12 px-5 text-[13px] font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 active:scale-[0.97] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <><Loader2 size={15} className="animate-spin" /> A guardar...</>
                ) : (
                  <><Save size={15} /> Guardar</>
                )}
              </button>
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X, Shield, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        <DialogPrimitive.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-0 animate-scale-in overflow-hidden max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
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

          {/* Permissões */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                    className="flex items-center gap-3 w-full text-left mb-3 group"
                  >
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
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
                  </button>

                  {/* Permissions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-8">
                    {group.permissions.map((perm) => {
                      const isSelected = selected.has(perm);
                      return (
                        <button
                          key={perm}
                          type="button"
                          onClick={() => togglePermission(perm)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all ${
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
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

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selected.size} de 18 permissões selecionadas
            </p>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-10 px-4 text-sm font-medium rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="h-10 px-5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700"
              >
                {isSaving ? (
                  "A guardar..."
                ) : (
                  <>
                    <Save size={16} className="mr-2" />
                    Guardar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

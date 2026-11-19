"use client";

import { useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X, UserPlus, Loader2, Check } from "lucide-react";
import { useToastContext } from "@/components/ui/toast";
import type { UtilizadorData } from "../types";
import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
} from "@/lib/permissions";
import type { Permission } from "@/lib/types";

interface UtilizadorFormModalProps {
  utilizador?: UtilizadorData;
  onClose: () => void;
  onSave: () => void;
  onInviteUrl?: (url: string, invitationId: string) => void;
}

export function UtilizadorFormModal({
  utilizador,
  onClose,
  onSave,
  onInviteUrl,
}: UtilizadorFormModalProps) {
  const [email, setEmail] = useState(utilizador?.email || "");
  const [fullName, setFullName] = useState(utilizador?.fullName || "");
  const [permissions, setPermissions] = useState<Permission[]>(["dashboard.view"]);
  const [isSaving, setIsSaving] = useState(false);
  const { success, error } = useToastContext();

  const isEditing = !!utilizador;

  const togglePermission = (permission: Permission) => {
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((value) => value !== permission)
        : [...current, permission]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      error("Erro", "Email é obrigatório.");
      return;
    }

    setIsSaving(true);

    try {
      if (isEditing) {
        const res = await fetch("/api/utilizadores", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: utilizador.id,
            email: email.trim(),
            fullName: fullName.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          error("Erro", data.error || "Erro ao atualizar.");
          return;
        }
        success("Sucesso", "Utilizador atualizado com sucesso.");
      } else {
        const res = await fetch("/api/utilizadores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            fullName: fullName.trim() || undefined,
            permissions,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          error("Erro", data.error || "Erro ao criar.");
          return;
        }
        if (
          typeof data.inviteUrl !== "string" ||
          typeof data.invitationId !== "string"
        ) {
          throw new Error("O servidor não devolveu o link do convite.");
        }
        onInviteUrl?.(data.inviteUrl, data.invitationId);
        success("Sucesso", "Convite criado com sucesso.");
      }
      onSave();
    } catch (e) {
      error("Erro", `Falha ao guardar: ${(e as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-sm animate-fade-in" />
        <DialogPrimitive.Popup className="fixed z-50 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white p-0 shadow-xl animate-scale-in dark:border-slate-800 dark:bg-slate-900
          inset-x-0 bottom-0 top-auto translate-x-0 translate-y-0
          sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:inset-x-auto sm:w-[min(92vw,520px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30">
                <UserPlus size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isEditing ? "Editar Funcionário" : "Convidar funcionário"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isEditing
                    ? "Atualize os dados do funcionário."
                    : "O funcionário definirá a palavra-passe no primeiro acesso."}
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

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
            <div className="space-y-5 overflow-y-auto p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Nome completo
                  <input
                    id="util-name"
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    required={!isEditing}
                    minLength={isEditing ? undefined : 2}
                    maxLength={120}
                    className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Email
                  <input
                    id="util-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={isEditing}
                    required
                    maxLength={254}
                    className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>
              </div>

              {!isEditing && (
                <fieldset>
                  <legend className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Permissões do módulo
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {PERMISSION_GROUPS.map((group) => (
                      <fieldset
                        key={group.label}
                        className="min-w-0 rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                      >
                        <legend className="px-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                          {group.label}
                        </legend>
                        <div className="space-y-2">
                          {group.permissions.map((permission) => (
                            <label
                              key={permission}
                              className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300"
                            >
                              <input
                                type="checkbox"
                                checked={permissions.includes(permission)}
                                onChange={() => togglePermission(permission)}
                                className="mt-0.5 accent-blue-600"
                              />
                              <span>{PERMISSION_LABELS[permission]}</span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    ))}
                  </div>
                </fieldset>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-4 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving || !email.trim()}
                className="h-10 px-5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <><Loader2 size={14} className="animate-spin" /> A guardar...</>
                ) : isEditing ? (
                  <><Check size={14} strokeWidth={3} /> Guardar</>
                ) : (
                  <><UserPlus size={14} /> Gerar convite</>
                )}
              </button>
            </div>
          </form>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

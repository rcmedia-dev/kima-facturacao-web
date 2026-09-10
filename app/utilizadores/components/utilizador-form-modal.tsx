"use client";

import { useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToastContext } from "@/components/ui/toast";
import type { UtilizadorData } from "../types";

interface UtilizadorFormModalProps {
  utilizador?: UtilizadorData;
  onClose: () => void;
  onSave: () => void;
}

export function UtilizadorFormModal({
  utilizador,
  onClose,
  onSave,
}: UtilizadorFormModalProps) {
  const [email, setEmail] = useState(utilizador?.email || "");
  const [fullName, setFullName] = useState(utilizador?.fullName || "");
  const [isSaving, setIsSaving] = useState(false);
  const { success, error } = useToastContext();

  const isEditing = !!utilizador;

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
            permissions: ["dashboard.view"],
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          error("Erro", data.error || "Erro ao criar.");
          return;
        }
        success("Sucesso", "Funcionário criado com sucesso.");
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
        <DialogPrimitive.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-0 animate-scale-in overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30">
                <UserPlus size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isEditing ? "Editar Funcionário" : "Novo Funcionário"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isEditing
                    ? "Atualize os dados do funcionário."
                    : "Adicione um novo funcionário à empresa."}
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

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="relative">
              <input
                id="util-email"
                type="email"
                placeholder=" "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isEditing}
                className="peer w-full h-[52px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 pt-5 pb-1.5 text-sm text-slate-900 dark:text-white outline-none transition-all duration-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <label
                htmlFor="util-email"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-slate-500 transition-all duration-200 pointer-events-none peer-focus:top-3.5 peer-focus:text-xs peer-focus:text-blue-600 peer-focus:font-semibold peer-[:not(:placeholder-shown)]:top-3.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-slate-500"
              >
                Email do funcionário*
              </label>
            </div>

            <div className="relative">
              <input
                id="util-name"
                type="text"
                placeholder=" "
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="peer w-full h-[52px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 pt-5 pb-1.5 text-sm text-slate-900 dark:text-white outline-none transition-all duration-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30"
              />
              <label
                htmlFor="util-name"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-slate-500 transition-all duration-200 pointer-events-none peer-focus:top-3.5 peer-focus:text-xs peer-focus:text-blue-600 peer-focus:font-semibold peer-[:not(:placeholder-shown)]:top-3.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-slate-500"
              >
                Nome completo (opcional)
              </label>
            </div>

            {!isEditing && (
              <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                O funcionário deverá definir a sua senha no primeiro acesso.
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-10 px-4 text-sm font-medium rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving || !email.trim()}
                className="h-10 px-5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700"
              >
                {isSaving ? "A guardar..." : isEditing ? "Guardar" : "Criar Funcionário"}
              </Button>
            </div>
          </form>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

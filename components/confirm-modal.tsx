"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface ConfirmModalProps {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  requireInputLabel?: string;
  inputPlaceholder?: string;
  onClose: () => void;
  onConfirm: (inputValue?: string) => void;
}

export function ConfirmModal({
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "danger",
  requireInputLabel,
  inputPlaceholder = "Digite aqui...",
  onClose,
  onConfirm,
}: ConfirmModalProps) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    if (requireInputLabel && !inputValue.trim()) {
      setError("Por favor, preencha este campo obrigatório.");
      return;
    }
    onConfirm(inputValue);
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          iconBg: "bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400",
          confirmBtn: "bg-red-600 hover:bg-red-700 text-white",
        };
      case "warning":
        return {
          iconBg: "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400",
          confirmBtn: "bg-amber-600 hover:bg-amber-700 text-white",
        };
      default:
        return {
          iconBg: "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400",
          confirmBtn: "bg-blue-600 hover:bg-blue-700 text-white",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="p-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden rounded-2xl
        w-full max-w-[calc(100vw-2rem)]
        sm:max-w-[420px] sm:p-6
        fixed inset-x-0 bottom-0 top-auto translate-x-0 translate-y-0 rounded-t-2xl
        sm:inset-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
        <div className="p-5 sm:p-6">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${styles.iconBg}`}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  {title}
                </DialogTitle>
              </div>
            </div>
            <DialogDescription className="text-xs text-slate-600 dark:text-slate-400 pt-1">
              {description}
            </DialogDescription>
          </DialogHeader>

          {requireInputLabel && (
            <div className="space-y-1.5 py-3">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {requireInputLabel} <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setError(null);
                }}
                placeholder={inputPlaceholder}
                className="rounded-xl text-xs h-11"
                autoFocus
              />
              {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}
            </div>
          )}

          {/* Desktop buttons */}
          <div className="hidden sm:flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              onClick={onClose}
              className="rounded-xl text-xs"
              aria-label={cancelText}
            >
              {cancelText}
            </Button>
            <Button
              onClick={handleConfirm}
              className={`rounded-xl text-xs font-semibold shadow-sm ${styles.confirmBtn}`}
              aria-label={confirmText}
            >
              {confirmText}
            </Button>
          </div>
        </div>

        {/* Mobile sticky footer */}
        <div className="sm:hidden flex items-stretch gap-3 px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            onClick={onClose}
            className="h-12 px-5 text-[13px] font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 active:scale-[0.97] transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 h-12 px-6 text-[13px] font-bold rounded-xl shadow-md active:scale-[0.97] transition-all flex items-center justify-center gap-2 ${styles.confirmBtn}`}
          >
            {confirmText}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

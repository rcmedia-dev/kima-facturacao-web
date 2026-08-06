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
  requireInputLabel?: string; // Se fornecido, exige input de texto (ex: Motivo de Cancelamento)
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
          buttonBg: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
        };
      case "warning":
        return {
          iconBg: "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400",
          buttonBg: "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500",
        };
      default:
        return {
          iconBg: "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400",
          buttonBg: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
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
          <div className="space-y-1.5 py-2">
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
              className="rounded-xl text-xs"
              autoFocus
            />
            {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
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
            className={`rounded-xl text-xs font-semibold shadow-sm ${styles.buttonBg}`}
            aria-label={confirmText}
          >
            {confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

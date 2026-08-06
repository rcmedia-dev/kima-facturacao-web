"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, XCircle, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextValue {
  toast: (options: Omit<ToastMessage, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ title, description, type = "info", duration = 4000 }: Omit<ToastMessage, "id">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const newToast: ToastMessage = { id, title, description, type, duration };
      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, description?: string) => addToast({ title, description, type: "success" }),
    [addToast]
  );

  const error = useCallback(
    (title: string, description?: string) => addToast({ title, description, type: "error" }),
    [addToast]
  );

  const warning = useCallback(
    (title: string, description?: string) => addToast({ title, description, type: "warning" }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, warning }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) {
  const getStyles = () => {
    switch (toast.type) {
      case "success":
        return {
          bg: "bg-emerald-50 dark:bg-slate-900 border-emerald-500 text-emerald-950 dark:text-emerald-200",
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
        };
      case "error":
        return {
          bg: "bg-red-50 dark:bg-slate-900 border-red-500 text-red-950 dark:text-red-200",
          icon: <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />,
        };
      case "warning":
        return {
          bg: "bg-amber-50 dark:bg-slate-900 border-amber-500 text-amber-950 dark:text-amber-200",
          icon: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />,
        };
      default:
        return {
          bg: "bg-blue-50 dark:bg-slate-900 border-blue-500 text-blue-950 dark:text-blue-200",
          icon: <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />,
        };
    }
  };

  const style = getStyles();

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border-l-4 shadow-lg transition-all duration-300 animate-slide-up ${style.bg}`}
      role="alert"
    >
      {style.icon}
      <div className="flex-1 text-xs">
        <h4 className="font-bold text-sm leading-tight mb-0.5">{toast.title}</h4>
        {toast.description && <p className="opacity-90 leading-normal">{toast.description}</p>}
      </div>
      <button
        onClick={onClose}
        className="p-1 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Fechar notificação"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToastContext deve ser usado dentro de um ToastProvider");
  }
  return context;
}

"use client";

import Link from "next/link";
import { ShieldOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AcessoNegadoPage() {
  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0F172A] flex items-center justify-center px-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-sm p-6 sm:p-9 max-w-md w-full text-center animate-scale-in">
        <ShieldOff size={48} className="mx-auto text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Acesso Negado
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Não tem permissão para aceder a esta página. Contacte o administrador da empresa para solicitar acesso.
        </p>
        <Link href="/dashboard">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <ArrowLeft size={16} className="mr-2" />
            Voltar ao Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus, ShieldCheck } from "lucide-react";

interface TopbarProps {
  onOpenMobile: () => void;
}

export function Topbar({ onOpenMobile }: TopbarProps) {
  const pathname = usePathname();

  const getPageTitle = (path: string) => {
    if (path.startsWith("/dashboard"))      return { title: "Dashboard",           subtitle: "Visão geral e desempenho financeiro" };
    if (path.startsWith("/clientes"))       return { title: "Clientes",            subtitle: "Gestão e cadastro de clientes" };
    if (path.startsWith("/artigos"))        return { title: "Artigos & Serviços",  subtitle: "Catálogo de artigos e controlo de stock" };
    if (path.startsWith("/faturas/nova"))   return { title: "Nova Fatura",         subtitle: "Emissão guiada em 3 passos" };
    if (path.startsWith("/faturas"))        return { title: "Faturas & Documentos",subtitle: "Histórico de documentos emitidos" };
    if (path.startsWith("/configuracoes"))  return { title: "Configurações",       subtitle: "Definições da empresa e sistema" };
    return { title: "Kima Financeiro", subtitle: "Sistema de Facturação" };
  };

  const { title, subtitle } = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
      {/* Esquerda: Botão Mobile + Título Contextual */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>

        <div>
          <h1 className="text-base md:text-lg font-bold text-slate-900 dark:text-white leading-tight">
            {title}
          </h1>
          <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 font-medium">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Direita: Ações Rápidas */}
      <div className="flex items-center gap-3">
        {/* Badge Conformidade AGT */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
          <ShieldCheck size={13} />
          <span>Certificado AGT</span>
        </div>

        {/* Botão Nova Fatura — gradiente KIMA */}
        <Link href="/faturas/nova">
          <button
            id="topbar-btn-nova-fatura"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus size={16} />
            <span className="hidden xs:inline">Nova Fatura</span>
            <span className="xs:hidden">Fatura</span>
          </button>
        </Link>
      </div>
    </header>
  );
}

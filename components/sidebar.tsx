"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Database,
  Building2,
  UserRound,
} from "lucide-react";
import { createBrowserSupabase } from "@rcmedia-dev/kima-sdk";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const navItems = [
  {
    section: "Principal",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/faturas",   label: "Faturas",   icon: FileText },
    ],
  },
  {
    section: "Gestão",
    items: [
      { href: "/clientes", label: "Clientes",          icon: Users },
      { href: "/artigos",  label: "Artigos & Serviços", icon: Package },
    ],
  },
  {
    section: "Sistema",
    items: [
      { href: "/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const store = useAppStore();
  const [userName, setUserName] = React.useState("Utilizador");
  const [userEmail, setUserEmail] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;

    createBrowserSupabase()
      .auth.getUser()
      .then(({ data }) => {
        if (cancelled || !data.user) return;

        const metadata = data.user.user_metadata as {
          full_name?: string;
          name?: string;
          first_name?: string;
          firstName?: string;
        };
        const name = metadata.full_name || metadata.name ||
          [metadata.first_name, metadata.firstName].filter(Boolean).join(" ") ||
          data.user.email?.split("@")[0] || "Utilizador";

        setUserName(name);
        setUserEmail(data.user.email || "");
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const userInitial = userName.trim().charAt(0).toUpperCase() || "U";
  const hubProfileUrl = `${(process.env.NEXT_PUBLIC_KIMA_HUB_URL || "https://kima-hub.vercel.app").replace(/\/$/, "")}/perfil`;

  return (
    <>
      {/* Overlay Mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-sm md:hidden animate-fade-in"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container — 280px conforme Design System */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col",
          "bg-white dark:bg-slate-900",
          "border-r border-slate-200 dark:border-slate-800",
          "shadow-sm sidebar-transition",
          collapsed ? "w-20" : "w-[280px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* ── HEADER / BRAND ─────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/80">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 overflow-hidden font-bold transition-opacity hover:opacity-90"
            onClick={onCloseMobile}
          >
            {/* Logo Mark */}
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-extrabold text-base shadow-md shrink-0">
              K
            </div>

            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
                  KIMA <span className="text-blue-600 dark:text-blue-400">FINANCEIRO</span>
                </span>
                <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
                  Facturação Web
                </span>
              </div>
            )}
          </Link>

          {/* Toggle Desktop */}
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
            title={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* ── BOTÃO NOVA FATURA ──────────────────────────── */}
        <div className="px-4 pt-4 pb-2">
          <Link
            href="/faturas/nova"
            onClick={onCloseMobile}
            className={cn(
              "flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-sm hover:shadow-md",
              "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white",
              collapsed && "px-0"
            )}
            title="Nova Fatura"
          >
            <PlusCircle size={17} className="shrink-0" />
            {!collapsed && <span>Nova Fatura</span>}
          </Link>
        </div>

        {/* ── NAVEGAÇÃO PRINCIPAL ────────────────────────── */}
        <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
          {navItems.map((group) => (
            <div key={group.section}>
              {/* Título de secção */}
              {!collapsed && (
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2">
                  {group.section}
                </p>
              )}

              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onCloseMobile}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative",
                        isActive
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-semibold"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                      )}
                    >
                      <Icon
                        size={18}
                        className={cn(
                          "shrink-0 transition-colors",
                          isActive
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-slate-400 dark:text-slate-500 group-hover:text-blue-500"
                        )}
                      />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── RODAPÉ ─────────────────────────────────────── */}
        <div className="px-4 py-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          {/* Perfil do utilizador autenticado no Kima Hub */}
          <a
            href={hubProfileUrl}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl border border-blue-100 dark:border-blue-900/50",
              "bg-blue-50/70 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors",
              collapsed && "justify-center px-0"
            )}
            title={collapsed ? `${userName} - Abrir perfil` : "Abrir perfil do utilizador"}
            onClick={onCloseMobile}
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">
              {userInitial}
            </span>
            {!collapsed && (
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {userName}
                </span>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {userEmail || "Abrir o meu perfil"}
                </span>
              </span>
            )}
            {!collapsed && <UserRound size={15} className="text-blue-500 shrink-0" />}
          </a>

          {/* Info da empresa */}
          {!collapsed && (
            <div className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
              <Building2 size={15} className="text-blue-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {store.empresa?.nomeEmpresa || "Empresa Demonstrativa"}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                  NIF: {store.empresa?.nif || "5417082910"}
                </p>
              </div>
            </div>
          )}

          {/* Botão dados mock */}
          <button
            onClick={() => store.seedMockData()}
            className={cn(
              "flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl text-xs font-medium",
              "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30",
              "border border-amber-200 dark:border-amber-800/50",
              "hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors",
              collapsed && "px-0"
            )}
            title="Recarregar Dados Demonstrativos"
          >
            <Database size={14} className="shrink-0" />
            {!collapsed && <span>Dados Mock</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

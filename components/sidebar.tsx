"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Truck,
  Wallet,
  Settings,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileDropdown } from "@/components/profile-dropdown";

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
      { href: "/faturas",   label: "Documentos", icon: FileText },
    ],
  },
  {
    section: "Gestão",
    items: [
      { href: "/clientes",      label: "Clientes",           icon: Users },
      { href: "/fornecedores",  label: "Fornecedores",       icon: Truck },
      { href: "/artigos",       label: "Artigos & Serviços", icon: Package },
    ],
  },
  {
    section: "Financeiro",
    items: [
      { href: "/despesas", label: "Despesas", icon: Wallet },
      { href: "/relatorios", label: "Relatórios & SAF-T", icon: BarChart3 },
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
          "bg-blue-600",
          "border-r border-blue-700/50",
          "shadow-sm sidebar-transition",
          collapsed ? "w-20" : "w-[280px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* ── HEADER / BRAND ─────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 overflow-hidden font-bold transition-opacity hover:opacity-90"
            onClick={onCloseMobile}
          >
            {/* Logo Mark */}
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white text-blue-700 font-extrabold text-base shadow-md shrink-0">
              K
            </div>

            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold tracking-tight text-white truncate">
                  Kima <span className="text-blue-100">Factura</span>
                </span>
              </div>
            )}
          </Link>

          {/* Toggle Desktop */}
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-blue-100 hover:text-white hover:bg-white/10 transition-colors"
            title={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* ── NAVEGAÇÃO PRINCIPAL ────────────────────────── */}
        <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
          {navItems.map((group) => (
            <div key={group.section}>
              {/* Título de secção */}
              {!collapsed && (
                <p className="text-[10px] font-semibold text-blue-100/90 uppercase tracking-wider px-3 mb-2">
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
                          ? "bg-white text-blue-700 shadow-sm font-semibold"
                          : "text-blue-50 hover:bg-white/15 hover:text-white"
                      )}
                    >
                      <Icon
                        size={18}
                        className={cn(
                          "shrink-0 transition-colors",
                          isActive
                            ? "text-blue-600"
                            : "text-blue-100 group-hover:text-white"
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
        <div className="px-4 py-4 border-t border-white/10">
          {/* Menu de perfil do utilizador com logout */}
          <ProfileDropdown collapsed={collapsed} variant="sidebar" />
        </div>
      </aside>
    </>
  );
}

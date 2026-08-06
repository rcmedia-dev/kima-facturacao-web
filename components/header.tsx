"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

export function Header() {
  const pathname = usePathname();
  const store = useAppStore();

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/clientes", label: "Clientes" },
    { href: "/artigos", label: "Artigos" },
    { href: "/faturas", label: "Faturas" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#2563EB] text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg hover:opacity-90 transition-opacity">
            <span className="text-2xl">📊</span>
            <span>KIMA FINANCEIRO</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-blue-500 text-white"
                    : "text-blue-50 hover:bg-blue-500/50"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Actions / Settings */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => store.seedMockData()}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-800/60 hover:bg-blue-800 text-xs font-medium text-blue-100 rounded-md border border-blue-400/30 transition-colors"
              title="Recarregar dados mockados"
            >
              <Database size={14} />
              <span>Dados Mock</span>
            </button>

            <Link
              href="/configuracoes"
              className="flex items-center justify-center w-10 h-10 rounded-md hover:bg-blue-500/50 transition-colors"
              title="Configurações"
            >
              <Settings size={20} />
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className="md:hidden border-t border-blue-500/30 px-4 py-2 flex items-center justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors",
                pathname === item.href
                  ? "bg-blue-500 text-white"
                  : "bg-blue-500/30 text-blue-50 hover:bg-blue-500/50"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}

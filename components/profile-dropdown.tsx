"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { User as UserIcon, Settings, LogOut, ChevronDown, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";

interface ProfileDropdownProps {
  collapsed?: boolean;
  variant?: "default" | "sidebar";
}

function getInitials(name: string, email: string) {
  const source = name.trim() || email;
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (source[0] || "K").toUpperCase();
}

export function ProfileDropdown({ collapsed = false, variant = "default" }: ProfileDropdownProps) {
  const router = useRouter();
  const { email, isOwner, loaded } = usePermissions();

  const displayName = email?.split("@")[0] || "Utilizador";
  const initials = getInitials(displayName, email || "");

  const handleLogout = async () => {
    // Limpar cookie kima-session
    document.cookie = "kima-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";

    // Limpar store se existir
    try {
      const { useAppStore } = await import("@/lib/store");
      useAppStore.getState().clearAllData();
    } catch {
      // Ignora se o store não estiver montado
    }

    router.push("/login");
    router.refresh();
  };

  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger
        className={cn(
          "flex items-center rounded-xl px-2 py-1.5 transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-blue-500",
          variant === "sidebar"
            ? "hover:bg-white/10"
            : "hover:bg-slate-100 dark:hover:bg-slate-800",
          collapsed ? "justify-center w-full" : "gap-2.5"
        )}
        aria-label="Menu do utilizador"
        title={collapsed ? displayName : undefined}
      >
        {/* Avatar */}
        <div className={cn(
          "flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold shadow-md shrink-0",
          variant === "sidebar" ? "bg-white text-blue-600" : "bg-gradient-to-tr from-blue-600 to-indigo-500 text-white"
        )}>
          {loaded ? initials : <UserIcon size={16} />}
        </div>

        {!collapsed && (
          <>
            <span className="hidden sm:flex flex-col items-start text-left leading-tight min-w-0">
              <span className={cn(
                "text-sm font-semibold max-w-[140px] truncate",
                variant === "sidebar" ? "text-white" : "text-slate-800 dark:text-slate-200"
              )}>
                {displayName}
              </span>
              <span className={cn(
                "text-[11px] max-w-[140px] truncate",
                variant === "sidebar" ? "text-blue-100/80" : "text-slate-400 dark:text-slate-500"
              )}>
                {isOwner ? "Administrador" : "Funcionário"}
              </span>
            </span>

            <ChevronDown size={15} className={cn(
              "hidden sm:block ml-auto",
              variant === "sidebar" ? "text-blue-100/80" : "text-slate-400"
            )} />
          </>
        )}
      </MenuPrimitive.Trigger>

      <MenuPrimitive.Portal>
        <MenuPrimitive.Positioner side="bottom" align="end" sideOffset={8} className="isolate z-50">
          <MenuPrimitive.Popup className="relative min-w-[220px] origin-(--transform-origin) rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg p-1.5 animate-scale-in">
            {/* Cabeçalho do perfil */}
            <div className="flex items-center gap-3 px-3 py-3 border-b border-slate-100 dark:border-slate-800 mb-1">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white text-sm font-bold shadow-md shrink-0">
                {initials || <UserIcon size={16} />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {displayName}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                  {email || "Conta KIMA"}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Shield size={10} className={isOwner ? "text-amber-500" : "text-blue-500"} />
                  <span className={cn(
                    "text-[10px] font-semibold",
                    isOwner ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"
                  )}>
                    {isOwner ? "Administrador" : "Funcionário"}
                  </span>
                </div>
              </div>
            </div>

            {/* Configurações */}
            <MenuPrimitive.Item
              render={<Link href="/configuracoes" />}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none select-none cursor-pointer transition-colors data-highlighted:bg-slate-100 dark:data-highlighted:bg-slate-800"
            >
              <Settings size={16} className="text-slate-400 shrink-0" />
              Configurações
            </MenuPrimitive.Item>

            <MenuPrimitive.Separator className="my-1 h-px bg-slate-100 dark:bg-slate-800" />

            {/* Logout */}
            <MenuPrimitive.Item
              onClick={handleLogout}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 outline-none select-none cursor-pointer transition-colors",
                "data-highlighted:bg-red-50 dark:data-highlighted:bg-red-950/40"
              )}
            >
              <LogOut size={16} className="shrink-0" />
              Terminar Sessão
            </MenuPrimitive.Item>
          </MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}

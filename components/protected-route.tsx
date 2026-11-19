/**
 * ProtectedRoute — Componente de protecção client-side.
 *
 * Se o utilizador não tem sessão → redireciona para /login.
 * Se o utilizador não tem permissão → redireciona para /acesso-negado.
 * Se tudo OK → renderiza os children.
 */

"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Se especificado, verifica esta permissão antes de renderizar */
  requiredPermission?: string;
}

export function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { loaded, unauthenticated, can } = usePermissions();

  useEffect(() => {
    if (!loaded) return;

    // Sem sessão → login
    if (unauthenticated) {
      const loginUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
      router.replace(loginUrl);
      return;
    }

    // Sem permissão necessária → acesso negado
    if (requiredPermission && !can(requiredPermission as any)) {
      router.replace("/acesso-negado");
      return;
    }
  }, [loaded, unauthenticated, requiredPermission, can, pathname, router]);

  // Ainda a carregar
  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={24} className="animate-spin text-blue-600" />
      </div>
    );
  }

  // Sem sessão — não renderiza (vai redirecionar)
  if (unauthenticated) {
    return null;
  }

  // Sem permissão — não renderiza (vai redirecionar)
  if (requiredPermission && !can(requiredPermission as any)) {
    return null;
  }

  return <>{children}</>;
}

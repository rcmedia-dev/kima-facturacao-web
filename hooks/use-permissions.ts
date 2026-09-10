/**
 * Hook cliente para permissões.
 *
 * Busca permissões do utilizador via API /api/auth/permissions
 * e fornece funções de verificação.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import type { Permission, UserPermissions } from "@/lib/types";
import { can, canAccessRoute, ROUTE_PERMISSIONS } from "@/lib/permissions";

interface UsePermissionsReturn {
  /** Permissões do utilizador (null = ainda a carregar) */
  permissions: Permission[] | null;
  /** true se é admin (owner) */
  isOwner: boolean;
  /** userId da sessão */
  userId: string | null;
  /** companyId da sessão */
  companyId: string | null;
  /** Email da sessão */
  email: string | null;
  /** true se terminou de carregar */
  loaded: boolean;
  /** true se não tem sessão */
  unauthenticated: boolean;
  /** Verifica se tem uma permissão */
  can: (permission: Permission) => boolean;
  /** Verifica se tem acesso a uma rota */
  canAccess: (pathname: string) => boolean;
  /** Recarrega permissões */
  reload: () => void;
}

export function usePermissions(): UsePermissionsReturn {
  const [data, setData] = useState<UserPermissions | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [unauthenticated, setUnauthenticated] = useState(false);

  const fetchPermissions = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/permissions");
      if (response.status === 401) {
        setUnauthenticated(true);
        setData(null);
        setLoaded(true);
        return;
      }
      const result: UserPermissions = await response.json();
      setData(result);
      setUnauthenticated(false);
    } catch {
      setUnauthenticated(true);
      setData(null);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const canCheck = useCallback(
    (permission: Permission): boolean => {
      if (!data) return false;
      return can(data.permissions, permission);
    },
    [data]
  );

  const canAccess = useCallback(
    (pathname: string): boolean => {
      if (!data) return false;
      return canAccessRoute(data.permissions, pathname);
    },
    [data]
  );

  return {
    permissions: data?.permissions ?? null,
    isOwner: data?.isOwner ?? false,
    userId: data?.userId ?? null,
    companyId: data?.companyId ?? null,
    email: data?.email ?? null,
    loaded,
    unauthenticated,
    can: canCheck,
    canAccess,
    reload: fetchPermissions,
  };
}

/**
 * Hook cliente para permissões.
 *
 * Busca permissões do utilizador via API /api/auth/permissions
 * e fornece funções de verificação.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import type { Permission, UserPermissions } from "@/lib/types";
import { can, canAccessRoute, ALL_PERMISSIONS } from "@/lib/permissions";

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
      const result = await response.json() as {
        userId?: unknown;
        companyId?: unknown;
        isOwner?: unknown;
        email?: unknown;
        permissions?: unknown;
        error?: unknown;
      };
      if (!response.ok || !Array.isArray(result.permissions)) {
        throw new Error(typeof result.error === "string"
          ? result.error
          : "Não foi possível carregar as permissões.");
      }
      const validPermissions = new Set<string>(ALL_PERMISSIONS);
      setData({
        userId: typeof result.userId === "string" ? result.userId : "",
        companyId: typeof result.companyId === "string" ? result.companyId : "",
        isOwner: result.isOwner === true,
        email: typeof result.email === "string" ? result.email : undefined,
        permissions: result.permissions.filter(
          (permission: unknown): permission is Permission =>
            typeof permission === "string" && validPermissions.has(permission)
        ),
      });
      setUnauthenticated(false);
    } catch (error) {
      console.error("[usePermissions]", error);
      setUnauthenticated(false);
      setData(null);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

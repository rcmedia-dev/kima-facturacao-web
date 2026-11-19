/**
 * Sistema de Permissões — Kima Facturação
 *
 * Dois tipos de utilizador:
 * - Admin (owner): todas as permissões, sempre
 * - Funcionário: apenas permissões atribuídas pelo Admin
 *
 * Permissões finais = Admin tem ['*'] / Funcionário tem lista atribuída
 */

import type { Permission } from '@/lib/types';

// ══════════════════════════════════════════════════════════════════════════════
// LISTA COMPLETA DE PERMISSÕES (18)
// ══════════════════════════════════════════════════════════════════════════════

export const ALL_PERMISSIONS: Permission[] = [
  'dashboard.view',
  'invoices.view',
  'invoices.create',
  'invoices.update',
  'invoices.delete',
  'customers.view',
  'customers.manage',
  'customers.delete',
  'suppliers.view',
  'suppliers.manage',
  'articles.view',
  'articles.manage',
  'expenses.view',
  'expenses.manage',
  'reports.view',
  'settings.manage',
  'agt.manage',
  'users.manage',
];

// ══════════════════════════════════════════════════════════════════════════════
// MAPA DE ROTAS → PERMISSÃO NECESSÁRIA
// ══════════════════════════════════════════════════════════════════════════════

export const ROUTE_PERMISSIONS: Record<string, Permission> = {
  '/dashboard': 'dashboard.view',
  '/faturas': 'invoices.view',
  '/faturas/nova': 'invoices.create',
  '/faturas/[id]': 'invoices.view',
  '/clientes': 'customers.view',
  '/fornecedores': 'suppliers.view',
  '/artigos': 'articles.view',
  '/despesas': 'expenses.view',
  '/relatorios': 'reports.view',
  '/configuracoes': 'settings.manage',
  '/agt': 'agt.manage',
  '/utilizadores': 'users.manage',
};

// ══════════════════════════════════════════════════════════════════════════════
// MAPA DE PERMISSÃO → DESCRIÇÃO (para UI)
// ══════════════════════════════════════════════════════════════════════════════

export const PERMISSION_LABELS: Record<Permission, string> = {
  'dashboard.view': 'Ver dashboard',
  'invoices.view': 'Ver facturas',
  'invoices.create': 'Criar facturas',
  'invoices.update': 'Editar facturas',
  'invoices.delete': 'Apagar facturas',
  'customers.view': 'Ver clientes',
  'customers.manage': 'Criar/editar clientes',
  'customers.delete': 'Apagar clientes',
  'suppliers.view': 'Ver fornecedores',
  'suppliers.manage': 'Gerir fornecedores',
  'articles.view': 'Ver artigos',
  'articles.manage': 'Gerir artigos',
  'expenses.view': 'Ver despesas',
  'expenses.manage': 'Gerir despesas',
  'reports.view': 'Ver relatórios',
  'settings.manage': 'Gerir configurações',
  'agt.manage': 'Gerir AGT',
  'users.manage': 'Gerir utilizadores',
};

// ══════════════════════════════════════════════════════════════════════════════
// AGRUPAMENTO DE PERMISSÕES POR SECÇÃO (para UI do /utilizadores)
// ══════════════════════════════════════════════════════════════════════════════

export interface PermissionGroup {
  label: string;
  permissions: Permission[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: 'Dashboard',
    permissions: ['dashboard.view'],
  },
  {
    label: 'Facturas',
    permissions: ['invoices.view', 'invoices.create', 'invoices.update', 'invoices.delete'],
  },
  {
    label: 'Clientes',
    permissions: ['customers.view', 'customers.manage', 'customers.delete'],
  },
  {
    label: 'Fornecedores',
    permissions: ['suppliers.view', 'suppliers.manage'],
  },
  {
    label: 'Artigos',
    permissions: ['articles.view', 'articles.manage'],
  },
  {
    label: 'Despesas',
    permissions: ['expenses.view', 'expenses.manage'],
  },
  {
    label: 'Relatórios',
    permissions: ['reports.view'],
  },
  {
    label: 'Sistema',
    permissions: ['settings.manage', 'agt.manage', 'users.manage'],
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES DE VERIFICAÇÃO
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Verifica se um utilizador tem uma permissão específica.
 *
 * @param permissions - Lista de permissões do utilizador (devolvida por obter_permissoes ou ['*'] para Admin)
 * @param permission - Permissão a verificar
 * @returns true se tiver a permissão
 */
export function can(permissions: Permission[], permission: Permission): boolean {
  if (!permissions || permissions.length === 0) return false;
  if (permissions.includes('*' as Permission)) return true;
  return permissions.includes(permission);
}

/**
 * Verifica se um utilizador tem acesso a uma rota.
 *
 * @param permissions - Lista de permissões do utilizador
 * @param pathname - Caminho da rota (ex: '/faturas/nova')
 * @returns true se tiver acesso
 */
export function canAccessRoute(permissions: Permission[], pathname: string): boolean {
  // Rotas públicas — sempre acessíveis
  const PUBLIC_PATHS = ['/login', '/primeiro-acesso', '/acesso-negado'];
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return true;

  // Verificar permissão da rota
  const requiredPermission = ROUTE_PERMISSIONS[pathname];
  if (!requiredPermission) return true; // Rota não mapeada → permitir

  return can(permissions, requiredPermission);
}

/**
 * Devolve a permissão necessária para uma rota.
 */
export function getRoutePermission(pathname: string): Permission | null {
  return ROUTE_PERMISSIONS[pathname] || null;
}

/**
 * Devolve o label de uma permissão para UI.
 */
export function getPermissionLabel(permission: Permission): string {
  return PERMISSION_LABELS[permission] || permission;
}

/**
 * Lista de permissões agrupadas por secção (para UI).
 */
export function getPermissionGroups(): PermissionGroup[] {
  return PERMISSION_GROUPS;
}

import {
  getSupabaseAuthContext,
  hasActiveCompanyModuleAccess,
  isAdminRole,
} from '@/lib/auth-context';
import { buscarPermissoes } from '@/lib/auth';
import { can } from '@/lib/permissions';
import type { Permission, Sessao } from '@/lib/types';

function sessionFromContext(
  context: Awaited<ReturnType<typeof getSupabaseAuthContext>>
): Sessao | null {
  if (!context.user || !context.activeCompanyAccess) return null;

  return {
    userId: context.user.id,
    companyId: context.activeCompanyAccess.company_id,
    isOwner:
      context.activeCompanyAccess.source === 'hub' &&
      isAdminRole(context.activeCompanyAccess.role),
    email: context.user.email || '',
    authSource: context.authSource,
  };
}

export async function getCompanyId(request: Request): Promise<string | null> {
  const context = await getSupabaseAuthContext(request);
  return context.activeCompanyAccess?.company_id || null;
}

export async function getSessaoDoRequest(
  request: Request
): Promise<Sessao | null> {
  return sessionFromContext(await getSupabaseAuthContext(request));
}

export async function requireCompanyId(
  request: Request,
  permission?: Permission
): Promise<string> {
  const context = await getSupabaseAuthContext(request);
  if (!context.user) {
    throw Object.assign(new Error('Não autenticado. Inicie sessão novamente.'), {
      status: 401,
    });
  }

  if (!context.activeCompanyAccess) {
    throw Object.assign(
      new Error('Selecione uma empresa à qual tem acesso no Kima Faturas.'),
      { status: 403 }
    );
  }

  if (!(await hasActiveCompanyModuleAccess(context.activeCompanyAccess.company_id))) {
    throw Object.assign(
      new Error('A empresa não tem uma subscrição ativa do módulo Faturas.'),
      { status: 403 }
    );
  }

  if (permission) {
    const sessao = sessionFromContext(context);
    if (!sessao) {
      throw Object.assign(new Error('Não autenticado.'), { status: 401 });
    }

    const permissoes = await buscarPermissoes(
      sessao.userId,
      sessao.companyId,
      sessao.isOwner,
      sessao.authSource
    );
    if (!can(permissoes, permission)) {
      throw Object.assign(new Error(`Sem permissão: ${permission}`), {
        status: 403,
      });
    }
  }

  return context.activeCompanyAccess.company_id;
}

export async function assertMembership(
  companyId: string,
  request: Request
): Promise<void> {
  const context = await getSupabaseAuthContext(request);
  if (!context.user) {
    throw Object.assign(new Error('Não autenticado. Faça login.'), {
      status: 401,
    });
  }

  if (!context.companyAccess.some((access) => access.company_id === companyId)) {
    throw Object.assign(new Error('Sem acesso a esta empresa.'), {
      status: 403,
    });
  }
}

export function isAdmin(sessao: Sessao | null): boolean {
  return sessao?.isOwner === true;
}

export async function requirePermission(
  request: Request,
  permission: Permission
): Promise<{ sessao: Sessao; hasPermission: boolean }> {
  const sessao = await getSessaoDoRequest(request);
  if (!sessao) {
    throw Object.assign(new Error('Não autenticado.'), { status: 401 });
  }

  const permissoes = await buscarPermissoes(
    sessao.userId,
    sessao.companyId,
    sessao.isOwner,
    sessao.authSource
  );
  const hasPermission = can(permissoes, permission);

  if (!hasPermission) {
    throw Object.assign(new Error(`Sem permissão: ${permission}`), {
      status: 403,
    });
  }

  return { sessao, hasPermission };
}

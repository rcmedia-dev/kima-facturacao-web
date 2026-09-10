/**
 * Helper para extrair o contexto da empresa ativa do cookie global do Kima Hub.
 * O cookie `kima-company-id` é definido pela rota de callback SSO e garante que
 * cada empresa/pessoa só acessa os próprios dados.
 *
 * Agora também suporta sessão própria via cookie `kima-session`.
 */

import { db } from '@/db/client';
import { obterSessaoDoRequest, buscarPermissoes } from '@/lib/auth';
import { can } from '@/lib/permissions';
import type { Permission, Sessao } from '@/lib/types';

/**
 * Lê o company_id do cookie `kima-session` (nossa sessão) ou `kima-company-id` (legado).
 */
export function getCompanyId(request: Request): string | null {
  try {
    // 1. Tentar sessão própria (kima-session)
    const sessao = obterSessaoDoRequest(request);
    if (sessao?.companyId) return sessao.companyId;

    // 2. Tentar cookie legado (kima-company-id)
    const nextReq = request as unknown as {
      cookies?: { get?: (name: string) => { value?: string } | undefined };
    };
    const fromApi = nextReq?.cookies?.get?.('kima-company-id')?.value;
    if (fromApi) return fromApi;

    const cookieHeader = request.headers.get('cookie') || '';
    const match = /(?:^|;\s*)kima-company-id=([^;]+)/i.exec(cookieHeader);
    if (match) return decodeURIComponent(match[1]);

    // Fallback dev/standalone
    return process.env.NEXT_PUBLIC_KIMA_FALLBACK_COMPANY_ID || null;
  } catch {
    return process.env.NEXT_PUBLIC_KIMA_FALLBACK_COMPANY_ID || null;
  }
}

/**
 * Lê a sessão completa a partir do request (kima-session).
 */
export function getSessaoDoRequest(request: Request): Sessao | null {
  return obterSessaoDoRequest(request);
}

export function requireCompanyId(request: Request): string {
  const companyId = getCompanyId(request);
  if (!companyId) {
    throw Object.assign(new Error('Sem empresa ativa no contexto. Faça login.'), { status: 401 });
  }
  return companyId;
}

/**
 * Valida que o utilizador autenticado é membro da empresa ativa.
 */
export async function assertMembership(companyId: string, request?: Request): Promise<void> {
  const sessao = request ? obterSessaoDoRequest(request) : null;
  const userId = sessao?.userId;

  if (!userId) {
    throw Object.assign(new Error('Não autenticado. Faça login.'), { status: 401 });
  }

  const { data, error } = await db
    .from('users')
    .select('id')
    .eq('id', userId)
    .eq('company_id', companyId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    throw Object.assign(new Error('Sem acesso a esta empresa.'), { status: 403 });
  }
}

/**
 * Verifica se o utilizador é Admin (owner) da empresa.
 */
export function isAdmin(sessao: Sessao | null): boolean {
  return sessao?.isOwner === true;
}

/**
 * Verifica se o utilizador tem uma permissão específica.
 * Admin (isOwner) tem sempre acesso.
 */
export async function requirePermission(
  request: Request,
  permission: Permission
): Promise<{ sessao: Sessao; hasPermission: boolean }> {
  const sessao = obterSessaoDoRequest(request);
  if (!sessao) {
    throw Object.assign(new Error('Não autenticado.'), { status: 401 });
  }

  const permissoes = await buscarPermissoes(
    sessao.userId,
    sessao.companyId,
    sessao.isOwner
  );

  const hasPermission = can(permissoes, permission);

  if (!hasPermission) {
    throw Object.assign(
      new Error(`Sem permissão: ${permission}`),
      { status: 403 }
    );
  }

  return { sessao, hasPermission };
}
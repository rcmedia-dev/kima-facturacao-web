/**
 * GET /api/auth/permissions
 *
 * Devolve as permissões finais do utilizador autenticado.
 *
 * Respostas:
 *   200 { userId, companyId, isOwner, permissions: Permission[] }
 *   401 { error: "Não autenticado" }
 */

import { NextResponse } from 'next/server';
import { obterSessaoDoRequest } from '@/lib/auth';
import { buscarPermissoes } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    // ── 1. Ler sessão do cookie ───────────────────────────────────────────
    const sessao = obterSessaoDoRequest(request);
    if (!sessao) {
      return NextResponse.json(
        { error: 'Não autenticado.' },
        { status: 401 }
      );
    }

    // ── 2. Buscar permissões ──────────────────────────────────────────────
    const permissoes = await buscarPermissoes(
      sessao.userId,
      sessao.companyId,
      sessao.isOwner
    );

    // ── 3. Resposta ──────────────────────────────────────────────────────
    return NextResponse.json({
      userId: sessao.userId,
      companyId: sessao.companyId,
      isOwner: sessao.isOwner,
      email: sessao.email,
      permissions: permissoes,
    });
  } catch (error: any) {
    console.error('[API /auth/permissions]', error);
    return NextResponse.json(
      { error: 'Erro ao buscar permissões.' },
      { status: 500 }
    );
  }
}

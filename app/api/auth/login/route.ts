/**
 * POST /api/auth/login
 *
 * Login com código da empresa + email + senha.
 *
 * Body: { companyCode: string, email: string, password: string }
 *
 * Respostas:
 *   200 { success: true, sessao: Sessao }
 *   200 { success: false, needsPassword: true, companyId, email }
 *   400 { error: "Campos obrigatórios" }
 *   401 { error: "Empresa não encontrada" }
 *   401 { error: "Colaborador não encontrado" }
 *   401 { error: "Senha inválida" }
 *   401 { error: "Conta inactiva" }
 */

import { NextResponse } from 'next/server';
import {
  buscarEmpresaPorCodigo,
  buscarUtilizador,
  verificarSenha,
  criarSessaoCookie,
  buscarPermissoes,
} from '@/lib/auth';
import type { Sessao } from '@/lib/types';

const SESSION_COOKIE = 'kima-session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyCode, email, password } = body;

    // ── Validação de campos obrigatórios ──────────────────────────────────
    if (!companyCode || !email || !password) {
      return NextResponse.json(
        { error: 'Código da empresa, email e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    const cleanCompanyCode = String(companyCode).trim().toUpperCase();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    // ── 1. Buscar empresa por código ──────────────────────────────────────
    const empresa = await buscarEmpresaPorCodigo(cleanCompanyCode);
    if (!empresa) {
      return NextResponse.json(
        { error: 'Empresa não encontrada. Verifique o código da empresa.' },
        { status: 401 }
      );
    }

    // ── 2. Buscar utilizador por company_id + email ───────────────────────
    const utilizador = await buscarUtilizador(empresa.id, cleanEmail);
    if (!utilizador) {
      return NextResponse.json(
        { error: 'Colaborador não encontrado. Verifique o código da empresa e o email.' },
        { status: 401 }
      );
    }

    // ── 3. Verificar estado da conta ──────────────────────────────────────
    if (utilizador.status === 'inativo') {
      return NextResponse.json(
        { error: 'Conta inactiva. Contacte o administrador da empresa.' },
        { status: 401 }
      );
    }

    // ── 4. Verificar se tem senha definida ────────────────────────────────
    if (!utilizador.passwordHash) {
      // Primeiro acesso: senha não definida
      return NextResponse.json(
        {
          success: false,
          needsPassword: true,
          companyId: empresa.id,
          companyName: empresa.name,
          email: utilizador.email,
          message: 'Ainda não tem senha definida. Crie a sua senha para continuar.',
        },
        { status: 200 }
      );
    }

    // ── 5. Validar senha ──────────────────────────────────────────────────
    const senhaValida = await verificarSenha(cleanPassword, utilizador.passwordHash);
    if (!senhaValida) {
      return NextResponse.json(
        { error: 'Senha inválida.' },
        { status: 401 }
      );
    }

    // ── 6. Criar sessão ──────────────────────────────────────────────────
    const sessao: Sessao = {
      userId: utilizador.id,
      companyId: empresa.id,
      isOwner: utilizador.isOwner,
      email: utilizador.email,
    };

    const token = criarSessaoCookie(sessao);

    // ── 7. Buscar permissões para devolver ao cliente ─────────────────────
    const permissoes = await buscarPermissoes(
      utilizador.id,
      empresa.id,
      utilizador.isOwner
    );

    // ── 8. Resposta com cookie ────────────────────────────────────────────
    const response = NextResponse.json({
      success: true,
      sessao: {
        userId: sessao.userId,
        companyId: sessao.companyId,
        isOwner: sessao.isOwner,
        email: sessao.email,
      },
      permissions: permissoes,
      companyName: empresa.name,
    });

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('[API /auth/login]', error);
    return NextResponse.json(
      { error: 'Erro ao processar login.' },
      { status: 500 }
    );
  }
}

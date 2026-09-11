/**
 * POST /api/auth/check-user
 *
 * Valida código da empresa + email e indica se o utilizador precisa de definir senha.
 *
 * Body: { companyCode: string, email: string }
 *
 * Respostas:
 *   200 { exists: true, needsPassword: false }  → utilizador tem senha, pode fazer login
 *   200 { exists: true, needsPassword: true }   → primeiro acesso, redirecionar para /primeiro-acesso
 *   400 { error: "Campos obrigatórios" }
 *   401 { error: "Empresa não encontrada" }
 *   401 { error: "Colaborador não encontrado" }
 *   401 { error: "Conta inactiva" }
 */

import { NextResponse } from 'next/server';
import { buscarEmpresaPorCodigo, buscarUtilizador } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyCode, email } = body;

    if (!companyCode || !email) {
      return NextResponse.json(
        { error: 'Código da empresa e email são obrigatórios.' },
        { status: 400 }
      );
    }

    const cleanCompanyCode = String(companyCode).trim().toUpperCase();
    const cleanEmail = String(email).trim().toLowerCase();

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
    const needsPassword = !utilizador.passwordHash;

    return NextResponse.json({
      exists: true,
      needsPassword,
      companyName: empresa.name,
      email: utilizador.email,
    });
  } catch (error: any) {
    console.error('[API /auth/check-user]', error);
    return NextResponse.json(
      { error: 'Erro ao verificar utilizador.' },
      { status: 500 }
    );
  }
}

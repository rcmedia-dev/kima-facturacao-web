/**
 * POST /api/auth/primeiro-acesso
 *
 * Define senha para utilizador sem password (primeiro acesso).
 *
 * Body: { companyCode: string, email: string, password: string }
 *
 * Respostas:
 *   200 { success: true, message: "Senha criada com sucesso" }
 *   400 { error: "Campos obrigatórios" }
 *   400 { error: "As senhas não coincidem" }
 *   401 { error: "Empresa não encontrada" }
 *   401 { error: "Colaborador não encontrado" }
 *   401 { error: "Este utilizador já tem senha definida" }
 */

import { NextResponse } from 'next/server';
import {
  buscarEmpresaPorCodigo,
  buscarUtilizador,
  hashSenha,
  atualizarSenha,
} from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyCode, email, password, confirmPassword } = body;

    // ── Validação de campos obrigatórios ──────────────────────────────────
    if (!companyCode || !email || !password) {
      return NextResponse.json(
        { error: 'Código da empresa, email e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    // ── Validação de confirmação ──────────────────────────────────────────
    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json(
        { error: 'As senhas não coincidem.' },
        { status: 400 }
      );
    }

    // ── Validação de força da senha ───────────────────────────────────────
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres.' },
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

    // ── 3. Verificar se já tem senha ──────────────────────────────────────
    if (utilizador.passwordHash) {
      return NextResponse.json(
        { error: 'Este utilizador já tem senha definida. Use o login normal.' },
        { status: 401 }
      );
    }

    // ── 4. Gerar hash e actualizar ────────────────────────────────────────
    const passwordHash = await hashSenha(cleanPassword);
    const actualizado = await atualizarSenha(utilizador.id, passwordHash);

    if (!actualizado) {
      return NextResponse.json(
        { error: 'Erro ao guardar senha. Tente novamente.' },
        { status: 500 }
      );
    }

    // ── 5. Resposta ──────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      message: 'Senha criada com sucesso! Já pode fazer login.',
    });
  } catch (error: any) {
    console.error('[API /auth/primeiro-acesso]', error);
    return NextResponse.json(
      { error: 'Erro ao processar pedido.' },
      { status: 500 }
    );
  }
}

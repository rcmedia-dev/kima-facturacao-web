/**
 * /api/utilizadores — CRUD de utilizadores (só Admin)
 *
 * GET    → lista utilizadores da empresa
 * POST   → cria novo funcionário
 * PUT    → atualiza utilizador (nome, email, permissões)
 * DELETE → remove utilizador (não Admin)
 */

import { NextResponse } from 'next/server';
import { obterSessaoDoRequest, hashSenha, buscarPermissoes } from '@/lib/auth';
import { db } from '@/db/client';
import type { Permission } from '@/lib/types';

// ══════════════════════════════════════════════════════════════════════════════
// GET — Listar utilizadores da empresa
// ══════════════════════════════════════════════════════════════════════════════

export async function GET(request: Request) {
  try {
    const sessao = obterSessaoDoRequest(request);
    if (!sessao) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    // Buscar utilizadores da empresa
    const { data: users, error } = await db
      .from('users')
      .select('id, email, full_name, is_owner, status, created_at, updated_at')
      .eq('company_id', sessao.companyId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Buscar permissões de cada funcionário
    const usersWithPermissions = await Promise.all(
      (users || []).map(async (user: any) => {
        const permissions = await buscarPermissoes(
          user.id,
          sessao.companyId,
          user.is_owner
        );
        return {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          isOwner: user.is_owner,
          status: user.status,
          permissions,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        };
      })
    );

    return NextResponse.json({ users: usersWithPermissions });
  } catch (error: any) {
    console.error('[API GET /utilizadores]', error);
    return NextResponse.json({ error: 'Erro ao listar utilizadores.' }, { status: 500 });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// POST — Criar novo funcionário
// ══════════════════════════════════════════════════════════════════════════════

export async function POST(request: Request) {
  try {
    const sessao = obterSessaoDoRequest(request);
    if (!sessao) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    // Só Admin pode criar utilizadores
    if (!sessao.isOwner) {
      return NextResponse.json(
        { error: 'Sem permissão. Apenas administradores podem criar utilizadores.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, fullName, permissions } = body;

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email é obrigatório.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Verificar se já existeutilizador com este email na empresa
    const { data: existing } = await db
      .from('users')
      .select('id')
      .eq('company_id', sessao.companyId)
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe um utilizador com este email nesta empresa.' },
        { status: 409 }
      );
    }

    // Criar utilizador (password_hash = NULL → primeiro acesso)
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    const { error: insertError } = await db.from('users').insert({
      id: userId,
      company_id: sessao.companyId,
      email: cleanEmail,
      full_name: fullName?.trim() || null,
      password_hash: null,
      is_owner: false,
      status: 'pendente',
      created_at: now,
      updated_at: now,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Guardar permissões
    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      const permRows = permissions.map((code: string) => ({
        user_id: userId,
        company_id: sessao.companyId,
        permission_code: code,
      }));

      const { error: permError } = await db.from('user_permissions').insert(permRows);
      if (permError) {
        console.error('Erro ao guardar permissões:', permError);
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: cleanEmail,
        fullName: fullName?.trim() || null,
        isOwner: false,
        status: 'pendente',
        permissions: permissions || [],
      },
    });
  } catch (error: any) {
    console.error('[API POST /utilizadores]', error);
    return NextResponse.json({ error: 'Erro ao criar utilizador.' }, { status: 500 });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PUT — Atualizar utilizador
// ══════════════════════════════════════════════════════════════════════════════

export async function PUT(request: Request) {
  try {
    const sessao = obterSessaoDoRequest(request);
    if (!sessao) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    if (!sessao.isOwner) {
      return NextResponse.json(
        { error: 'Sem permissão. Apenas administradores podem editar utilizadores.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, fullName, email, status, permissions } = body;

    if (!userId) {
      return NextResponse.json({ error: 'ID do utilizador é obrigatório.' }, { status: 400 });
    }

    // Verificar que o utilizador pertence à mesma empresa
    const { data: targetUser } = await db
      .from('users')
      .select('id, is_owner')
      .eq('id', userId)
      .eq('company_id', sessao.companyId)
      .maybeSingle();

    if (!targetUser) {
      return NextResponse.json({ error: 'Utilizador não encontrado.' }, { status: 404 });
    }

    // Não permite editar o próprio utilizador admin
    if (targetUser.is_owner) {
      return NextResponse.json(
        { error: 'Não é possível editar o administrador da empresa.' },
        { status: 403 }
      );
    }

    // Actualizar dados do utilizador
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (fullName !== undefined) updateData.full_name = fullName?.trim() || null;
    if (email !== undefined) {
      const cleanEmail = email.trim().toLowerCase();
      // Verificar se o email já está em uso por outro utilizador
      const { data: emailConflict } = await db
        .from('users')
        .select('id')
        .eq('company_id', sessao.companyId)
        .eq('email', cleanEmail)
        .neq('id', userId)
        .maybeSingle();

      if (emailConflict) {
        return NextResponse.json(
          { error: 'Já existe outro utilizador com este email.' },
          { status: 409 }
        );
      }
      updateData.email = cleanEmail;
    }
    if (status !== undefined && ['ativo', 'inativo', 'pendente'].includes(status)) {
      updateData.status = status;
    }

    const { error: updateError } = await db
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Actualizar permissões (substituir todas)
    if (permissions !== undefined && Array.isArray(permissions)) {
      // Remover permissões antigas
      await db
        .from('user_permissions')
        .delete()
        .eq('user_id', userId)
        .eq('company_id', sessao.companyId);

      // Inserir novas permissões
      if (permissions.length > 0) {
        const permRows = permissions.map((code: string) => ({
          user_id: userId,
          company_id: sessao.companyId,
          permission_code: code,
        }));
        await db.from('user_permissions').insert(permRows);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API PUT /utilizadores]', error);
    return NextResponse.json({ error: 'Erro ao atualizar utilizador.' }, { status: 500 });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DELETE — Remover funcionário
// ══════════════════════════════════════════════════════════════════════════════

export async function DELETE(request: Request) {
  try {
    const sessao = obterSessaoDoRequest(request);
    if (!sessao) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    if (!sessao.isOwner) {
      return NextResponse.json(
        { error: 'Sem permissão. Apenas administradores podem remover utilizadores.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'ID do utilizador é obrigatório.' }, { status: 400 });
    }

    // Verificar que o utilizador pertence à mesma empresa e não é owner
    const { data: targetUser } = await db
      .from('users')
      .select('id, is_owner')
      .eq('id', userId)
      .eq('company_id', sessao.companyId)
      .maybeSingle();

    if (!targetUser) {
      return NextResponse.json({ error: 'Utilizador não encontrado.' }, { status: 404 });
    }

    if (targetUser.is_owner) {
      return NextResponse.json(
        { error: 'Não é possível remover o administrador da empresa.' },
        { status: 403 }
      );
    }

    // Remover permissões
    await db
      .from('user_permissions')
      .delete()
      .eq('user_id', userId)
      .eq('company_id', sessao.companyId);

    // Remover utilizador
    const { error: deleteError } = await db
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API DELETE /utilizadores]', error);
    return NextResponse.json({ error: 'Erro ao remover utilizador.' }, { status: 500 });
  }
}

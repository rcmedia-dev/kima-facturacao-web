import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { db } from '@/db/client';
import { hasActiveCompanyModuleAccess } from '@/lib/auth-context';
import { getSessaoDoRequest } from '@/lib/company';
import { ALL_PERMISSIONS } from '@/lib/permissions';

const PRIVATE_NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
};

const inviteSchema = z.object({
  email: z.string().trim().email().max(254),
  fullName: z.string().trim().min(2).max(120),
  permissions: z.array(z.string()).max(ALL_PERMISSIONS.length),
});

const updateSchema = z.object({
  userId: z.string().uuid(),
  authSource: z.enum(['hub', 'faturas']),
  status: z.enum(['ativo', 'inativo']),
  permissions: z.array(z.string()).max(ALL_PERMISSIONS.length),
});

async function getAdminSession(request: Request) {
  const session = await getSessaoDoRequest(request);
  if (!session) {
    return {
      session: null,
      response: NextResponse.json({ error: 'Não autenticado.' }, { status: 401 }),
    };
  }
  if (!session.isOwner) {
    return {
      session: null,
      response: NextResponse.json(
        { error: 'Só o administrador da empresa pode gerir funcionários.' },
        { status: 403 }
      ),
    };
  }
  if (!(await hasActiveCompanyModuleAccess(session.companyId))) {
    return {
      session: null,
      response: NextResponse.json(
        { error: 'A empresa não tem uma subscrição ativa do módulo Faturas.' },
        { status: 403 }
      ),
    };
  }
  return { session, response: null };
}

function validPermissions(permissions: string[]): boolean {
  return (
    new Set(permissions).size === permissions.length &&
    permissions.every((permission) =>
      ALL_PERMISSIONS.includes(permission as (typeof ALL_PERMISSIONS)[number])
    )
  );
}

export async function GET(request: Request) {
  try {
    const { session, response } = await getAdminSession(request);
    if (response || !session) return response;

    const [
      { data: employees, error: employeesError },
      { data: permissions, error: permissionsError },
      { data: invitations, error: invitationsError },
    ] = await Promise.all([
      db
        .from('employees')
        .select('id, user_id, auth_source, email, full_name, status, created_at')
        .eq('company_id', session.companyId)
        .order('created_at', { ascending: false }),
      db
        .from('employee_permissions')
        .select('user_id, auth_source, permission_code')
        .eq('company_id', session.companyId),
      db
        .from('employee_invitations')
        .select('id, email, full_name, expires_at, created_at')
        .eq('company_id', session.companyId)
        .is('accepted_at', null)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false }),
    ]);

    if (employeesError) throw employeesError;
    if (permissionsError) throw permissionsError;
    if (invitationsError) throw invitationsError;

    const permissionsByUser = new Map<string, string[]>();
    for (const row of permissions || []) {
      const key = `${row.auth_source}:${row.user_id}`;
      const current = permissionsByUser.get(key) || [];
      current.push(row.permission_code);
      permissionsByUser.set(key, current);
    }

    return NextResponse.json({
      employees: (employees || []).map((employee: {
        id: string;
        user_id: string;
        auth_source: 'hub' | 'faturas';
        email: string;
        full_name: string | null;
        status: 'ativo' | 'inativo';
        created_at: string;
      }) => ({
        ...employee,
        permissions:
          permissionsByUser.get(`${employee.auth_source}:${employee.user_id}`) ||
          [],
      })),
      invitations: invitations || [],
    }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('[API /utilizadores GET]', error);
    return NextResponse.json(
      { error: 'Não foi possível carregar os funcionários.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { session, response } = await getAdminSession(request);
    if (response || !session) return response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
    }

    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success || !validPermissions(parsed.data?.permissions || [])) {
      return NextResponse.json(
        { error: 'Verifique o email, nome e permissões selecionadas.' },
        { status: 400 }
      );
    }

    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: invitationId, error } = await db.rpc(
      'create_employee_invitation',
      {
        p_company_id: session.companyId,
        p_email: parsed.data.email.toLowerCase(),
        p_full_name: parsed.data.fullName,
        p_token_hash: tokenHash,
        p_expires_at: expiresAt,
        p_invited_by: session.userId,
        p_permission_codes: parsed.data.permissions,
      }
    );

    if (error) {
      if (error.message.includes('employee_already_exists')) {
        return NextResponse.json(
          { error: 'Este email já pertence a um funcionário ativo da empresa.' },
          { status: 409 }
        );
      }
      throw error;
    }

    const inviteUrl = new URL('/primeiro-acesso', request.url);
    inviteUrl.searchParams.set('token', token);

    return NextResponse.json({
      invitationId,
      inviteUrl: inviteUrl.toString(),
      expiresAt,
    }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('[API /utilizadores POST]', error);
    return NextResponse.json(
      { error: 'Não foi possível criar o convite.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { session, response } = await getAdminSession(request);
    if (response || !session) return response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
    }

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success || !validPermissions(parsed.data?.permissions || [])) {
      return NextResponse.json(
        { error: 'Verifique o estado e as permissões selecionadas.' },
        { status: 400 }
      );
    }

    const { error } = await db.rpc('update_employee_access', {
      p_company_id: session.companyId,
      p_user_id: parsed.data.userId,
      p_auth_source: parsed.data.authSource,
      p_status: parsed.data.status,
      p_permission_codes: parsed.data.permissions,
    });
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[API /utilizadores PUT]', error);
    return NextResponse.json(
      { error: 'Não foi possível atualizar o acesso do funcionário.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { session, response } = await getAdminSession(request);
    if (response || !session) return response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
    }

    const invitationId =
      typeof body === 'object' && body !== null && 'invitationId' in body
        ? body.invitationId
        : null;
    if (typeof invitationId !== 'string') {
      return NextResponse.json(
        { error: 'Identificador de convite inválido.' },
        { status: 400 }
      );
    }

    const { data, error } = await db
      .from('employee_invitations')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', invitationId)
      .eq('company_id', session.companyId)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: 'O convite já foi usado, expirou ou não existe.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[API /utilizadores DELETE]', error);
    return NextResponse.json(
      { error: 'Não foi possível cancelar o convite.' },
      { status: 500 }
    );
  }
}

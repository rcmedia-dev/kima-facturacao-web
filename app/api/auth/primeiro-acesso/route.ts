import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { db } from '@/db/client';
import { hasActiveCompanyModuleAccess } from '@/lib/auth-context';
import { createSupabaseRequestClient } from '@/lib/supabase-request';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

const acceptSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  password: z.string().min(8).max(128).optional(),
});

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
    }

    const parsed = acceptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'O link ou a palavra-passe não são válidos.' },
        { status: 400 }
      );
    }

    const tokenHash = createHash('sha256')
      .update(parsed.data.token)
      .digest('hex');
    const { data: invitation, error: invitationError } = await db
      .from('employee_invitations')
      .select('email, full_name, company_id')
      .eq('token_hash', tokenHash)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (invitationError) throw invitationError;
    if (!invitation) {
      return NextResponse.json(
        { error: 'Este convite é inválido, expirou ou já foi utilizado.' },
        { status: 410 }
      );
    }
    if (!(await hasActiveCompanyModuleAccess(invitation.company_id))) {
      return NextResponse.json(
        { error: 'A empresa não tem uma subscrição ativa do módulo Faturas.' },
        { status: 403 }
      );
    }

    const requestSupabase = createSupabaseRequestClient(
      request,
      undefined,
      'faturas'
    );
    const { data: authData, error: authError } =
      await requestSupabase.auth.getUser();

    if (
      authError &&
      authError.status !== 401 &&
      authError.name !== 'AuthSessionMissingError'
    ) {
      throw authError;
    }

    let userId = authData.user?.id;
    let userEmail = authData.user?.email;
    if (authData.user) {
      if (
        (authData.user.email || '').trim().toLowerCase() !==
        invitation.email.trim().toLowerCase()
      ) {
        return NextResponse.json(
          { error: 'Inicie sessão com a conta indicada no convite.' },
          { status: 403 }
        );
      }
    } else {
      if (!parsed.data.password) {
        return NextResponse.json(
          { error: 'Defina uma palavra-passe para ativar a conta.' },
          { status: 400 }
        );
      }

      const adminSupabase = createSupabaseAdminClient('faturas');
      const { data: createdUser, error: createUserError } =
        await adminSupabase.auth.admin.createUser({
          email: invitation.email,
          password: parsed.data.password,
          email_confirm: true,
          user_metadata: { full_name: invitation.full_name },
        });

      if (createUserError) {
        const message = createUserError.message.toLowerCase();
        if (
          createUserError.code === 'email_exists' ||
          message.includes('already registered') ||
          message.includes('already exists') ||
          message.includes('email_exists')
        ) {
          return NextResponse.json(
            {
              code: 'account_exists',
              email: invitation.email,
              error:
                'Este email já tem uma conta Kima. Inicie sessão com a palavra-passe existente para aceitar o convite.',
            },
            { status: 409 }
          );
        }
        throw createUserError;
      }

      if (!createdUser.user) {
        throw new Error('O Supabase não devolveu a identidade criada.');
      }
      userId = createdUser.user.id;
      userEmail = createdUser.user.email;
    }

    if (!userId) {
      throw new Error('Não foi possível identificar a conta convidada.');
    }

    const { data: accepted, error: acceptError } = await db.rpc(
      'accept_employee_invitation',
      {
        p_token_hash: tokenHash,
        p_user_id: userId,
        p_email: userEmail || '',
      }
    );

    if (acceptError) {
      if (
        acceptError.message.includes('invitation_invalid_or_expired')
      ) {
        return NextResponse.json(
          { error: 'Este convite é inválido, expirou ou já foi utilizado.' },
          { status: 410 }
        );
      }
      if (acceptError.message.includes('invitation_email_mismatch')) {
        return NextResponse.json(
          { error: 'A conta autenticada não corresponde ao email do convite.' },
          { status: 403 }
        );
      }
      throw acceptError;
    }

    const acceptedInvite = Array.isArray(accepted) ? accepted[0] : accepted;
    if (!acceptedInvite?.company_id) {
      throw new Error('A aceitação do convite não devolveu a empresa.');
    }

    return NextResponse.json({
      success: true,
      companyId: acceptedInvite.company_id,
      email: invitation.email,
      accountCreated: !authData.user,
    });
  } catch (error: unknown) {
    console.error('[API /auth/primeiro-acesso]', error);
    if (error instanceof Error && error.message.includes('não está configurada')) {
      return NextResponse.json(
        { error: error.message },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: 'Não foi possível ativar o convite. Tente novamente.' },
      { status: 500 }
    );
  }
}

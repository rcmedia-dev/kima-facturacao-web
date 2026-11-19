import { NextResponse } from 'next/server';

import { db } from '@/db/client';
import { getSupabaseAuthContext } from '@/lib/auth-context';

const MODULE_KEYS = Array.from(
  new Set([
    process.env.NEXT_PUBLIC_KIMA_MODULE_KEY || 'faturas',
    'faturas',
    'facturas',
    'facturacao',
    'fatura',
    'factura',
  ])
);

function isActive(status: string | null, expiresAt: string | null): boolean {
  const normalizedStatus = (status || '').trim().toLowerCase();
  if (!['ativo', 'active', 'approved', 'aprovado'].includes(normalizedStatus)) {
    return false;
  }
  if (!expiresAt) return true;

  const expiration = new Date(expiresAt).getTime();
  return Number.isFinite(expiration) && expiration >= Date.now();
}

export async function POST(request: Request) {
  try {
    const context = await getSupabaseAuthContext(request);
    if (!context.user) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado.', hasAccess: false, status: 'error' },
        { status: 401 }
      );
    }

    if (!context.activeCompanyAccess) {
      return NextResponse.json(
        {
          success: false,
          error: 'Selecione uma empresa à qual tem acesso.',
          hasAccess: false,
          status: 'company_required',
        },
        { status: 409 }
      );
    }

    const companyId = context.activeCompanyAccess.company_id;
    const [{ data: company, error: companyError }, { data: modules, error: moduleError }] =
      await Promise.all([
        db
          .schema('public')
          .from('companies')
          .select('name, status')
          .eq('id', companyId)
          .maybeSingle(),
        db
          .schema('public')
          .from('company_modules')
          .select('module_key, status, plan, expires_at')
          .eq('company_id', companyId)
          .in('module_key', MODULE_KEYS),
      ]);

    if (companyError) {
      throw new Error(`Não foi possível carregar a empresa: ${companyError.message}`);
    }
    if (moduleError) {
      throw new Error(`Não foi possível verificar a subscrição: ${moduleError.message}`);
    }

    const activeModule = (modules || []).find((item: {
      status: string | null;
      expires_at: string | null;
    }) => isActive(item.status, item.expires_at));
    const companyName = company?.name || null;
    const companyStatus = (company?.status || '').trim().toLowerCase();

    if (companyStatus && !['ativo', 'active'].includes(companyStatus)) {
      return NextResponse.json({
        success: true,
        hasAccess: false,
        status: 'company_inactive',
        companyId,
        companyName,
        message: 'A empresa não está ativa no Kima Hub.',
      });
    }

    if (activeModule) {
      return NextResponse.json({
        success: true,
        hasAccess: true,
        status: 'active',
        rawStatus: activeModule.status,
        companyId,
        companyName,
        planName: activeModule.plan || 'Plano Facturação',
        expiresAt: activeModule.expires_at || null,
        message: 'Subscrição ativa e aprovada.',
      });
    }

    const latestModule = (modules || [])[0];
    const rawStatus = latestModule?.status || null;
    const normalizedStatus = (rawStatus || '').trim().toLowerCase();
    const status = ['pendente', 'pending', 'aguardando', 'em_analise', 'waiting'].includes(
      normalizedStatus
    )
      ? 'pending'
      : ['expirado', 'expired'].includes(normalizedStatus)
        ? 'expired'
        : latestModule
          ? 'inactive'
          : 'no_subscription';

    return NextResponse.json({
      success: true,
      hasAccess: false,
      status,
      rawStatus,
      companyId,
      companyName,
      planName: latestModule?.plan || null,
      expiresAt: latestModule?.expires_at || null,
      message: latestModule
        ? 'A subscrição do módulo KIMA Faturas não está ativa.'
        : 'A empresa ainda não possui uma subscrição registada para o módulo KIMA Faturas.',
    });
  } catch (error: unknown) {
    console.error('[API /auth/check-subscription]', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao verificar subscrição.',
        hasAccess: false,
        status: 'error',
      },
      { status: 500 }
    );
  }
}

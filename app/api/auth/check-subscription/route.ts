/**
 * POST /api/auth/check-subscription
 *
 * Verifica se a empresa do utilizador tem subscrição ativa no módulo Facturação.
 * Usa nossa tabela `users` (não mais `memberships` do Supabase Auth).
 */

import { NextResponse } from 'next/server';
import { obterSessaoDoRequest } from '@/lib/auth';
import { db } from '@/db/client';

const MODULE_KEYS = [
  process.env.NEXT_PUBLIC_KIMA_MODULE_KEY || 'faturas',
  'faturas',
  'facturas',
  'facturacao',
  'fatura',
  'factura',
];

export async function POST(request: Request) {
  try {
    // 1. Ler sessão do cookie
    const sessao = obterSessaoDoRequest(request);
    if (!sessao) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado.', hasAccess: false, status: 'error' },
        { status: 401 }
      );
    }

    const companyId = sessao.companyId;

    // 2. Obter nome da empresa
    let companyName: string | null = null;
    try {
      const { data: companyData } = await db
        .from('companies')
        .select('name')
        .eq('id', companyId)
        .maybeSingle();

      if (companyData) {
        companyName = companyData.name || null;
      }
    } catch {
      // Ignore company name lookup failure
    }

    // 3. Consultar o módulo na tabela `company_modules`
    const { data: moduleData, error: modErr } = await db
      .from('company_modules')
      .select('id, module_key, status, plan, expires_at, created_at')
      .eq('company_id', companyId)
      .in('module_key', MODULE_KEYS)
      .maybeSingle();

    if (modErr && modErr.code !== 'PGRST116') {
      console.warn('Aviso ao consultar company_modules:', modErr.message);
    }

    // Se não tem registo em `company_modules`, verificar pedido em `subscription_requests`
    if (!moduleData) {
      try {
        const { data: requestData } = await db
          .from('subscription_requests')
          .select('id, status, plan, created_at')
          .eq('company_id', companyId)
          .in('module_key', MODULE_KEYS)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (requestData) {
          const reqStatus = (requestData.status || '').toString().toLowerCase();
          if (['pendente', 'pending', 'aguardando', 'em_analise'].includes(reqStatus)) {
            return NextResponse.json({
              success: true,
              hasAccess: false,
              status: 'pending',
              rawStatus: requestData.status,
              companyId,
              companyName,
              planName: requestData.plan || 'Plano Facturação',
              message:
                'O seu pedido de subscrição para o módulo KIMA Facturação ainda está a aguardar aprovação pelo administrador.',
            });
          }
        }
      } catch {
        // subscription_requests table might not exist
      }

      return NextResponse.json({
        success: true,
        hasAccess: false,
        status: 'no_subscription',
        companyId,
        companyName,
        planName: null,
        message: 'A sua empresa ainda não possui uma subscrição registada para o módulo KIMA Facturação.',
      });
    }

    const rawStatus = (moduleData.status || '').toString().trim();
    const statusLower = rawStatus.toLowerCase();
    const planName = moduleData.plan || 'Plano Facturação';
    const expiresAt = moduleData.expires_at || null;

    // Verificar se a subscrição expirou
    if (expiresAt) {
      const expDate = new Date(expiresAt);
      if (!isNaN(expDate.getTime()) && expDate < new Date()) {
        return NextResponse.json({
          success: true,
          hasAccess: false,
          status: 'expired',
          rawStatus,
          companyId,
          companyName,
          planName,
          expiresAt,
          message: 'A sua subscrição para o módulo KIMA Facturação expirou.',
        });
      }
    }

    // Estados Aprovados / Ativos
    if (['ativo', 'active', 'approved', 'aprovado'].includes(statusLower)) {
      return NextResponse.json({
        success: true,
        hasAccess: true,
        status: 'active',
        rawStatus,
        companyId,
        companyName,
        planName,
        expiresAt,
        message: 'Subscrição ativa e aprovada.',
      });
    }

    // Estados Pendentes de Aprovação
    if (['pendente', 'pending', 'aguardando', 'em_analise', 'waiting'].includes(statusLower)) {
      return NextResponse.json({
        success: true,
        hasAccess: false,
        status: 'pending',
        rawStatus,
        companyId,
        companyName,
        planName,
        expiresAt,
        message:
          'O seu pedido de subscrição para o módulo KIMA Facturação ainda está a aguardar aprovação pelo administrador.',
      });
    }

    // Estados Expirados
    if (['expirado', 'expired'].includes(statusLower)) {
      return NextResponse.json({
        success: true,
        hasAccess: false,
        status: 'expired',
        rawStatus,
        companyId,
        companyName,
        planName,
        expiresAt,
        message: 'A sua subscrição para o módulo KIMA Facturação expirou.',
      });
    }

    // Estados Cancelados / Rejeitados / Inativos
    return NextResponse.json({
      success: true,
      hasAccess: false,
      status: 'inactive',
      rawStatus,
      companyId,
      companyName,
      planName,
      expiresAt,
      message:
        statusLower === 'rejeitado' || statusLower === 'rejected'
          ? 'O pedido de subscrição para este módulo foi rejeitado pelo administrador.'
          : 'A sua subscrição para o módulo KIMA Facturação foi cancelada ou está inativa.',
    });
  } catch (error: any) {
    console.error('Erro na rota /api/auth/check-subscription:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Erro ao verificar subscrição.',
        hasAccess: false,
        status: 'error',
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    const { userId, email } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'ID do utilizador é obrigatório.' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const admin = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // 1. Procurar a empresa do utilizador em `memberships`
    let companyId: string | null = null;
    let role: string | null = null;

    const { data: memberships, error: memberErr } = await admin
      .from('memberships')
      .select('company_id, role, status')
      .eq('user_id', userId);

    if (memberErr) {
      console.warn('Aviso ao consultar memberships no backend:', memberErr.message);
    }

    if (memberships && memberships.length > 0) {
      companyId = memberships[0].company_id;
      role = memberships[0].role || null;
    }

    // Se não encontrou por membership, tentar buscar empresas criadas pelo utilizador
    if (!companyId) {
      const { data: ownedCompanies } = await admin
        .from('companies')
        .select('id')
        .or(`owner_id.eq.${userId},created_by.eq.${userId}`)
        .limit(1);

      if (ownedCompanies && ownedCompanies.length > 0) {
        companyId = ownedCompanies[0].id;
      }
    }

    // Se ainda não tem empresa vinculada
    if (!companyId) {
      return NextResponse.json({
        success: true,
        hasAccess: false,
        status: 'no_company',
        companyId: null,
        companyName: null,
        planName: null,
        message: 'A sua conta não tem nenhuma empresa vinculada. Conclua a configuração da sua empresa no Kima Hub.',
      });
    }

    // 2. Obter nome da empresa
    let companyName: string | null = null;
    try {
      const { data: companyData } = await admin
        .from('companies')
        .select('name, trade_name')
        .eq('id', companyId)
        .maybeSingle();

      if (companyData) {
        companyName = companyData.trade_name || companyData.name || null;
      }
    } catch {
      // Ignore company name lookup failure
    }

    // 3. Consultar o módulo na tabela `company_modules`
    const { data: moduleData, error: modErr } = await admin
      .from('company_modules')
      .select('id, module_key, status, plan, expires_at, created_at')
      .eq('company_id', companyId)
      .in('module_key', MODULE_KEYS)
      .maybeSingle();

    if (modErr && modErr.code !== 'PGRST116') {
      console.warn('Aviso ao consultar company_modules:', modErr.message);
    }

    // Se não tem registo em `company_modules`, verificar se existe pedido em `subscription_requests`
    if (!moduleData) {
      try {
        const { data: requestData } = await admin
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

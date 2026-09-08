import { SupabaseClient } from '@supabase/supabase-js';

export type SubscriptionStatusType =
  | 'active'
  | 'pending'
  | 'expired'
  | 'inactive'
  | 'no_subscription'
  | 'no_company'
  | 'error';

export interface SubscriptionCheckResult {
  hasAccess: boolean;
  status: SubscriptionStatusType;
  rawStatus?: string;
  companyId: string | null;
  companyName?: string | null;
  planName?: string | null;
  expiresAt?: string | null;
  message: string;
}

const MODULE_KEYS = [
  process.env.NEXT_PUBLIC_KIMA_MODULE_KEY || 'faturas',
  'faturas',
  'facturas',
  'facturacao',
  'fatura',
  'factura',
];

/**
 * Verifica se um utilizador tem uma empresa associada e um plano/módulo ativo e aprovado.
 * Usa a rota de API do servidor para evitar restrições de RLS no cliente e garantir dados fiáveis.
 */
export async function checkUserSubscription(
  supabase: SupabaseClient,
  userId: string,
  targetCompanyId?: string | null
): Promise<SubscriptionCheckResult> {
  // 1. Tentar verificar via API do servidor (mais robusto, sem problemas de joins/RLS)
  try {
    const res = await fetch('/api/auth/check-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return {
          hasAccess: Boolean(data.hasAccess),
          status: data.status as SubscriptionStatusType,
          rawStatus: data.rawStatus,
          companyId: data.companyId || null,
          companyName: data.companyName || null,
          planName: data.planName || null,
          expiresAt: data.expiresAt || null,
          message: data.message || 'Verificação concluída.',
        };
      }
    }
  } catch (apiErr) {
    console.warn('Falha ao contactar /api/auth/check-subscription, a recorrer à consulta direta:', apiErr);
  }

  // 2. Fallback: Consulta direta via cliente Supabase
  try {
    let companyId: string | null = targetCompanyId || null;

    if (!companyId) {
      const { data: memberData } = await supabase
        .from('memberships')
        .select('company_id, role, status')
        .eq('user_id', userId)
        .limit(1);

      if (memberData && memberData.length > 0) {
        companyId = memberData[0].company_id;
      }
    }

    if (!companyId) {
      const { data: ownedCompanies } = await supabase
        .from('companies')
        .select('id')
        .or(`owner_id.eq.${userId},created_by.eq.${userId}`)
        .limit(1);

      if (ownedCompanies && ownedCompanies.length > 0) {
        companyId = ownedCompanies[0].id;
      }
    }

    if (!companyId) {
      return {
        hasAccess: false,
        status: 'no_company',
        companyId: null,
        message: 'A sua conta não tem nenhuma empresa vinculada. Conclua a configuração da sua empresa no Kima Hub.',
      };
    }

    // Obter nome da empresa
    let companyName: string | null = null;
    const { data: comp } = await supabase
      .from('companies')
      .select('name, trade_name')
      .eq('id', companyId)
      .maybeSingle();

    if (comp) {
      companyName = comp.trade_name || comp.name || null;
    }

    // Consultar `company_modules`
    const { data: moduleData } = await supabase
      .from('company_modules')
      .select('id, module_key, status, plan, expires_at')
      .eq('company_id', companyId)
      .in('module_key', MODULE_KEYS)
      .maybeSingle();

    if (!moduleData) {
      return {
        hasAccess: false,
        status: 'no_subscription',
        companyId,
        companyName,
        message: 'A sua empresa ainda não possui uma subscrição registada para o módulo KIMA Facturação.',
      };
    }

    const rawStatus = (moduleData.status || '').toString().trim();
    const statusLower = rawStatus.toLowerCase();
    const planName = moduleData.plan || 'Plano Facturação';
    const expiresAt = moduleData.expires_at || null;

    if (expiresAt) {
      const expDate = new Date(expiresAt);
      if (!isNaN(expDate.getTime()) && expDate < new Date()) {
        return {
          hasAccess: false,
          status: 'expired',
          rawStatus,
          companyId,
          companyName,
          planName,
          expiresAt,
          message: 'A sua subscrição para o módulo KIMA Facturação expirou.',
        };
      }
    }

    if (['ativo', 'active', 'approved', 'aprovado'].includes(statusLower)) {
      return {
        hasAccess: true,
        status: 'active',
        rawStatus,
        companyId,
        companyName,
        planName,
        expiresAt,
        message: 'Subscrição ativa e aprovada.',
      };
    }

    if (['pendente', 'pending', 'aguardando', 'em_analise'].includes(statusLower)) {
      return {
        hasAccess: false,
        status: 'pending',
        rawStatus,
        companyId,
        companyName,
        planName,
        expiresAt,
        message: 'O seu pedido de subscrição para o módulo KIMA Facturação ainda está a aguardar aprovação pelo administrador.',
      };
    }

    if (['expirado', 'expired'].includes(statusLower)) {
      return {
        hasAccess: false,
        status: 'expired',
        rawStatus,
        companyId,
        companyName,
        planName,
        expiresAt,
        message: 'A sua subscrição para o módulo KIMA Facturação expirou.',
      };
    }

    return {
      hasAccess: false,
      status: 'inactive',
      rawStatus,
      companyId,
      companyName,
      planName,
      expiresAt,
      message: 'A sua subscrição para o módulo KIMA Facturação foi cancelada ou está inativa.',
    };
  } catch (err: any) {
    console.error('Erro ao verificar subscrição no cliente:', err);
    return {
      hasAccess: false,
      status: 'error',
      companyId: null,
      message: 'Ocorreu um erro ao verificar o estado da sua subscrição.',
    };
  }
}

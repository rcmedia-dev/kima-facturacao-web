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
];

/**
 * Verifica se um utilizador tem uma empresa associada e um plano/módulo ativo e aprovado.
 */
export async function checkUserSubscription(
  supabase: SupabaseClient,
  userId: string,
  targetCompanyId?: string | null
): Promise<SubscriptionCheckResult> {
  try {
    // 1. Obter a empresa associada ao utilizador (memberships)
    let membershipQuery = supabase
      .from('memberships')
      .select('company_id, role, companies(id, name, trade_name)')
      .eq('user_id', userId);

    if (targetCompanyId) {
      membershipQuery = membershipQuery.eq('company_id', targetCompanyId);
    }

    const { data: membershipData, error: membershipError } = await membershipQuery.maybeSingle();

    if (membershipError) {
      console.warn('Erro ao consultar membership:', membershipError.message);
    }

    const membership = membershipData as {
      company_id: string;
      role?: string;
      companies?: { id: string; name?: string; trade_name?: string } | null;
    } | null;

    if (!membership?.company_id) {
      // Tentar busca sem filtro de targetCompanyId se o especificado falhou
      if (targetCompanyId) {
        return checkUserSubscription(supabase, userId, null);
      }

      return {
        hasAccess: false,
        status: 'no_company',
        companyId: null,
        message: 'A sua conta ainda não está associada a nenhuma empresa. Configure a sua empresa no Kima Hub para prosseguir.',
      };
    }

    const companyId = membership.company_id;
    const companyName =
      membership.companies?.trade_name ||
      membership.companies?.name ||
      null;

    // 2. Consultar o módulo / subscrição da empresa (company_modules)
    const { data: moduleData, error: moduleError } = await supabase
      .from('company_modules')
      .select('id, module_key, status, plan, expires_at, created_at')
      .eq('company_id', companyId)
      .in('module_key', MODULE_KEYS)
      .maybeSingle();

    if (moduleError && moduleError.code !== 'PGRST116') {
      console.warn('Aviso ao consultar company_modules:', moduleError.message);
    }

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
    const planName = moduleData.plan || 'Plano Padrão';
    const expiresAt = moduleData.expires_at || null;

    // Verificar se expirou por data
    if (expiresAt) {
      const expirationDate = new Date(expiresAt);
      if (!isNaN(expirationDate.getTime()) && expirationDate < new Date()) {
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

    // Validação de estados
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
        message: 'A sua subscrição do módulo KIMA Facturação ainda está a aguardar aprovação pelo administrador.',
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

    if (['rejeitado', 'rejected', 'cancelado', 'cancelled', 'inativo', 'inactive'].includes(statusLower)) {
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
    }

    return {
      hasAccess: false,
      status: 'inactive',
      rawStatus,
      companyId,
      companyName,
      planName,
      expiresAt,
      message: `O estado atual da sua subscrição é "${rawStatus}". Contacte o suporte ou consulte o Kima Hub.`,
    };
  } catch (err: any) {
    console.error('Erro inesperado na verificação de subscrição:', err);
    return {
      hasAccess: false,
      status: 'error',
      companyId: null,
      message: 'Ocorreu um erro ao verificar o estado da sua subscrição.',
    };
  }
}

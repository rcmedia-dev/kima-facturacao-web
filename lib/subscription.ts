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

/**
 * Verifica se um utilizador tem uma empresa associada e um plano/módulo ativo e aprovado.
 * Usa a rota de API do servidor para evitar queries redundantes no cliente.
 */
export async function checkUserSubscription(
  _supabase: SupabaseClient,
  userId: string,
  _targetCompanyId?: string | null
): Promise<SubscriptionCheckResult> {
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
    console.warn('Falha ao contactar /api/auth/check-subscription:', apiErr);
  }

  return {
    hasAccess: false,
    status: 'error',
    companyId: null,
    message: 'Ocorreu um erro ao verificar o estado da sua subscrição.',
  };
}

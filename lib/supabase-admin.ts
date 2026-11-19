import { createClient } from '@supabase/supabase-js';
import type { SupabaseAuthSource } from '@/lib/auth-source';

export function createSupabaseAdminClient(source: SupabaseAuthSource = 'hub') {
  const supabaseUrl =
    source === 'faturas'
      ? process.env.NEXT_PUBLIC_FATURAS_AUTH_SUPABASE_URL
      : process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    source === 'faturas'
      ? process.env.FATURAS_AUTH_SUPABASE_SERVICE_ROLE_KEY
      : process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    const sourceName = source === 'faturas' ? 'Faturas' : 'partilhada';
    throw new Error(
      `As credenciais administrativas da autenticação ${sourceName} não estão configuradas.`
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}


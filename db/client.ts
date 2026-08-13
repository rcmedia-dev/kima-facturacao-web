import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Cliente de servidor (API routes). Usa a service role key para operações
 * server-side e aponta para o schema do módulo kima_facturas.
 * O isolamento multiempresa é garantido nas queries (company_id) e nas
 * políticas RLS do banco.
 */
export const db = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'kima_facturas' },
});

export type Database = typeof db;
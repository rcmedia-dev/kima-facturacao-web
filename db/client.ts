import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DB === 'true';

/**
 * Cliente de servidor (API routes). Usa a service role key para operações
 * server-side e aponta para o schema do módulo kima_facturas.
 * O isolamento multiempresa é garantido nas queries (company_id) e nas
 * políticas RLS do banco.
 *
 * Quando NEXT_PUBLIC_USE_MOCK_DB=true, usa um mock em memória em vez do Supabase.
 */
function createDbClient() {
  if (useMock) {
    // Lazy import para não carregar mocks em produção
    const { createMockClient } = require('./mocks/mock-client');
    console.log('[MODO MOCK] Cliente Supabase substituído por mock em memória.');
    return createMockClient() as any;
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    db: { schema: 'kima_facturas' },
  });
}

export const db = createDbClient();

export type Database = typeof db;
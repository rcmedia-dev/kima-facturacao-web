import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DB === 'true';

function createSupabaseClient() {
  if (useMock) {
    const { createMockClient } = require('../db/mocks/mock-client');
    return createMockClient(supabaseUrl, supabaseAnonKey) as any;
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createSupabaseClient();

/**
 * Wrapper para @supabase/ssr que suporta mock via variável de ambiente.
 * Substitui importações diretas de "@supabase/ssr" nos componentes client-side.
 *
 * Uso: import { createBrowserClient } from '@/lib/supabase-ssr';
 *
 * NOTA: createBrowserClient é síncrono (como o original de @supabase/ssr).
 * Em modo mock, o cliente é pré-inicializado no carregamento do módulo.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DB === 'true';

let _mockBrowserClient: SupabaseClient | null = null;

if (useMock) {
  // Synchronous initialization via require (CommonJS) for mock
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createMockClient } = require('../db/mocks/mock-client');
  _mockBrowserClient = createMockClient();
}

/**
 * Cria um cliente browser-side. Em modo mock, devolve o mock client.
 * Mantém assinatura síncrona compatível com @supabase/ssr.
 */
export function createBrowserClient(
  _supabaseUrl?: string,
  _supabaseKey?: string
): SupabaseClient {
  if (useMock && _mockBrowserClient) {
    return _mockBrowserClient;
  }
  // Lazy require do módulo real (síncrono)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createBrowserClient: realCreateBrowserClient } = require('@supabase/ssr');
  return realCreateBrowserClient(_supabaseUrl!, _supabaseKey!);
}

/**
 * Cria um cliente server-side (cookies-based). Em modo mock, devolve o mock client.
 * Mantém assinatura síncrona compatível com @supabase/ssr.
 */
export function createServerClient(
  supabaseUrl: string,
  supabaseKey: string,
  options: any
): any {
  if (useMock && _mockBrowserClient) {
    return _mockBrowserClient;
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createServerClient: realCreateServerClient } = require('@supabase/ssr');
  return realCreateServerClient(supabaseUrl, supabaseKey, options);
}

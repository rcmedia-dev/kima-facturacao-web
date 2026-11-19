/**
 * Mock layer para Supabase — Kima Facturação
 * Exporta tudo que é necessário para interceptar chamadas ao Supabase.
 */

export { createMockClient, MockSupabaseClient, MockDB } from './mock-client';
export { MockQueryBuilder } from './query-builder';
export * from './mock-data';

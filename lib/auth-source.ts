export type SupabaseAuthSource = 'hub' | 'faturas';

export function getSupabaseAuthConfig(source: SupabaseAuthSource): {
  url: string;
  anonKey: string;
} {
  const config =
    source === 'faturas'
      ? {
          url: process.env.NEXT_PUBLIC_FATURAS_AUTH_SUPABASE_URL,
          anonKey: process.env.NEXT_PUBLIC_FATURAS_AUTH_SUPABASE_ANON_KEY,
        }
      : {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL,
          anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        };

  if (!config.url || !config.anonKey) {
    const sourceName = source === 'faturas' ? 'Faturas' : 'partilhada';
    throw new Error(`A autenticação ${sourceName} do Supabase não está configurada.`);
  }

  return { url: config.url, anonKey: config.anonKey };
}

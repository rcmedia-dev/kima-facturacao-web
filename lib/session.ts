import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase-ssr';
import { getSupabaseAuthConfig } from '@/lib/auth-source';

/**
 * Devolve o utilizador autenticado a partir dos cookies de sessão do Supabase.
 * Usado apenas em código de servidor (API routes / server actions) para
 * auditoria e rastreio de ações.
 */
export async function usuarioAtual(): Promise<{ id: string; email: string } | null> {
  try {
    const cookieStore = await cookies();
    const authSource =
      cookieStore.get('kima-auth-source')?.value === 'faturas'
        ? 'faturas'
        : 'hub';
    const { url, anonKey } = getSupabaseAuthConfig(authSource);
    const supabase = createServerClient(
      url,
      anonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // Sessão já gerida pelo middleware/proxy — leitura apenas aqui.
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;
    return { id: user.id, email: user.email || '' };
  } catch {
    return null;
  }
}
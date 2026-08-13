import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Devolve o utilizador autenticado a partir dos cookies de sessão do Supabase.
 * Usado apenas em código de servidor (API routes / server actions) para
 * auditoria e rastreio de ações.
 */
export async function usuarioAtual(): Promise<{ id: string; email: string } | null> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const MODULE_KEY = process.env.NEXT_PUBLIC_KIMA_MODULE_KEY || 'faturas';
const HUB_URL = process.env.NEXT_PUBLIC_KIMA_HUB_URL || 'https://kima-hub.vercel.app';

/**
 * KimaEventListener — Escuta eventos do Kima Hub via BroadcastChannel.
 *
 * NOTA: Com o sistema de auth próprio, já não usamos Supabase Auth.
 * Este componente mantém-se para suportar eventos futuros do Kima Hub
 * (ex: empresa mudou, módulo desactivado).
 */
export function KimaEventListener() {
  const router = useRouter();

  useEffect(() => {
    // Só escuta eventos se o Supabase estiver configurado (produção com Kima Hub)
    const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!hasSupabase) return;

    let channel: any = null;
    let authListener: any = null;

    async function setup() {
      try {
        const { createBrowserClient } = await import('@/lib/supabase-ssr');
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Escutar eventos broadcast do Kima Hub
        channel = supabase.channel('kima-events') as ReturnType<typeof supabase.channel>;

        channel
          .on('broadcast', { event: 'LOGOUT' }, () => {
            // Limpar nossa sessão e redirecionar
            document.cookie = 'kima-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
            if (typeof window !== 'undefined') {
              const path = window.location.pathname;
              if (path !== '/login' && !path.startsWith('/primeiro-acesso')) {
                window.location.href = '/login';
              }
            }
          })
          .on('broadcast', { event: 'COMPANY_SWITCHED' }, () => {
            void (async () => {
              const { useAppStore } = await import('@/lib/store');
              const store = useAppStore.getState();
              store.clearAllData();
              await store.loadAll();
              router.refresh();
            })();
          })
          .on('broadcast', { event: 'MODULE_STATUS_CHANGED' }, (payload: { moduleKey?: string; status?: string }) => {
            if (payload?.moduleKey === MODULE_KEY && payload?.status !== 'Ativo') {
              alert('A licença deste módulo foi alterada ou cancelada.');
              window.location.href = `${HUB_URL}/marketplace`;
            }
          })
          .subscribe();
      } catch {
        // Supabase não configurado — ignora
      }
    }

    setup();

    return () => {
      if (channel) {
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          if (supabaseUrl) {
            import('@/lib/supabase-ssr').then(({ createBrowserClient }) => {
              const supabase = createBrowserClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
              supabase.removeChannel(channel);
            });
          }
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [router]);

  return null;
}

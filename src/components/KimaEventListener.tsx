'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const MODULE_KEY = process.env.NEXT_PUBLIC_KIMA_MODULE_KEY || 'faturas';
const HUB_URL = process.env.NEXT_PUBLIC_KIMA_HUB_URL || 'https://kima-hub.vercel.app';

/**
 * KimaEventListener — Escuta eventos do Kima Hub via BroadcastChannel.
 *
 * Sincroniza eventos de sessão e subscrição do Kima Hub.
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
          .on('broadcast', { event: 'LOGOUT' }, async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
              console.error('[KimaEventListener] Erro ao terminar sessão.', error);
            }
            const path = window.location.pathname;
            if (path !== '/login' && !path.startsWith('/primeiro-acesso')) {
              window.location.href = '/login';
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
      const activeChannel = channel;
      if (activeChannel) {
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          if (supabaseUrl) {
            import('@/lib/supabase-ssr').then(({ createBrowserClient }) => {
              const supabase = createBrowserClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
              supabase.removeChannel(activeChannel);
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

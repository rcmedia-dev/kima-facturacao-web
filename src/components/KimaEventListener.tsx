'use client';

import { useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

const MODULE_KEY = process.env.NEXT_PUBLIC_KIMA_MODULE_KEY || 'faturas';

export function KimaEventListener() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        window.location.href = '/login';
      }
    });

    const channel = supabase
      .channel('kima-events')
      .on('broadcast', { event: 'LOGOUT' }, () => {
        supabase.auth.signOut();
        window.location.href = '/login';
      })
      .on('broadcast', { event: 'COMPANY_SWITCHED' }, () => {
        // Troca de empresa: limpar dados da empresa anterior ANTES de
        // recarregar, senão /clientes e /artigos exibem dados alheios.
        void (async () => {
          const { useAppStore } = await import('@/lib/store');
          useAppStore.getState().clearAllData();
          await useAppStore.getState().loadAll();
          router.refresh();
        })();
      })
      .on('broadcast', { event: 'MODULE_STATUS_CHANGED' }, (payload: { moduleKey?: string; status?: string }) => {
        if (payload?.moduleKey === MODULE_KEY && payload?.status !== 'Ativo') {
          alert('A licença deste módulo foi alterada ou cancelada.');
          window.location.href = `${process.env.NEXT_PUBLIC_KIMA_HUB_URL}/marketplace`;
        }
      })
      .subscribe();

    return () => {
      authListener.subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}

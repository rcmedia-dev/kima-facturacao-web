'use client';

import { useState } from 'react';
import './globals.css';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { useStoreInit } from '@/hooks/use-store-init';
import { cn } from '@/lib/utils';
import { ToastProvider } from '@/components/ui/toast';

export function LayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  useStoreInit();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ToastProvider>
      {/* Fundo principal KIMA: #F3F4F6 (Light) */}
      <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 antialiased">
        {/* Sidebar Lateral */}
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        {/* Área Principal (Topbar + Conteúdo) */}
        <div
          className={cn(
            'flex flex-col min-h-screen transition-all duration-300 ease-in-out',
            collapsed ? 'md:pl-20' : 'md:pl-[280px]'
          )}
        >
          <Topbar onOpenMobile={() => setMobileOpen(true)} />
          <main className="flex-1 p-4 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

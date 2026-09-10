'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import './globals.css';
import { Sidebar } from '@/components/sidebar';
import { ProtectedRoute } from '@/components/protected-route';
import { useStoreInit } from '@/hooks/use-store-init';
import { cn } from '@/lib/utils';
import { ToastProvider } from '@/components/ui/toast';

const AUTH_PATHS = ['/login', '/primeiro-acesso', '/acesso-negado'];

export function LayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  useStoreInit();
  const pathname = usePathname();
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isAuthPage) {
    return (
      <ToastProvider>
        <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 antialiased">
          {children}
        </div>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <ProtectedRoute>
        <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 antialiased">
          <Sidebar
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed(!collapsed)}
            mobileOpen={mobileOpen}
            onCloseMobile={() => setMobileOpen(false)}
          />

          <div
            className={cn(
              'flex flex-col min-h-screen transition-all duration-300 ease-in-out',
              collapsed ? 'md:pl-20' : 'md:pl-[280px]'
            )}
          >
            <div className="md:hidden sticky top-0 z-30 flex items-center h-14 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
              <button
                onClick={() => setMobileOpen(true)}
                className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Abrir menu"
              >
                <Menu size={20} />
              </button>
            </div>
            <main className="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
              {children}
            </main>
          </div>
        </div>
      </ProtectedRoute>
    </ToastProvider>
  );
}

import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { KimaEventListener } from '@rcmedia-dev/kima-sdk'
import { LayoutClient } from './layout-client'

export const metadata: Metadata = {
  title: 'Kima Financeiro — Faturação para PME',
  description: 'Sistema moderno de faturação para pequenas empresas angolanas — KIMA SaaS',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2563EB' },
    { media: '(prefers-color-scheme: dark)', color: '#1D4ED8' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-AO" suppressHydrationWarning>
      <head>
        {/* KIMA Design System — Fonte Inter */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
        />
      </head>
      <body
        className="antialiased"
        style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}
        suppressHydrationWarning
      >
        <LayoutClient>
          <KimaEventListener moduleKey="faturas" />
          {children}
        </LayoutClient>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

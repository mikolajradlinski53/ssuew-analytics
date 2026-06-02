import type { Metadata } from 'next'
import './globals.css'
import { AppShell } from '@/components/ui/AppShell'

export const metadata: Metadata = {
  title: 'SSUEW Analytics',
  description: 'System monitorowania i projekcji KPI — Wiceprzewodniczący ds. Strategii',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}

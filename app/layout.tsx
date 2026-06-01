import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SSUEW Analytics',
  description: 'System monitorowania i projekcji KPI — Wiceprzewodniczący ds. Strategii',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}

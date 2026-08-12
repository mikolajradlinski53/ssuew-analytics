import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth/useAuth'

export const metadata: Metadata = {
  title: 'DECK',
  description: 'Prywatne centrum dowodzenia — analityka SSUEW, planer semestru, zadania i strony',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}

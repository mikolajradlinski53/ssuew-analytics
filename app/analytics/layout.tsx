import type { ReactNode } from 'react'
import { AppShell } from '@/components/ui/AppShell'
import { AnalyticsDataProvider, BanerZrodla } from '@/components/ui/AnalyticsDataProvider'

export default function AnalyticsLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <AnalyticsDataProvider>
        <BanerZrodla />
        {children}
      </AnalyticsDataProvider>
    </AppShell>
  )
}

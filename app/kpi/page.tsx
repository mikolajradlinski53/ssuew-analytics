import { Suspense } from 'react'
import KpiClient from '@/components/modules/KpiClient'

export default function Page() {
  return (
    <Suspense fallback={<p className="text-deck-muted text-sm">Ładowanie…</p>}>
      <KpiClient />
    </Suspense>
  )
}

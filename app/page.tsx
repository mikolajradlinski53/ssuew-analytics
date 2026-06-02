import { Suspense } from 'react'
import OverviewClient from '@/components/modules/OverviewClient'

export default function Page() {
  return (
    <Suspense fallback={<p className="text-deck-muted text-sm">Ładowanie…</p>}>
      <OverviewClient />
    </Suspense>
  )
}

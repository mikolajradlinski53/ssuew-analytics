import { Suspense } from 'react'
import KorelacjeClient from '@/components/modules/KorelacjeClient'

export default function Page() {
  return (
    <Suspense fallback={<p className="text-deck-muted text-sm">Ładowanie…</p>}>
      <KorelacjeClient />
    </Suspense>
  )
}

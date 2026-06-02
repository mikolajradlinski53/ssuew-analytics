import { Suspense } from 'react'
import KomisjeClient from '@/components/modules/KomisjeClient'

export default function Page() {
  return (
    <Suspense fallback={<p className="text-deck-muted text-sm">Ładowanie…</p>}>
      <KomisjeClient />
    </Suspense>
  )
}

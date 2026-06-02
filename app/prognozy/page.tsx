import { Suspense } from 'react'
import PrognozyClient from '@/components/modules/PrognozyClient'

export default function Page() {
  return (
    <Suspense fallback={<p className="text-deck-muted text-sm">Ładowanie…</p>}>
      <PrognozyClient />
    </Suspense>
  )
}

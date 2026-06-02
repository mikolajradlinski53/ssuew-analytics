import { Suspense } from 'react'
import RekrutacjeClient from '@/components/modules/RekrutacjeClient'

export default function Page() {
  return (
    <Suspense fallback={<p className="text-deck-muted text-sm">Ładowanie…</p>}>
      <RekrutacjeClient />
    </Suspense>
  )
}

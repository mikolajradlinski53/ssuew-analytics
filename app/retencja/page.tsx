import { Suspense } from 'react'
import RetencjaClient from '@/components/modules/RetencjaClient'

export default function Page() {
  return (
    <Suspense fallback={<p className="text-deck-muted text-sm">Ładowanie…</p>}>
      <RetencjaClient />
    </Suspense>
  )
}

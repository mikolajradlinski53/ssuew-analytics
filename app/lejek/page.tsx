import { Suspense } from 'react'
import LejekClient from '@/components/modules/LejekClient'

export default function Page() {
  return (
    <Suspense fallback={<p className="text-deck-muted text-sm">Ładowanie…</p>}>
      <LejekClient />
    </Suspense>
  )
}

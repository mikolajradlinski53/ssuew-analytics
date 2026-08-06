import { Suspense } from 'react'
import WpisClient from '@/components/modules/WpisClient'

export default function Page() {
  return (
    <Suspense fallback={<p className="text-deck-muted text-sm">Ładowanie…</p>}>
      <WpisClient />
    </Suspense>
  )
}

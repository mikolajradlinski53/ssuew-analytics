import { Suspense } from 'react'
import AlertyClient from '@/components/modules/AlertyClient'

export default function Page() {
  return (
    <Suspense fallback={<p className="text-deck-muted text-sm">Ładowanie…</p>}>
      <AlertyClient />
    </Suspense>
  )
}

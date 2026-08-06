import { Suspense } from 'react'
import PrognozyClient from '@/components/modules/PrognozyClient'
import { ModuleSkeleton } from '@/components/ui/ModuleSkeleton'

export default function Page() {
  return (
    <Suspense fallback={<ModuleSkeleton variant="rekrutacje" />}>
      <PrognozyClient />
    </Suspense>
  )
}

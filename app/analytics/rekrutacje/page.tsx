import { Suspense } from 'react'
import RekrutacjeClient from '@/components/modules/RekrutacjeClient'
import { ModuleSkeleton } from '@/components/ui/ModuleSkeleton'

export default function Page() {
  return (
    <Suspense fallback={<ModuleSkeleton variant="rekrutacje" />}>
      <RekrutacjeClient />
    </Suspense>
  )
}

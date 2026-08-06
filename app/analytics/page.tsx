import { Suspense } from 'react'
import OverviewClient from '@/components/modules/OverviewClient'
import { ModuleSkeleton } from '@/components/ui/ModuleSkeleton'

export default function Page() {
  return (
    <Suspense fallback={<ModuleSkeleton variant="overview" />}>
      <OverviewClient />
    </Suspense>
  )
}

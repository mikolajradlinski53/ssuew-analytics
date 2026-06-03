import { Suspense } from 'react'
import KpiClient from '@/components/modules/KpiClient'
import { ModuleSkeleton } from '@/components/ui/ModuleSkeleton'

export default function Page() {
  return (
    <Suspense fallback={<ModuleSkeleton variant="kpi" />}>
      <KpiClient />
    </Suspense>
  )
}

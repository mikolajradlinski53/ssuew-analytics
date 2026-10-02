import { Suspense } from 'react'
import ProjektyClient from '@/components/modules/ProjektyClient'
import { ModuleSkeleton } from '@/components/ui/ModuleSkeleton'

export default function Page() {
  return (
    <Suspense fallback={<ModuleSkeleton />}>
      <ProjektyClient />
    </Suspense>
  )
}

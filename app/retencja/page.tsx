import { Suspense } from 'react'
import RetencjaClient from '@/components/modules/RetencjaClient'
import { ModuleSkeleton } from '@/components/ui/ModuleSkeleton'

export default function Page() {
  return (
    <Suspense fallback={<ModuleSkeleton variant="retencja" />}>
      <RetencjaClient />
    </Suspense>
  )
}

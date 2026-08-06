import { Suspense } from 'react'
import LejekClient from '@/components/modules/LejekClient'
import { ModuleSkeleton } from '@/components/ui/ModuleSkeleton'

export default function Page() {
  return (
    <Suspense fallback={<ModuleSkeleton variant="lejek" />}>
      <LejekClient />
    </Suspense>
  )
}

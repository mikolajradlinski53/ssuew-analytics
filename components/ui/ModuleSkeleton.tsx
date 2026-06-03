import { Skeleton } from './Skeleton'

type Variant = 'overview' | 'rekrutacje' | 'retencja' | 'czlonkowie' | 'kpi' | 'lejek' | 'default'

function KpiRow({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid gap-2 ${count === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-16" />
      ))}
    </div>
  )
}

function Bars({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-6 flex-1" />
        </div>
      ))}
    </div>
  )
}

export function ModuleSkeleton({ variant = 'default' }: { variant?: Variant }) {
  if (variant === 'overview') {
    return (
      <div className="space-y-3" aria-label="Ladowanie" aria-busy="true">
        <Skeleton className="h-44" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
        <KpiRow />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      </div>
    )
  }

  if (variant === 'rekrutacje') {
    return (
      <div className="space-y-3" aria-label="Ladowanie" aria-busy="true">
        <KpiRow />
        <Skeleton className="h-64" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      </div>
    )
  }

  if (variant === 'retencja') {
    return (
      <div className="space-y-3" aria-label="Ladowanie" aria-busy="true">
        <Skeleton className="h-6 w-72" />
        <Skeleton className="h-80" />
        <Skeleton className="h-36" />
      </div>
    )
  }

  if (variant === 'czlonkowie') {
    return (
      <div className="space-y-3" aria-label="Ladowanie" aria-busy="true">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-20" />
        <div className="space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[180px_repeat(8,1fr)_80px] gap-1">
              {Array.from({ length: 10 }).map((__, j) => (
                <Skeleton key={j} className="h-7" />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (variant === 'kpi') {
    return (
      <div className="space-y-3" aria-label="Ladowanie" aria-busy="true">
        <KpiRow count={3} />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-52" />
      </div>
    )
  }

  if (variant === 'lejek') {
    return (
      <div className="space-y-3" aria-label="Ladowanie" aria-busy="true">
        <Skeleton className="h-8 w-96" />
        <div className="bg-deck-panel border border-deck-border rounded-lg p-3">
          <Bars count={4} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3" aria-label="Ladowanie" aria-busy="true">
      <KpiRow />
      <Skeleton className="h-44" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
    </div>
  )
}

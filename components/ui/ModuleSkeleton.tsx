import { Skeleton } from './Skeleton'

export function ModuleSkeleton() {
  return (
    <div className="space-y-3" aria-label="Ładowanie" aria-busy="true">
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
      <Skeleton className="h-44" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
    </div>
  )
}

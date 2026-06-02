export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-deck-panel border border-deck-border rounded-lg ${className}`} />
}

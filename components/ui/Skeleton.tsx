export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.045] ${className}`}
      aria-hidden
    >
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[deck-sheen_1.6s_ease-in-out_infinite]" />
    </div>
  )
}

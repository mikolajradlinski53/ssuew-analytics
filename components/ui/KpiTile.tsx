import type { ReactNode } from 'react'

type Accent = 'accent' | 'violet' | 'default'

type Props = {
  label: string
  value: ReactNode
  sub?: string
  accent?: Accent
}

const valueColor: Record<Accent, string> = {
  accent: 'text-deck-accent',
  violet: 'text-deck-violet',
  default: 'text-deck-text',
}

const railColor: Record<Accent, string> = {
  accent: 'from-deck-accent via-deck-accent to-transparent',
  violet: 'from-deck-violet via-deck-violet to-transparent',
  default: 'from-deck-warn via-deck-warn to-transparent',
}

export function KpiTile({ label, value, sub, accent = 'default' }: Props) {
  return (
    <div className="deck-card group rounded-lg p-4">
      <div className={`mb-3 h-1 w-16 rounded-full bg-gradient-to-r ${railColor[accent]} opacity-80 transition-all group-hover:w-24`} />
      <div className="text-[10px] uppercase tracking-[0.18em] text-deck-muted">{label}</div>
      <div className={`mt-1 text-3xl font-semibold tabular-nums leading-tight ${valueColor[accent]}`}>{value}</div>
      {sub && <div className="mt-1 text-[10px] text-deck-muted">{sub}</div>}
    </div>
  )
}

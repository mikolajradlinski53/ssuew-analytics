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

export function KpiTile({ label, value, sub, accent = 'default' }: Props) {
  return (
    <div className="bg-deck-panel border border-deck-border rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wide text-deck-muted">{label}</div>
      <div className={`text-2xl font-semibold tabular ${valueColor[accent]}`}>{value}</div>
      {sub && <div className="text-[10px] text-deck-muted mt-0.5">{sub}</div>}
    </div>
  )
}

import Link from 'next/link'
import type { ExecutiveInsight } from '@/types'

const priorityClass: Record<ExecutiveInsight['priority'], string> = {
  high: 'border-deck-danger-border bg-deck-danger-bg text-deck-danger',
  medium: 'border-deck-warn/40 bg-deck-panel text-deck-warn',
  low: 'border-deck-border bg-deck-panel text-deck-accent',
}

const priorityLabel: Record<ExecutiveInsight['priority'], string> = {
  high: 'PRIORYTET',
  medium: 'OBSERWUJ',
  low: 'SZANSA',
}

export function InsightCard({ insight }: { insight: ExecutiveInsight }) {
  return (
    <div className={`rounded-lg border p-3 ${priorityClass[insight.priority]}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-semibold tracking-wide">{priorityLabel[insight.priority]}</span>
        <span className="text-[10px] tabular-nums text-deck-muted">{insight.metric}</span>
      </div>
      <div className="mt-1 text-sm text-deck-text">{insight.title}</div>
      <div className="mt-1 text-[11px] text-deck-muted">{insight.detail}</div>
      <div className="mt-2 text-[11px] text-deck-muted italic">{insight.action}</div>
      <Link href={insight.href} className="mt-2 inline-block text-[10px] text-deck-muted hover:text-deck-text">
        zobacz modul
      </Link>
    </div>
  )
}

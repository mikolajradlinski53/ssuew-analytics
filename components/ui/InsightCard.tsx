import Link from 'next/link'
import { ArrowRight, Flame, Radar, Sparkle } from 'lucide-react'
import type { ExecutiveInsight } from '@/types'

const priorityClass: Record<ExecutiveInsight['priority'], string> = {
  high: 'border-deck-danger-border/70 bg-deck-danger-bg/70 text-deck-danger',
  medium: 'border-deck-warn/35 bg-deck-warn/8 text-deck-warn',
  low: 'border-deck-accent/30 bg-deck-accent/8 text-deck-accent',
}

const priorityLabel: Record<ExecutiveInsight['priority'], string> = {
  high: 'PRIORYTET',
  medium: 'OBSERWUJ',
  low: 'SZANSA',
}

const priorityIcon = {
  high: Flame,
  medium: Radar,
  low: Sparkle,
}

export function InsightCard({ insight }: { insight: ExecutiveInsight }) {
  const Icon = priorityIcon[insight.priority]
  return (
    <div className={`group rounded-lg border p-4 transition hover:-translate-y-0.5 ${priorityClass[insight.priority]}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.14em]">
          <Icon size={13} />
          {priorityLabel[insight.priority]}
        </span>
        <span className="text-[10px] tabular-nums text-deck-muted">{insight.metric}</span>
      </div>
      <div className="mt-3 text-sm font-medium text-deck-text">{insight.title}</div>
      <div className="mt-2 text-[11px] leading-5 text-deck-muted">{insight.detail}</div>
      <div className="mt-3 text-[11px] leading-5 text-deck-muted italic">{insight.action}</div>
      <Link href={insight.href} className="mt-4 inline-flex items-center gap-1 text-[10px] font-medium text-deck-text/80 transition group-hover:text-deck-text">
        zobacz moduł
        <ArrowRight size={12} />
      </Link>
    </div>
  )
}

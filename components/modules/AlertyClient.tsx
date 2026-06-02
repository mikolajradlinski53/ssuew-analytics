'use client'
import Link from 'next/link'
import { useAnalyticsData } from '@/lib/useAnalyticsData'
import { useFilters } from '@/lib/useFilters'
import { applyFilters } from '@/lib/filters'
import { buildAlerts, type Alert } from '@/lib/stats'
import { BentoCard } from '@/components/ui/BentoCard'

const sevBox: Record<Alert['severity'], string> = {
  critical: 'bg-deck-danger-bg border-deck-danger-border',
  warning: 'border-deck-warn/40 bg-deck-panel',
  info: 'border-deck-border bg-deck-panel',
}
const sevText: Record<Alert['severity'], string> = {
  critical: 'text-deck-danger',
  warning: 'text-deck-warn',
  info: 'text-deck-muted',
}
const sevLabel: Record<Alert['severity'], string> = {
  critical: 'KRYTYCZNY',
  warning: 'OSTRZEŻENIE',
  info: 'INFO',
}

export default function AlertyClient() {
  const { rekrutacje, kohorty, kpiMetrics, loading } = useAnalyticsData()
  const { filters } = useFilters()
  if (loading) return <p className="text-deck-muted text-sm">Ładowanie…</p>

  const alerts = buildAlerts(applyFilters(rekrutacje, filters), applyFilters(kohorty, filters), kpiMetrics)

  if (!alerts.length) {
    return (
      <BentoCard title="Alerty">
        <p className="text-[11px] text-deck-accent">Brak alertów — wszystko w normie. ✓</p>
      </BentoCard>
    )
  }

  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <div key={a.id} className={`border rounded-lg p-3 ${sevBox[a.severity]}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-semibold tracking-wide ${sevText[a.severity]}`}>{sevLabel[a.severity]}</span>
            <Link href={a.href} className="text-[10px] text-deck-muted hover:text-deck-text">→ zobacz</Link>
          </div>
          <div className="text-sm text-deck-text mt-1">{a.title}</div>
          <div className="text-[11px] text-deck-muted">{a.detail}</div>
          <div className="text-[11px] text-deck-muted mt-1 italic">{a.recommendation}</div>
        </div>
      ))}
    </div>
  )
}

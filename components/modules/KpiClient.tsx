'use client'
import { useAnalyticsData } from '@/lib/useAnalyticsData'
import { buildStrategicKpis, kpiRatio, kpiByKategoria, kpiSummary } from '@/lib/stats'
import { BentoCard } from '@/components/ui/BentoCard'
import { KpiTile } from '@/components/ui/KpiTile'
import { ModuleSkeleton } from '@/components/ui/ModuleSkeleton'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'

function ratioColor(r: number): string {
  if (r >= 1) return 'text-deck-accent'
  if (r >= 0.8) return 'text-deck-warn'
  return 'text-deck-danger'
}

export default function KpiClient() {
  const { rekrutacje, kohorty, kpiMetrics, loading } = useAnalyticsData()
  if (loading) return <ModuleSkeleton variant="kpi" />
  if (!kpiMetrics.length) {
    return (
      <BentoCard title="KPI">
        <p className="text-[11px] text-deck-muted">Brak metryk KPI.</p>
      </BentoCard>
    )
  }

  const summary = kpiSummary(kpiMetrics)
  const grouped = kpiByKategoria(kpiMetrics)
  const strategic = buildStrategicKpis(rekrutacje, kohorty, kpiMetrics)

  return (
    <div className="space-y-3">
      <div className="text-[11px] text-deck-muted">Wskaźniki rok-do-roku (wartość zeszłoroczna → tegoroczna)</div>
      <div className="grid grid-cols-3 gap-2">
        <KpiTile label="Metryki rosnące" value={<AnimatedNumber value={summary.up} />} sub="rok do roku" accent="accent" />
        <KpiTile label="Metryki spadające" value={<AnimatedNumber value={summary.down} />} sub="rok do roku" accent="violet" />
        <KpiTile label="Średni ratio" value={<AnimatedNumber value={Math.round(summary.avgRatio * 100)} suffix="%" />} sub="r/r" />
      </div>

      <BentoCard title="KPI strategiczne" sub="nowe wskaĹşniki dla pracy ZarzÄ…du" span={4}>
        <div className="grid grid-cols-2 gap-2">
          {strategic.map((kpi) => (
            <div key={kpi.id} className="rounded-lg border border-deck-border bg-deck-bg p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-deck-text">{kpi.title}</div>
                  <div className="text-[10px] text-deck-muted mt-1">{kpi.detail}</div>
                </div>
                <div className={`text-lg font-semibold tabular-nums ${kpi.score >= 70 ? 'text-deck-accent' : kpi.score < 45 ? 'text-deck-danger' : 'text-deck-warn'}`}>{kpi.value}</div>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-deck-panel overflow-hidden">
                <div className="h-full bg-deck-accent/70" style={{ width: `${kpi.score}%` }} />
              </div>
              <div className="mt-2 text-[10px] text-deck-muted italic">{kpi.recommendation}</div>
            </div>
          ))}
        </div>
      </BentoCard>

      {[...grouped.entries()].map(([kat, metrics]) => (
        <BentoCard key={kat} title={kat} sub={`${metrics.length} metryk · ${metrics[0].okres_poprzedni} → ${metrics[0].okres_biezacy}`} span={4}>
          <div className="space-y-1">
            {metrics.map((m) => {
              const r = kpiRatio(m)
              return (
                <div key={m.id} className="flex items-center gap-3 text-[11px]">
                  <span className="text-deck-text w-28 truncate">{m.nazwa}</span>
                  <span className="tabular text-deck-muted w-20">{m.wartosc_poprzednia} → {m.wartosc_biezaca}</span>
                  <div className="flex-1 bg-deck-bg rounded h-2 overflow-hidden border border-deck-border">
                    <div className={`h-full ${r >= 1 ? 'bg-deck-accent/60' : 'bg-deck-danger/50'}`} style={{ width: `${Math.min(100, r * 50)}%` }} />
                  </div>
                  <span className={`tabular font-semibold w-14 text-right ${ratioColor(r)}`}>{r > 0 ? `${Math.round(r * 100)}%` : '—'}</span>
                </div>
              )
            })}
          </div>
        </BentoCard>
      ))}
    </div>
  )
}

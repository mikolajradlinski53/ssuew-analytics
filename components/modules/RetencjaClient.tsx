'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useAnalyticsData } from '@/lib/useAnalyticsData'
import { useFilters } from '@/lib/useFilters'
import { applyFilters } from '@/lib/filters'
import { survivalCurve, analyzeRetention } from '@/lib/stats'
import { chartTheme, axisTick, tooltipStyle } from '@/lib/chartTheme'
import { BentoCard } from '@/components/ui/BentoCard'
import { ModuleSkeleton } from '@/components/ui/ModuleSkeleton'

export default function RetencjaClient() {
  const { kohorty, loading } = useAnalyticsData()
  const { filters } = useFilters()
  if (loading) return <ModuleSkeleton variant="retencja" />

  const koh = applyFilters(kohorty, filters)
  const reg = analyzeRetention(koh)

  // Krzywa per kohorta: realny pomiar (survival) gdy jest, inaczej aproksymacja.
  const pct = (k: typeof koh[number], s: number): number | null => {
    if (k.survival) return s < k.survival.length ? k.survival[s] : null
    const pt = survivalCurve(k.avg_retention_sem, k.max_retention_sem).find((p) => p.sem === s)
    return pt ? pt.pct : null
  }
  const curveLen = (k: typeof koh[number]) => (k.survival ? k.survival.length - 1 : Math.round(k.max_retention_sem))
  const maxSem = Math.max(0, ...koh.map(curveLen))
  const data: Record<string, number | string>[] = []
  for (let s = 0; s <= maxSem; s++) {
    const row: Record<string, number | string> = { sem: s }
    for (const k of koh) {
      const v = pct(k, s)
      if (v != null) row[k.edycja] = v
    }
    data.push(row)
  }
  const allMeasured = koh.length > 0 && koh.every((k) => k.survival)

  return (
    <div className="space-y-3">
      <div className={`text-[11px] border rounded-md px-2 py-1 inline-block ${allMeasured ? 'text-deck-accent border-deck-accent/40' : 'text-deck-warn border-deck-warn/40'}`}>
        {allMeasured
          ? 'Pomiar z danych per-osoba (% aktywnych po t semestrach)'
          : 'Część krzywych to szacunek (model wykładniczy) — brak pomiaru per semestr'}
      </div>

      <BentoCard title="Krzywe przeżycia kohort" sub="% aktywnych w kolejnych semestrach" span={4}>
        {koh.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="sem" tick={axisTick} label={{ value: 'semestr', position: 'insideBottom', offset: -2, fontSize: 10, fill: chartTheme.axis }} />
              <YAxis tick={axisTick} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {koh.map((k, i) => (
                <Line
                  key={k.edycja}
                  type="monotone"
                  dataKey={k.edycja}
                  stroke={chartTheme.series[i % chartTheme.series.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-[11px] text-deck-muted">Brak kohort dla wybranych filtrów.</p>
        )}
      </BentoCard>

      <BentoCard title="Model regresji (OLS)" sub="trend, sezon, liczebność → retencja" span={4}>
        {reg.coefficients.length ? (
          <div className="space-y-2">
            {reg.coefficients.map((c) => (
              <div key={c.name} className="text-[11px]">
                <span className="text-deck-text">{c.name}: </span>
                <span className="tabular-nums text-deck-accent">β = {c.beta.toFixed(3)}</span>
                <span className="text-deck-muted"> — {c.interpretation}</span>
              </div>
            ))}
            <div className="text-[11px] text-deck-muted">
              R² = {(reg.r2 * 100).toFixed(0)}% · prognoza następnej edycji: {reg.prediction} sem.
            </div>
            {reg.warning && <div className="text-[11px] text-deck-warn">{reg.warning}</div>}
          </div>
        ) : (
          <p className="text-[11px] text-deck-muted">{reg.warning ?? 'Brak danych.'}</p>
        )}
      </BentoCard>
    </div>
  )
}

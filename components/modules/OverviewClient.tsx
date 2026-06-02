'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAnalyticsData } from '@/lib/useAnalyticsData'
import { useFilters } from '@/lib/useFilters'
import { applyFilters } from '@/lib/filters'
import { computeOverview } from '@/lib/overview'
import { analyzeKomisje } from '@/lib/stats'
import { chartTheme, axisTick, tooltipStyle } from '@/lib/chartTheme'
import { KpiTile } from '@/components/ui/KpiTile'
import { BentoCard } from '@/components/ui/BentoCard'

function zColor(z: number): string {
  if (z > 0.5) return 'text-deck-accent'
  if (z < -1) return 'text-deck-danger'
  if (z < -0.5) return 'text-deck-warn'
  return 'text-deck-muted'
}

export default function OverviewClient() {
  const { rekrutacje, kohorty, kpiPeriods, loading, usingDemo } = useAnalyticsData()
  const { filters } = useFilters()

  if (loading) return <p className="text-deck-muted text-sm">Ładowanie…</p>

  const rekr = applyFilters(rekrutacje, filters)
  const koh = applyFilters(kohorty, filters)
  // kpiPeriods nie filtrujemy po roku/sezonie — KpiPeriod jest kluczowane semestrem (string),
  // bez pól rok/sezon. Z-score komisji liczymy z całości.
  const m = computeOverview(rekr, koh, kpiPeriods)
  const kom = kpiPeriods.length >= 2 ? analyzeKomisje(kpiPeriods) : null

  const barData = [...rekr]
    .sort((a, b) => a.rok - b.rok || (a.sezon === 'wiosna' ? -1 : 1))
    .map((r) => ({ edycja: r.edycja, zgłoszenia: r.zgloszenia, przyjęci: r.przyjeci }))

  return (
    <div className="space-y-3">
      {usingDemo && (
        <div className="inline-block text-[11px] text-deck-warn border border-deck-warn/40 rounded-md px-2 py-1">
          Tryb demo — skonfiguruj Supabase, aby zobaczyć dane na żywo
        </div>
      )}
      <div className="grid grid-cols-4 gap-2">
      <KpiTile
        label="Conversion (avg)"
        value={m.avgConversion != null ? `${m.avgConversion}%` : '—'}
        sub="filtrowane edycje"
        accent="accent"
      />
      <KpiTile
        label="Retencja (hist.)"
        value={m.histRetention != null ? `${m.histRetention} sem` : '—'}
        sub="ukończone kohorty"
        accent="violet"
      />
      <KpiTile
        label={`Przyjęci ${m.lastEdycja ?? ''}`.trim()}
        value={m.lastAccepted ?? '—'}
        sub={m.lastApplications != null ? `z ${m.lastApplications} zgłoszeń` : ''}
      />
      <KpiTile
        label="Komisje śr."
        value={m.avgKpiRealization != null ? `${m.avgKpiRealization}%` : '—'}
        sub="realizacja KPI"
      />

      <BentoCard title="Zgłoszenia vs przyjęci" sub="trend historyczny" span={2}>
        {barData.length ? (
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={barData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="edycja" tick={axisTick} />
              <YAxis tick={axisTick} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="zgłoszenia" fill={chartTheme.series[2]} radius={[3, 3, 0, 0]} />
              <Bar dataKey="przyjęci" fill={chartTheme.accent} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-[11px] text-deck-muted">Brak edycji dla wybranych filtrów.</p>
        )}
      </BentoCard>

      <BentoCard title="Komisje — z-score" sub="realizacja KPI vs norma" span={2}>
        {kom ? (
          <div className="flex gap-2">
            {kom.withZ.map((c) => (
              <div key={c.id} className="flex-1 text-center">
                <div className={`text-sm font-semibold tabular-nums ${zColor(c.z)}`}>
                  {c.z > 0 ? '+' : ''}
                  {c.z.toFixed(1)}
                </div>
                <div className="text-[9px] text-deck-muted truncate">{c.komisja?.kod ?? '—'}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-deck-muted">Za mało danych KPI.</p>
        )}
      </BentoCard>
      </div>
    </div>
  )
}

'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAnalyticsData } from '@/lib/useAnalyticsData'
import { useFilters } from '@/lib/useFilters'
import { applyFilters } from '@/lib/filters'
import { computeOverview } from '@/lib/overview'
import { kpiSummary, kpiRatio } from '@/lib/stats'
import { chartTheme, axisTick, tooltipStyle } from '@/lib/chartTheme'
import { KpiTile } from '@/components/ui/KpiTile'
import { BentoCard } from '@/components/ui/BentoCard'

export default function OverviewClient() {
  const { rekrutacje, kohorty, kpiMetrics, loading, usingDemo } = useAnalyticsData()
  const { filters } = useFilters()

  if (loading) return <p className="text-deck-muted text-sm">Ładowanie…</p>

  const rekr = applyFilters(rekrutacje, filters)
  const koh = applyFilters(kohorty, filters)
  const m = computeOverview(rekr, koh, [])
  const summary = kpiSummary(kpiMetrics)

  const movers = [...kpiMetrics]
    .filter((x) => x.wartosc_poprzednia > 0)
    .sort((a, b) => kpiRatio(b) - kpiRatio(a))
  const top = movers.slice(0, 3)
  const bottom = movers.slice(-3).reverse()

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
          label="KPI rosnące r/r"
          value={`${summary.up}/${summary.up + summary.down}`}
          sub={`śr. ratio ${Math.round(summary.avgRatio * 100)}%`}
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

        <BentoCard title="KPI — zmiany rok-do-roku" sub="największe wzrosty i spadki" span={2}>
          {movers.length ? (
            <div className="space-y-1">
              {top.map((x) => (
                <div key={x.id} className="flex items-center justify-between text-[11px]">
                  <span className="text-deck-muted truncate">{x.kategoria}: {x.nazwa}</span>
                  <span className="tabular text-deck-accent">+{Math.round((kpiRatio(x) - 1) * 100)}%</span>
                </div>
              ))}
              {bottom.map((x) => (
                <div key={x.id} className="flex items-center justify-between text-[11px]">
                  <span className="text-deck-muted truncate">{x.kategoria}: {x.nazwa}</span>
                  <span className="tabular text-deck-danger">{Math.round((kpiRatio(x) - 1) * 100)}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-deck-muted">Brak metryk KPI.</p>
          )}
        </BentoCard>
      </div>
    </div>
  )
}

'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAnalyticsData } from '@/lib/useAnalyticsData'
import { useFilters } from '@/lib/useFilters'
import { applyFilters } from '@/lib/filters'
import { computeOverview } from '@/lib/overview'
import { buildExecutiveInsights, buildStrategicKpis, kpiSummary, kpiRatio } from '@/lib/stats'
import { chartTheme, axisTick, tooltipStyle } from '@/lib/chartTheme'
import { KpiTile } from '@/components/ui/KpiTile'
import { BentoCard } from '@/components/ui/BentoCard'
import { ModuleSkeleton } from '@/components/ui/ModuleSkeleton'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { InsightCard } from '@/components/ui/InsightCard'

export default function OverviewClient() {
  const { rekrutacje, kohorty, kpiMetrics, loading, usingDemo } = useAnalyticsData()
  const { filters } = useFilters()

  if (loading) return <ModuleSkeleton variant="overview" />

  const rekr = applyFilters(rekrutacje, filters)
  const koh = applyFilters(kohorty, filters)
  const m = computeOverview(rekr, koh, [])
  const summary = kpiSummary(kpiMetrics)
  const strategic = buildStrategicKpis(rekr, koh, kpiMetrics)
  const insights = buildExecutiveInsights(rekr, koh, kpiMetrics)
  const health = strategic[0]

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
        <BentoCard title="Strategic cockpit" sub="syntetyczna ocena kondycji organizacji" span={4} className="bg-gradient-to-br from-deck-panel to-deck-bg">
          <div className="grid grid-cols-[180px_1fr] gap-4 items-center">
            <div className="relative h-36 rounded-lg border border-deck-border bg-deck-bg flex items-center justify-center overflow-hidden">
              <div
                className="absolute inset-x-0 bottom-0 bg-deck-accent/20"
                style={{ height: `${health.score}%` }}
              />
              <div className="relative text-center">
                <div className="text-[10px] uppercase tracking-wide text-deck-muted">Health score</div>
                <div className="text-4xl font-semibold tabular-nums text-deck-accent">{health.value}</div>
                <div className="text-[10px] text-deck-muted">{health.trend === 'up' ? 'stabilny wzrost' : health.trend === 'down' ? 'ryzyko spadku' : 'do obserwacji'}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {strategic.slice(1).map((kpi) => (
                <div key={kpi.id} className="rounded-lg border border-deck-border bg-deck-bg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] text-deck-text truncate">{kpi.title}</div>
                    <div className={`text-[11px] tabular-nums ${kpi.score >= 70 ? 'text-deck-accent' : kpi.score < 45 ? 'text-deck-danger' : 'text-deck-warn'}`}>{kpi.value}</div>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-deck-panel overflow-hidden">
                    <div className="h-full bg-deck-accent/70" style={{ width: `${kpi.score}%` }} />
                  </div>
                  <div className="mt-2 text-[10px] text-deck-muted">{kpi.detail}</div>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-[11px] text-deck-muted">{health.recommendation}</p>
        </BentoCard>

        <BentoCard title="NajwaĹĽniejsze wnioski" sub="automatyczna lista dziaĹ‚aĹ„ na podstawie danych" span={4}>
          {insights.length ? (
            <div className="grid grid-cols-3 gap-2">
              {insights.slice(0, 3).map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-deck-muted">Brak pilnych wnioskĂłw przy obecnych filtrach.</p>
          )}
        </BentoCard>

        <KpiTile
          label="Conversion (avg)"
          value={m.avgConversion != null ? <AnimatedNumber value={m.avgConversion} decimals={1} suffix="%" /> : '—'}
          sub="filtrowane edycje"
          accent="accent"
        />
        <KpiTile
          label="Retencja (hist.)"
          value={m.histRetention != null ? <AnimatedNumber value={m.histRetention} decimals={2} suffix=" sem" /> : '—'}
          sub="ukończone kohorty"
          accent="violet"
        />
        <KpiTile
          label={`Przyjęci ${m.lastEdycja ?? ''}`.trim()}
          value={m.lastAccepted != null ? <AnimatedNumber value={m.lastAccepted} /> : '—'}
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

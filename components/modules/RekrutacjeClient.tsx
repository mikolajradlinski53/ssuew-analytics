'use client'
import { ComposedChart, Bar, Line, Area, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useAnalyticsData } from '@/lib/useAnalyticsData'
import { useFilters } from '@/lib/useFilters'
import { applyFilters } from '@/lib/filters'
import { analyzeRekrutacje, linearForecast, mean } from '@/lib/stats'
import { chartTheme, axisTick, tooltipStyle } from '@/lib/chartTheme'
import { BentoCard } from '@/components/ui/BentoCard'
import { KpiTile } from '@/components/ui/KpiTile'
import { ModuleSkeleton } from '@/components/ui/ModuleSkeleton'

export default function RekrutacjeClient() {
  const { rekrutacje, loading } = useAnalyticsData()
  const { filters } = useFilters()
  if (loading) return <ModuleSkeleton variant="rekrutacje" />

  const rekr = applyFilters(rekrutacje, filters)
  if (rekr.length < 2) {
    return (
      <BentoCard title="Rekrutacje">
        <p className="text-[11px] text-deck-muted">Za mało edycji (≥2) dla analiz.</p>
      </BentoCard>
    )
  }

  const s = analyzeRekrutacje(rekr)
  const fc = linearForecast(s.przyj, 2)
  const avgCR = Math.round(mean(s.cr) * 10) / 10
  const lastIdx = s.przyj.length - 1

  const trendData = s.sorted.map((r, i) => ({ edycja: r.edycja, zgłoszenia: s.zglos[i], przyjęci: s.przyj[i], 'CR%': s.cr[i] }))
  const scatterData = s.sorted.map((r, i) => ({ x: s.zglos[i], y: s.przyj[i], label: r.edycja }))
  const fcData: Record<string, number | string | number[]>[] = [
    ...s.sorted.map((r, i) => ({ label: r.edycja, hist: s.przyj[i] })),
    ...fc.map((p, k) => ({ label: `prog.${k + 1}`, yhat: p.yhat, band: [p.lo, p.hi] as number[] })),
  ]

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        <KpiTile label={`Przyjęci ${s.sorted[lastIdx].edycja}`} value={s.przyj[lastIdx]} sub={`z ${s.zglos[lastIdx]} zgłoszeń`} />
        <KpiTile label="Avg CR" value={`${avgCR}%`} sub="wszystkie edycje" accent="accent" />
        <KpiTile label="Prognoza next" value={`~${fc[0].yhat}`} sub={`±${Math.round((fc[0].hi - fc[0].yhat) * 10) / 10}`} accent="violet" />
        <KpiTile label="Korelacja r" value={s.corZglosAccepted.r.toFixed(3)} sub={`R²=${(s.corZglosAccepted.r2 * 100).toFixed(0)}%`} />
      </div>

      <BentoCard title="Zgłoszenia vs przyjęci + CR%" sub="trend per edycja" span={4}>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={trendData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
            <XAxis dataKey="edycja" tick={axisTick} />
            <YAxis yAxisId="l" tick={axisTick} />
            <YAxis yAxisId="r" orientation="right" tick={axisTick} tickFormatter={(v) => `${v}%`} domain={[0, 120]} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="l" dataKey="zgłoszenia" fill={chartTheme.series[2]} radius={[3, 3, 0, 0]} />
            <Bar yAxisId="l" dataKey="przyjęci" fill={chartTheme.accent} radius={[3, 3, 0, 0]} />
            <Line yAxisId="r" dataKey="CR%" stroke={chartTheme.violet} strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </BentoCard>

      <div className="grid grid-cols-2 gap-3">
        <BentoCard
          title="Korelacja zgłoszenia ↔ przyjęci"
          sub={`r = ${s.corZglosAccepted.r.toFixed(3)} · R² = ${(s.corZglosAccepted.r2 * 100).toFixed(0)}% · p ${s.corZglosAccepted.p_approx}`}
        >
          <ResponsiveContainer width="100%" height={180}>
            <ScatterChart margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis type="number" dataKey="x" name="zgłoszenia" tick={axisTick} />
              <YAxis type="number" dataKey="y" name="przyjęci" tick={axisTick} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={scatterData} fill={chartTheme.accent} />
            </ScatterChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-deck-muted mt-2">{s.corZglosAccepted.interpretation}</p>
        </BentoCard>

        <BentoCard
          title="Sezonowość — test t Welcha"
          sub={`t = ${s.sezonowosc.tStat.toFixed(2)} · df ≈ ${s.sezonowosc.df} · p ${s.sezonowosc.p_approx}`}
        >
          <div className="flex gap-3 mb-2">
            <div className="flex-1 bg-deck-bg border border-deck-border rounded-lg p-2 text-center">
              <div className="text-[10px] text-deck-muted">Jesień avg</div>
              <div className="text-lg font-semibold tabular text-deck-accent">{s.sezonowosc.meanA.toFixed(1)}</div>
              <div className="text-[9px] text-deck-muted">SD {s.sezonowosc.sdA.toFixed(1)}</div>
            </div>
            <div className="flex-1 bg-deck-bg border border-deck-border rounded-lg p-2 text-center">
              <div className="text-[10px] text-deck-muted">Wiosna avg</div>
              <div className="text-lg font-semibold tabular text-deck-violet">{s.sezonowosc.meanB.toFixed(1)}</div>
              <div className="text-[9px] text-deck-muted">SD {s.sezonowosc.sdB.toFixed(1)}</div>
            </div>
          </div>
          <p className="text-[11px] text-deck-muted">{s.sezonowosc.interpretation}</p>
        </BentoCard>
      </div>

      <BentoCard title="Prognoza przyjętych" sub="historia + 2 edycje z pasem niepewności" span={4}>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={fcData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
            <XAxis dataKey="label" tick={axisTick} />
            <YAxis tick={axisTick} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area dataKey="band" stroke="none" fill={chartTheme.accent} fillOpacity={0.15} />
            <Line dataKey="hist" stroke={chartTheme.accent} strokeWidth={2} dot={{ r: 3 }} connectNulls />
            <Line dataKey="yhat" stroke={chartTheme.accent} strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3 }} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </BentoCard>
    </div>
  )
}

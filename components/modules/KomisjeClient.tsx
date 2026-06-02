'use client'
import { useState } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useAnalyticsData } from '@/lib/useAnalyticsData'
import { analyzeKomisje, kpiByKomisja } from '@/lib/stats'
import { chartTheme, axisTick, tooltipStyle } from '@/lib/chartTheme'
import { BentoCard } from '@/components/ui/BentoCard'

function zColor(z: number): string {
  if (z > 0.5) return 'text-deck-accent'
  if (z < -1) return 'text-deck-danger'
  if (z < -0.5) return 'text-deck-warn'
  return 'text-deck-muted'
}

export default function KomisjeClient() {
  const { kpiPeriods, loading } = useAnalyticsData()
  const [selected, setSelected] = useState<string | null>(null)
  if (loading) return <p className="text-deck-muted text-sm">Ładowanie…</p>
  if (kpiPeriods.length < 2) {
    return (
      <BentoCard title="Komisje">
        <p className="text-[11px] text-deck-muted">Za mało danych KPI (≥2 okresy) dla z-score.</p>
      </BentoCard>
    )
  }

  const kom = analyzeKomisje(kpiPeriods)
  const byKom = kpiByKomisja(kpiPeriods)
  const ranking = [...kom.withZ].sort((a, b) => b.z - a.z)
  const barData = kom.withZ.map((c) => ({
    kod: c.komisja?.kod ?? c.komisja_id,
    planowane: c.projekty_planowane,
    zrealizowane: c.projekty_zrealizowane,
  }))
  const semesters = Array.from(new Set(kpiPeriods.map((p) => p.semestr)))
  const komKody = kom.withZ.map((c) => c.komisja?.kod ?? c.komisja_id)
  const trendData = semesters.map((sem) => {
    const row: Record<string, string | number> = { semestr: sem }
    for (const periods of byKom.values()) {
      const p = periods.find((x) => x.semestr === sem)
      if (p && p.projekty_planowane > 0) {
        const kod = p.komisja?.kod ?? p.komisja_id
        row[kod] = Math.round((p.projekty_zrealizowane / p.projekty_planowane) * 100)
      }
    }
    return row
  })

  const selectedPeriods = selected ? byKom.get(selected) ?? [] : []
  const selectedKom = ranking.find((c) => c.komisja_id === selected)

  return (
    <div className="space-y-3">
      <BentoCard title="Ranking realizacji KPI (z-score)" sub="względem normy organizacyjnej" span={4}>
        <div className="space-y-1">
          {ranking.map((c) => (
            <button
              key={c.komisja_id}
              onClick={() => setSelected(c.komisja_id)}
              className={`w-full flex items-center gap-3 text-left px-2 py-1.5 rounded-md border ${selected === c.komisja_id ? 'border-deck-accent/40 bg-deck-accent/5' : 'border-deck-border'}`}
            >
              <span className={`text-sm font-semibold tabular w-12 ${zColor(c.z)}`}>{c.z > 0 ? '+' : ''}{c.z.toFixed(1)}</span>
              <span className="text-[11px] text-deck-text w-24">{c.komisja?.kod ?? c.komisja_id}</span>
              <span className="text-[11px] text-deck-muted flex-1 truncate">{c.komisja?.nazwa ?? ''}</span>
              <span className="text-[11px] text-deck-muted tabular">{c.realizacjaPct}%</span>
            </button>
          ))}
        </div>
      </BentoCard>

      <div className="grid grid-cols-2 gap-3">
        <BentoCard title="Planowane vs zrealizowane" sub="projekty per komisja">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="kod" tick={axisTick} />
              <YAxis tick={axisTick} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="planowane" fill={chartTheme.series[2]} radius={[3, 3, 0, 0]} />
              <Bar dataKey="zrealizowane" fill={chartTheme.accent} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </BentoCard>

        <BentoCard title="Szczegóły komisji" sub={selectedKom ? (selectedKom.komisja?.nazwa ?? selectedKom.komisja_id) : 'kliknij komisję w rankingu'}>
          {selected ? (
            <div className="space-y-2">
              {selectedPeriods.map((p) => (
                <div key={p.id} className="text-[11px] border-b border-deck-border pb-1">
                  <span className="text-deck-text">{p.semestr}: </span>
                  <span className="tabular text-deck-accent">{p.projekty_zrealizowane}/{p.projekty_planowane}</span>
                  <span className="text-deck-muted"> ({Math.round((p.projekty_zrealizowane / p.projekty_planowane) * 100)}%)</span>
                  {p.notatka && <div className="text-deck-muted italic">{p.notatka}</div>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-deck-muted">Wybierz komisję z rankingu, by zobaczyć jej historię KPI.</p>
          )}
        </BentoCard>
      </div>

      <BentoCard title="Trend realizacji w czasie" sub="% realizacji per komisja po semestrach" span={4}>
        {semesters.length > 1 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="semestr" tick={axisTick} />
              <YAxis tick={axisTick} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {komKody.map((kod, i) => (
                <Line key={kod} type="monotone" dataKey={kod} stroke={chartTheme.series[i % chartTheme.series.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-[11px] text-deck-warn">Mała próba ({semesters.length} semestr) — trend wypełni się po kolejnych semestrach.</p>
        )}
      </BentoCard>
    </div>
  )
}

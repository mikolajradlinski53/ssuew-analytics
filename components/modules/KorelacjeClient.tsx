'use client'
import { useState } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAnalyticsData } from '@/lib/useAnalyticsData'
import { useFilters } from '@/lib/useFilters'
import { applyFilters } from '@/lib/filters'
import { correlationMatrix, orgKpiByEdition, zScores } from '@/lib/stats'
import { chartTheme, axisTick, tooltipStyle } from '@/lib/chartTheme'
import { BentoCard } from '@/components/ui/BentoCard'
import { Heatmap } from '@/components/ui/Heatmap'

const MAIN_VARS = ['zgłoszenia', 'przyjęci', 'CR%', 'liczebność', 'avg retencja', 'max retencja', 'KPI%']
const KPI_VARS = ['planowane', 'zrealizowane', 'realizacja%', 'z-score']

export default function KorelacjeClient() {
  const { rekrutacje, kohorty, kpiPeriods, loading } = useAnalyticsData()
  const { filters } = useFilters()
  const [pair, setPair] = useState<{ a: string; b: string } | null>(null)

  if (loading) return <p className="text-deck-muted text-sm">Ładowanie…</p>

  const rekr = applyFilters(rekrutacje, filters)
  const kohByEd = new Map(applyFilters(kohorty, filters).map((k) => [k.edycja, k]))
  const kpiMap = orgKpiByEdition(kpiPeriods)

  const mainRows: Record<string, number | null>[] = rekr.map((r) => {
    const k = kohByEd.get(r.edycja)
    return {
      'zgłoszenia': r.zgloszenia,
      'przyjęci': r.przyjeci,
      'CR%': r.zgloszenia > 0 ? (r.przyjeci / r.zgloszenia) * 100 : null,
      'liczebność': k?.n_czlonkow ?? null,
      'avg retencja': k?.avg_retention_sem ?? null,
      'max retencja': k?.max_retention_sem ?? null,
      'KPI%': kpiMap.get(`${r.sezon}-${r.rok}`) ?? null,
    }
  })
  const mainCells = correlationMatrix(mainRows, MAIN_VARS)

  const realizacje = kpiPeriods
    .filter((p) => p.projekty_planowane > 0)
    .map((p) => (p.projekty_zrealizowane / p.projekty_planowane) * 100)
  const zs = realizacje.length ? zScores(realizacje) : []
  const kpiRows: Record<string, number | null>[] = kpiPeriods
    .filter((p) => p.projekty_planowane > 0)
    .map((p, i) => ({
      'planowane': p.projekty_planowane,
      'zrealizowane': p.projekty_zrealizowane,
      'realizacja%': realizacje[i],
      'z-score': zs[i],
    }))
  const kpiCells = correlationMatrix(kpiRows, KPI_VARS)

  const scatterData =
    pair && pair.a !== pair.b
      ? mainRows
          .filter((row) => row[pair.a] != null && row[pair.b] != null)
          .map((row) => ({ x: row[pair.a] as number, y: row[pair.b] as number }))
      : []

  return (
    <div className="space-y-3">
      <div className="text-[11px] text-deck-warn border border-deck-warn/40 rounded-md px-2 py-1 inline-block">
        KPI% liczone z niewielu okresów — korelacje orientacyjne, nabiorą sensu po zebraniu kolejnych semestrów
      </div>

      <BentoCard title="Macierz korelacji — rekrutacje × retencja × KPI" sub="kliknij komórkę, by zobaczyć wykres rozrzutu" span={4}>
        <Heatmap vars={MAIN_VARS} cells={mainCells} onSelect={(a, b) => setPair({ a, b })} />
      </BentoCard>

      {pair && pair.a !== pair.b && (
        <BentoCard title={`Rozrzut: ${pair.a} ↔ ${pair.b}`} span={2}>
          {scatterData.length >= 3 ? (
            <ResponsiveContainer width="100%" height={200}>
              <ScatterChart margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis type="number" dataKey="x" name={pair.a} tick={axisTick} />
                <YAxis type="number" dataKey="y" name={pair.b} tick={axisTick} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={scatterData} fill={chartTheme.accent} />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[11px] text-deck-muted">Za mało wspólnych obserwacji dla tej pary.</p>
          )}
        </BentoCard>
      )}

      <BentoCard title="Korelacje wewnątrz KPI komisji" sub="komisja × semestr" span={4}>
        {kpiRows.length >= 3 ? (
          <Heatmap vars={KPI_VARS} cells={kpiCells} />
        ) : (
          <p className="text-[11px] text-deck-muted">Za mało danych KPI (potrzeba ≥3 wierszy komisja×semestr).</p>
        )}
      </BentoCard>
    </div>
  )
}

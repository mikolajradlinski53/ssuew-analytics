'use client'
import { useState } from 'react'
import { useAnalyticsData } from '@/lib/useAnalyticsData'
import { isConfigured } from '@/lib/supabase/config'
import { buildStrategicKpis, kpiRatio, kpiByKategoria, kpiSummary } from '@/lib/stats'
import { BentoCard } from '@/components/ui/BentoCard'
import { KpiTile } from '@/components/ui/KpiTile'
import { ModuleSkeleton } from '@/components/ui/ModuleSkeleton'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { EditableCell } from '@/components/ui/EditableCell'

function ratioColor(r: number): string {
  if (r >= 1) return 'text-deck-accent'
  if (r >= 0.8) return 'text-deck-warn'
  return 'text-deck-danger'
}

const inp = 'bg-deck-bg border border-deck-border rounded-md px-2 py-1 text-[11px] text-deck-text'
const KATEGORIE = ['SKS', 'Wydarzenia', 'Ankieta', 'Koordynatorzy', 'Retencja', 'Pipeline', 'Zaangażowanie', 'Parytet']

export default function KpiClient() {
  const { rekrutacje, kohorty, kpiMetrics, loading, addKpiMetric, updateKpiMetric } = useAnalyticsData()
  const [nowa, setNowa] = useState({ kategoria: '', nazwa: '', poprz: '', biez: '' })
  const [err, setErr] = useState<string | null>(null)

  if (loading) return <ModuleSkeleton variant="kpi" />

  const editable = isConfigured
  const okresP = kpiMetrics[0]?.okres_poprzedni ?? '2024/2025'
  const okresB = kpiMetrics[0]?.okres_biezacy ?? '2025/2026'

  const addMetric = () => {
    setErr(null)
    if (!nowa.kategoria.trim() || !nowa.nazwa.trim() || !nowa.poprz || !nowa.biez) return
    addKpiMetric({
      kategoria: nowa.kategoria.trim(),
      nazwa: nowa.nazwa.trim(),
      okres_poprzedni: okresP,
      wartosc_poprzednia: parseFloat(nowa.poprz),
      okres_biezacy: okresB,
      wartosc_biezaca: parseFloat(nowa.biez),
    })
      .then(() => setNowa({ kategoria: '', nazwa: '', poprz: '', biez: '' }))
      .catch((e) => setErr(String(e)))
  }

  const addForm = editable ? (
    <BentoCard title="Dodaj metrykę / projekt" sub={`okres ${okresP} → ${okresB}`} span={4}>
      <div className="flex items-center gap-2 flex-wrap">
        <input list="kpi-kat" className={`w-32 ${inp}`} placeholder="kategoria" value={nowa.kategoria} onChange={(e) => setNowa((p) => ({ ...p, kategoria: e.target.value }))} />
        <datalist id="kpi-kat">{KATEGORIE.map((k) => <option key={k} value={k} />)}</datalist>
        <input className={`w-44 ${inp}`} placeholder="nazwa (np. Kwiecień / Gala)" value={nowa.nazwa} onChange={(e) => setNowa((p) => ({ ...p, nazwa: e.target.value }))} />
        <input type="number" className={`w-20 ${inp}`} placeholder="zeszły rok" value={nowa.poprz} onChange={(e) => setNowa((p) => ({ ...p, poprz: e.target.value }))} />
        <span className="text-deck-muted text-[11px]">→</span>
        <input type="number" className={`w-20 ${inp}`} placeholder="ten rok" value={nowa.biez} onChange={(e) => setNowa((p) => ({ ...p, biez: e.target.value }))} />
        <button onClick={addMetric} disabled={!nowa.kategoria.trim() || !nowa.nazwa.trim() || !nowa.poprz || !nowa.biez} className="text-[11px] px-3 py-1 rounded-md border border-deck-accent/40 text-deck-accent disabled:opacity-40">
          + dodaj
        </button>
      </div>
      {err && <p className="text-[11px] text-deck-danger mt-2">{err}</p>}
    </BentoCard>
  ) : null

  if (!kpiMetrics.length) {
    return (
      <div className="space-y-3">
        <BentoCard title="KPI">
          <p className="text-[11px] text-deck-muted">Brak metryk KPI{editable ? ' — dodaj pierwszą poniżej.' : '.'}</p>
        </BentoCard>
        {addForm}
      </div>
    )
  }

  const summary = kpiSummary(kpiMetrics)
  const grouped = kpiByKategoria(kpiMetrics)
  const strategic = buildStrategicKpis(rekrutacje, kohorty, kpiMetrics)

  return (
    <div className="space-y-3">
      <div className="text-[11px] text-deck-muted">
        Wskaźniki rok-do-roku (zeszłoroczna → tegoroczna). {editable ? 'Kliknij wartość, by edytować.' : 'Tryb demo — read-only.'}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <KpiTile label="Metryki rosnące" value={<AnimatedNumber value={summary.up} />} sub="rok do roku" accent="accent" />
        <KpiTile label="Metryki spadające" value={<AnimatedNumber value={summary.down} />} sub="rok do roku" accent="violet" />
        <KpiTile label="Średni ratio" value={<AnimatedNumber value={Math.round(summary.avgRatio * 100)} suffix="%" />} sub="r/r" />
      </div>

      <BentoCard title="KPI strategiczne" sub="nowe wskaźniki dla pracy Zarządu" span={4}>
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
                  <span className="tabular text-deck-muted w-24 flex items-center justify-end gap-1">
                    <EditableCell value={m.wartosc_poprzednia} editable={editable} onCommit={(v) => updateKpiMetric(m.id, { wartosc_poprzednia: v })} className="w-10" />
                    <span>→</span>
                    <EditableCell value={m.wartosc_biezaca} editable={editable} onCommit={(v) => updateKpiMetric(m.id, { wartosc_biezaca: v })} className="w-10" />
                  </span>
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

      {addForm}
    </div>
  )
}

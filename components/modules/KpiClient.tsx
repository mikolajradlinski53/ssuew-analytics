'use client'
import { useState } from 'react'
import { ArrowRight, Plus, Sparkles, TrendingDown, TrendingUp } from 'lucide-react'
import { useAnalyticsData } from '@/lib/useAnalyticsData'
import { useAuth } from '@/lib/auth/useAuth'
import { buildStrategicKpis, kpiRatio, kpiByKategoria, kpiSummary } from '@/lib/stats'
import { BentoCard } from '@/components/ui/BentoCard'
import { KpiTile } from '@/components/ui/KpiTile'
import { ModuleSkeleton } from '@/components/ui/ModuleSkeleton'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { EditableCell } from '@/components/ui/EditableCell'

function ratioColor(ratio: number): string {
  if (ratio >= 1) return 'text-deck-accent'
  if (ratio >= 0.8) return 'text-deck-warn'
  return 'text-deck-danger'
}

function ratioIcon(ratio: number) {
  return ratio >= 1 ? <TrendingUp size={14} /> : <TrendingDown size={14} />
}

const inputClass = 'deck-input rounded-md px-2 py-1 text-[11px]'
const KATEGORIE = ['SKS', 'Wydarzenia', 'Ankieta', 'Koordynatorzy', 'Retencja', 'Pipeline', 'Zaangażowanie', 'Parytet']

export default function KpiClient() {
  const { rekrutacje, kohorty, kpiMetrics, loading, addKpiMetric, updateKpiMetric } = useAnalyticsData()
  const [nowa, setNowa] = useState({ kategoria: '', nazwa: '', poprz: '', biez: '' })
  const [err, setErr] = useState<string | null>(null)

  const { rola } = useAuth()

  if (loading) return <ModuleSkeleton variant="kpi" />

  const editable = rola === 'owner'
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
    <BentoCard title="Dodaj metrykę / projekt" sub={`okres ${okresP} -> ${okresB}`} span={4}>
      <div className="flex items-center gap-2 flex-wrap">
        <input list="kpi-kat" className={`w-36 ${inputClass}`} placeholder="kategoria" value={nowa.kategoria} onChange={(e) => setNowa((p) => ({ ...p, kategoria: e.target.value }))} />
        <datalist id="kpi-kat">{KATEGORIE.map((k) => <option key={k} value={k} />)}</datalist>
        <input className={`w-52 ${inputClass}`} placeholder="nazwa (np. Kwiecień / Gala)" value={nowa.nazwa} onChange={(e) => setNowa((p) => ({ ...p, nazwa: e.target.value }))} />
        <input type="number" className={`w-24 ${inputClass}`} placeholder="zeszły rok" value={nowa.poprz} onChange={(e) => setNowa((p) => ({ ...p, poprz: e.target.value }))} />
        <ArrowRight size={14} className="text-deck-muted" />
        <input type="number" className={`w-24 ${inputClass}`} placeholder="ten rok" value={nowa.biez} onChange={(e) => setNowa((p) => ({ ...p, biez: e.target.value }))} />
        <button
          type="button"
          onClick={addMetric}
          disabled={!nowa.kategoria.trim() || !nowa.nazwa.trim() || !nowa.poprz || !nowa.biez}
          className="deck-button inline-flex items-center gap-2 rounded-md px-3 py-1 text-[11px] font-semibold disabled:opacity-40"
        >
          <Plus size={13} />
          dodaj
        </button>
      </div>
      {err && <p className="text-[11px] text-deck-danger mt-2">{err}</p>}
    </BentoCard>
  ) : null

  if (!kpiMetrics.length) {
    return (
      <div className="space-y-3">
        <BentoCard title="KPI">
          <p className="text-[11px] text-deck-muted">Brak metryk KPI{editable ? ' - dodaj pierwszą poniżej.' : '.'}</p>
        </BentoCard>
        {addForm}
      </div>
    )
  }

  const summary = kpiSummary(kpiMetrics)
  const grouped = kpiByKategoria(kpiMetrics)
  const strategic = buildStrategicKpis(rekrutacje, kohorty, kpiMetrics)
  const total = summary.up + summary.down
  const growthPct = total ? Math.round((summary.up / total) * 100) : 0

  return (
    <div className="space-y-4">
      <BentoCard span={4} className="deck-scan">
        <div className="flex items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-deck-accent/30 bg-deck-accent/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-deck-accent">
              <Sparkles size={13} />
              KPI intelligence
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-deck-text">Metryki rok-do-roku, ale z pulsem.</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-deck-muted">
              Każdy wskaźnik pokazuje zmianę między okresami. {editable ? 'Kliknij liczbę, aby edytować.' : 'Tryb demo jest read-only.'}
            </p>
          </div>
          <div className="relative grid h-32 w-32 place-items-center rounded-full border border-deck-accent/25 bg-deck-accent/8">
            <div
              className="absolute inset-2 rounded-full"
              style={{ background: `conic-gradient(#2EE6A6 ${growthPct * 3.6}deg, rgba(255,255,255,0.08) 0deg)` }}
            />
            <div className="relative grid h-24 w-24 place-items-center rounded-full bg-deck-bg-deep/95">
              <div className="text-center">
                <div className="text-3xl font-semibold text-deck-accent">{growthPct}%</div>
                <div className="text-[10px] text-deck-muted">rosnących</div>
              </div>
            </div>
          </div>
        </div>
      </BentoCard>

      <div className="grid grid-cols-3 gap-3">
        <KpiTile label="Metryki rosnące" value={<AnimatedNumber value={summary.up} />} sub="rok do roku" accent="accent" />
        <KpiTile label="Metryki spadające" value={<AnimatedNumber value={summary.down} />} sub="rok do roku" accent="violet" />
        <KpiTile label="Średni ratio" value={<AnimatedNumber value={Math.round(summary.avgRatio * 100)} suffix="%" />} sub="r/r" />
      </div>

      <BentoCard title="KPI strategiczne" sub="syntetyczne wskaźniki dla pracy Zarządu" span={4}>
        <div className="grid grid-cols-2 gap-3">
          {strategic.map((kpi) => (
            <div key={kpi.id} className="deck-row rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-deck-text">{kpi.title}</div>
                  <div className="text-[11px] text-deck-muted mt-1 leading-5">{kpi.detail}</div>
                </div>
                <div className={`text-xl font-semibold tabular-nums ${kpi.score >= 70 ? 'text-deck-accent' : kpi.score < 45 ? 'text-deck-danger' : 'text-deck-warn'}`}>{kpi.value}</div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-deck-bg-deep/70 overflow-hidden">
                <div className="deck-meter-fill h-full rounded-full bg-gradient-to-r from-deck-accent to-deck-warn" style={{ width: `${kpi.score}%` }} />
              </div>
              <div className="mt-3 text-[11px] text-deck-muted italic">{kpi.recommendation}</div>
            </div>
          ))}
        </div>
      </BentoCard>

      {[...grouped.entries()].map(([kat, metrics]) => (
        <BentoCard key={kat} title={kat} sub={`${metrics.length} metryk · ${metrics[0].okres_poprzedni} -> ${metrics[0].okres_biezacy}`} span={4}>
          <div className="space-y-2">
            {metrics.map((m, index) => {
              const ratio = kpiRatio(m)
              return (
                <div key={m.id} className="deck-row deck-pop grid grid-cols-[160px_130px_1fr_72px] items-center gap-3 rounded-lg px-3 py-2 text-[11px]" style={{ animationDelay: `${index * 35}ms` }}>
                  <span className="truncate font-medium text-deck-text">{m.nazwa}</span>
                  <span className="tabular text-deck-muted flex items-center justify-end gap-1">
                    <EditableCell value={m.wartosc_poprzednia} editable={editable} onCommit={(v) => updateKpiMetric(m.id, { wartosc_poprzednia: v })} className="w-10" />
                    <ArrowRight size={12} />
                    <EditableCell value={m.wartosc_biezaca} editable={editable} onCommit={(v) => updateKpiMetric(m.id, { wartosc_biezaca: v })} className="w-10" />
                  </span>
                  <div className="h-2.5 rounded-full bg-deck-bg-deep/70 overflow-hidden border border-white/10">
                    <div
                      className={`deck-meter-fill h-full rounded-full ${ratio >= 1 ? 'bg-gradient-to-r from-deck-accent to-deck-warn' : 'bg-gradient-to-r from-deck-danger to-deck-warn'}`}
                      style={{ width: `${Math.min(100, Math.max(8, ratio * 50))}%` }}
                    />
                  </div>
                  <span className={`inline-flex items-center justify-end gap-1 tabular font-semibold ${ratioColor(ratio)}`}>
                    {ratioIcon(ratio)}
                    {ratio > 0 ? `${Math.round(ratio * 100)}%` : '-'}
                  </span>
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

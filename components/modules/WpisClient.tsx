'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAnalyticsData } from '@/lib/useAnalyticsData'
import { createClient } from '@/lib/supabase/client'
import { isConfigured } from '@/lib/supabase/config'
import { nextOkres } from '@/lib/period'
import { kpiByKategoria } from '@/lib/stats'
import { BentoCard } from '@/components/ui/BentoCard'
import { ModuleSkeleton } from '@/components/ui/ModuleSkeleton'

type Tab = 'rekrutacja' | 'kohorta' | 'kpi' | 'rocznik'
const inputCls = 'w-full bg-deck-bg border border-deck-border rounded-md px-3 py-2 text-sm text-deck-text'
const labelCls = 'block text-[11px] text-deck-muted mb-1'
const btnCls = 'w-full bg-deck-accent text-deck-bg-deep rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-50'

export default function WpisClient() {
  const { kpiMetrics, addRekrutacja, addKohorta, addKpiMetric, addKpiMetricsBulk } = useAnalyticsData()
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [tab, setTab] = useState<Tab>('rekrutacja')
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isConfigured) {
      setAuthed(false)
      return
    }
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s?.user))
    return () => sub.subscription.unsubscribe()
  }, [])

  const [rekr, setRekr] = useState({ edycja: '', sezon: 'jesien' as 'jesien' | 'wiosna', rok: new Date().getFullYear(), zgloszenia: '', przyjeci: '' })
  const [koh, setKoh] = useState({ edycja: '', sezon: 'jesien' as 'jesien' | 'wiosna', rok: new Date().getFullYear(), n: '', avg: '', max: '', inProgress: false })
  const [kpi, setKpi] = useState({ kategoria: 'SKS', nazwa: '', okres_poprzedni: '2024/2025', wartosc_poprzednia: '', okres_biezacy: '2025/2026', wartosc_biezaca: '' })

  // Rocznik KPI (wsadowo): nowy okres + wartości per istniejąca metryka
  const latestOkres = useMemo(() => kpiMetrics[0]?.okres_biezacy ?? '2025/2026', [kpiMetrics])
  const grouped = useMemo(() => kpiByKategoria(kpiMetrics), [kpiMetrics])
  const [rocznikOkres, setRocznikOkres] = useState('')
  const [rocznikVals, setRocznikVals] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!rocznikOkres) setRocznikOkres(nextOkres(latestOkres))
  }, [latestOkres, rocznikOkres])

  if (authed === null) return <ModuleSkeleton />
  if (!authed) {
    return (
      <BentoCard title="Wpisz dane">
        <p className="text-[11px] text-deck-muted">
          Zaloguj się, by wpisywać dane. <Link href="/login" className="text-deck-accent">Zaloguj →</Link>
        </p>
      </BentoCard>
    )
  }

  async function run(fn: () => Promise<void>, okMsg: string) {
    setBusy(true)
    setStatus(null)
    try {
      await fn()
      setStatus({ ok: true, msg: okMsg })
    } catch (e) {
      setStatus({ ok: false, msg: e instanceof Error ? e.message : 'Błąd zapisu' })
    } finally {
      setBusy(false)
    }
  }

  const submitRekr = () =>
    run(async () => {
      await addRekrutacja({ edycja: rekr.edycja, sezon: rekr.sezon, rok: rekr.rok, zgloszenia: parseInt(rekr.zgloszenia), przyjeci: parseInt(rekr.przyjeci) })
      setRekr({ edycja: '', sezon: 'jesien', rok: new Date().getFullYear(), zgloszenia: '', przyjeci: '' })
    }, `Rekrutacja ${rekr.edycja} zapisana.`)

  const submitKoh = () =>
    run(async () => {
      await addKohorta({ edycja: koh.edycja, sezon: koh.sezon, rok: koh.rok, n_czlonkow: parseInt(koh.n), avg_retention_sem: parseFloat(koh.avg), max_retention_sem: parseInt(koh.max), in_progress: koh.inProgress })
      setKoh({ edycja: '', sezon: 'jesien', rok: new Date().getFullYear(), n: '', avg: '', max: '', inProgress: false })
    }, `Kohorta ${koh.edycja} zapisana.`)

  const submitKpi = () =>
    run(async () => {
      await addKpiMetric({ kategoria: kpi.kategoria, nazwa: kpi.nazwa, okres_poprzedni: kpi.okres_poprzedni, wartosc_poprzednia: parseFloat(kpi.wartosc_poprzednia), okres_biezacy: kpi.okres_biezacy, wartosc_biezaca: parseFloat(kpi.wartosc_biezaca) })
      setKpi({ kategoria: 'SKS', nazwa: '', okres_poprzedni: '2024/2025', wartosc_poprzednia: '', okres_biezacy: '2025/2026', wartosc_biezaca: '' })
    }, `Metryka KPI „${kpi.nazwa}" zapisana.`)

  const submitRocznik = () => {
    const payloads = kpiMetrics
      .filter((m) => rocznikVals[m.id]?.trim())
      .map((m) => ({
        kategoria: m.kategoria,
        nazwa: m.nazwa,
        okres_poprzedni: m.okres_biezacy,
        wartosc_poprzednia: m.wartosc_biezaca,
        okres_biezacy: rocznikOkres,
        wartosc_biezaca: parseFloat(rocznikVals[m.id]),
      }))
    run(async () => {
      if (!payloads.length) throw new Error('Wpisz przynajmniej jedną wartość.')
      await addKpiMetricsBulk(payloads)
      setRocznikVals({})
    }, `Zapisano rocznik ${rocznikOkres} (${payloads.length} metryk).`)
  }

  return (
    <div className="max-w-2xl space-y-3">
      <div className="flex gap-2 flex-wrap">
        {(['rekrutacja', 'kohorta', 'kpi', 'rocznik'] as Tab[]).map((t) => (
          <button key={t} onClick={() => { setTab(t); setStatus(null) }}
            className={`text-[11px] px-3 py-1 rounded-md border ${tab === t ? 'bg-deck-accent/10 text-deck-accent border-deck-accent/40' : 'text-deck-muted border-deck-border'}`}>
            {t === 'rekrutacja' ? 'Rekrutacja' : t === 'kohorta' ? 'Kohorta' : t === 'kpi' ? 'Metryka KPI' : 'Rocznik KPI'}
          </button>
        ))}
      </div>

      <div className="text-[11px] text-deck-muted bg-deck-panel border border-deck-border rounded-md px-3 py-2 leading-relaxed">
        {tab === 'rekrutacja' && 'Wyniki rekrutacji: edycja (np. J’26), zgłoszenia, przyjęci. Trafią do modułu Rekrutacje, Lejek i Prognozy.'}
        {tab === 'kohorta' && 'Kohorta: liczebność i retencja (avg/max). Zasili moduł Retencja i krzywe przeżycia.'}
        {tab === 'kpi' && 'Pojedyncza metryka KPI rok-do-roku: kategoria, nazwa, wartość zeszłoroczna i tegoroczna (np. SKS / Listopad / 57 → 84).'}
        {tab === 'rocznik' && 'Najszybszy sposób na nowy rok: wpisz tegoroczne liczby obok istniejących metryk (poprzednie przenoszą się automatycznie) i zapisz wszystkie naraz.'}
        {' '}Wypełnij i kliknij „Zapisz" — zmiany od razu widać w modułach.
      </div>

      {status && (
        <div className={`text-[11px] px-3 py-2 rounded-md border ${status.ok ? 'border-deck-accent/40 text-deck-accent' : 'border-deck-danger-border text-deck-danger'}`}>
          {status.msg}
        </div>
      )}

      {tab === 'rekrutacja' && (
        <BentoCard title="Dodaj rekrutację">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Edycja</label><input className={inputCls} placeholder="J'26" value={rekr.edycja} onChange={(e) => setRekr((p) => ({ ...p, edycja: e.target.value }))} /></div>
              <div><label className={labelCls}>Sezon</label>
                <select className={inputCls} value={rekr.sezon} onChange={(e) => setRekr((p) => ({ ...p, sezon: e.target.value as 'jesien' | 'wiosna' }))}><option value="jesien">Jesień</option><option value="wiosna">Wiosna</option></select>
              </div>
            </div>
            <div><label className={labelCls}>Rok</label><input type="number" className={inputCls} value={rekr.rok} onChange={(e) => setRekr((p) => ({ ...p, rok: parseInt(e.target.value) }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Zgłoszenia</label><input type="number" className={inputCls} value={rekr.zgloszenia} onChange={(e) => setRekr((p) => ({ ...p, zgloszenia: e.target.value }))} /></div>
              <div><label className={labelCls}>Przyjęci</label><input type="number" className={inputCls} value={rekr.przyjeci} onChange={(e) => setRekr((p) => ({ ...p, przyjeci: e.target.value }))} /></div>
            </div>
            <button onClick={submitRekr} disabled={busy} className={btnCls}>{busy ? 'Zapisywanie…' : 'Zapisz rekrutację'}</button>
          </div>
        </BentoCard>
      )}

      {tab === 'kohorta' && (
        <BentoCard title="Dodaj kohortę">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Edycja</label><input className={inputCls} placeholder="J'26" value={koh.edycja} onChange={(e) => setKoh((p) => ({ ...p, edycja: e.target.value }))} /></div>
              <div><label className={labelCls}>Sezon</label>
                <select className={inputCls} value={koh.sezon} onChange={(e) => setKoh((p) => ({ ...p, sezon: e.target.value as 'jesien' | 'wiosna' }))}><option value="jesien">Jesień</option><option value="wiosna">Wiosna</option></select>
              </div>
            </div>
            <div><label className={labelCls}>Rok</label><input type="number" className={inputCls} value={koh.rok} onChange={(e) => setKoh((p) => ({ ...p, rok: parseInt(e.target.value) }))} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className={labelCls}>Liczebność</label><input type="number" className={inputCls} value={koh.n} onChange={(e) => setKoh((p) => ({ ...p, n: e.target.value }))} /></div>
              <div><label className={labelCls}>Avg retencja</label><input type="number" step="0.01" className={inputCls} value={koh.avg} onChange={(e) => setKoh((p) => ({ ...p, avg: e.target.value }))} /></div>
              <div><label className={labelCls}>Max retencja</label><input type="number" className={inputCls} value={koh.max} onChange={(e) => setKoh((p) => ({ ...p, max: e.target.value }))} /></div>
            </div>
            <label className="flex items-center gap-2 text-[11px] text-deck-muted">
              <input type="checkbox" checked={koh.inProgress} onChange={(e) => setKoh((p) => ({ ...p, inProgress: e.target.checked }))} /> kohorta w toku (in_progress)
            </label>
            <button onClick={submitKoh} disabled={busy} className={btnCls}>{busy ? 'Zapisywanie…' : 'Zapisz kohortę'}</button>
          </div>
        </BentoCard>
      )}

      {tab === 'kpi' && (
        <BentoCard title="Dodaj metrykę KPI (rok-do-roku)">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Kategoria</label>
                <input list="kpi-kategorie" className={inputCls} value={kpi.kategoria} onChange={(e) => setKpi((p) => ({ ...p, kategoria: e.target.value }))} placeholder="np. SKS / Retencja" />
                <datalist id="kpi-kategorie">
                  <option value="SKS" /><option value="Wydarzenia" /><option value="Ankieta" /><option value="Koordynatorzy" />
                  <option value="Retencja" /><option value="Pipeline" /><option value="Zaangażowanie" /><option value="Parytet" />
                </datalist>
              </div>
              <div><label className={labelCls}>Nazwa</label><input className={inputCls} placeholder="np. Listopad / Wigilia" value={kpi.nazwa} onChange={(e) => setKpi((p) => ({ ...p, nazwa: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Okres poprzedni</label><input className={inputCls} value={kpi.okres_poprzedni} onChange={(e) => setKpi((p) => ({ ...p, okres_poprzedni: e.target.value }))} /></div>
              <div><label className={labelCls}>Wartość poprzednia</label><input type="number" step="0.01" className={inputCls} value={kpi.wartosc_poprzednia} onChange={(e) => setKpi((p) => ({ ...p, wartosc_poprzednia: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Okres bieżący</label><input className={inputCls} value={kpi.okres_biezacy} onChange={(e) => setKpi((p) => ({ ...p, okres_biezacy: e.target.value }))} /></div>
              <div><label className={labelCls}>Wartość bieżąca</label><input type="number" step="0.01" className={inputCls} value={kpi.wartosc_biezaca} onChange={(e) => setKpi((p) => ({ ...p, wartosc_biezaca: e.target.value }))} /></div>
            </div>
            <button onClick={submitKpi} disabled={busy || !kpi.nazwa} className={btnCls}>{busy ? 'Zapisywanie…' : 'Zapisz metrykę'}</button>
          </div>
        </BentoCard>
      )}

      {tab === 'rocznik' && (
        <BentoCard title="Nowy rocznik KPI" sub="wpisz tegoroczne wartości — poprzednie przeniesione automatycznie">
          <div className="space-y-3">
            <div className="flex items-end gap-3">
              <div className="w-40"><label className={labelCls}>Nowy okres</label><input className={inputCls} value={rocznikOkres} onChange={(e) => setRocznikOkres(e.target.value)} /></div>
              <p className="text-[10px] text-deck-muted pb-2">przenosimy z: {latestOkres}</p>
            </div>
            {kpiMetrics.length === 0 ? (
              <p className="text-[11px] text-deck-muted">Brak istniejących metryk do przeniesienia.</p>
            ) : (
              [...grouped.entries()].map(([kat, metrics]) => (
                <div key={kat}>
                  <div className="text-[11px] text-deck-text font-medium mb-1">{kat}</div>
                  <div className="space-y-1">
                    {metrics.map((m) => (
                      <div key={m.id} className="flex items-center gap-2 text-[11px]">
                        <span className="text-deck-muted flex-1 truncate">{m.nazwa}</span>
                        <span className="text-deck-muted tabular w-16 text-right">{m.wartosc_biezaca} →</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="nowa"
                          className="w-24 bg-deck-bg border border-deck-border rounded-md px-2 py-1 text-[11px] text-deck-text"
                          value={rocznikVals[m.id] ?? ''}
                          onChange={(e) => setRocznikVals((v) => ({ ...v, [m.id]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
            <button onClick={submitRocznik} disabled={busy} className={btnCls}>{busy ? 'Zapisywanie…' : `Zapisz rocznik ${rocznikOkres}`}</button>
          </div>
        </BentoCard>
      )}
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAnalyticsData } from '@/lib/useAnalyticsData'
import { createClient } from '@/lib/supabase/client'
import { isConfigured } from '@/lib/supabase/config'
import { BentoCard } from '@/components/ui/BentoCard'

type Tab = 'rekrutacja' | 'kohorta' | 'kpi'
const inputCls = 'w-full bg-deck-bg border border-deck-border rounded-md px-3 py-2 text-sm text-deck-text'
const labelCls = 'block text-[11px] text-deck-muted mb-1'
const btnCls = 'w-full bg-deck-accent text-deck-bg-deep rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-50'

export default function WpisClient() {
  const { addRekrutacja, addKohorta, addKpiMetric } = useAnalyticsData()
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

  if (authed === null) return <p className="text-deck-muted text-sm">Ładowanie…</p>
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

  return (
    <div className="max-w-xl space-y-3">
      <div className="flex gap-2">
        {(['rekrutacja', 'kohorta', 'kpi'] as Tab[]).map((t) => (
          <button key={t} onClick={() => { setTab(t); setStatus(null) }}
            className={`text-[11px] px-3 py-1 rounded-md border ${tab === t ? 'bg-deck-accent/10 text-deck-accent border-deck-accent/40' : 'text-deck-muted border-deck-border'}`}>
            {t === 'rekrutacja' ? 'Rekrutacja' : t === 'kohorta' ? 'Kohorta' : 'Metryka KPI'}
          </button>
        ))}
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
                <select className={inputCls} value={kpi.kategoria} onChange={(e) => setKpi((p) => ({ ...p, kategoria: e.target.value }))}>
                  <option value="SKS">SKS</option><option value="Wydarzenia">Wydarzenia</option><option value="Ankieta">Ankieta</option><option value="Koordynatorzy">Koordynatorzy</option>
                </select>
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
    </div>
  )
}

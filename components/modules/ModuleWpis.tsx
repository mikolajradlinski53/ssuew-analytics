'use client'
import { useState } from 'react'
import type { Komisja } from '@/types'

type Props = {
  komisje: Komisja[]
  onAddRekrutacja: (data: { edycja:string; sezon:'jesien'|'wiosna'; rok:number; zgloszenia:number; przyjeci:number }) => Promise<void>
  onAddKpi: (data: { komisja_id:string; semestr:string; projekty_planowane:number; projekty_zrealizowane:number; notatka:string|null }) => Promise<void>
}

function FormField({ label, hint, children }: { label:string; hint?:string; children:React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      {children}
    </div>
  )
}

export default function ModuleWpis({ komisje, onAddRekrutacja, onAddKpi }: Props) {
  const [activeForm, setActiveForm] = useState<'rekrutacja'|'kpi'>('rekrutacja')
  const [status, setStatus] = useState<{type:'ok'|'error'; msg:string}|null>(null)
  const [loading, setLoading] = useState(false)

  const [rekrForm, setRekrForm] = useState({ edycja:'', sezon:'jesien' as 'jesien'|'wiosna', rok: new Date().getFullYear(), zgloszenia:'', przyjeci:'' })
  const [kpiForm,  setKpiForm]  = useState({ komisja_id:'', semestr:'letni 2025/2026', projekty_planowane:'', projekty_zrealizowane:'', notatka:'' })

  const cr = rekrForm.zgloszenia && rekrForm.przyjeci
    ? ((parseFloat(rekrForm.przyjeci) / parseFloat(rekrForm.zgloszenia)) * 100).toFixed(1)
    : null
  const kpiPct = kpiForm.projekty_planowane && kpiForm.projekty_zrealizowane
    ? ((parseFloat(kpiForm.projekty_zrealizowane) / parseFloat(kpiForm.projekty_planowane)) * 100).toFixed(1)
    : null

  async function submitRekrutacja() {
    if (!rekrForm.edycja || !rekrForm.zgloszenia || !rekrForm.przyjeci) {
      setStatus({ type:'error', msg:'Uzupełnij wszystkie pola.' }); return
    }
    setLoading(true); setStatus(null)
    try {
      await onAddRekrutacja({ edycja: rekrForm.edycja, sezon: rekrForm.sezon, rok: rekrForm.rok, zgloszenia: parseInt(rekrForm.zgloszenia), przyjeci: parseInt(rekrForm.przyjeci) })
      setStatus({ type:'ok', msg:`Rekrutacja ${rekrForm.edycja} zapisana. Wykresy zaktualizowane.` })
      setRekrForm({ edycja:'', sezon:'jesien', rok:new Date().getFullYear(), zgloszenia:'', przyjeci:'' })
    } catch(e:unknown) {
      setStatus({ type:'error', msg: e instanceof Error ? e.message : 'Błąd zapisu' })
    } finally { setLoading(false) }
  }

  async function submitKpi() {
    if (!kpiForm.komisja_id || !kpiForm.projekty_planowane || !kpiForm.projekty_zrealizowane) {
      setStatus({ type:'error', msg:'Uzupełnij wszystkie pola.' }); return
    }
    setLoading(true); setStatus(null)
    try {
      await onAddKpi({ komisja_id: kpiForm.komisja_id, semestr: kpiForm.semestr, projekty_planowane: parseInt(kpiForm.projekty_planowane), projekty_zrealizowane: parseInt(kpiForm.projekty_zrealizowane), notatka: kpiForm.notatka || null })
      setStatus({ type:'ok', msg:`KPI dla komisji zapisane. Analizy zaktualizowane.` })
      setKpiForm({ komisja_id:'', semestr:'letni 2025/2026', projekty_planowane:'', projekty_zrealizowane:'', notatka:'' })
    } catch(e:unknown) {
      setStatus({ type:'error', msg: e instanceof Error ? e.message : 'Błąd zapisu' })
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-xl">
      <div className="flex gap-2 mb-6">
        {(['rekrutacja','kpi'] as const).map(f => (
          <button key={f} onClick={()=>{ setActiveForm(f); setStatus(null) }}
            className={`px-4 py-2 text-sm rounded-lg border transition-colors ${activeForm===f ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            {f === 'rekrutacja' ? 'Nowa rekrutacja' : 'KPI komisji'}
          </button>
        ))}
      </div>

      {status && (
        <div className={`mb-4 p-3 rounded-lg text-sm border-l-[3px] ${status.type==='ok' ? 'bg-emerald-50 text-emerald-800 border-emerald-500' : 'bg-red-50 text-red-800 border-red-500'}`}>
          {status.msg}
        </div>
      )}

      {activeForm === 'rekrutacja' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Dodaj wyniki rekrutacji</h3>
            <p className="text-xs text-gray-500 mt-0.5">Po zapisaniu — statystyki i wykresy odświeżą się automatycznie.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Edycja" hint="np. J'26, W'27">
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="J'26" value={rekrForm.edycja} onChange={e=>setRekrForm(p=>({...p,edycja:e.target.value}))} />
            </FormField>
            <FormField label="Sezon">
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={rekrForm.sezon} onChange={e=>setRekrForm(p=>({...p,sezon:e.target.value as 'jesien'|'wiosna'}))}>
                <option value="jesien">Jesień</option>
                <option value="wiosna">Wiosna</option>
              </select>
            </FormField>
          </div>

          <FormField label="Rok akademicki (start)">
            <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={rekrForm.rok} onChange={e=>setRekrForm(p=>({...p,rok:parseInt(e.target.value)}))} />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Liczba zgłoszeń">
              <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="43" value={rekrForm.zgloszenia} onChange={e=>setRekrForm(p=>({...p,zgloszenia:e.target.value}))} />
            </FormField>
            <FormField label="Liczba przyjętych">
              <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="14" value={rekrForm.przyjeci} onChange={e=>setRekrForm(p=>({...p,przyjeci:e.target.value}))} />
            </FormField>
          </div>

          {cr && (
            <div className="bg-indigo-50 rounded-lg p-3 text-sm text-indigo-700">
              Conversion rate: <strong>{cr}%</strong>
              {parseFloat(cr) < 30 && <span className="ml-2 text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">niski CR — warto sprawdzić jakość kandydatów</span>}
            </div>
          )}

          <button onClick={submitRekrutacja} disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors">
            {loading ? 'Zapisywanie…' : 'Zapisz rekrutację'}
          </button>
        </div>
      )}

      {activeForm === 'kpi' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Zaktualizuj KPI komisji</h3>
            <p className="text-xs text-gray-500 mt-0.5">Z-score i rankingi przeliczą się po zapisaniu.</p>
          </div>

          <FormField label="Komisja">
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={kpiForm.komisja_id} onChange={e=>setKpiForm(p=>({...p,komisja_id:e.target.value}))}>
              <option value="">Wybierz komisję…</option>
              {komisje.map(k => <option key={k.id} value={k.id}>{k.kod} — {k.nazwa}</option>)}
            </select>
          </FormField>

          <FormField label="Semestr">
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={kpiForm.semestr} onChange={e=>setKpiForm(p=>({...p,semestr:e.target.value}))} />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Projekty planowane">
              <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="18" value={kpiForm.projekty_planowane} onChange={e=>setKpiForm(p=>({...p,projekty_planowane:e.target.value}))} />
            </FormField>
            <FormField label="Projekty zrealizowane">
              <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="14" value={kpiForm.projekty_zrealizowane} onChange={e=>setKpiForm(p=>({...p,projekty_zrealizowane:e.target.value}))} />
            </FormField>
          </div>

          {kpiPct && (
            <div className={`rounded-lg p-3 text-sm ${parseFloat(kpiPct)>=75?'bg-emerald-50 text-emerald-700':parseFloat(kpiPct)>=50?'bg-amber-50 text-amber-700':'bg-red-50 text-red-700'}`}>
              Realizacja: <strong>{kpiPct}%</strong>
              {parseFloat(kpiPct) < 50 && <span className="ml-2 text-xs">— poniżej 50%, wymaga uwagi</span>}
            </div>
          )}

          <FormField label="Notatka (opcjonalnie)">
            <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" rows={2} placeholder="Kontekst, przyczyny odchyleń…" value={kpiForm.notatka} onChange={e=>setKpiForm(p=>({...p,notatka:e.target.value}))} />
          </FormField>

          <button onClick={submitKpi} disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors">
            {loading ? 'Zapisywanie…' : 'Zapisz KPI'}
          </button>
        </div>
      )}

      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs font-medium text-amber-800 mb-1">Konfiguracja Supabase</p>
        <p className="text-xs text-amber-700 leading-relaxed">
          Utwórz plik <code className="bg-amber-100 px-1 rounded">.env.local</code> w katalogu projektu i dodaj:
        </p>
        <pre className="text-xs bg-amber-100 rounded p-2 mt-2 text-amber-800 overflow-x-auto">{`NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...`}</pre>
        <p className="text-xs text-amber-600 mt-2">SQL schema: <code>lib/schema.sql</code> — wklej do Supabase SQL Editor.</p>
      </div>
    </div>
  )
}

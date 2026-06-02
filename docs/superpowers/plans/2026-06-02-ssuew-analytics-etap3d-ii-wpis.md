# SSUEW Analytics 2.0 — Etap 3d-ii (Wpis danych) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Formularze `/wpis` (rekrutacja, KPI komisji + custom KPI, kohorta) zapisujące na żywo do Supabase jako zalogowany user, plus brakujące endpointy i podłączenie kohort/komisji na żywo.

**Architecture:** Endpointy `/api/kohorty` i `/api/komisje-lista` (server client, wzorzec z 3d-i). `useAnalyticsData` pobiera 4 źródła (live z fallbackiem demo) i dostaje `addKohorta`. `WpisClient` — gated (sesja Supabase) — renderuje 3 formularze. Custom KPI składane czystą funkcją `customRowsToObject`.

**Tech Stack:** Next.js 16, React 19, `@supabase/ssr`, TypeScript strict, Vitest.

**Start:** bezpośrednio na `main`. Weryfikacja realnym zapisem na żywym Supabase.

---

## Struktura plików

**Tworzone:** `app/api/kohorty/route.ts`, `app/api/komisje-lista/route.ts`, `lib/wpis.ts`, `lib/wpis.test.ts`, `components/modules/WpisClient.tsx`.
**Modyfikowane:** `lib/useAnalyticsData.ts`, `app/wpis/page.tsx`.

---

## Task 1: Endpointy kohorty + lista komisji

**Files:**
- Create: `app/api/kohorty/route.ts`, `app/api/komisje-lista/route.ts`

- [ ] **Step 1: Create `app/api/kohorty/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isConfigured } from '@/lib/supabase/config'

export async function GET() {
  if (!isConfigured) return NextResponse.json([])
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('kohorty').select('*')
    .order('rok', { ascending: true }).order('sezon', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!isConfigured) return NextResponse.json({ error: 'Supabase nie skonfigurowany' }, { status: 503 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })
  const body = await req.json()
  const { edycja, sezon, rok, n_czlonkow, avg_retention_sem, max_retention_sem, in_progress } = body
  if (!edycja || !sezon || !rok || n_czlonkow == null || avg_retention_sem == null || max_retention_sem == null)
    return NextResponse.json({ error: 'Brakujące pola' }, { status: 400 })
  const { data, error } = await supabase.from('kohorty')
    .upsert({ edycja, sezon, rok, n_czlonkow, avg_retention_sem, max_retention_sem, in_progress: in_progress ?? false }, { onConflict: 'edycja' })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2: Create `app/api/komisje-lista/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isConfigured } from '@/lib/supabase/config'

export async function GET() {
  if (!isConfigured) return NextResponse.json([])
  const supabase = await createClient()
  const { data, error } = await supabase.from('komisje').select('*').order('kod', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc clean; build OK; trasy `/api/kohorty`, `/api/komisje-lista`.

- [ ] **Step 4: Commit**

```bash
git add app/api/kohorty/route.ts app/api/komisje-lista/route.ts
git commit -m "feat(api): endpointy /api/kohorty (GET/POST) + /api/komisje-lista (GET)"
```

---

## Task 2: useAnalyticsData — live wiring + addKohorta

**Files:**
- Modify: `lib/useAnalyticsData.ts`

- [ ] **Step 1: Zastąp `fetchAll`** — znajdź blok (linie ~14–45) i zastąp:

```ts
  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [rRes, kRes, kohRes, komRes] = await Promise.all([
        fetch('/api/rekrutacje'),
        fetch('/api/komisje'),
        fetch('/api/kohorty'),
        fetch('/api/komisje-lista'),
      ])
      if (!rRes.ok || !kRes.ok) throw new Error('Błąd pobierania danych')
      const [rData, kData, kohData, komData] = await Promise.all([
        rRes.json(),
        kRes.json(),
        kohRes.ok ? kohRes.json() : [],
        komRes.ok ? komRes.json() : [],
      ])

      // Preferuj dane live; gdy backend pusty/niewdrożony — dane demo (historyczne SSUEW)
      const liveRekr = Array.isArray(rData) && rData.length > 0
      const liveKpi = Array.isArray(kData) && kData.length > 0
      const liveKoh = Array.isArray(kohData) && kohData.length > 0
      const liveKom = Array.isArray(komData) && komData.length > 0
      setRekrutacje(liveRekr ? rData : DEMO_REKRUTACJE)
      setKpiPeriods(liveKpi ? kData : DEMO_KPI)
      setKohorty(liveKoh ? kohData : DEMO_KOHORTY)
      setKomisje(liveKom ? komData : DEMO_KOMISJE)
      setUsingDemo(!liveRekr && !liveKpi && !liveKoh && !liveKom)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Nieznany błąd'
      setError(msg)
      // Fallback: dane demo (historyczne SSUEW)
      setRekrutacje(DEMO_REKRUTACJE)
      setKohorty(DEMO_KOHORTY)
      setKomisje(DEMO_KOMISJE)
      setKpiPeriods(DEMO_KPI)
      setUsingDemo(true)
    } finally {
      setLoading(false)
    }
  }, [])
```

- [ ] **Step 2: Dodaj `addKohorta`** — po `addKpi` (przed `return`) wstaw:

```ts
  const addKohorta = async (payload: Omit<Kohorta, 'id' | 'created_at'>) => {
    const res = await fetch('/api/kohorty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(await res.text())
    await fetchAll()
  }
```

- [ ] **Step 3: Dodaj `addKohorta` do zwracanego obiektu** — znajdź `return { ... refresh: fetchAll }` i dodaj `addKohorta`:

```ts
  return { rekrutacje, kohorty, komisje, kpiPeriods, loading, error, usingDemo, addRekrutacja, addKpi, addKohorta, refresh: fetchAll }
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: brak błędów.

- [ ] **Step 5: Commit**

```bash
git add lib/useAnalyticsData.ts
git commit -m "feat(data): live kohorty + komisje + addKohorta w useAnalyticsData"
```

---

## Task 3: Helper custom KPI

**Files:**
- Create: `lib/wpis.ts`, `lib/wpis.test.ts`

- [ ] **Step 1: Failing test `lib/wpis.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { customRowsToObject } from '@/lib/wpis'

describe('customRowsToObject', () => {
  it('składa wiersze w obiekt', () => {
    expect(customRowsToObject([{ key: 'frekwencja', value: '85' }, { key: 'budżet', value: '90' }]))
      .toEqual({ frekwencja: '85', budżet: '90' })
  })
  it('pomija wiersze z pustym kluczem', () => {
    expect(customRowsToObject([{ key: '', value: 'x' }, { key: '  ', value: 'y' }, { key: 'a', value: 'b' }]))
      .toEqual({ a: 'b' })
  })
  it('przycina białe znaki klucza i wartości', () => {
    expect(customRowsToObject([{ key: ' k ', value: ' v ' }])).toEqual({ k: 'v' })
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run lib/wpis.test.ts`
Expected: FAIL (brak modułu).

- [ ] **Step 3: Create `lib/wpis.ts`**

```ts
export interface CustomRow {
  key: string
  value: string
}

export function customRowsToObject(rows: CustomRow[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const r of rows) {
    const k = r.key.trim()
    if (k) out[k] = r.value.trim()
  }
  return out
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run lib/wpis.test.ts`
Expected: PASS (3).

- [ ] **Step 5: Commit**

```bash
git add lib/wpis.ts lib/wpis.test.ts
git commit -m "feat(wpis): helper customRowsToObject (custom KPI)"
```

---

## Task 4: WpisClient (gated, 3 formularze)

**Files:**
- Create: `components/modules/WpisClient.tsx`
- Modify: `app/wpis/page.tsx`

- [ ] **Step 1: Implement `components/modules/WpisClient.tsx`**

```tsx
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAnalyticsData } from '@/lib/useAnalyticsData'
import { createClient } from '@/lib/supabase/client'
import { isConfigured } from '@/lib/supabase/config'
import { customRowsToObject, type CustomRow } from '@/lib/wpis'
import { BentoCard } from '@/components/ui/BentoCard'

type Tab = 'rekrutacja' | 'kpi' | 'kohorta'
const inputCls = 'w-full bg-deck-bg border border-deck-border rounded-md px-3 py-2 text-sm text-deck-text'
const labelCls = 'block text-[11px] text-deck-muted mb-1'

export default function WpisClient() {
  const { komisje, addRekrutacja, addKpi, addKohorta } = useAnalyticsData()
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
  const [kpi, setKpi] = useState({ komisja_id: '', semestr: 'letni 2025/2026', planowane: '', zrealizowane: '', notatka: '' })
  const [customRows, setCustomRows] = useState<CustomRow[]>([{ key: '', value: '' }])
  const [koh, setKoh] = useState({ edycja: '', sezon: 'jesien' as 'jesien' | 'wiosna', rok: new Date().getFullYear(), n: '', avg: '', max: '', inProgress: false })

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
      await addRekrutacja({
        edycja: rekr.edycja,
        sezon: rekr.sezon,
        rok: rekr.rok,
        zgloszenia: parseInt(rekr.zgloszenia),
        przyjeci: parseInt(rekr.przyjeci),
      })
      setRekr({ edycja: '', sezon: 'jesien', rok: new Date().getFullYear(), zgloszenia: '', przyjeci: '' })
    }, `Rekrutacja ${rekr.edycja} zapisana.`)

  const submitKpi = () =>
    run(async () => {
      await addKpi({
        komisja_id: kpi.komisja_id,
        semestr: kpi.semestr,
        projekty_planowane: parseInt(kpi.planowane),
        projekty_zrealizowane: parseInt(kpi.zrealizowane),
        kpi_custom: customRowsToObject(customRows),
        notatka: kpi.notatka || null,
      })
      setKpi({ komisja_id: '', semestr: 'letni 2025/2026', planowane: '', zrealizowane: '', notatka: '' })
      setCustomRows([{ key: '', value: '' }])
    }, 'KPI komisji zapisane.')

  const submitKoh = () =>
    run(async () => {
      await addKohorta({
        edycja: koh.edycja,
        sezon: koh.sezon,
        rok: koh.rok,
        n_czlonkow: parseInt(koh.n),
        avg_retention_sem: parseFloat(koh.avg),
        max_retention_sem: parseInt(koh.max),
        in_progress: koh.inProgress,
      })
      setKoh({ edycja: '', sezon: 'jesien', rok: new Date().getFullYear(), n: '', avg: '', max: '', inProgress: false })
    }, `Kohorta ${koh.edycja} zapisana.`)

  return (
    <div className="max-w-xl space-y-3">
      <div className="flex gap-2">
        {(['rekrutacja', 'kpi', 'kohorta'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setStatus(null) }}
            className={`text-[11px] px-3 py-1 rounded-md border ${tab === t ? 'bg-deck-accent/10 text-deck-accent border-deck-accent/40' : 'text-deck-muted border-deck-border'}`}
          >
            {t === 'rekrutacja' ? 'Rekrutacja' : t === 'kpi' ? 'KPI komisji' : 'Kohorta'}
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
                <select className={inputCls} value={rekr.sezon} onChange={(e) => setRekr((p) => ({ ...p, sezon: e.target.value as 'jesien' | 'wiosna' }))}>
                  <option value="jesien">Jesień</option><option value="wiosna">Wiosna</option>
                </select>
              </div>
            </div>
            <div><label className={labelCls}>Rok</label><input type="number" className={inputCls} value={rekr.rok} onChange={(e) => setRekr((p) => ({ ...p, rok: parseInt(e.target.value) }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Zgłoszenia</label><input type="number" className={inputCls} value={rekr.zgloszenia} onChange={(e) => setRekr((p) => ({ ...p, zgloszenia: e.target.value }))} /></div>
              <div><label className={labelCls}>Przyjęci</label><input type="number" className={inputCls} value={rekr.przyjeci} onChange={(e) => setRekr((p) => ({ ...p, przyjeci: e.target.value }))} /></div>
            </div>
            <button onClick={submitRekr} disabled={busy} className="w-full bg-deck-accent text-deck-bg-deep rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-50">{busy ? 'Zapisywanie…' : 'Zapisz rekrutację'}</button>
          </div>
        </BentoCard>
      )}

      {tab === 'kpi' && (
        <BentoCard title="Dodaj KPI komisji">
          <div className="space-y-3">
            <div><label className={labelCls}>Komisja</label>
              <select className={inputCls} value={kpi.komisja_id} onChange={(e) => setKpi((p) => ({ ...p, komisja_id: e.target.value }))}>
                <option value="">Wybierz komisję…</option>
                {komisje.map((k) => <option key={k.id} value={k.id}>{k.kod} — {k.nazwa}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Semestr</label><input className={inputCls} value={kpi.semestr} onChange={(e) => setKpi((p) => ({ ...p, semestr: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Planowane</label><input type="number" className={inputCls} value={kpi.planowane} onChange={(e) => setKpi((p) => ({ ...p, planowane: e.target.value }))} /></div>
              <div><label className={labelCls}>Zrealizowane</label><input type="number" className={inputCls} value={kpi.zrealizowane} onChange={(e) => setKpi((p) => ({ ...p, zrealizowane: e.target.value }))} /></div>
            </div>
            <div><label className={labelCls}>Notatka</label><input className={inputCls} value={kpi.notatka} onChange={(e) => setKpi((p) => ({ ...p, notatka: e.target.value }))} /></div>
            <div>
              <label className={labelCls}>Custom KPI (klucz–wartość)</label>
              {customRows.map((row, i) => (
                <div key={i} className="flex gap-2 mb-1">
                  <input className={inputCls} placeholder="np. frekwencja" value={row.key} onChange={(e) => setCustomRows((rows) => rows.map((r, j) => (j === i ? { ...r, key: e.target.value } : r)))} />
                  <input className={inputCls} placeholder="np. 85%" value={row.value} onChange={(e) => setCustomRows((rows) => rows.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))} />
                </div>
              ))}
              <button type="button" onClick={() => setCustomRows((rows) => [...rows, { key: '', value: '' }])} className="text-[10px] text-deck-muted hover:text-deck-text">+ dodaj wiersz</button>
            </div>
            <button onClick={submitKpi} disabled={busy || !kpi.komisja_id} className="w-full bg-deck-accent text-deck-bg-deep rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-50">{busy ? 'Zapisywanie…' : 'Zapisz KPI'}</button>
          </div>
        </BentoCard>
      )}

      {tab === 'kohorta' && (
        <BentoCard title="Dodaj kohortę">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Edycja</label><input className={inputCls} placeholder="J'26" value={koh.edycja} onChange={(e) => setKoh((p) => ({ ...p, edycja: e.target.value }))} /></div>
              <div><label className={labelCls}>Sezon</label>
                <select className={inputCls} value={koh.sezon} onChange={(e) => setKoh((p) => ({ ...p, sezon: e.target.value as 'jesien' | 'wiosna' }))}>
                  <option value="jesien">Jesień</option><option value="wiosna">Wiosna</option>
                </select>
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
            <button onClick={submitKoh} disabled={busy} className="w-full bg-deck-accent text-deck-bg-deep rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-50">{busy ? 'Zapisywanie…' : 'Zapisz kohortę'}</button>
          </div>
        </BentoCard>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Replace `app/wpis/page.tsx`**

```tsx
import { Suspense } from 'react'
import WpisClient from '@/components/modules/WpisClient'

export default function Page() {
  return (
    <Suspense fallback={<p className="text-deck-muted text-sm">Ładowanie…</p>}>
      <WpisClient />
    </Suspense>
  )
}
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc clean; build OK; trasa `/wpis`.

- [ ] **Step 4: Commit**

```bash
git add components/modules/WpisClient.tsx app/wpis/page.tsx
git commit -m "feat(wpis): formularze wpisu (rekrutacja, KPI+custom, kohorta) gated na sesji"
```

---

## Task 5: Finalna weryfikacja + push + test na żywo

- [ ] **Step 1: Testy**

Run: `npm test`
Expected: wszystkie PASS (poprzednie + `customRowsToObject`).

- [ ] **Step 2: Typy + build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc clean; build OK; trasy `/wpis`, `/api/kohorty`, `/api/komisje-lista`.

- [ ] **Step 3: Push na main**

```bash
git push origin main
```

- [ ] **Step 4: Weryfikacja na żywo (z użytkownikiem)**

1. `npm run dev`, zaloguj się (`/login`).
2. `/wpis` → zakładka **Kohorta** → zapisz testową (np. `T'99`, n=10, avg=2, max=3, in_progress) → komunikat OK.
3. Sprawdź `/retencja` — testowa kohorta widoczna (po `refresh()`).
4. `/wpis` → **KPI komisji** → wybierz komisję (lista live z uuid), wpisz wartości + 1 custom KPI → zapisz → OK.
5. Wyloguj się → `/wpis` pokazuje gating „Zaloguj się, by wpisywać dane".

---

## Notatki dla wykonawcy

- **Dropdown komisji** używa `komisje` z `useAnalyticsData` — po Tasku 2 to dane live (`/api/komisje-lista`)
  z prawdziwymi `uuid`, więc insert KPI ma poprawny FK.
- **Reuse:** `addRekrutacja`/`addKpi`/`addKohorta` z hooka; `createClient` (browser) do sesji; `BentoCard`.
- **Poza zakresem (3d-iii):** encja `projekt`, tabela `projekty`, `/projekty`, `/api/projekty`.
```

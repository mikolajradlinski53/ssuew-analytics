# SSUEW Analytics 2.0 — Etap 3b (Pełne moduły Rekrutacje + Komisje) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zastąpić zaślepki `/rekrutacje` i `/komisje` pełnymi widokami deep-dive (Command Deck), reużywając `analyzeRekrutacje`/`analyzeKomisje`/`linearForecast`, i usunąć osierocone komponenty starej apki.

**Architecture:** Klienckie komponenty modułów na danych z `useAnalyticsData` + filtrach z URL. Logika z `lib/stats.ts` (reuse + nowy `kpiByKomisja`). Drill-down Komisji przez lokalny stan wyboru. Reuse `BentoCard`, `KpiTile`, `chartTheme`.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Tailwind 4, recharts (Bar/Line/Scatter/Composed/Area), Vitest.

**Start:** bezpośrednio na `main` (workflow direct-to-main).

---

## Struktura plików

**Modyfikowane:** `lib/stats.ts` (`kpiByKomisja`), `app/rekrutacje/page.tsx`, `app/komisje/page.tsx`.
**Tworzone:** `lib/stats.kpigroup.test.ts`, `components/modules/RekrutacjeClient.tsx`, `components/modules/KomisjeClient.tsx`.
**Usuwane:** `components/modules/Dashboard.tsx`, `ModuleRekrutacje.tsx`, `ModuleRetention.tsx`, `ModuleKomisje.tsx`, `ModuleWpis.tsx`.

---

## Task 1: stats — grupowanie KPI po komisji

**Files:**
- Modify: `lib/stats.ts`
- Test: `lib/stats.kpigroup.test.ts`

- [ ] **Step 1: Failing test `lib/stats.kpigroup.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { kpiByKomisja } from '@/lib/stats'
import type { KpiPeriod } from '@/types'

function p(id: string, kom: string, sem: string, created: string): KpiPeriod {
  return { id, komisja_id: kom, semestr: sem, projekty_planowane: 10, projekty_zrealizowane: 5, notatka: null, created_at: created }
}

describe('kpiByKomisja', () => {
  const periods = [
    p('1', 'k1', 'zimowy 2024/2025', '2024-10-01'),
    p('2', 'k1', 'letni 2024/2025', '2025-03-01'),
    p('3', 'k2', 'letni 2024/2025', '2025-03-01'),
  ]
  it('grupuje po komisja_id', () => {
    const m = kpiByKomisja(periods)
    expect(m.size).toBe(2)
    expect(m.get('k1')).toHaveLength(2)
    expect(m.get('k2')).toHaveLength(1)
  })
  it('sortuje okresy komisji wg created_at', () => {
    const m = kpiByKomisja(periods)
    expect(m.get('k1')!.map((x) => x.id)).toEqual(['1', '2'])
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run lib/stats.kpigroup.test.ts`
Expected: FAIL (`kpiByKomisja` not exported).

- [ ] **Step 3: Add to end of `lib/stats.ts`**

```ts
// ─── Grupowanie KPI po komisji (drill-down / trend) ──────────────────────────

export function kpiByKomisja(periods: KpiPeriod[]): Map<string, KpiPeriod[]> {
  const m = new Map<string, KpiPeriod[]>()
  for (const p of periods) {
    const arr = m.get(p.komisja_id) ?? []
    arr.push(p)
    m.set(p.komisja_id, arr)
  }
  for (const arr of m.values()) {
    arr.sort((a, b) => a.created_at.localeCompare(b.created_at))
  }
  return m
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run lib/stats.kpigroup.test.ts`
Expected: PASS (2).

- [ ] **Step 5: Commit**

```bash
git add lib/stats.ts lib/stats.kpigroup.test.ts
git commit -m "feat(stats): kpiByKomisja (grupowanie KPI po komisji)"
```

---

## Task 2: Moduł Rekrutacje

**Files:**
- Create: `components/modules/RekrutacjeClient.tsx`
- Modify: `app/rekrutacje/page.tsx`

- [ ] **Step 1: Implement `components/modules/RekrutacjeClient.tsx`**

```tsx
'use client'
import { ComposedChart, Bar, Line, Area, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useAnalyticsData } from '@/lib/useAnalyticsData'
import { useFilters } from '@/lib/useFilters'
import { applyFilters } from '@/lib/filters'
import { analyzeRekrutacje, linearForecast, mean } from '@/lib/stats'
import { chartTheme, axisTick, tooltipStyle } from '@/lib/chartTheme'
import { BentoCard } from '@/components/ui/BentoCard'
import { KpiTile } from '@/components/ui/KpiTile'

export default function RekrutacjeClient() {
  const { rekrutacje, loading } = useAnalyticsData()
  const { filters } = useFilters()
  if (loading) return <p className="text-deck-muted text-sm">Ładowanie…</p>

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
```

- [ ] **Step 2: Replace `app/rekrutacje/page.tsx`**

```tsx
import { Suspense } from 'react'
import RekrutacjeClient from '@/components/modules/RekrutacjeClient'

export default function Page() {
  return (
    <Suspense fallback={<p className="text-deck-muted text-sm">Ładowanie…</p>}>
      <RekrutacjeClient />
    </Suspense>
  )
}
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc clean; build OK.

- [ ] **Step 4: Commit**

```bash
git add components/modules/RekrutacjeClient.tsx app/rekrutacje/page.tsx
git commit -m "feat(rekrutacje): pelny modul (trend, korelacja, Welch, prognoza)"
```

---

## Task 3: Moduł Komisje (z drill-down)

**Files:**
- Create: `components/modules/KomisjeClient.tsx`
- Modify: `app/komisje/page.tsx`

- [ ] **Step 1: Implement `components/modules/KomisjeClient.tsx`**

```tsx
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
```

- [ ] **Step 2: Replace `app/komisje/page.tsx`**

```tsx
import { Suspense } from 'react'
import KomisjeClient from '@/components/modules/KomisjeClient'

export default function Page() {
  return (
    <Suspense fallback={<p className="text-deck-muted text-sm">Ładowanie…</p>}>
      <KomisjeClient />
    </Suspense>
  )
}
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc clean; build OK.

- [ ] **Step 4: Commit**

```bash
git add components/modules/KomisjeClient.tsx app/komisje/page.tsx
git commit -m "feat(komisje): pelny modul (ranking z-score, slupki, trend, drill-down)"
```

---

## Task 4: Sprzątanie osieroconych komponentów

**Files:**
- Delete: `components/modules/Dashboard.tsx`, `ModuleRekrutacje.tsx`, `ModuleRetention.tsx`, `ModuleKomisje.tsx`, `ModuleWpis.tsx`

- [ ] **Step 1: Potwierdź brak importów**

Run: `npx grep -rn "Dashboard\|ModuleRekrutacje\|ModuleRetention\|ModuleKomisje\|ModuleWpis" app components lib` (lub narzędzie Grep)
Expected: dopasowania tylko WEWNĄTRZ usuwanych plików (Dashboard importuje Module*, definicje) — żaden żywy plik (`app/`, nowe `*Client.tsx`) ich nie importuje.

- [ ] **Step 2: Usuń pliki**

```bash
git rm components/modules/Dashboard.tsx components/modules/ModuleRekrutacje.tsx components/modules/ModuleRetention.tsx components/modules/ModuleKomisje.tsx components/modules/ModuleWpis.tsx
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc clean; build OK (brak złamanych importów).

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: usun osierocone komponenty oryginalnej apki"
```

---

## Task 5: Finalna weryfikacja + push

- [ ] **Step 1: Testy**

Run: `npm test`
Expected: wszystkie PASS (poprzednie + `kpiByKomisja`).

- [ ] **Step 2: Typy + build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc clean; build OK; trasy `/rekrutacje`, `/komisje`.

- [ ] **Step 3: Wizualna weryfikacja**

Run: `npm run dev`, sprawdź `/rekrutacje` (4 panele) i `/komisje` (ranking, słupki, trend-notka, klik w komisję → szczegóły). Zatrzymaj serwer.

- [ ] **Step 4: Push na main**

```bash
git push origin main
```

---

## Notatki dla wykonawcy

- **Reuse:** `analyzeRekrutacje`, `analyzeKomisje`, `linearForecast`, `mean`, `kpiByKomisja`; `BentoCard`, `KpiTile`, `chartTheme`, `applyFilters`, `useFilters`, `useAnalyticsData`.
- **`analyzeKomisje.withZ`** ma pola `KpiPeriod` + `realizacjaPct`, `z`, `interpretation`; `komisja?` to opcjonalna `Komisja` (kod, nazwa).
- **Trend Komisji** rysuje linie tylko gdy >1 semestr; w demo (1 semestr) pokazuje notkę.
- **Poza zakresem (3c/3d):** alerty, eksport, backend, formularze wpisu.
```

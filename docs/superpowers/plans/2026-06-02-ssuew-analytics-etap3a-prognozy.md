# SSUEW Analytics 2.0 — Etap 3a (Prognozy i symulacje) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nowy moduł `/prognozy` z prognozami (rekrutacje, retencja) z przedziałem niepewności oraz interaktywnym symulatorem „co jeśli" (3 sekcje + porównanie scenariuszy).

**Architecture:** Czyste funkcje prognoz w `lib/stats.ts` (`linearForecast`, `retentionModel`) z testami. Prezentacja w klienckich komponentach: `PrognozyClient` (wykresy prognoz z pasem niepewności) komponuje `Symulator` (suwaki + scenariusze). Wszystko na danych z `useAnalyticsData` + filtrach z URL. Reuse Etap 1a/2: `Slider`, `BentoCard`, `chartTheme`, `retentionFraction`, `applyFilters`.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Tailwind 4, recharts (Line + range Area), Vitest + Testing Library.

**Start:** gałąź `etap-3a-prognozy` z `main` (po merge Etapu 2).

---

## Struktura plików

**Modyfikowane:**
- `lib/stats.ts` — `linearForecast` + `ForecastPoint`, `retentionModel` + `RetentionModel`.
- `components/ui/Sidebar.tsx` — nowa pozycja `/prognozy` w `NAV`.
- `components/ui/Sidebar.test.tsx` — asercja nowej pozycji.

**Tworzone:**
- `lib/stats.forecast.test.ts`, `lib/stats.model.test.ts`
- `components/modules/Symulator.tsx`, `components/modules/Symulator.test.tsx`
- `components/modules/PrognozyClient.tsx`
- `app/prognozy/page.tsx`

---

## Task 1: stats — prognoza liniowa z przedziałem

**Files:**
- Modify: `lib/stats.ts`
- Test: `lib/stats.forecast.test.ts`

- [ ] **Step 1: Failing test `lib/stats.forecast.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { linearForecast } from '@/lib/stats'

describe('linearForecast', () => {
  it('prognozuje idealną prostą bez niepewności', () => {
    const f = linearForecast([2, 4, 6, 8], 1)
    expect(f).toHaveLength(1)
    expect(f[0].yhat).toBe(10)
    expect(f[0].lo).toBe(10)
    expect(f[0].hi).toBe(10)
  })
  it('zwraca tyle punktów ile kroków', () => {
    expect(linearForecast([2, 4, 6, 8], 2)).toHaveLength(2)
  })
  it('dla zaszumionych danych lo < yhat < hi', () => {
    const f = linearForecast([2, 5, 6, 9, 9], 1)
    expect(f[0].lo).toBeLessThan(f[0].yhat)
    expect(f[0].hi).toBeGreaterThan(f[0].yhat)
  })
  it('nie schodzi poniżej zera (lo >= 0)', () => {
    const f = linearForecast([5, 3, 1, 0], 2)
    expect(f.every((p) => p.lo >= 0)).toBe(true)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run lib/stats.forecast.test.ts`
Expected: FAIL (`linearForecast` not exported).

- [ ] **Step 3: Add to end of `lib/stats.ts`**

```ts
// ─── Prognoza liniowa z przedziałem predykcji ────────────────────────────────
// Dopasowuje y ~ a + b·i, prognozuje `steps` kolejnych punktów.
// SE_pred = s·√(1 + 1/n + (x₀−x̄)²/Sxx) — przedział rośnie z odległością.

export interface ForecastPoint {
  i: number
  yhat: number
  lo: number
  hi: number
}

export function linearForecast(y: number[], steps: number): ForecastPoint[] {
  const n = y.length
  const xs = y.map((_, i) => i)
  const mx = mean(xs)
  const my = mean(y)
  const Sxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0)
  const b = Sxx === 0 ? 0 : xs.reduce((s, x, i) => s + (x - mx) * (y[i] - my), 0) / Sxx
  const a = my - b * mx
  const sse = y.reduce((s, v, i) => s + (v - (a + b * i)) ** 2, 0)
  const sErr = n > 2 ? Math.sqrt(sse / (n - 2)) : 0

  const r1 = (v: number) => Math.round(v * 10) / 10
  const out: ForecastPoint[] = []
  for (let k = 1; k <= steps; k++) {
    const x0 = n - 1 + k
    const yhat = a + b * x0
    const sePred = Sxx > 0 ? sErr * Math.sqrt(1 + 1 / n + (x0 - mx) ** 2 / Sxx) : sErr
    out.push({ i: x0, yhat: r1(yhat), lo: r1(Math.max(0, yhat - sePred)), hi: r1(yhat + sePred) })
  }
  return out
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run lib/stats.forecast.test.ts`
Expected: PASS (4).

- [ ] **Step 5: Commit**

```bash
git add lib/stats.ts lib/stats.forecast.test.ts
git commit -m "feat(stats): prognoza liniowa z przedzialem (linearForecast)"
```

---

## Task 2: stats — model retencji (predykcja dowolnych wejść)

**Files:**
- Modify: `lib/stats.ts`
- Test: `lib/stats.model.test.ts`

- [ ] **Step 1: Failing test `lib/stats.model.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { retentionModel } from '@/lib/stats'
import type { Kohorta } from '@/types'

function koh(edycja: string, sezon: 'jesien' | 'wiosna', rok: number, n: number, avg: number): Kohorta {
  return { id: edycja, edycja, sezon, rok, n_czlonkow: n, avg_retention_sem: avg, max_retention_sem: Math.ceil(avg) + 1, in_progress: false, created_at: '' }
}

const cohorts: Kohorta[] = [
  koh("W'22", 'wiosna', 2022, 11, 4.4),
  koh("J'22", 'jesien', 2022, 33, 4.2),
  koh("W'23", 'wiosna', 2023, 10, 4.2),
  koh("J'23", 'jesien', 2023, 28, 3.9),
]

describe('retentionModel', () => {
  it('zwraca model przy >=4 ukończonych kohortach', () => {
    const m = retentionModel(cohorts)
    expect(m).not.toBeNull()
    expect(m!.n).toBe(4)
  })
  it('predict zwraca skończoną, nieujemną liczbę', () => {
    const m = retentionModel(cohorts)!
    const p = m.predict(m.nextEdNr, 1, 20)
    expect(Number.isFinite(p)).toBe(true)
    expect(p).toBeGreaterThanOrEqual(0)
  })
  it('zwraca null przy <4 ukończonych kohortach', () => {
    expect(retentionModel(cohorts.slice(0, 3))).toBeNull()
  })
  it('pomija kohorty in_progress', () => {
    const withProgress = [...cohorts, { ...koh("J'24", 'jesien', 2024, 30, 3.5), in_progress: true }]
    expect(retentionModel(withProgress)!.n).toBe(4)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run lib/stats.model.test.ts`
Expected: FAIL (`retentionModel` not exported).

- [ ] **Step 3: Add to end of `lib/stats.ts`**

```ts
// ─── Model retencji OLS jako predyktor dowolnych wejść ───────────────────────
// (Oddzielny od analyzeRetention, by nie zmieniać jego zachowania/testów.)

export interface RetentionModel {
  predict: (edNr: number, sezonJesien: 0 | 1, nCzl: number) => number
  r2: number
  n: number
  residualSd: number
  nextEdNr: number
  meanNCzl: number
}

export function retentionModel(kohort: Kohorta[]): RetentionModel | null {
  const complete = kohort.filter((k) => !k.in_progress)
  if (complete.length < 4) return null
  const sorted = [...complete].sort((a, b) => a.rok - b.rok || (a.sezon === 'wiosna' ? -1 : 1))

  const edNr = sorted.map((_, i) => i)
  const sezon = sorted.map((k) => (k.sezon === 'jesien' ? 1 : 0))
  const nCzl = sorted.map((k) => k.n_czlonkow)
  const y = sorted.map((k) => k.avg_retention_sem)

  const { betas, r2, yhat } = olsMultiple([edNr, sezon, nCzl], y, [])
  const intercept = mean(y) - betas[0] * mean(edNr) - betas[1] * mean(sezon) - betas[2] * mean(nCzl)
  const sse = y.reduce((s, v, i) => s + (v - yhat[i]) ** 2, 0)
  const residualSd = sorted.length > 4 ? Math.sqrt(sse / (sorted.length - 4)) : 0

  const predict = (e: number, sz: 0 | 1, nc: number) =>
    Math.max(0, intercept + betas[0] * e + betas[1] * sz + betas[2] * nc)

  return { predict, r2, n: sorted.length, residualSd, nextEdNr: sorted.length, meanNCzl: mean(nCzl) }
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run lib/stats.model.test.ts`
Expected: PASS (4).

- [ ] **Step 5: Commit**

```bash
git add lib/stats.ts lib/stats.model.test.ts
git commit -m "feat(stats): model retencji jako predyktor (retentionModel)"
```

---

## Task 3: Sidebar — pozycja /prognozy

**Files:**
- Modify: `components/ui/Sidebar.tsx`
- Modify: `components/ui/Sidebar.test.tsx`

- [ ] **Step 1: Dodaj asercję w `components/ui/Sidebar.test.tsx`** — w bloku `it('renderuje wszystkie pozycje nawigacji', ...)` dopisz przed `expect(screen.getByText(/Wpisz dane/))`:

```tsx
    expect(screen.getByText('Prognozy')).toBeInTheDocument()
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run components/ui/Sidebar.test.tsx`
Expected: FAIL (brak „Prognozy").

- [ ] **Step 3: W `components/ui/Sidebar.tsx`** dodaj pozycję do `NAV` — zmień fragment:

```tsx
  { href: '/korelacje', label: 'Korelacje', glyph: '∿' },
  { href: '/alerty', label: 'Alerty', glyph: '⚠' },
] as const
```

na:

```tsx
  { href: '/korelacje', label: 'Korelacje', glyph: '∿' },
  { href: '/prognozy', label: 'Prognozy', glyph: '◔' },
  { href: '/alerty', label: 'Alerty', glyph: '⚠' },
] as const
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run components/ui/Sidebar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/ui/Sidebar.tsx components/ui/Sidebar.test.tsx
git commit -m "feat(ui): pozycja Prognozy w sidebarze"
```

---

## Task 4: Komponent Symulator

**Files:**
- Create: `components/modules/Symulator.tsx`
- Test: `components/modules/Symulator.test.tsx`

- [ ] **Step 1: Failing test `components/modules/Symulator.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Symulator from '@/components/modules/Symulator'
import type { Rekrutacja, Kohorta } from '@/types'

const rekr: Rekrutacja[] = [
  { id: '1', edycja: "J'24", sezon: 'jesien', rok: 2024, zgloszenia: 40, przyjeci: 20, created_at: '' },
  { id: '2', edycja: "W'25", sezon: 'wiosna', rok: 2025, zgloszenia: 10, przyjeci: 8, created_at: '' },
]
const koh: Kohorta[] = [
  { id: '1', edycja: "J'24", sezon: 'jesien', rok: 2024, n_czlonkow: 20, avg_retention_sem: 4, max_retention_sem: 8, in_progress: false, created_at: '' },
]

describe('Symulator', () => {
  it('renderuje trzy sekcje co-jeśli', () => {
    render(<Symulator rekrutacje={rekr} kohorty={koh} />)
    expect(screen.getByText(/Rekrutacja/)).toBeInTheDocument()
    expect(screen.getByText(/Retencja/)).toBeInTheDocument()
    expect(screen.getByText(/Utrzymanie/)).toBeInTheDocument()
  })
  it('ma przycisk zapisu scenariusza', () => {
    render(<Symulator rekrutacje={rekr} kohorty={koh} />)
    expect(screen.getByRole('button', { name: /Zapisz scenariusz/ })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run components/modules/Symulator.test.tsx`
Expected: FAIL (brak importu).

- [ ] **Step 3: Implement `components/modules/Symulator.tsx`**

```tsx
'use client'
import { useState } from 'react'
import type { Rekrutacja, Kohorta } from '@/types'
import { retentionModel, retentionFraction, linearForecast } from '@/lib/stats'
import { BentoCard } from '@/components/ui/BentoCard'
import { Slider } from '@/components/ui/Slider'

type Props = { rekrutacje: Rekrutacja[]; kohorty: Kohorta[] }

interface Scenario {
  name: string
  przyjeciCR: number
  retencjaPred: number | null
  utrzymani: number
}

export default function Symulator({ rekrutacje, kohorty }: Props) {
  const sorted = [...rekrutacje].sort((a, b) => a.rok - b.rok || (a.sezon === 'wiosna' ? -1 : 1))
  const last = sorted[sorted.length - 1]
  const avgCR = sorted.length
    ? Math.round(
        (sorted.reduce((s, r) => s + (r.zgloszenia > 0 ? (r.przyjeci / r.zgloszenia) * 100 : 0), 0) / sorted.length) * 10,
      ) / 10
    : 50
  const model = retentionModel(kohorty)
  const meanN = model ? Math.round(model.meanNCzl) : 15
  const trend = sorted.length >= 2 ? linearForecast(sorted.map((r) => r.przyjeci), 1)[0] : null

  // Sekcja 1: rekrutacja
  const [zgloszenia, setZgloszenia] = useState(last?.zgloszenia ?? 30)
  const [cr, setCr] = useState(Math.round(avgCR))
  const przyjeciCR = Math.round((zgloszenia * cr) / 100)

  // Sekcja 2: retencja
  const [liczebnosc, setLiczebnosc] = useState(meanN)
  const [sezonJesien, setSezonJesien] = useState(true)
  const retencjaPred = model
    ? Math.round(model.predict(model.nextEdNr, sezonJesien ? 1 : 0, liczebnosc) * 100) / 100
    : null

  // Sekcja 3: utrzymanie
  const [przyjeci2, setPrzyjeci2] = useState(last?.przyjeci ?? 15)
  const [retencja2, setRetencja2] = useState(4)
  const [prog, setProg] = useState(2)
  const utrzymani = Math.round(przyjeci2 * retentionFraction(retencja2, prog))

  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const saveScenario = () => {
    if (scenarios.length >= 3) return
    setScenarios((prev) => [
      ...prev,
      { name: `Scenariusz ${prev.length + 1}`, przyjeciCR, retencjaPred, utrzymani },
    ])
  }

  return (
    <div className="space-y-3">
      <BentoCard title="Symulator „co jeśli"" sub="suwaki przeliczają wynik na żywo" span={4}>
        <div className="grid grid-cols-3 gap-4">
          {/* Rekrutacja */}
          <div className="space-y-2">
            <div className="text-[11px] text-deck-text font-medium">Rekrutacja</div>
            <Slider label="Zgłoszenia" min={0} max={60} value={zgloszenia} onChange={setZgloszenia} />
            <Slider label="CR %" min={0} max={100} value={cr} onChange={setCr} />
            <div className="text-deck-accent text-lg font-semibold tabular">{przyjeciCR} przyjętych</div>
            {trend && <div className="text-[10px] text-deck-muted">trend: ~{trend.yhat} (±{Math.round((trend.hi - trend.yhat) * 10) / 10})</div>}
          </div>

          {/* Retencja */}
          <div className="space-y-2">
            <div className="text-[11px] text-deck-text font-medium">Retencja</div>
            <Slider label="Liczebność" min={1} max={50} value={liczebnosc} onChange={setLiczebnosc} />
            <button
              onClick={() => setSezonJesien((s) => !s)}
              className="text-[11px] px-2 py-1 rounded-md border border-deck-border text-deck-muted"
            >
              Sezon: {sezonJesien ? 'jesień' : 'wiosna'}
            </button>
            <div className="text-deck-violet text-lg font-semibold tabular">
              {retencjaPred != null ? `${retencjaPred} sem` : '—'}
            </div>
            {!model && <div className="text-[10px] text-deck-warn">za mało danych do modelu (≥4 kohort)</div>}
          </div>

          {/* Utrzymanie */}
          <div className="space-y-2">
            <div className="text-[11px] text-deck-text font-medium">Utrzymanie</div>
            <Slider label="Przyjęci" min={0} max={50} value={przyjeci2} onChange={setPrzyjeci2} />
            <Slider label="Avg retencja" min={1} max={10} value={retencja2} onChange={setRetencja2} />
            <Slider label="Próg N sem." min={1} max={10} value={prog} onChange={setProg} />
            <div className="text-deck-accent text-lg font-semibold tabular">{utrzymani} utrzymanych</div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={saveScenario}
            disabled={scenarios.length >= 3}
            className="text-[11px] px-3 py-1 rounded-md border border-deck-accent/40 text-deck-accent disabled:opacity-40"
          >
            Zapisz scenariusz
          </button>
          {scenarios.length > 0 && (
            <button onClick={() => setScenarios([])} className="text-[11px] text-deck-muted">
              wyczyść
            </button>
          )}
        </div>
      </BentoCard>

      {scenarios.length > 0 && (
        <BentoCard title="Porównanie scenariuszy" span={4}>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-deck-muted text-left">
                <th className="py-1">Scenariusz</th>
                <th>Przyjęci (CR)</th>
                <th>Retencja</th>
                <th>Utrzymani</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((s) => (
                <tr key={s.name} className="border-t border-deck-border tabular">
                  <td className="py-1 text-deck-text">{s.name}</td>
                  <td className="text-deck-accent">{s.przyjeciCR}</td>
                  <td className="text-deck-violet">{s.retencjaPred != null ? `${s.retencjaPred} sem` : '—'}</td>
                  <td className="text-deck-accent">{s.utrzymani}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </BentoCard>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run components/modules/Symulator.test.tsx`
Expected: PASS (2).

- [ ] **Step 5: Commit**

```bash
git add components/modules/Symulator.tsx components/modules/Symulator.test.tsx
git commit -m "feat(prognozy): symulator co-jesli (3 sekcje + scenariusze)"
```

---

## Task 5: PrognozyClient + strona

**Files:**
- Create: `components/modules/PrognozyClient.tsx`
- Create: `app/prognozy/page.tsx`

- [ ] **Step 1: Implement `components/modules/PrognozyClient.tsx`**

```tsx
'use client'
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAnalyticsData } from '@/lib/useAnalyticsData'
import { useFilters } from '@/lib/useFilters'
import { applyFilters } from '@/lib/filters'
import { linearForecast, retentionModel } from '@/lib/stats'
import { chartTheme, axisTick, tooltipStyle } from '@/lib/chartTheme'
import { BentoCard } from '@/components/ui/BentoCard'
import Symulator from './Symulator'

export default function PrognozyClient() {
  const { rekrutacje, kohorty, loading } = useAnalyticsData()
  const { filters } = useFilters()
  if (loading) return <p className="text-deck-muted text-sm">Ładowanie…</p>

  const rekr = applyFilters(rekrutacje, filters)
  const koh = applyFilters(kohorty, filters)

  // Prognoza rekrutacji (przyjęci)
  const sorted = [...rekr].sort((a, b) => a.rok - b.rok || (a.sezon === 'wiosna' ? -1 : 1))
  const przyj = sorted.map((r) => r.przyjeci)
  const fc = przyj.length >= 2 ? linearForecast(przyj, 2) : []
  const rekrData: Record<string, number | string | number[]>[] = [
    ...sorted.map((r) => ({ label: r.edycja, hist: r.przyjeci })),
    ...fc.map((p, k) => ({ label: `prog.${k + 1}`, yhat: p.yhat, band: [p.lo, p.hi] as number[] })),
  ]

  // Prognoza retencji
  const model = retentionModel(koh)
  const completed = [...koh].filter((k) => !k.in_progress).sort((a, b) => a.rok - b.rok || (a.sezon === 'wiosna' ? -1 : 1))
  let retData: Record<string, number | string | number[]>[] = []
  if (model) {
    const pred = Math.round(model.predict(model.nextEdNr, 1, model.meanNCzl) * 100) / 100
    const sd = model.residualSd
    retData = [
      ...completed.map((k) => ({ label: k.edycja, hist: k.avg_retention_sem })),
      { label: 'prog.', yhat: pred, band: [Math.max(0, Math.round((pred - sd) * 100) / 100), Math.round((pred + sd) * 100) / 100] as number[] },
    ]
  }

  return (
    <div className="space-y-3">
      <div className="text-[11px] text-deck-warn border border-deck-warn/40 rounded-md px-2 py-1 inline-block">
        Prognozy orientacyjne — mała próba; pas = przedział predykcji
      </div>

      <div className="grid grid-cols-2 gap-3">
        <BentoCard title="Prognoza rekrutacji" sub="przyjęci — historia + 2 edycje">
          {rekrData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={rekrData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis dataKey="label" tick={axisTick} />
                <YAxis tick={axisTick} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area dataKey="band" stroke="none" fill={chartTheme.accent} fillOpacity={0.15} />
                <Line dataKey="hist" stroke={chartTheme.accent} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line dataKey="yhat" stroke={chartTheme.accent} strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[11px] text-deck-muted">Za mało edycji do prognozy.</p>
          )}
        </BentoCard>

        <BentoCard title="Prognoza retencji" sub="avg retencja — historia + następna edycja">
          {model ? (
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={retData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis dataKey="label" tick={axisTick} />
                <YAxis tick={axisTick} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area dataKey="band" stroke="none" fill={chartTheme.violet} fillOpacity={0.15} />
                <Line dataKey="hist" stroke={chartTheme.violet} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line dataKey="yhat" stroke={chartTheme.violet} strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[11px] text-deck-muted">Za mało ukończonych kohort (≥4) do modelu.</p>
          )}
        </BentoCard>
      </div>

      <Symulator rekrutacje={rekr} kohorty={koh} />
    </div>
  )
}
```

- [ ] **Step 2: Create `app/prognozy/page.tsx`**

```tsx
import { Suspense } from 'react'
import PrognozyClient from '@/components/modules/PrognozyClient'

export default function Page() {
  return (
    <Suspense fallback={<p className="text-deck-muted text-sm">Ładowanie…</p>}>
      <PrognozyClient />
    </Suspense>
  )
}
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc clean; `✓ Compiled successfully`; trasa `/prognozy` w wyniku.

- [ ] **Step 4: Commit**

```bash
git add components/modules/PrognozyClient.tsx app/prognozy/page.tsx
git commit -m "feat(prognozy): modul /prognozy (wykresy prognoz + symulator)"
```

---

## Task 6: Finalna weryfikacja

- [ ] **Step 1: Testy**

Run: `npm test`
Expected: wszystkie PASS (poprzednie + forecast, model, Sidebar, Symulator).

- [ ] **Step 2: Typy + build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc clean; build OK.

- [ ] **Step 3: Wizualna weryfikacja**

Run: `npm run dev`, otwórz `http://localhost:3000/prognozy`. Sprawdź: dwa wykresy prognoz z pasem niepewności; symulator — ruch suwaków zmienia wyniki; zapis 2 scenariuszy → tabela porównania. Zatrzymaj serwer.

---

## Notatki dla wykonawcy

- **Reuse:** `mean`, `olsMultiple`, `retentionFraction` z `lib/stats.ts`; `Slider`, `BentoCard`, `chartTheme`, `applyFilters`, `useFilters`, `useAnalyticsData`.
- **recharts range Area:** punkt z wartością `band: [lo, hi]` renderuje pas; punkty historii nie mają `band` (brak pasu tam).
- **Poza zakresem (3b–3d):** redesign Rekrutacje/Komisje, alerty, eksport, zapisy Supabase, nowe grupy KPI.
- Działa na danych demo bez konfiguracji.
```

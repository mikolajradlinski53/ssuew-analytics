# SSUEW Analytics 2.0 — Etap 2 (Lejek · Krzywe retencji · Korelacje) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dodać 3 opisowe moduły analityczne (krzywe przeżycia kohort, Lejek rekrutacyjny, Korelacje międzydomenowe) na fundamencie Etapu 1a, bez zmian schematu Supabase.

**Architecture:** Czysta logika w `lib/stats.ts` (nowe funkcje z testami), prezentacja w klienckich komponentach modułów osadzonych w istniejącym szkielecie (sidebar + filtry w URL + design system Command Deck). Krzywe retencji to aproksymacja wykładnicza z `avg`/`max`. Reuse `applyFilters`, `BentoCard`, `chartTheme`, `pearsonTest`, `zScores`.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Tailwind 4, recharts, Vitest + Testing Library.

**Punkt startu:** gałąź `etap-2-analizy` z `main` (po merge Etapu 1a). Strony `/retencja`, `/lejek`, `/korelacje` to obecnie zaślepki — zostaną zastąpione.

---

## Struktura plików

**Modyfikowane:**
- `lib/stats.ts` — nowe funkcje: `retentionFraction`, `survivalCurve`, `buildFunnel`, `parseSemestr`, `orgKpiByEdition`, `correlationMatrix` + typy `FunnelStage`, `CorrCell`; guard na macierz osobliwą w `olsMultiple`.
- `app/retencja/page.tsx`, `app/lejek/page.tsx`, `app/korelacje/page.tsx` — z zaślepek na realne (Suspense + klient).

**Tworzone:**
- `lib/stats.curves.test.ts`, `lib/stats.funnel.test.ts`, `lib/stats.kpi.test.ts`, `lib/stats.corr.test.ts`, `lib/stats.ols.test.ts`
- `components/ui/Slider.tsx`, `components/ui/Heatmap.tsx`
- `components/modules/RetencjaClient.tsx`, `components/modules/LejekClient.tsx`, `components/modules/KorelacjeClient.tsx`

---

## Task 1: stats — krzywa przeżycia

**Files:**
- Modify: `lib/stats.ts`
- Test: `lib/stats.curves.test.ts`

- [ ] **Step 1: Failing test `lib/stats.curves.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { survivalCurve } from '@/lib/stats'

describe('survivalCurve', () => {
  it('zaczyna od 100% w semestrze 0', () => {
    expect(survivalCurve(4, 8)[0]).toEqual({ sem: 0, pct: 100 })
  })
  it('ma długość max+1 punktów', () => {
    expect(survivalCurve(4, 8)).toHaveLength(9)
  })
  it('spada wykładniczo (avg = średnia rozkładu)', () => {
    const c = survivalCurve(4, 8)
    expect(c[4].pct).toBeCloseTo(36.8, 0) // 100*exp(-1)
  })
  it('dla avg<=0 zwraca 100% w sem 0 i 0% dalej', () => {
    const c = survivalCurve(0, 2)
    expect(c).toEqual([{ sem: 0, pct: 100 }, { sem: 1, pct: 0 }, { sem: 2, pct: 0 }])
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run lib/stats.curves.test.ts`
Expected: FAIL (`survivalCurve` not exported).

- [ ] **Step 3: Add to end of `lib/stats.ts`**

```ts
// ─── Krzywa przeżycia kohort (aproksymacja wykładnicza) ──────────────────────
// S(sem) = exp(−sem / avg). Średnia rozkładu = avg (spójne z avg_retention_sem).

export function retentionFraction(avg: number, sem: number): number {
  if (avg <= 0) return sem <= 0 ? 1 : 0
  return Math.exp(-sem / avg)
}

export function survivalCurve(avg: number, max: number): { sem: number; pct: number }[] {
  const maxSem = Math.max(0, Math.round(max))
  const out: { sem: number; pct: number }[] = []
  for (let s = 0; s <= maxSem; s++) {
    out.push({ sem: s, pct: Math.round(100 * retentionFraction(avg, s) * 10) / 10 })
  }
  return out
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run lib/stats.curves.test.ts`
Expected: PASS (4).

- [ ] **Step 5: Commit**

```bash
git add lib/stats.ts lib/stats.curves.test.ts
git commit -m "feat(stats): krzywa przezycia kohort (survivalCurve)"
```

---

## Task 2: stats — lejek

**Files:**
- Modify: `lib/stats.ts`
- Test: `lib/stats.funnel.test.ts`

- [ ] **Step 1: Failing test `lib/stats.funnel.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { buildFunnel } from '@/lib/stats'
import type { Rekrutacja, Kohorta } from '@/types'

const rekr: Rekrutacja[] = [
  { id: '1', edycja: "J'24", sezon: 'jesien', rok: 2024, zgloszenia: 40, przyjeci: 20, created_at: '' },
  { id: '2', edycja: "W'25", sezon: 'wiosna', rok: 2025, zgloszenia: 10, przyjeci: 8, created_at: '' },
]
const koh: Kohorta[] = [
  { id: '1', edycja: "J'24", sezon: 'jesien', rok: 2024, n_czlonkow: 20, avg_retention_sem: 4, max_retention_sem: 8, in_progress: false, created_at: '' },
]

describe('buildFunnel', () => {
  it('agreguje wszystkie edycje i liczy % względem zgłoszeń', () => {
    const f = buildFunnel(rekr, koh, { threshold: 1 })
    expect(f[0]).toMatchObject({ stage: 'Zgłoszenia', count: 50, pct: 100 })
    expect(f[1]).toMatchObject({ stage: 'Przyjęci', count: 28 })
    expect(f[2]).toMatchObject({ stage: 'Aktywni', count: 20 }) // tylko J'24 ma kohortę
  })
  it('liczy utrzymanych z modelu przeżycia przy progu', () => {
    const f = buildFunnel(rekr, koh, { threshold: 4 })
    // 20 * exp(-1) ≈ 7.36 → 7
    expect(f[3]).toMatchObject({ stage: 'Utrzymani po 4 sem.', count: 7 })
  })
  it('filtruje do jednej edycji', () => {
    const f = buildFunnel(rekr, koh, { edycja: "W'25", threshold: 1 })
    expect(f[0].count).toBe(10)
    expect(f[2].count).toBe(0) // brak kohorty dla W'25
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run lib/stats.funnel.test.ts`
Expected: FAIL (`buildFunnel` not exported).

- [ ] **Step 3: Add to `lib/stats.ts`**

```ts
// ─── Lejek rekrutacyjny ──────────────────────────────────────────────────────

export interface FunnelStage {
  stage: string
  count: number
  pct: number
}

export function buildFunnel(
  rekr: Rekrutacja[],
  koh: Kohorta[],
  opts: { edycja?: string; threshold: number },
): FunnelStage[] {
  const kohByEd = new Map(koh.map((k) => [k.edycja, k]))
  const rows = opts.edycja ? rekr.filter((r) => r.edycja === opts.edycja) : rekr

  let zgloszenia = 0
  let przyjeci = 0
  let aktywni = 0
  let utrzymani = 0
  for (const r of rows) {
    zgloszenia += r.zgloszenia
    przyjeci += r.przyjeci
    const k = kohByEd.get(r.edycja)
    if (k) {
      aktywni += k.n_czlonkow
      utrzymani += Math.round(k.n_czlonkow * retentionFraction(k.avg_retention_sem, opts.threshold))
    }
  }

  const raw = [
    { stage: 'Zgłoszenia', count: zgloszenia },
    { stage: 'Przyjęci', count: przyjeci },
    { stage: 'Aktywni', count: aktywni },
    { stage: `Utrzymani po ${opts.threshold} sem.`, count: utrzymani },
  ]
  return raw.map((s) => ({
    ...s,
    pct: zgloszenia > 0 ? Math.round((s.count / zgloszenia) * 1000) / 10 : 0,
  }))
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run lib/stats.funnel.test.ts`
Expected: PASS (3).

- [ ] **Step 5: Commit**

```bash
git add lib/stats.ts lib/stats.funnel.test.ts
git commit -m "feat(stats): lejek rekrutacyjny (buildFunnel)"
```

---

## Task 3: stats — mapowanie semestru i agregat KPI

**Files:**
- Modify: `lib/stats.ts`
- Test: `lib/stats.kpi.test.ts`

- [ ] **Step 1: Failing test `lib/stats.kpi.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { parseSemestr, orgKpiByEdition } from '@/lib/stats'
import type { KpiPeriod } from '@/types'

describe('parseSemestr', () => {
  it('letni → wiosna następnego roku', () => {
    expect(parseSemestr('letni 2025/2026')).toEqual({ sezon: 'wiosna', rok: 2026 })
  })
  it('zimowy → jesień pierwszego roku', () => {
    expect(parseSemestr('zimowy 2025/2026')).toEqual({ sezon: 'jesien', rok: 2025 })
  })
  it('nierozpoznany → null', () => {
    expect(parseSemestr('coś dziwnego')).toBeNull()
  })
})

describe('orgKpiByEdition', () => {
  const periods: KpiPeriod[] = [
    { id: 'a', komisja_id: 'k1', semestr: 'letni 2025/2026', projekty_planowane: 10, projekty_zrealizowane: 8, notatka: null, created_at: '' },
    { id: 'b', komisja_id: 'k2', semestr: 'letni 2025/2026', projekty_planowane: 10, projekty_zrealizowane: 6, notatka: null, created_at: '' },
  ]
  it('średnia realizacji per okres, mapowana na edycję', () => {
    const m = orgKpiByEdition(periods)
    expect(m.get('wiosna-2026')).toBe(70) // (80 + 60) / 2
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run lib/stats.kpi.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add to `lib/stats.ts`** (import `Sezon` is already covered — `KpiPeriod`/`Sezon` come from `@/types`; ensure the top import line includes them — see note)

```ts
// ─── Mapowanie semestru KPI na edycję + agregat organizacyjny ────────────────

export function parseSemestr(s: string): { sezon: Sezon; rok: number } | null {
  const m = s.trim().toLowerCase().match(/^(letni|zimowy)\s+(\d{4})\/\d{4}$/)
  if (!m) return null
  const typ = m[1]
  const y1 = Number(m[2])
  return typ === 'zimowy' ? { sezon: 'jesien', rok: y1 } : { sezon: 'wiosna', rok: y1 + 1 }
}

export function orgKpiByEdition(periods: KpiPeriod[]): Map<string, number> {
  const bySem = new Map<string, number[]>()
  for (const p of periods) {
    if (p.projekty_planowane <= 0) continue
    const pct = (p.projekty_zrealizowane / p.projekty_planowane) * 100
    const arr = bySem.get(p.semestr) ?? []
    arr.push(pct)
    bySem.set(p.semestr, arr)
  }
  const out = new Map<string, number>()
  for (const [sem, arr] of bySem) {
    const ed = parseSemestr(sem)
    if (!ed) continue
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length
    out.set(`${ed.sezon}-${ed.rok}`, Math.round(avg * 10) / 10)
  }
  return out
}
```

**Note:** The first line of `lib/stats.ts` currently is:
`import type { Rekrutacja, Kohorta, KpiPeriod, StatResult, RegressionResult } from '@/types'`
Change it to also import `Sezon`:
`import type { Rekrutacja, Kohorta, KpiPeriod, StatResult, RegressionResult, Sezon } from '@/types'`

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run lib/stats.kpi.test.ts`
Expected: PASS (4).

- [ ] **Step 5: Commit**

```bash
git add lib/stats.ts lib/stats.kpi.test.ts
git commit -m "feat(stats): parseSemestr + orgKpiByEdition"
```

---

## Task 4: stats — macierz korelacji

**Files:**
- Modify: `lib/stats.ts`
- Test: `lib/stats.corr.test.ts`

- [ ] **Step 1: Failing test `lib/stats.corr.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { correlationMatrix } from '@/lib/stats'

describe('correlationMatrix', () => {
  const rows = [
    { x: 1, y: 2, z: 1 },
    { x: 2, y: 4, z: 1 },
    { x: 3, y: 6, z: 1 },
    { x: 4, y: 8, z: 2 },
  ]
  it('przekątna = 1', () => {
    const cells = correlationMatrix(rows, ['x', 'y'])
    expect(cells.find((c) => c.a === 'x' && c.b === 'x')?.r).toBe(1)
  })
  it('x i y idealnie skorelowane → r ≈ 1', () => {
    const cells = correlationMatrix(rows, ['x', 'y'])
    const r = cells.find((c) => c.a === 'x' && c.b === 'y')?.r
    expect(r).toBeCloseTo(1, 5)
  })
  it('za mało wspólnych wartości → r = null', () => {
    const sparse = [{ a: 1, b: null }, { a: 2, b: null }, { a: 3, b: 5 }] as Record<string, number | null>[]
    const cells = correlationMatrix(sparse, ['a', 'b'])
    expect(cells.find((c) => c.a === 'a' && c.b === 'b')?.r).toBeNull()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run lib/stats.corr.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add to `lib/stats.ts`**

```ts
// ─── Macierz korelacji ───────────────────────────────────────────────────────

export interface CorrCell {
  a: string
  b: string
  r: number | null
  significant: boolean
}

export function correlationMatrix(
  rows: Record<string, number | null>[],
  vars: string[],
): CorrCell[] {
  const cells: CorrCell[] = []
  for (const a of vars) {
    for (const b of vars) {
      if (a === b) {
        cells.push({ a, b, r: 1, significant: true })
        continue
      }
      const pairs = rows
        .map((row) => [row[a], row[b]] as const)
        .filter(([x, y]) => x != null && y != null) as [number, number][]
      if (pairs.length < 3) {
        cells.push({ a, b, r: null, significant: false })
        continue
      }
      const res = pearsonTest(pairs.map((p) => p[0]), pairs.map((p) => p[1]))
      cells.push({ a, b, r: res.r, significant: res.significant })
    }
  }
  return cells
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run lib/stats.corr.test.ts`
Expected: PASS (3).

- [ ] **Step 5: Commit**

```bash
git add lib/stats.ts lib/stats.corr.test.ts
git commit -m "feat(stats): macierz korelacji (correlationMatrix)"
```

---

## Task 5: stats — guard na macierz osobliwą w OLS

**Files:**
- Modify: `lib/stats.ts` (funkcja `olsMultiple`)
- Test: `lib/stats.ols.test.ts`

- [ ] **Step 1: Failing test `lib/stats.ols.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { olsMultiple } from '@/lib/stats'

describe('olsMultiple — macierz osobliwa', () => {
  it('nie zwraca NaN przy współliniowych kolumnach', () => {
    // dwie identyczne kolumny → X^T X osobliwa
    const col = [1, 2, 3, 4]
    const res = olsMultiple([col, [...col]], [1, 2, 3, 4], [])
    expect(res.betas.every((b) => Number.isFinite(b))).toBe(true)
    expect(Number.isFinite(res.r2)).toBe(true)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run lib/stats.ols.test.ts`
Expected: FAIL (betas zawierają NaN/Infinity).

- [ ] **Step 3: Modify `olsMultiple` in `lib/stats.ts`** — find:

```ts
  const betas_mat = matMul(XtXinv, Xty)
  const betas = betas_mat.map(r => r[0])

  const yhat = X.map(row => betas.reduce((s, b, j) => s + b * row[j], 0))
```

replace with:

```ts
  const betas_mat = matMul(XtXinv, Xty)
  let betas = betas_mat.map(r => r[0])

  // Guard: współliniowe dane → macierz osobliwa → NaN/Infinity. Zwróć degenerację,
  // którą caller (np. analyzeRetention) zgłosi jako słabe dopasowanie (r2=0).
  if (betas.some(b => !Number.isFinite(b))) {
    const my0 = mean(y)
    return { betas: new Array(X_raw.length).fill(0), r2: 0, yhat: y.map(() => my0) }
  }

  const yhat = X.map(row => betas.reduce((s, b, j) => s + b * row[j], 0))
```

(Leave the rest of the function unchanged. `betas` is reassigned only via `let`; the trailing `return { betas: betas.slice(1), ... }` stays.)

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run lib/stats.ols.test.ts`
Expected: PASS (1).

- [ ] **Step 5: Full stats suite + commit**

Run: `npx vitest run lib/`
Expected: all PASS.

```bash
git add lib/stats.ts lib/stats.ols.test.ts
git commit -m "fix(stats): guard na macierz osobliwa w olsMultiple"
```

---

## Task 6: UI — Slider + Heatmap

**Files:**
- Create: `components/ui/Slider.tsx`, `components/ui/Slider.test.tsx`
- Create: `components/ui/Heatmap.tsx`, `components/ui/Heatmap.test.tsx`

- [ ] **Step 1: Failing tests**

`components/ui/Slider.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Slider } from '@/components/ui/Slider'

describe('Slider', () => {
  it('pokazuje etykietę i wartość', () => {
    render(<Slider label="Próg" min={1} max={8} value={3} onChange={() => {}} />)
    expect(screen.getByText('Próg')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})
```

`components/ui/Heatmap.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Heatmap } from '@/components/ui/Heatmap'
import type { CorrCell } from '@/lib/stats'

describe('Heatmap', () => {
  it('renderuje wartości r komórek', () => {
    const cells: CorrCell[] = [
      { a: 'x', b: 'x', r: 1, significant: true },
      { a: 'x', b: 'y', r: 0.5, significant: false },
      { a: 'y', b: 'x', r: 0.5, significant: false },
      { a: 'y', b: 'y', r: 1, significant: true },
    ]
    render(<Heatmap vars={['x', 'y']} cells={cells} />)
    expect(screen.getAllByText('0.50').length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run components/ui/Slider.test.tsx components/ui/Heatmap.test.tsx`
Expected: FAIL (imports missing).

- [ ] **Step 3: Implement `components/ui/Slider.tsx`**

```tsx
'use client'

type Props = {
  label: string
  min: number
  max: number
  value: number
  onChange: (v: number) => void
}

export function Slider({ label, min, max, value, onChange }: Props) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-deck-muted">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-deck-accent"
      />
      <span className="text-deck-text tabular-nums w-6 text-right">{value}</span>
    </label>
  )
}
```

- [ ] **Step 4: Implement `components/ui/Heatmap.tsx`**

```tsx
'use client'
import type { CorrCell } from '@/lib/stats'

function cellColor(r: number | null): string {
  if (r == null) return 'transparent'
  const mag = Math.min(1, Math.abs(r))
  return r >= 0 ? `rgba(46,230,166,${mag})` : `rgba(255,138,138,${mag})`
}

type Props = {
  vars: string[]
  cells: CorrCell[]
  onSelect?: (a: string, b: string) => void
}

export function Heatmap({ vars, cells, onSelect }: Props) {
  const get = (a: string, b: string) => cells.find((c) => c.a === a && c.b === b)
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-[10px]">
        <thead>
          <tr>
            <th className="p-1" />
            {vars.map((v) => (
              <th key={v} className="p-1 text-deck-muted font-normal align-bottom">
                {v}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {vars.map((a) => (
            <tr key={a}>
              <td className="p-1 text-deck-muted text-right whitespace-nowrap">{a}</td>
              {vars.map((b) => {
                const c = get(a, b)
                const r = c?.r ?? null
                return (
                  <td
                    key={b}
                    onClick={() => onSelect?.(a, b)}
                    className="w-12 h-8 text-center cursor-pointer border border-deck-border tabular-nums text-deck-text"
                    style={{ background: cellColor(r) }}
                    title={`${a} ↔ ${b}: ${r == null ? '—' : r.toFixed(2)}`}
                  >
                    {r == null ? '—' : r.toFixed(2)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 5: Run — expect PASS**

Run: `npx vitest run components/ui/Slider.test.tsx components/ui/Heatmap.test.tsx`
Expected: PASS (2).

- [ ] **Step 6: Commit**

```bash
git add components/ui/Slider.tsx components/ui/Slider.test.tsx components/ui/Heatmap.tsx components/ui/Heatmap.test.tsx
git commit -m "feat(ui): komponenty Slider i Heatmap"
```

---

## Task 7: Moduł Retencja (krzywe przeżycia)

**Files:**
- Create: `components/modules/RetencjaClient.tsx`
- Modify: `app/retencja/page.tsx`

- [ ] **Step 1: Implement `components/modules/RetencjaClient.tsx`**

```tsx
'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useAnalyticsData } from '@/lib/useAnalyticsData'
import { useFilters } from '@/lib/useFilters'
import { applyFilters } from '@/lib/filters'
import { survivalCurve, analyzeRetention } from '@/lib/stats'
import { chartTheme, axisTick, tooltipStyle } from '@/lib/chartTheme'
import { BentoCard } from '@/components/ui/BentoCard'

export default function RetencjaClient() {
  const { kohorty, loading } = useAnalyticsData()
  const { filters } = useFilters()
  if (loading) return <p className="text-deck-muted text-sm">Ładowanie…</p>

  const koh = applyFilters(kohorty, filters)
  const reg = analyzeRetention(koh)

  // Wspólna oś semestrów = najdłuższa krzywa
  const maxSem = Math.max(0, ...koh.map((k) => Math.round(k.max_retention_sem)))
  const data: Record<string, number | string>[] = []
  for (let s = 0; s <= maxSem; s++) {
    const row: Record<string, number | string> = { sem: s }
    for (const k of koh) {
      const pt = survivalCurve(k.avg_retention_sem, k.max_retention_sem).find((p) => p.sem === s)
      if (pt) row[k.edycja] = pt.pct
    }
    data.push(row)
  }

  return (
    <div className="space-y-3">
      <div className="text-[11px] text-deck-warn border border-deck-warn/40 rounded-md px-2 py-1 inline-block">
        Krzywe to szacunek (model wykładniczy) — brak pomiaru per semestr
      </div>

      <BentoCard title="Krzywe przeżycia kohort" sub="% aktywnych w kolejnych semestrach" span={4}>
        {koh.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="sem" tick={axisTick} label={{ value: 'semestr', position: 'insideBottom', offset: -2, fontSize: 10, fill: chartTheme.axis }} />
              <YAxis tick={axisTick} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {koh.map((k, i) => (
                <Line
                  key={k.edycja}
                  type="monotone"
                  dataKey={k.edycja}
                  stroke={chartTheme.series[i % chartTheme.series.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-[11px] text-deck-muted">Brak kohort dla wybranych filtrów.</p>
        )}
      </BentoCard>

      <BentoCard title="Model regresji (OLS)" sub="trend, sezon, liczebność → retencja" span={4}>
        {reg.coefficients.length ? (
          <div className="space-y-2">
            {reg.coefficients.map((c) => (
              <div key={c.name} className="text-[11px]">
                <span className="text-deck-text">{c.name}: </span>
                <span className="tabular-nums text-deck-accent">β = {c.beta.toFixed(3)}</span>
                <span className="text-deck-muted"> — {c.interpretation}</span>
              </div>
            ))}
            <div className="text-[11px] text-deck-muted">
              R² = {(reg.r2 * 100).toFixed(0)}% · prognoza następnej edycji: {reg.prediction} sem.
            </div>
            {reg.warning && <div className="text-[11px] text-deck-warn">{reg.warning}</div>}
          </div>
        ) : (
          <p className="text-[11px] text-deck-muted">{reg.warning ?? 'Brak danych.'}</p>
        )}
      </BentoCard>
    </div>
  )
}
```

- [ ] **Step 2: Replace `app/retencja/page.tsx`**

```tsx
import { Suspense } from 'react'
import RetencjaClient from '@/components/modules/RetencjaClient'

export default function Page() {
  return (
    <Suspense fallback={<p className="text-deck-muted text-sm">Ładowanie…</p>}>
      <RetencjaClient />
    </Suspense>
  )
}
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc clean; `✓ Compiled successfully`.

- [ ] **Step 4: Commit**

```bash
git add components/modules/RetencjaClient.tsx app/retencja/page.tsx
git commit -m "feat(retencja): krzywe przezycia kohort + OLS"
```

---

## Task 8: Moduł Lejek

**Files:**
- Create: `components/modules/LejekClient.tsx`
- Modify: `app/lejek/page.tsx`

- [ ] **Step 1: Implement `components/modules/LejekClient.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { useAnalyticsData } from '@/lib/useAnalyticsData'
import { useFilters } from '@/lib/useFilters'
import { applyFilters } from '@/lib/filters'
import { buildFunnel } from '@/lib/stats'
import { BentoCard } from '@/components/ui/BentoCard'
import { Slider } from '@/components/ui/Slider'

export default function LejekClient() {
  const { rekrutacje, kohorty, loading } = useAnalyticsData()
  const { filters } = useFilters()
  const [perEdycja, setPerEdycja] = useState(false)
  const [edycja, setEdycja] = useState<string>('')
  const [threshold, setThreshold] = useState(2)

  if (loading) return <p className="text-deck-muted text-sm">Ładowanie…</p>

  const rekr = applyFilters(rekrutacje, filters)
  const koh = applyFilters(kohorty, filters)
  const maxThreshold = Math.max(1, ...koh.map((k) => Math.round(k.max_retention_sem)))
  const chosen = perEdycja && edycja ? edycja : undefined
  const funnel = buildFunnel(rekr, koh, { edycja: chosen, threshold })

  // największy spadek między kolejnymi etapami
  let worstIdx = -1
  let worstDrop = -1
  for (let i = 1; i < funnel.length; i++) {
    const prev = funnel[i - 1].count
    const drop = prev > 0 ? (prev - funnel[i].count) / prev : 0
    if (drop > worstDrop) {
      worstDrop = drop
      worstIdx = i
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-2">
          <button
            onClick={() => setPerEdycja(false)}
            className={`text-[11px] px-3 py-1 rounded-md border ${!perEdycja ? 'bg-deck-accent/10 text-deck-accent border-deck-accent/40' : 'text-deck-muted border-deck-border'}`}
          >
            Zagregowany
          </button>
          <button
            onClick={() => setPerEdycja(true)}
            className={`text-[11px] px-3 py-1 rounded-md border ${perEdycja ? 'bg-deck-accent/10 text-deck-accent border-deck-accent/40' : 'text-deck-muted border-deck-border'}`}
          >
            Per edycja
          </button>
        </div>
        {perEdycja && (
          <select
            value={edycja}
            onChange={(e) => setEdycja(e.target.value)}
            className="bg-deck-panel border border-deck-border text-deck-muted text-[11px] rounded-md px-2 py-1"
          >
            <option value="">Wybierz edycję…</option>
            {rekr.map((r) => (
              <option key={r.id} value={r.edycja}>{r.edycja}</option>
            ))}
          </select>
        )}
        <Slider label="Próg utrzymania (sem.)" min={1} max={maxThreshold} value={threshold} onChange={setThreshold} />
      </div>

      <BentoCard title="Lejek rekrutacyjny" sub={perEdycja && edycja ? `edycja ${edycja}` : 'wszystkie edycje (po filtrach)'} span={4}>
        <div className="space-y-2">
          {funnel.map((s, i) => (
            <div key={s.stage} className="flex items-center gap-3">
              <span className="text-[11px] text-deck-muted w-40 shrink-0">{s.stage}</span>
              <div className="flex-1 bg-deck-bg rounded h-6 relative overflow-hidden border border-deck-border">
                <div
                  className={`h-full ${i === worstIdx ? 'bg-deck-danger/60' : 'bg-deck-accent/50'}`}
                  style={{ width: `${s.pct}%` }}
                />
                <span className="absolute inset-0 flex items-center px-2 text-[11px] text-deck-text tabular-nums">
                  {s.count} · {s.pct}%
                </span>
              </div>
            </div>
          ))}
        </div>
        {worstIdx > 0 && (
          <p className="text-[11px] text-deck-warn mt-3">
            Największy spadek: {funnel[worstIdx - 1].stage} → {funnel[worstIdx].stage}
            {' '}(−{Math.round(worstDrop * 100)}%)
          </p>
        )}
      </BentoCard>
    </div>
  )
}
```

- [ ] **Step 2: Replace `app/lejek/page.tsx`**

```tsx
import { Suspense } from 'react'
import LejekClient from '@/components/modules/LejekClient'

export default function Page() {
  return (
    <Suspense fallback={<p className="text-deck-muted text-sm">Ładowanie…</p>}>
      <LejekClient />
    </Suspense>
  )
}
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc clean; build OK.

- [ ] **Step 4: Commit**

```bash
git add components/modules/LejekClient.tsx app/lejek/page.tsx
git commit -m "feat(lejek): lejek rekrutacyjny (oba widoki + suwak progu)"
```

---

## Task 9: Moduł Korelacje

**Files:**
- Create: `components/modules/KorelacjeClient.tsx`
- Modify: `app/korelacje/page.tsx`

- [ ] **Step 1: Implement `components/modules/KorelacjeClient.tsx`**

```tsx
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

  const realizacje = kpiPeriods.filter((p) => p.projekty_planowane > 0).map((p) => (p.projekty_zrealizowane / p.projekty_planowane) * 100)
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
```

- [ ] **Step 2: Replace `app/korelacje/page.tsx`**

```tsx
import { Suspense } from 'react'
import KorelacjeClient from '@/components/modules/KorelacjeClient'

export default function Page() {
  return (
    <Suspense fallback={<p className="text-deck-muted text-sm">Ładowanie…</p>}>
      <KorelacjeClient />
    </Suspense>
  )
}
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc clean; build OK.

- [ ] **Step 4: Commit**

```bash
git add components/modules/KorelacjeClient.tsx app/korelacje/page.tsx
git commit -m "feat(korelacje): macierz glowna (z KPI) + widok wewnatrz-KPI + scatter"
```

---

## Task 10: Finalna weryfikacja

- [ ] **Step 1: Testy**

Run: `npm test`
Expected: wszystkie pliki PASS (Etap 1a + nowe: curves, funnel, kpi, corr, ols, Slider, Heatmap).

- [ ] **Step 2: Typy + build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc clean; build OK; trasy `/retencja`, `/lejek`, `/korelacje` w wyniku.

- [ ] **Step 3: Wizualna weryfikacja**

Run: `npm run dev`, otwórz `http://localhost:3000`, sprawdź `/retencja` (krzywe), `/lejek` (przełącznik + suwak), `/korelacje` (heatmapa, klik → scatter). Zatrzymaj serwer.

---

## Notatki dla wykonawcy

- **Reuse:** `pearsonTest`, `zScores`, `analyzeRetention`, `mean` z `lib/stats.ts`; `applyFilters`, `BentoCard`, `chartTheme` z Etapu 1a. Nie duplikuj.
- **Poza zakresem (Etap 3):** prognozy z przedziałem niepewności, symulator „co jeśli", pełny redesign Rekrutacji/Komisji, Alerty, eksport, nowe grupy KPI, realne zapisy do Supabase.
- Tryb demo działa bez konfiguracji (dane z `useAnalyticsData`).
```

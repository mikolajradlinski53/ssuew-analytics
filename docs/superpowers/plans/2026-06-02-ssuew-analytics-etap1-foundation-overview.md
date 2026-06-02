# SSUEW Analytics 2.0 — Etap 1a: Fundament + Przegląd — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zbudować ciemny design system „Command Deck", szkielet aplikacji (sidebar + globalne filtry w URL + routing) oraz interaktywną stronę startową „Przegląd" (bento) na danych demo/Supabase.

**Architecture:** Next.js 16 App Router. Root layout renderuje `AppShell` (sidebar + górny pasek z filtrami). Filtry trzymane w query params URL i czytane przez hook `useFilters`. Komponenty UI (KpiTile, BentoCard) tworzą bibliotekę design systemu opartą o tokeny Tailwind 4 (`@theme`). Strona Przegląd agreguje dane czystą funkcją `computeOverview` i renderuje kafelki bento + wykresy recharts w ciemnym motywie. Logika (filtry, agregacja, komponenty prezentacyjne) testowana Vitest + Testing Library; warstwa wizualna weryfikowana uruchomieniem aplikacji.

**Tech Stack:** Next.js 16, React 19, TypeScript 5 (strict), Tailwind CSS 4, recharts, Supabase (istniejący hook), Vitest + @testing-library/react + jsdom.

**Reużywane z istniejącego kodu:** `lib/stats.ts` (`mean`, `analyzeKomisje`), `lib/useAnalyticsData.ts` (hook + `DEMO_*`), `types/index.ts` (`Rekrutacja`, `Kohorta`, `Komisja`, `KpiPeriod`, `Sezon`).

---

## Struktura plików (co powstaje / zmienia się)

**Tworzone:**
- `vitest.config.ts` — konfiguracja testów
- `vitest.setup.ts` — matchery jest-dom
- `lib/filters.ts` — typy filtrów + czyste funkcje parse/build/apply
- `lib/filters.test.ts`
- `lib/useFilters.ts` — hook czytający/zapisujący filtry w URL
- `lib/chartTheme.ts` — kolory/osie wykresów (ciemny motyw)
- `lib/overview.ts` — agregacja metryk Przeglądu
- `lib/overview.test.ts`
- `components/ui/KpiTile.tsx` + `KpiTile.test.tsx`
- `components/ui/BentoCard.tsx` + `BentoCard.test.tsx`
- `components/ui/Sidebar.tsx` + `Sidebar.test.tsx`
- `components/ui/FilterBar.tsx`
- `components/ui/AppShell.tsx`
- `components/modules/OverviewClient.tsx` — bento strony startowej
- `app/rekrutacje/page.tsx`, `app/retencja/page.tsx`, `app/komisje/page.tsx`, `app/lejek/page.tsx`, `app/korelacje/page.tsx`, `app/alerty/page.tsx`, `app/wpis/page.tsx` — strony-zaślepki

**Modyfikowane:**
- `package.json` — skrypty testów + devDependencies
- `app/globals.css` — tokeny Command Deck
- `app/layout.tsx` — owinięcie w `AppShell`
- `app/page.tsx` — strona Przegląd (Suspense + OverviewClient)

**Bez zmian (użyte później):** istniejące `components/modules/Dashboard.tsx`, `Module*.tsx` zostają w repo do przebudowy w kolejnych planach.

---

## Task 1: Konfiguracja testów (Vitest)

**Files:**
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `lib/smoke.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Zainstaluj zależności testowe**

Run:
```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom
```
Expected: pakiety dodane do `devDependencies`, brak błędów.

- [ ] **Step 2: Utwórz `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
  },
  resolve: {
    alias: { '@': resolve(__dirname, '.') },
  },
})
```

- [ ] **Step 3: Utwórz `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 4: Dodaj skrypty testów w `package.json`**

Zmień blok `"scripts"` tak, by zawierał:
```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
```

- [ ] **Step 5: Napisz test dymny `lib/smoke.test.ts`**

```ts
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('środowisko testowe działa', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 6: Uruchom testy — mają przejść**

Run: `npm test`
Expected: PASS, 1 plik testowy, 1 test zielony.

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts vitest.setup.ts lib/smoke.test.ts package.json package-lock.json
git commit -m "test: konfiguracja Vitest + Testing Library"
```

---

## Task 2: Tokeny design systemu „Command Deck"

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Zastąp całą zawartość `app/globals.css`**

```css
@import "tailwindcss";

@theme {
  --color-deck-bg: #0E1116;
  --color-deck-bg-deep: #090B0E;
  --color-deck-panel: #161B22;
  --color-deck-border: #21262D;
  --color-deck-text: #E6EDF3;
  --color-deck-muted: #7D8590;
  --color-deck-accent: #2EE6A6;
  --color-deck-violet: #8B7CF6;
  --color-deck-danger: #ff8a8a;
  --color-deck-danger-bg: #2a1416;
  --color-deck-danger-border: #5c2a2e;
  --color-deck-warn: #d9b06a;

  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
}

body {
  background: var(--color-deck-bg-deep);
  color: var(--color-deck-text);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}

.tabular {
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 2: Zweryfikuj, że Tailwind kompiluje tokeny**

Run: `npm run build`
Expected: `✓ Compiled successfully`, brak błędów CSS/Tailwind. (Strona może chwilowo wyglądać surowo — to OK, layout zmieniamy w Task 7.)

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(ui): tokeny design systemu Command Deck"
```

---

## Task 3: Motyw wykresów

**Files:**
- Create: `lib/chartTheme.ts`

- [ ] **Step 1: Utwórz `lib/chartTheme.ts`**

```ts
// Ciemny motyw dla wykresów recharts — jedno miejsce na kolory/osie.
export const chartTheme = {
  grid: '#21262D',
  axis: '#7D8590',
  accent: '#2EE6A6',
  violet: '#8B7CF6',
  // [accent, violet, błękit, złoto] — kolejne serie
  series: ['#2EE6A6', '#8B7CF6', '#B5D4F4', '#d9b06a'],
} as const

export const axisTick = { fontSize: 11, fill: chartTheme.axis } as const

export const tooltipStyle = {
  background: '#161B22',
  border: '1px solid #21262D',
  borderRadius: 8,
  fontSize: 12,
  color: '#E6EDF3',
} as const
```

- [ ] **Step 2: Commit**

```bash
git add lib/chartTheme.ts
git commit -m "feat(ui): ciemny motyw wykresow recharts"
```

---

## Task 4: Komponent `KpiTile`

**Files:**
- Create: `components/ui/KpiTile.tsx`
- Test: `components/ui/KpiTile.test.tsx`

- [ ] **Step 1: Napisz failing test `components/ui/KpiTile.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { KpiTile } from '@/components/ui/KpiTile'

describe('KpiTile', () => {
  it('renderuje etykietę, wartość i podtekst', () => {
    render(<KpiTile label="Conversion" value="77.9%" sub="avg" />)
    expect(screen.getByText('Conversion')).toBeInTheDocument()
    expect(screen.getByText('77.9%')).toBeInTheDocument()
    expect(screen.getByText('avg')).toBeInTheDocument()
  })

  it('stosuje klasę koloru akcentu', () => {
    render(<KpiTile label="X" value="1" accent="accent" />)
    expect(screen.getByText('1').className).toContain('text-deck-accent')
  })
})
```

- [ ] **Step 2: Uruchom test — ma się NIE powieść**

Run: `npx vitest run components/ui/KpiTile.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/ui/KpiTile"`.

- [ ] **Step 3: Zaimplementuj `components/ui/KpiTile.tsx`**

```tsx
import type { ReactNode } from 'react'

type Accent = 'accent' | 'violet' | 'default'

type Props = {
  label: string
  value: ReactNode
  sub?: string
  accent?: Accent
}

const valueColor: Record<Accent, string> = {
  accent: 'text-deck-accent',
  violet: 'text-deck-violet',
  default: 'text-deck-text',
}

export function KpiTile({ label, value, sub, accent = 'default' }: Props) {
  return (
    <div className="bg-deck-panel border border-deck-border rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wide text-deck-muted">{label}</div>
      <div className={`text-2xl font-semibold tabular ${valueColor[accent]}`}>{value}</div>
      {sub && <div className="text-[10px] text-deck-muted mt-0.5">{sub}</div>}
    </div>
  )
}
```

- [ ] **Step 4: Uruchom test — ma przejść**

Run: `npx vitest run components/ui/KpiTile.test.tsx`
Expected: PASS (2 testy).

- [ ] **Step 5: Commit**

```bash
git add components/ui/KpiTile.tsx components/ui/KpiTile.test.tsx
git commit -m "feat(ui): komponent KpiTile"
```

---

## Task 5: Komponent `BentoCard`

**Files:**
- Create: `components/ui/BentoCard.tsx`
- Test: `components/ui/BentoCard.test.tsx`

- [ ] **Step 1: Napisz failing test `components/ui/BentoCard.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { BentoCard } from '@/components/ui/BentoCard'

describe('BentoCard', () => {
  it('renderuje tytuł i dzieci', () => {
    render(<BentoCard title="Komisje"><span>treść</span></BentoCard>)
    expect(screen.getByText('Komisje')).toBeInTheDocument()
    expect(screen.getByText('treść')).toBeInTheDocument()
  })

  it('dodaje klasę col-span przy span=2', () => {
    const { container } = render(<BentoCard span={2}>x</BentoCard>)
    expect(container.firstElementChild?.className).toContain('col-span-2')
  })

  it('stosuje styl danger', () => {
    const { container } = render(<BentoCard tone="danger">x</BentoCard>)
    expect(container.firstElementChild?.className).toContain('bg-deck-danger-bg')
  })
})
```

- [ ] **Step 2: Uruchom test — ma się NIE powieść**

Run: `npx vitest run components/ui/BentoCard.test.tsx`
Expected: FAIL — nie można rozwiązać importu `@/components/ui/BentoCard`.

- [ ] **Step 3: Zaimplementuj `components/ui/BentoCard.tsx`**

```tsx
import type { ReactNode } from 'react'

type Props = {
  title?: string
  sub?: string
  span?: 1 | 2 | 3 | 4
  tone?: 'default' | 'danger'
  className?: string
  children: ReactNode
}

const spanClass: Record<NonNullable<Props['span']>, string> = {
  1: '',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
}

export function BentoCard({ title, sub, span = 1, tone = 'default', className = '', children }: Props) {
  const toneClass =
    tone === 'danger'
      ? 'bg-deck-danger-bg border-deck-danger-border'
      : 'bg-deck-panel border-deck-border'
  return (
    <div className={`${spanClass[span]} ${toneClass} border rounded-lg p-3 ${className}`.trim()}>
      {title && (
        <div className="mb-2">
          <div className="text-xs text-deck-text">{title}</div>
          {sub && <div className="text-[10px] text-deck-muted">{sub}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Uruchom test — ma przejść**

Run: `npx vitest run components/ui/BentoCard.test.tsx`
Expected: PASS (3 testy).

- [ ] **Step 5: Commit**

```bash
git add components/ui/BentoCard.tsx components/ui/BentoCard.test.tsx
git commit -m "feat(ui): komponent BentoCard"
```

---

## Task 6: Filtry — czyste funkcje

**Files:**
- Create: `lib/filters.ts`
- Test: `lib/filters.test.ts`

- [ ] **Step 1: Napisz failing test `lib/filters.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { parseFilters, buildFilterQuery, applyFilters, DEFAULT_FILTERS, type Filters } from '@/lib/filters'

describe('parseFilters', () => {
  it('zwraca domyślne dla pustych parametrów', () => {
    expect(parseFilters(new URLSearchParams())).toEqual(DEFAULT_FILTERS)
  })
  it('czyta sezon i zakres lat', () => {
    const f = parseFilters(new URLSearchParams('sezon=jesien&from=2023&to=2025'))
    expect(f).toEqual({ sezon: 'jesien', fromYear: 2023, toYear: 2025 })
  })
  it('ignoruje nieprawidłowe wartości', () => {
    const f = parseFilters(new URLSearchParams('sezon=xxx&from=abc'))
    expect(f).toEqual({ sezon: 'all', fromYear: null, toYear: null })
  })
})

describe('buildFilterQuery', () => {
  it('pomija domyślne', () => {
    expect(buildFilterQuery(DEFAULT_FILTERS)).toBe('')
  })
  it('serializuje ustawione filtry', () => {
    const f: Filters = { sezon: 'wiosna', fromYear: 2022, toYear: null }
    expect(buildFilterQuery(f)).toBe('?sezon=wiosna&from=2022')
  })
  it('roundtrip parse(build(f)) === f', () => {
    const f: Filters = { sezon: 'jesien', fromYear: 2023, toYear: 2025 }
    const q = buildFilterQuery(f).replace(/^\?/, '')
    expect(parseFilters(new URLSearchParams(q))).toEqual(f)
  })
})

describe('applyFilters', () => {
  const rows = [
    { sezon: 'jesien' as const, rok: 2022 },
    { sezon: 'wiosna' as const, rok: 2024 },
    { sezon: 'jesien' as const, rok: 2025 },
  ]
  it('filtruje po sezonie', () => {
    expect(applyFilters(rows, { sezon: 'jesien', fromYear: null, toYear: null })).toHaveLength(2)
  })
  it('filtruje po zakresie lat', () => {
    expect(applyFilters(rows, { sezon: 'all', fromYear: 2024, toYear: null })).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Uruchom test — ma się NIE powieść**

Run: `npx vitest run lib/filters.test.ts`
Expected: FAIL — nie można rozwiązać importu `@/lib/filters`.

- [ ] **Step 3: Zaimplementuj `lib/filters.ts`**

```ts
import type { Sezon } from '@/types'

export type SezonFilter = 'all' | Sezon

export interface Filters {
  sezon: SezonFilter
  fromYear: number | null
  toYear: number | null
}

export const DEFAULT_FILTERS: Filters = { sezon: 'all', fromYear: null, toYear: null }

export function parseFilters(params: URLSearchParams): Filters {
  const sezon = params.get('sezon')
  const from = params.get('from')
  const to = params.get('to')
  return {
    sezon: sezon === 'jesien' || sezon === 'wiosna' ? sezon : 'all',
    fromYear: from && /^\d{4}$/.test(from) ? Number(from) : null,
    toYear: to && /^\d{4}$/.test(to) ? Number(to) : null,
  }
}

export function buildFilterQuery(f: Filters): string {
  const p = new URLSearchParams()
  if (f.sezon !== 'all') p.set('sezon', f.sezon)
  if (f.fromYear != null) p.set('from', String(f.fromYear))
  if (f.toYear != null) p.set('to', String(f.toYear))
  const s = p.toString()
  return s ? `?${s}` : ''
}

interface Edycjowy {
  sezon: Sezon
  rok: number
}

export function applyFilters<T extends Edycjowy>(rows: T[], f: Filters): T[] {
  return rows.filter((r) => {
    if (f.sezon !== 'all' && r.sezon !== f.sezon) return false
    if (f.fromYear != null && r.rok < f.fromYear) return false
    if (f.toYear != null && r.rok > f.toYear) return false
    return true
  })
}
```

- [ ] **Step 4: Uruchom test — ma przejść**

Run: `npx vitest run lib/filters.test.ts`
Expected: PASS (wszystkie testy).

- [ ] **Step 5: Commit**

```bash
git add lib/filters.ts lib/filters.test.ts
git commit -m "feat(filters): czyste funkcje parse/build/apply filtrow"
```

---

## Task 7: Hook `useFilters`

**Files:**
- Create: `lib/useFilters.ts`

- [ ] **Step 1: Zaimplementuj `lib/useFilters.ts`**

```ts
'use client'
import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { parseFilters, buildFilterQuery, type Filters } from '@/lib/filters'

export function useFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const filters = useMemo(
    () => parseFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  )

  const setFilters = useCallback(
    (next: Filters) => {
      router.replace(`${pathname}${buildFilterQuery(next)}`, { scroll: false })
    },
    [router, pathname],
  )

  return { filters, setFilters }
}
```

- [ ] **Step 2: Sprawdź typy (hook zależny od routera — weryfikacja przez kompilację)**

Run: `npx tsc --noEmit`
Expected: brak błędów typów.

- [ ] **Step 3: Commit**

```bash
git add lib/useFilters.ts
git commit -m "feat(filters): hook useFilters (stan w URL)"
```

---

## Task 8: Komponent `Sidebar`

**Files:**
- Create: `components/ui/Sidebar.tsx`
- Test: `components/ui/Sidebar.test.tsx`

- [ ] **Step 1: Napisz failing test `components/ui/Sidebar.test.tsx`**

```tsx
import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

import { Sidebar } from '@/components/ui/Sidebar'

describe('Sidebar', () => {
  it('renderuje wszystkie pozycje nawigacji', () => {
    render(<Sidebar />)
    expect(screen.getByText('Przegląd')).toBeInTheDocument()
    expect(screen.getByText('Rekrutacje')).toBeInTheDocument()
    expect(screen.getByText('Korelacje')).toBeInTheDocument()
    expect(screen.getByText(/Wpisz dane/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Uruchom test — ma się NIE powieść**

Run: `npx vitest run components/ui/Sidebar.test.tsx`
Expected: FAIL — nie można rozwiązać importu `@/components/ui/Sidebar`.

- [ ] **Step 3: Zaimplementuj `components/ui/Sidebar.tsx`**

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const NAV = [
  { href: '/', label: 'Przegląd', glyph: '◧' },
  { href: '/rekrutacje', label: 'Rekrutacje', glyph: '↗' },
  { href: '/retencja', label: 'Retencja', glyph: '⟲' },
  { href: '/komisje', label: 'Komisje', glyph: '▦' },
  { href: '/lejek', label: 'Lejek', glyph: '⥥' },
  { href: '/korelacje', label: 'Korelacje', glyph: '∿' },
  { href: '/alerty', label: 'Alerty', glyph: '⚠' },
] as const

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-[150px] shrink-0 bg-deck-bg border-r border-deck-border p-2 flex flex-col gap-1 min-h-screen">
      <div className="flex items-center gap-2 px-2 py-3">
        <span className="w-6 h-6 rounded-md bg-deck-accent text-deck-bg-deep font-extrabold text-xs flex items-center justify-center">
          S
        </span>
        <span className="text-sm font-semibold text-deck-text">SSUEW</span>
      </div>
      {NAV.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`text-xs px-2 py-1.5 rounded-md flex items-center gap-2 ${
              active
                ? 'bg-deck-accent/10 text-deck-accent border border-deck-accent/40'
                : 'text-deck-muted hover:text-deck-text'
            }`}
          >
            <span aria-hidden>{item.glyph}</span>
            {item.label}
          </Link>
        )
      })}
      <Link
        href="/wpis"
        className="mt-auto text-xs px-2 py-1.5 rounded-md text-deck-muted hover:text-deck-text border-t border-deck-border pt-3"
      >
        ＋ Wpisz dane
      </Link>
    </aside>
  )
}
```

- [ ] **Step 4: Uruchom test — ma przejść**

Run: `npx vitest run components/ui/Sidebar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/ui/Sidebar.tsx components/ui/Sidebar.test.tsx
git commit -m "feat(ui): komponent Sidebar z nawigacja"
```

---

## Task 9: Komponent `FilterBar`

**Files:**
- Create: `components/ui/FilterBar.tsx`

- [ ] **Step 1: Zaimplementuj `components/ui/FilterBar.tsx`**

```tsx
'use client'
import { useFilters } from '@/lib/useFilters'

export function FilterBar() {
  const { filters, setFilters } = useFilters()
  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="Sezon"
        value={filters.sezon}
        onChange={(e) => setFilters({ ...filters, sezon: e.target.value as typeof filters.sezon })}
        className="bg-deck-panel border border-deck-border text-deck-muted text-[11px] rounded-md px-2 py-1"
      >
        <option value="all">Sezon: oba</option>
        <option value="jesien">Jesień</option>
        <option value="wiosna">Wiosna</option>
      </select>
      <input
        aria-label="Rok od"
        type="number"
        placeholder="od"
        value={filters.fromYear ?? ''}
        onChange={(e) =>
          setFilters({ ...filters, fromYear: e.target.value ? Number(e.target.value) : null })
        }
        className="w-16 bg-deck-panel border border-deck-border text-deck-muted text-[11px] rounded-md px-2 py-1"
      />
      <input
        aria-label="Rok do"
        type="number"
        placeholder="do"
        value={filters.toYear ?? ''}
        onChange={(e) =>
          setFilters({ ...filters, toYear: e.target.value ? Number(e.target.value) : null })
        }
        className="w-16 bg-deck-panel border border-deck-border text-deck-muted text-[11px] rounded-md px-2 py-1"
      />
    </div>
  )
}
```

- [ ] **Step 2: Sprawdź typy**

Run: `npx tsc --noEmit`
Expected: brak błędów.

- [ ] **Step 3: Commit**

```bash
git add components/ui/FilterBar.tsx
git commit -m "feat(ui): komponent FilterBar (filtry globalne)"
```

---

## Task 10: Szkielet aplikacji (AppShell + layout + strony-zaślepki)

**Files:**
- Create: `components/ui/AppShell.tsx`
- Modify: `app/layout.tsx`
- Create: `app/rekrutacje/page.tsx`, `app/retencja/page.tsx`, `app/komisje/page.tsx`, `app/lejek/page.tsx`, `app/korelacje/page.tsx`, `app/alerty/page.tsx`, `app/wpis/page.tsx`

- [ ] **Step 1: Utwórz `components/ui/AppShell.tsx`**

```tsx
'use client'
import { Suspense, type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { FilterBar } from './FilterBar'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-deck-bg-deep">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-5 py-3 border-b border-deck-border">
          <span className="text-[11px] text-deck-muted tracking-wide">SSUEW · ANALYTICS</span>
          <Suspense fallback={<div className="text-[11px] text-deck-muted">…</div>}>
            <FilterBar />
          </Suspense>
        </header>
        <main className="flex-1 p-5 max-w-[1200px] w-full mx-auto">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Zastąp `app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import './globals.css'
import { AppShell } from '@/components/ui/AppShell'

export const metadata: Metadata = {
  title: 'SSUEW Analytics',
  description: 'System monitorowania i projekcji KPI — Wiceprzewodniczący ds. Strategii',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Utwórz 7 stron-zaślepek**

Każdy plik poniżej ma identyczną strukturę, różni się tylko `title`. Utwórz wszystkie 7:

`app/rekrutacje/page.tsx`:
```tsx
import { BentoCard } from '@/components/ui/BentoCard'
export default function Page() {
  return (
    <BentoCard title="Rekrutacje">
      <p className="text-xs text-deck-muted">Moduł w przebudowie — wkrótce.</p>
    </BentoCard>
  )
}
```

`app/retencja/page.tsx`:
```tsx
import { BentoCard } from '@/components/ui/BentoCard'
export default function Page() {
  return (
    <BentoCard title="Retencja">
      <p className="text-xs text-deck-muted">Moduł w przebudowie — wkrótce.</p>
    </BentoCard>
  )
}
```

`app/komisje/page.tsx`:
```tsx
import { BentoCard } from '@/components/ui/BentoCard'
export default function Page() {
  return (
    <BentoCard title="Komisje">
      <p className="text-xs text-deck-muted">Moduł w przebudowie — wkrótce.</p>
    </BentoCard>
  )
}
```

`app/lejek/page.tsx`:
```tsx
import { BentoCard } from '@/components/ui/BentoCard'
export default function Page() {
  return (
    <BentoCard title="Lejek">
      <p className="text-xs text-deck-muted">Moduł w przebudowie — wkrótce.</p>
    </BentoCard>
  )
}
```

`app/korelacje/page.tsx`:
```tsx
import { BentoCard } from '@/components/ui/BentoCard'
export default function Page() {
  return (
    <BentoCard title="Korelacje">
      <p className="text-xs text-deck-muted">Moduł w przebudowie — wkrótce.</p>
    </BentoCard>
  )
}
```

`app/alerty/page.tsx`:
```tsx
import { BentoCard } from '@/components/ui/BentoCard'
export default function Page() {
  return (
    <BentoCard title="Alerty">
      <p className="text-xs text-deck-muted">Moduł w przebudowie — wkrótce.</p>
    </BentoCard>
  )
}
```

`app/wpis/page.tsx`:
```tsx
import { BentoCard } from '@/components/ui/BentoCard'
export default function Page() {
  return (
    <BentoCard title="Wpisz dane">
      <p className="text-xs text-deck-muted">Formularze w przebudowie — wkrótce.</p>
    </BentoCard>
  )
}
```

- [ ] **Step 4: Tymczasowa strona główna, by build przeszedł**

Zastąp `app/page.tsx` (pełną wersję Przeglądu zbudujemy w Task 12):
```tsx
import { BentoCard } from '@/components/ui/BentoCard'
export default function Page() {
  return (
    <BentoCard title="Przegląd">
      <p className="text-xs text-deck-muted">Wkrótce.</p>
    </BentoCard>
  )
}
```

- [ ] **Step 5: Zbuduj i sprawdź nawigację**

Run: `npm run build`
Expected: `✓ Compiled successfully`; w liście tras widoczne `/`, `/rekrutacje`, `/retencja`, `/komisje`, `/lejek`, `/korelacje`, `/alerty`, `/wpis`.

- [ ] **Step 6: Wizualna weryfikacja**

Run: `npm run dev`, otwórz `http://localhost:3000`.
Expected: ciemny layout, lewy sidebar z 7 pozycjami + „Wpisz dane", górny pasek z filtrami; klikanie pozycji zmienia stronę i podświetla aktywną; zmiana filtra zmienia URL (np. `?sezon=jesien`). Zatrzymaj serwer (Ctrl+C).

- [ ] **Step 7: Commit**

```bash
git add components/ui/AppShell.tsx app/layout.tsx app/page.tsx app/rekrutacje app/retencja app/komisje app/lejek app/korelacje app/alerty app/wpis
git commit -m "feat(ui): szkielet aplikacji (AppShell + routing + zaslepki)"
```

---

## Task 11: Agregacja metryk Przeglądu

**Files:**
- Create: `lib/overview.ts`
- Test: `lib/overview.test.ts`

- [ ] **Step 1: Napisz failing test `lib/overview.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { computeOverview } from '@/lib/overview'
import type { Rekrutacja, Kohorta, KpiPeriod } from '@/types'

const rekr: Rekrutacja[] = [
  { id: '1', edycja: "W'24", sezon: 'wiosna', rok: 2024, zgloszenia: 10, przyjeci: 5, created_at: '' },
  { id: '2', edycja: "J'24", sezon: 'jesien', rok: 2024, zgloszenia: 20, przyjeci: 15, created_at: '' },
]
const koh: Kohorta[] = [
  { id: '1', edycja: "W'24", sezon: 'wiosna', rok: 2024, n_czlonkow: 5, avg_retention_sem: 4, max_retention_sem: 6, in_progress: false, created_at: '' },
  { id: '2', edycja: "J'24", sezon: 'jesien', rok: 2024, n_czlonkow: 15, avg_retention_sem: 2, max_retention_sem: 5, in_progress: true, created_at: '' },
]
const kpi: KpiPeriod[] = [
  { id: 'p1', komisja_id: 'k1', semestr: 'letni 2025/2026', projekty_planowane: 10, projekty_zrealizowane: 8, notatka: null, created_at: '' },
]

describe('computeOverview', () => {
  it('liczy średni conversion rate', () => {
    // (50% + 75%) / 2 = 62.5
    expect(computeOverview(rekr, koh, kpi).avgConversion).toBe(62.5)
  })
  it('liczy retencję tylko z ukończonych kohort', () => {
    // tylko kohorta W'24 (in_progress=false) → 4
    expect(computeOverview(rekr, koh, kpi).histRetention).toBe(4)
  })
  it('bierze ostatnią edycję wg roku/sezonu', () => {
    const m = computeOverview(rekr, koh, kpi)
    expect(m.lastEdycja).toBe("J'24")
    expect(m.lastAccepted).toBe(15)
    expect(m.lastApplications).toBe(20)
  })
  it('liczy średnią realizację KPI', () => {
    expect(computeOverview(rekr, koh, kpi).avgKpiRealization).toBe(80)
  })
  it('zwraca null dla pustych danych', () => {
    const m = computeOverview([], [], [])
    expect(m.avgConversion).toBeNull()
    expect(m.histRetention).toBeNull()
    expect(m.lastEdycja).toBeNull()
  })
})
```

- [ ] **Step 2: Uruchom test — ma się NIE powieść**

Run: `npx vitest run lib/overview.test.ts`
Expected: FAIL — nie można rozwiązać importu `@/lib/overview`.

- [ ] **Step 3: Zaimplementuj `lib/overview.ts`**

```ts
import { mean } from '@/lib/stats'
import type { Rekrutacja, Kohorta, KpiPeriod } from '@/types'

export interface OverviewMetrics {
  avgConversion: number | null
  histRetention: number | null
  lastEdycja: string | null
  lastAccepted: number | null
  lastApplications: number | null
  avgKpiRealization: number | null
}

function round(n: number, dp: number): number {
  const f = 10 ** dp
  return Math.round(n * f) / f
}

export function computeOverview(
  rekrutacje: Rekrutacja[],
  kohorty: Kohorta[],
  kpiPeriods: KpiPeriod[],
): OverviewMetrics {
  const crs = rekrutacje
    .filter((r) => r.zgloszenia > 0)
    .map((r) => (r.przyjeci / r.zgloszenia) * 100)

  const completed = kohorty.filter((k) => !k.in_progress)

  const last =
    [...rekrutacje].sort((a, b) => a.rok - b.rok || (a.sezon === 'wiosna' ? -1 : 1)).at(-1) ?? null

  const kpiPct = kpiPeriods
    .filter((p) => p.projekty_planowane > 0)
    .map((p) => (p.projekty_zrealizowane / p.projekty_planowane) * 100)

  return {
    avgConversion: crs.length ? round(mean(crs), 1) : null,
    histRetention: completed.length ? round(mean(completed.map((k) => k.avg_retention_sem)), 2) : null,
    lastEdycja: last?.edycja ?? null,
    lastAccepted: last?.przyjeci ?? null,
    lastApplications: last?.zgloszenia ?? null,
    avgKpiRealization: kpiPct.length ? round(mean(kpiPct), 1) : null,
  }
}
```

- [ ] **Step 4: Uruchom test — ma przejść**

Run: `npx vitest run lib/overview.test.ts`
Expected: PASS (5 testów).

- [ ] **Step 5: Commit**

```bash
git add lib/overview.ts lib/overview.test.ts
git commit -m "feat(overview): agregacja metryk strony Przeglad"
```

---

## Task 12: Strona Przegląd (bento)

**Files:**
- Create: `components/modules/OverviewClient.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Utwórz `components/modules/OverviewClient.tsx`**

```tsx
'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAnalyticsData } from '@/lib/useAnalyticsData'
import { useFilters } from '@/lib/useFilters'
import { applyFilters } from '@/lib/filters'
import { computeOverview } from '@/lib/overview'
import { analyzeKomisje } from '@/lib/stats'
import { chartTheme, axisTick, tooltipStyle } from '@/lib/chartTheme'
import { KpiTile } from '@/components/ui/KpiTile'
import { BentoCard } from '@/components/ui/BentoCard'

function zColor(z: number): string {
  if (z > 0.5) return 'text-deck-accent'
  if (z < -1) return 'text-deck-danger'
  if (z < -0.5) return 'text-deck-warn'
  return 'text-deck-muted'
}

export default function OverviewClient() {
  const { rekrutacje, kohorty, kpiPeriods, loading } = useAnalyticsData()
  const { filters } = useFilters()

  if (loading) return <p className="text-deck-muted text-sm">Ładowanie…</p>

  const rekr = applyFilters(rekrutacje, filters)
  const m = computeOverview(rekr, kohorty, kpiPeriods)
  const kom = kpiPeriods.length >= 2 ? analyzeKomisje(kpiPeriods) : null

  const barData = [...rekr]
    .sort((a, b) => a.rok - b.rok || (a.sezon === 'wiosna' ? -1 : 1))
    .map((r) => ({ edycja: r.edycja, zgłoszenia: r.zgloszenia, przyjęci: r.przyjeci }))

  return (
    <div className="grid grid-cols-4 gap-2">
      <KpiTile
        label="Conversion (avg)"
        value={m.avgConversion != null ? `${m.avgConversion}%` : '—'}
        sub="filtrowane edycje"
        accent="accent"
      />
      <KpiTile
        label="Retencja (hist.)"
        value={m.histRetention != null ? `${m.histRetention} sem` : '—'}
        sub="ukończone kohorty"
        accent="violet"
      />
      <KpiTile
        label={`Przyjęci ${m.lastEdycja ?? ''}`.trim()}
        value={m.lastAccepted ?? '—'}
        sub={m.lastApplications != null ? `z ${m.lastApplications} zgłoszeń` : ''}
      />
      <KpiTile
        label="Komisje śr."
        value={m.avgKpiRealization != null ? `${m.avgKpiRealization}%` : '—'}
        sub="realizacja KPI"
      />

      <BentoCard title="Zgłoszenia vs przyjęci" sub="trend historyczny" span={2}>
        {barData.length ? (
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={barData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="edycja" tick={axisTick} />
              <YAxis tick={axisTick} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="zgłoszenia" fill={chartTheme.series[2]} radius={[3, 3, 0, 0]} />
              <Bar dataKey="przyjęci" fill={chartTheme.accent} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-[11px] text-deck-muted">Brak edycji dla wybranych filtrów.</p>
        )}
      </BentoCard>

      <BentoCard title="Komisje — z-score" sub="realizacja KPI vs norma" span={2}>
        {kom ? (
          <div className="flex gap-2">
            {kom.withZ.map((c) => (
              <div key={c.id} className="flex-1 text-center">
                <div className={`text-sm font-semibold tabular ${zColor(c.z)}`}>
                  {c.z > 0 ? '+' : ''}
                  {c.z.toFixed(1)}
                </div>
                <div className="text-[9px] text-deck-muted truncate">{c.komisja?.kod ?? '—'}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-deck-muted">Za mało danych KPI.</p>
        )}
      </BentoCard>
    </div>
  )
}
```

- [ ] **Step 2: Zastąp `app/page.tsx`**

```tsx
import { Suspense } from 'react'
import OverviewClient from '@/components/modules/OverviewClient'

export default function Page() {
  return (
    <Suspense fallback={<p className="text-deck-muted text-sm">Ładowanie…</p>}>
      <OverviewClient />
    </Suspense>
  )
}
```

- [ ] **Step 3: Sprawdź typy i testy**

Run: `npx tsc --noEmit && npm test`
Expected: brak błędów typów; wszystkie testy PASS.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 5: Wizualna weryfikacja**

Run: `npm run dev`, otwórz `http://localhost:3000`.
Expected (tryb demo): 4 kafelki KPI (Conversion ~77.9%, Retencja ~3.81 sem, Przyjęci J'25 = 14, Komisje śr. ~70%), wykres słupkowy zgłoszenia/przyjęci, pasek z-score komisji. Zmiana filtra sezonu/lat w górnym pasku przelicza KPI i wykres na żywo. Zatrzymaj serwer.

- [ ] **Step 6: Commit**

```bash
git add components/modules/OverviewClient.tsx app/page.tsx
git commit -m "feat(overview): interaktywna strona Przeglad (bento)"
```

---

## Task 13: Finalna weryfikacja całości

**Files:** brak (weryfikacja)

- [ ] **Step 1: Pełny zestaw testów**

Run: `npm test`
Expected: wszystkie pliki testowe PASS (smoke, KpiTile, BentoCard, filters, Sidebar, overview).

- [ ] **Step 2: Typy + build**

Run: `npx tsc --noEmit && npm run build`
Expected: brak błędów typów; build OK.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: brak błędów (ostrzeżenia dopuszczalne).

- [ ] **Step 4: Push na GitHub (opcjonalnie, po potwierdzeniu)**

```bash
git push origin main
```

---

## Notatki dla wykonawcy

- **Tryb demo:** `useAnalyticsData` zwraca dane demo, gdy backend pusty/niewdrożony (flaga `usingDemo`). Cały Etap 1a działa bez konfiguracji Supabase. Pełne podłączenie Supabase (endpoint `/api/kohorty`, formularze) jest w kolejnych planach.
- **Poza zakresem tego planu (kolejne plany):** przebudowa modułów Rekrutacje/Retencja/Komisje na pełne widoki, drill-down (drawer), bogate tooltipy z interpretacją, Lejek, Korelacje, Alerty, eksport, „co jeśli", nowe grupy KPI, realne Supabase z endpointem kohort i ulepszenia statystyki (`matInv` guard).
- **Reużycie:** nie duplikuj `mean`/`analyzeKomisje` — importuj z `lib/stats.ts`.
```

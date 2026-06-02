# SSUEW Analytics 2.0 — Etap 3c (Alerty + eksport) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Moduł `/alerty` z auto-anomaliami z 4 źródeł oraz globalny eksport aktualnego widoku do PNG/PDF.

**Architecture:** Czysta funkcja `buildAlerts` w `lib/stats.ts` agreguje istniejące analizy (z-score komisji, trend retencji, CR, lejek) w listę alertów z severity. `AlertyClient` renderuje karty. `ExportButton` (html-to-image + jsPDF) zrzuca element `#export-root` z `AppShell`.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Tailwind 4, html-to-image, jspdf, Vitest.

**Start:** bezpośrednio na `main`.

---

## Struktura plików

**Modyfikowane:** `package.json` (deps), `lib/stats.ts` (`buildAlerts`+`Alert`), `components/ui/AppShell.tsx` (`#export-root` + `ExportButton`), `app/alerty/page.tsx`.
**Tworzone:** `lib/stats.alerts.test.ts`, `components/modules/AlertyClient.tsx`, `components/ui/ExportButton.tsx`.

---

## Task 1: Zależności eksportu

**Files:** Modify: `package.json`

- [ ] **Step 1: Zainstaluj**

Run: `npm install html-to-image jspdf`
Expected: dodane do `dependencies`, brak błędów.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: dodaj html-to-image + jspdf (eksport)"
```

---

## Task 2: stats — buildAlerts

**Files:**
- Modify: `lib/stats.ts`
- Test: `lib/stats.alerts.test.ts`

- [ ] **Step 1: Failing test `lib/stats.alerts.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { buildAlerts } from '@/lib/stats'
import type { Rekrutacja, Kohorta, KpiPeriod, Komisja } from '@/types'

function kp(id: string, kod: string, plan: number, real: number): KpiPeriod {
  const komisja: Komisja = { id, kod, nazwa: kod, przewodniczacy: null, created_at: '' }
  return { id, komisja_id: id, komisja, semestr: 'letni 2025/2026', projekty_planowane: plan, projekty_zrealizowane: real, notatka: null, created_at: '' }
}
function koh(edycja: string, sezon: 'jesien' | 'wiosna', rok: number, avg: number): Kohorta {
  return { id: edycja, edycja, sezon, rok, n_czlonkow: 20, avg_retention_sem: avg, max_retention_sem: 8, in_progress: false, created_at: '' }
}

describe('buildAlerts', () => {
  it('puste dane → brak alertów', () => {
    expect(buildAlerts([], [], [])).toEqual([])
  })

  it('komisja głęboko poniżej normy → alert krytyczny z linkiem do /komisje', () => {
    const periods = [
      kp('k1', 'P.KA.', 10, 8), kp('k2', 'P.KF.', 10, 8), kp('k3', 'P.KKZ.', 10, 8),
      kp('k4', 'P.KHR.', 10, 8), kp('k5', 'P.KP.', 10, 8), kp('k6', 'P.KDiJK.', 10, 3),
    ]
    const alerts = buildAlerts([], [], periods)
    const crit = alerts.find((a) => a.severity === 'critical')
    expect(crit).toBeTruthy()
    expect(crit!.href).toBe('/komisje')
  })

  it('spadkowy trend retencji → ostrzeżenie z linkiem do /retencja', () => {
    const cohorts = [koh("W'22", 'wiosna', 2022, 4.4), koh("J'24", 'jesien', 2024, 2.1)]
    const alerts = buildAlerts([], cohorts, [])
    expect(alerts.some((a) => a.href === '/retencja')).toBe(true)
  })

  it('sortuje critical przed warning', () => {
    const periods = [
      kp('k1', 'P.KA.', 10, 8), kp('k2', 'P.KF.', 10, 8), kp('k3', 'P.KKZ.', 10, 8),
      kp('k4', 'P.KHR.', 10, 8), kp('k5', 'P.KP.', 10, 8), kp('k6', 'P.KDiJK.', 10, 3),
    ]
    const cohorts = [koh("W'22", 'wiosna', 2022, 4.4), koh("J'24", 'jesien', 2024, 2.1)]
    const alerts = buildAlerts([], cohorts, periods)
    const sev = alerts.map((a) => a.severity)
    const firstWarning = sev.indexOf('warning')
    const lastCritical = sev.lastIndexOf('critical')
    expect(lastCritical).toBeLessThan(firstWarning)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run lib/stats.alerts.test.ts`
Expected: FAIL (`buildAlerts` not exported).

- [ ] **Step 3: Add to end of `lib/stats.ts`**

```ts
// ─── Alerty / anomalie ───────────────────────────────────────────────────────

export interface Alert {
  id: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  detail: string
  recommendation: string
  href: string
}

const SEVERITY_ORDER: Record<Alert['severity'], number> = { critical: 0, warning: 1, info: 2 }

export function buildAlerts(
  rekrutacje: Rekrutacja[],
  kohorty: Kohorta[],
  kpiPeriods: KpiPeriod[],
): Alert[] {
  const alerts: Alert[] = []

  // 1. Komisje (z-score)
  if (kpiPeriods.length >= 2) {
    const kom = analyzeKomisje(kpiPeriods)
    for (const c of kom.withZ) {
      const kod = c.komisja?.kod ?? c.komisja_id
      if (c.z < -2) {
        alerts.push({ id: `kom-${c.komisja_id}`, severity: 'critical', title: `Komisja ${kod} krytycznie poniżej normy`, detail: `Realizacja ${c.realizacjaPct}%, z=${c.z.toFixed(1)}`, recommendation: 'Priorytet Zarządu — interwencja.', href: '/komisje' })
      } else if (c.z < -1) {
        alerts.push({ id: `kom-${c.komisja_id}`, severity: 'warning', title: `Komisja ${kod} poniżej normy`, detail: `Realizacja ${c.realizacjaPct}%, z=${c.z.toFixed(1)}`, recommendation: 'Monitorować, wsparcie planowania.', href: '/komisje' })
      }
    }
  }

  // 2. Spadek retencji
  const completed = [...kohorty]
    .filter((k) => !k.in_progress)
    .sort((a, b) => a.rok - b.rok || (a.sezon === 'wiosna' ? -1 : 1))
  if (completed.length >= 2) {
    const first = completed[0]
    const last = completed[completed.length - 1]
    if (last.avg_retention_sem < first.avg_retention_sem) {
      alerts.push({ id: 'ret-decline', severity: 'warning', title: 'Spadkowy trend retencji', detail: `Z ${first.avg_retention_sem.toFixed(1)} (${first.edycja}) do ${last.avg_retention_sem.toFixed(1)} sem. (${last.edycja}).`, recommendation: 'Sprawdź onboarding i obciążenie sesją.', href: '/retencja' })
    }
  }

  // 3. Niski CR
  if (rekrutacje.length >= 2) {
    const s = analyzeRekrutacje(rekrutacje)
    const meanCR = mean(s.cr)
    const lastCR = s.cr[s.cr.length - 1]
    if (meanCR > 0 && lastCR < 0.7 * meanCR) {
      alerts.push({ id: 'cr-low', severity: 'warning', title: 'Niski conversion rate ostatniej edycji', detail: `CR ${lastCR}% vs średnia ${meanCR.toFixed(1)}%.`, recommendation: 'Sprawdź jakość kandydatów / proces rekrutacji.', href: '/rekrutacje' })
    }
  }

  // 4. Wyciek w lejku
  if (rekrutacje.length >= 1 && kohorty.length >= 1) {
    const funnel = buildFunnel(rekrutacje, kohorty, { threshold: 2 })
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
    if (worstIdx > 0 && worstDrop > 0.5) {
      alerts.push({ id: 'funnel-leak', severity: 'info', title: 'Duży wyciek w lejku', detail: `${funnel[worstIdx - 1].stage} → ${funnel[worstIdx].stage}: −${Math.round(worstDrop * 100)}%.`, recommendation: 'Najsłabszy etap ścieżki — punkt do poprawy.', href: '/lejek' })
    }
  }

  return alerts.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run lib/stats.alerts.test.ts`
Expected: PASS (4).

- [ ] **Step 5: Commit**

```bash
git add lib/stats.ts lib/stats.alerts.test.ts
git commit -m "feat(stats): buildAlerts (anomalie z 4 zrodel)"
```

---

## Task 3: Moduł Alerty

**Files:**
- Create: `components/modules/AlertyClient.tsx`
- Modify: `app/alerty/page.tsx`

- [ ] **Step 1: Implement `components/modules/AlertyClient.tsx`**

```tsx
'use client'
import Link from 'next/link'
import { useAnalyticsData } from '@/lib/useAnalyticsData'
import { useFilters } from '@/lib/useFilters'
import { applyFilters } from '@/lib/filters'
import { buildAlerts, type Alert } from '@/lib/stats'
import { BentoCard } from '@/components/ui/BentoCard'

const sevBox: Record<Alert['severity'], string> = {
  critical: 'bg-deck-danger-bg border-deck-danger-border',
  warning: 'border-deck-warn/40 bg-deck-panel',
  info: 'border-deck-border bg-deck-panel',
}
const sevText: Record<Alert['severity'], string> = {
  critical: 'text-deck-danger',
  warning: 'text-deck-warn',
  info: 'text-deck-muted',
}
const sevLabel: Record<Alert['severity'], string> = {
  critical: 'KRYTYCZNY',
  warning: 'OSTRZEŻENIE',
  info: 'INFO',
}

export default function AlertyClient() {
  const { rekrutacje, kohorty, kpiPeriods, loading } = useAnalyticsData()
  const { filters } = useFilters()
  if (loading) return <p className="text-deck-muted text-sm">Ładowanie…</p>

  const alerts = buildAlerts(applyFilters(rekrutacje, filters), applyFilters(kohorty, filters), kpiPeriods)

  if (!alerts.length) {
    return (
      <BentoCard title="Alerty">
        <p className="text-[11px] text-deck-accent">Brak alertów — wszystko w normie. ✓</p>
      </BentoCard>
    )
  }

  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <div key={a.id} className={`border rounded-lg p-3 ${sevBox[a.severity]}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-semibold tracking-wide ${sevText[a.severity]}`}>{sevLabel[a.severity]}</span>
            <Link href={a.href} className="text-[10px] text-deck-muted hover:text-deck-text">→ zobacz</Link>
          </div>
          <div className="text-sm text-deck-text mt-1">{a.title}</div>
          <div className="text-[11px] text-deck-muted">{a.detail}</div>
          <div className="text-[11px] text-deck-muted mt-1 italic">{a.recommendation}</div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Replace `app/alerty/page.tsx`**

```tsx
import { Suspense } from 'react'
import AlertyClient from '@/components/modules/AlertyClient'

export default function Page() {
  return (
    <Suspense fallback={<p className="text-deck-muted text-sm">Ładowanie…</p>}>
      <AlertyClient />
    </Suspense>
  )
}
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc clean; build OK.

- [ ] **Step 4: Commit**

```bash
git add components/modules/AlertyClient.tsx app/alerty/page.tsx
git commit -m "feat(alerty): modul alertow (4 zrodla, sortowanie wg waznosci)"
```

---

## Task 4: ExportButton + AppShell

**Files:**
- Create: `components/ui/ExportButton.tsx`
- Modify: `components/ui/AppShell.tsx`

- [ ] **Step 1: Implement `components/ui/ExportButton.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

async function captureRoot(): Promise<string | null> {
  const node = document.getElementById('export-root')
  if (!node) return null
  return toPng(node, { backgroundColor: '#090B0E', pixelRatio: 2, cacheBust: true })
}

export function ExportButton() {
  const [busy, setBusy] = useState<null | 'png' | 'pdf'>(null)

  async function exportPng() {
    setBusy('png')
    try {
      const url = await captureRoot()
      if (!url) return
      const a = document.createElement('a')
      a.href = url
      a.download = `ssuew-${today()}.png`
      a.click()
    } catch {
      // zrzut nieudany — pomijamy po cichu
    } finally {
      setBusy(null)
    }
  }

  async function exportPdf() {
    setBusy('pdf')
    try {
      const url = await captureRoot()
      if (!url) return
      const img = new Image()
      img.src = url
      await new Promise<void>((resolve) => {
        img.onload = () => resolve()
      })
      const pdf = new jsPDF({
        orientation: img.width >= img.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [img.width, img.height],
      })
      pdf.addImage(url, 'PNG', 0, 0, img.width, img.height)
      pdf.save(`ssuew-${today()}.pdf`)
    } catch {
      // zrzut nieudany — pomijamy po cichu
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button onClick={exportPng} disabled={!!busy} className="text-[10px] px-2 py-1 rounded-md border border-deck-border text-deck-muted hover:text-deck-text disabled:opacity-40">
        {busy === 'png' ? '…' : 'PNG'}
      </button>
      <button onClick={exportPdf} disabled={!!busy} className="text-[10px] px-2 py-1 rounded-md border border-deck-border text-deck-muted hover:text-deck-text disabled:opacity-40">
        {busy === 'pdf' ? '…' : 'PDF'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Replace `components/ui/AppShell.tsx`**

```tsx
'use client'
import { Suspense, type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { FilterBar } from './FilterBar'
import { ExportButton } from './ExportButton'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-deck-bg-deep">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-5 py-3 border-b border-deck-border">
          <span className="text-[11px] text-deck-muted tracking-wide">SSUEW · ANALYTICS</span>
          <div className="flex items-center gap-3">
            <Suspense fallback={<div className="text-[11px] text-deck-muted">…</div>}>
              <FilterBar />
            </Suspense>
            <ExportButton />
          </div>
        </header>
        <main id="export-root" className="flex-1 p-5 max-w-[1200px] w-full mx-auto">{children}</main>
      </div>
    </div>
  )
}
```

**Uwaga:** przed zastąpieniem przeczytaj aktualny `AppShell.tsx` — jeśli różni się od powyższego (np. zmiany z review), nanieś tylko dwie zmiany: (a) dodaj `<ExportButton/>` obok `<FilterBar/>` w `<header>`, (b) dodaj `id="export-root"` do `<main>`.

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc clean; build OK.

- [ ] **Step 4: Commit**

```bash
git add components/ui/ExportButton.tsx components/ui/AppShell.tsx
git commit -m "feat(eksport): globalny eksport widoku do PNG/PDF"
```

---

## Task 5: Finalna weryfikacja + push

- [ ] **Step 1: Testy**

Run: `npm test`
Expected: wszystkie PASS (poprzednie + `buildAlerts`).

- [ ] **Step 2: Typy + build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc clean; build OK; trasa `/alerty`.

- [ ] **Step 3: Wizualna weryfikacja**

Run: `npm run dev`. Sprawdź `/alerty` (karty alertów posortowane, lub pusty stan). W topbarze kliknij PNG i PDF — pobiera się plik `ssuew-<data>.png/pdf` z zrzutem aktualnego widoku. Zatrzymaj serwer.

- [ ] **Step 4: Push na main**

```bash
git push origin main
```

---

## Notatki dla wykonawcy

- **Reuse:** `analyzeKomisje`, `analyzeRekrutacje`, `buildFunnel`, `mean` w `buildAlerts`; `BentoCard`, `applyFilters`, `useFilters`, `useAnalyticsData`.
- **Eksport** działa tylko w przeglądarce (komponent `'use client'`); `#export-root` to `<main>` z `AppShell`.
- **Poza zakresem (3d):** backend, formularze wpisu, nowe grupy KPI.
```

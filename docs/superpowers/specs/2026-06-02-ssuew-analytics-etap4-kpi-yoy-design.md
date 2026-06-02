# SSUEW Analytics 2.0 — Etap 4: Realny model KPI (rok-do-roku) — Design

- **Data:** 2026-06-02
- **Status:** Zatwierdzony (pełny rework), workflow: bezpośrednio na `main`.
- **Powód:** Dotychczasowy model „Komisje (projekty planowane/zrealizowane + z-score)" był zmyślony.
  Realne KPI SSUEW (z `dane_zrodlowe/KPI SSUEW.xlsx`) to **metryki rok-do-roku (ratio)**.

---

## 1. Model danych

```ts
interface KpiMetric {
  id: string
  kategoria: string        // 'SKS' | 'Wydarzenia' | 'Ankieta' | 'Koordynatorzy'
  nazwa: string            // 'Październik', 'Wigilia', 'Gala', ...
  okres_poprzedni: string  // '2024/2025'
  wartosc_poprzednia: number
  okres_biezacy: string    // '2025/2026'
  wartosc_biezaca: number
  created_at: string
}
// ratio = wartosc_biezaca / wartosc_poprzednia (>1 wzrost, <1 spadek)
```

Dane demo (`DEMO_KPI_METRICS`) wstawione z realnych liczb (2024/2025 → 2025/2026): SKS (6 mies.),
wydarzenia (JWK/Wigilia/Przydziałki/WWK), ankieta zarządu, koordynatorzy (wybrane projekty).

## 2. Statystyka (`lib/stats.ts`, TDD)

- `kpiRatio(m: KpiMetric) → number` — `wartosc_biezaca / wartosc_poprzednia` (0 gdy poprz = 0).
- `kpiByKategoria(metrics) → Map<string, KpiMetric[]>` — grupowanie.
- `kpiSummary(metrics) → { up: number; down: number; avgRatio: number }` — do Przeglądu.
- `buildAlerts(...)` zmienia 4. źródło: zamiast z-score komisji → **metryki ze spadkiem YoY**
  (`ratio < 0.8` → warning), link `/kpi`.

## 3. Moduł KPI (`/kpi`, zastępuje `/komisje`)

- Sidebar: „Komisje" → **„KPI"**, href `/kpi`.
- Widok: metryki pogrupowane po kategoriach; każda jako `poprz → biez` + **ratio %** (zielone >100%,
  czerwone <100%), słupki/strzałki trendu. KPI summary u góry (ile wzrosło/spadło).

## 4. Ripple (spójność)

- **Przegląd:** kafelek „Komisje śr." → „KPI: X% rosnących"; bento z-score komisji → mini-lista
  metryk z największym wzrostem/spadkiem (z `kpiSummary`/`kpiByKategoria`).
- **Alerty:** źródło komisji → spadki KPI YoY (`buildAlerts` na `kpiMetrics`).
- **Korelacje:** usunięcie kolumny `KPI%` z głównej macierzy i widoku wewnątrz-KPI (inna ziarnistość —
  YoY nie łączy się per edycja). Zostaje rekrutacje × retencja. Notka o zmianie.
- **Wpis (3d-ii):** formularz KPI komisji → **formularz metryki KPI** (kategoria, nazwa, okresy+wartości).

## 5. Backend / dane

- `kpi_metrics` (nowa tabela) w `schema.sql` + seed realny. `/api/kpi` (GET publiczny, POST authenticated).
- `useAnalyticsData`: pobiera `kpiMetrics` (live/fallback demo), akcja `addKpiMetric`.
- Stary model (`kpi_periods`, `analyzeKomisje`, `orgKpiByEdition`, `kpiByKomisja`, `/api/komisje`,
  `DEMO_KPI`, `DEMO_KOMISJE`) — **wycofany z użycia w UI**; funkcje stats mogą zostać (otestowane,
  nieużywane) lub być usunięte; `komisje`/`kpiPeriods` znikają z hooka i typów-w-użyciu.

## 6. Nie-cele

- Wielookresowe trendy KPI (>2 okresy) — na razie para poprz/biez.
- Zachowanie modelu komisji jako encji (komisje jako słownik mogą zostać w schema, ale nieużywane w UI).

## 7. Kryteria sukcesu

- `/kpi` pokazuje realne metryki YoY z ratio i kategoriami; Przegląd/Alerty spójne z nowym modelem;
  Korelacje bez fałszywego KPI%. Nowe funkcje stats z testami; `tsc` czysto; `npm test` zielone; build OK.

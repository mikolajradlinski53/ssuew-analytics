# SSUEW Analytics 2.0 — Etap 3c: Alerty + eksport — Design

- **Data:** 2026-06-02
- **Status:** Zatwierdzony, gotowy do planu
- **Część Etapu 3.** Workflow: bezpośrednio na `main`.

---

## 1. Cel

Moduł `/alerty` z automatycznym wykrywaniem anomalii (4 źródła) oraz globalny eksport aktualnego
widoku do PNG/PDF. Na istniejącej statystyce i danych demo.

## 2. Moduł Alerty (`/alerty`)

**Czysta funkcja `buildAlerts(rekrutacje, kohorty, kpiPeriods) → Alert[]`** (TDD), agregująca:

1. **Komisje (z-score)** — reuse `analyzeKomisje` (wymaga ≥2 okresów): dla każdej komisji
   `z < −2` → `critical`, `z < −1` → `warning`. detail: kod komisji, realizacja %, z.
2. **Spadek retencji** — z ukończonych kohort (≥2, posortowanych): jeśli ostatnia `avg_retention_sem`
   < pierwsza (trend spadkowy) → `warning`. detail: wartości skrajne.
3. **Niski CR** — reuse `analyzeRekrutacje` (≥2 edycje): jeśli CR ostatniej edycji < 70% średniego CR
   → `warning`. detail: CR ostatniej vs średnia.
4. **Wyciek w lejku** — reuse `buildFunnel` (agregat, próg=2): największy spadek między kolejnymi
   etapami; jeśli > 50% → `info`. detail: etap źródłowy → docelowy, % spadku.

**Typ alertu:**
```ts
interface Alert {
  id: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  detail: string
  recommendation: string
  href: string   // link do modułu źródłowego
}
```
Zwracane posortowane: `critical` → `warning` → `info`.

**Widok:** karty alertów (kolor wg severity: danger/warn/muted/akcent), tytuł, detail, rekomendacja,
link „→ zobacz". Pusty stan: „Brak alertów — wszystko w normie".

## 3. Eksport (globalny)

- **Komponent `ExportButton`** w górnym pasku (obok `FilterBar`): dwa przyciski **PNG** i **PDF**.
- Zrzuca element `#export-root` (główny `<main>`): `html-to-image.toPng` → dataURL.
  - **PNG:** pobranie pliku.
  - **PDF:** dataURL osadzony w `jsPDF` (rozmiar dopasowany do obrazu), zapis pliku.
- Nazwa pliku: `ssuew-YYYY-MM-DD.png` / `.pdf`.
- Tło zrzutu: kolor `#090B0E` (deck-bg-deep), by ciemny motyw wyszedł poprawnie.
- Obsługa błędu: `try/catch`, krótki komunikat statusu przy przycisku.

## 4. Zależności

- `html-to-image` (rasteryzacja DOM → PNG), `jspdf` (PNG → PDF). Dodane do `dependencies`.

## 5. Pliki

- `lib/stats.ts` — `buildAlerts` + `Alert` (+ test `lib/stats.alerts.test.ts`).
- `components/modules/AlertyClient.tsx`, `app/alerty/page.tsx`.
- `components/ui/ExportButton.tsx`.
- `components/ui/AppShell.tsx` — `id="export-root"` na `<main>` + `<ExportButton/>` w topbarze.
- Reuse: `analyzeKomisje`, `analyzeRetention`, `analyzeRekrutacje`, `buildFunnel`, `mean`, `BentoCard`, `applyFilters`, `useFilters`, `useAnalyticsData`.

## 6. Nie-cele (poza 3c)

- Realne zapisy do Supabase, formularze wpisu, nowe grupy KPI (3d).
- Konfigurowalne progi alertów (na sztywno w `buildAlerts` — YAGNI).
- Eksport per-element / wybór fragmentu (zawsze cały `#export-root`).

## 7. Ryzyka / założenia

- **Mała próba** → niektóre alerty mogą się nie pojawić (np. brak ≥2 okresów KPI). `buildAlerts`
  degraduje łagodnie (pomija źródło bez danych).
- `html-to-image` na wykresach recharts (SVG) działa, ale fonty/web-components mogą wymagać
  `cacheBust`/`backgroundColor`; ustawiamy `backgroundColor` i `pixelRatio: 2`.
- Eksport działa tylko po stronie klienta (przyciski w komponencie `'use client'`).

## 8. Kryteria sukcesu

- `/alerty` pokazuje posortowane karty z 4 źródeł (lub pusty stan).
- Przyciski PNG/PDF w topbarze pobierają zrzut aktualnego widoku.
- `buildAlerts` pokryte testem; `tsc` czysto; `npm test` zielone; build OK; działa na demo.

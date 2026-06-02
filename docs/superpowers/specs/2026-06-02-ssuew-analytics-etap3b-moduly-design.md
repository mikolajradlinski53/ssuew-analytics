# SSUEW Analytics 2.0 — Etap 3b: Pełne moduły Rekrutacje + Komisje — Design

- **Data:** 2026-06-02
- **Status:** Zatwierdzony, gotowy do planu
- **Część Etapu 3.** Poprzednio: 3a (prognozy) — na `main`. Workflow: bezpośrednio na `main`.

---

## 1. Cel

Zastąpić zaślepki `/rekrutacje` i `/komisje` pełnymi widokami deep-dive w stylu Command Deck,
reużywając istniejącą statystykę (`analyzeRekrutacje`, `analyzeKomisje`) i prognozy z 3a
(`linearForecast`). Przy okazji usunąć osierocone komponenty z oryginalnej (jasnej) apki.

## 2. Moduł Rekrutacje (`/rekrutacje`)

Źródło: `analyzeRekrutacje(rekrutacje)` (Pearson, Welch, CR, forecast) + `linearForecast(przyjęci, 2)`.
Dane filtrowane globalnie (`applyFilters`). Wymaga ≥2 edycji (inaczej komunikat).

- **KPI tiles (4):** przyjęci ostatniej edycji · avg CR% · prognoza następnej edycji (±niepewność) · r korelacji.
- **Trend:** słupki zgłoszenia vs przyjęci per edycja + linia CR% (osobny panel lub oś pomocnicza).
- **Korelacja:** scatter zgłoszenia↔przyjęci; podtytuł `r · R² · p`; interpretacja z `corZglosAccepted`.
- **Sezonowość (Welch):** karty jesień vs wiosna (średnia, SD) + `t`, `p`, istotność; interpretacja z `sezonowosc`.
- **Prognoza:** ComposedChart historii przyjętych + 2 edycje z pasem niepewności (`linearForecast`, reuse z 3a).

## 3. Moduł Komisje (`/komisje`)

Źródło: `analyzeKomisje(kpiPeriods)` (z-score) + grupowanie po komisji. Wymaga ≥2 okresów KPI dla z-score.

- **Ranking z-score:** komisje wg `z` (malejąco), kolor wg progu (accent/warn/danger), interpretacja.
- **Planowane vs zrealizowane:** słupki planowane/zrealizowane per komisja + etykieta % realizacji (bieżący/wybrany semestr).
- **Trend realizacji w czasie:** linia % realizacji per komisja po semestrach. W demo (1 semestr) płaska —
  widoczna notka „mała próba; trend wypełni się po kolejnych semestrach".
- **Drill-down:** klik w komisję (w rankingu/słupkach) → panel ze szczegółami: lista jej okresów KPI
  (semestr, planowane, zrealizowane, %, notatka). Stan wyboru lokalny w komponencie.

## 4. Statystyka / helpery

- **Nowa czysta funkcja `kpiByKomisja(periods: KpiPeriod[]) → Map<string, KpiPeriod[]>`** (klucz = `komisja_id`,
  wartości posortowane wg `created_at`) — do drill-down i trendu. TDD.
- Reuse: `analyzeRekrutacje`, `analyzeKomisje`, `linearForecast`, `mean`. Bez zmian w istniejących funkcjach.

## 5. Komponenty i pliki

- `components/modules/RekrutacjeClient.tsx` — moduł Rekrutacje.
- `components/modules/KomisjeClient.tsx` — moduł Komisje (z drill-down).
- `app/rekrutacje/page.tsx`, `app/komisje/page.tsx` — z zaślepek na `<Suspense>` + klient.
- `lib/stats.ts` — `kpiByKomisja` (+ test).
- Reuse: `BentoCard`, `KpiTile`, `chartTheme`, `applyFilters`, `useFilters`, `useAnalyticsData`, recharts.

## 6. Sprzątanie (osierocony kod oryginalnej apki)

Usunąć (zweryfikowano: importuje je tylko osierocony `Dashboard.tsx`, którego nikt nie importuje):
`components/modules/Dashboard.tsx`, `ModuleRekrutacje.tsx`, `ModuleRetention.tsx`, `ModuleKomisje.tsx`,
`ModuleWpis.tsx`. (Formularze wpisu zostaną odbudowane w 3d.)

## 7. Nie-cele (poza 3b)

- Alerty/anomalie, eksport PDF/PNG (3c).
- Realne zapisy do Supabase, nowe grupy KPI, formularze wpisu (3d).

## 8. Ryzyka / założenia

- **Trend Komisji** jest pusty/płaski w demo (1 semestr KPI) — komunikowane notką; wypełni się z danymi.
- Rekrutacje wymaga ≥2 edycji, Komisje ≥2 okresów dla z-score — inaczej łagodne komunikaty.

## 9. Kryteria sukcesu

- `/rekrutacje` pokazuje trend, korelację, sezonowość (Welch) i prognozę z niepewnością.
- `/komisje` pokazuje ranking z-score, planowane/zrealizowane, trend i drill-down w komisję.
- `kpiByKomisja` pokryte testem; osierocone komponenty usunięte; `tsc` czysto; `npm test` zielone; build OK.
- Działa na demo.

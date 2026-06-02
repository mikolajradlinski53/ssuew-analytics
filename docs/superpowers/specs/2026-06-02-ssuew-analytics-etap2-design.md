# SSUEW Analytics 2.0 — Etap 2: Lejek · Krzywe retencji · Korelacje — Design

- **Data:** 2026-06-02
- **Status:** Zatwierdzony design, gotowy do spisania planu
- **Bazuje na:** [master spec](2026-06-02-ssuew-analytics-redesign-design.md) oraz wdrożonym Etapie 1a (plan: `docs/superpowers/plans/2026-06-02-ssuew-analytics-etap1-foundation-overview.md`)

---

## 1. Cel

Druga warstwa analiz na fundamencie z Etapu 1a (Command Deck, sidebar, filtry w URL, design system).
Trzy nowe/rozszerzone moduły: **krzywe przeżycia kohort** (rozszerza Retencję), **Lejek** rekrutacyjny
i **Korelacje** międzydomenowe. Wszystko na istniejących danych — **bez zmian w schemacie Supabase**.

## 2. Decyzje projektowe (zatwierdzone)

- **Dane retencji:** aproksymacja krzywej z `avg_retention_sem`/`max_retention_sem` (bez zmian schematu),
  oznaczona w UI jako szacunek.
- **Lejek:** dwa widoki (zagregowany ↔ per edycja) + suwak progu utrzymania.
- **Korelacje:** główna macierz per edycja (rekrutacje + retencja) **z** agregatem KPI per okres,
  **oraz** osobny widok korelacji wewnątrz domeny KPI.

## 3. Moduł: Retencja — krzywe przeżycia (rozszerzenie `/retencja`)

- **Model (czysta funkcja `survivalCurve` w `lib/stats.ts`):**
  Dla kohorty o średniej `avg` i maksimum `max` zwraca punkty `{ sem, pct }` dla `sem = 0..max`,
  gdzie `pct(sem) = 100 · exp(−sem / avg)`, `pct(0) = 100`. Średnia rozkładu wykładniczego = `avg`
  (spójność z danymi). Gdy `avg ≤ 0` → krzywa `[{0,100},{max,0}]` (brzeg).
- **Wizualizacja:** wykres liniowy `% aktywnych` vs `semestr`, po jednej krzywej na kohortę,
  legenda z możliwością włączania/wyłączania kohort do porównania. Pod spodem zostaje istniejąca
  regresja OLS (`analyzeRetention`).
- **Oznaczenie szacunku:** widoczna etykieta „Szacunek (model wykładniczy) — brak pomiaru per semestr".
- **Interakcje:** filtry globalne (sezon/lata zawężają zbiór kohort), wybór kohort do porównania,
  tooltip z `% aktywnych` w danym semestrze.

## 4. Moduł: Lejek — nowy (`/lejek`)

- **Przełącznik widoku:** „Zagregowany" / „Per edycja" (przy per-edycja: select edycji).
- **Etapy lejka (czysta funkcja `buildFunnel`):**
  1. **Zgłoszenia** — `rekrutacje.zgloszenia`
  2. **Przyjęci** — `rekrutacje.przyjeci`
  3. **Aktywni** — `kohorty.n_czlonkow` dopasowanej edycji (po `edycja`)
  4. **Utrzymani po N sem.** — `round(n_czlonkow · exp(−N / avg_retention_sem))`, gdzie **N** to wartość
     suwaka (1…max dostępnego `max_retention_sem`).
  - **Widok zagregowany:** etapy 1–2 sumują wszystkie edycje (po filtrach globalnych); etapy 3–4
    sumują tylko edycje z dopasowaną kohortą, z notką „etapy 3–4 z N kohort".
  - **Widok per edycja:** gdy edycja nie ma dopasowanej kohorty, etapy 3–4 pokazują „brak danych kohorty".
- **Wynik funkcji:** `{ stage: string, count: number, pct: number }[]` — `pct` = % względem etapu 1.
- **Wizualizacja:** wykres lejka (malejące słupki/segmenty) z `%` konwersji między etapami i
  **podświetleniem największego spadku** („wyciek"). Reaguje na filtry (zagregowany) i suwak progu.
- **Interakcje:** przełącznik widoku, select edycji (per-edycja), suwak progu N, tooltipy z liczbami i %.

## 5. Moduł: Korelacje — nowy (`/korelacje`)

### 5a. Główna macierz (per edycja)
- **Zbiór per edycja** (złączenie rekrutacji + kohort po `edycja`): zmienne
  `zgłoszenia, przyjęci, CR%, liczebność (n_czlonkow), avg_retention, max_retention`.
- **Agregat KPI per okres (włączony jako dodatkowa zmienna `KPI%`):**
  - `parseSemestr(s)` mapuje string semestru na edycję: `"zimowy YYYY/ZZZZ" → { sezon:'jesien', rok:YYYY }`,
    `"letni YYYY/ZZZZ" → { sezon:'wiosna', rok:YYYY+1 }`; nierozpoznane → `null`.
  - `orgKpiByEdition(kpiPeriods)` = średnia realizacji (`zrealizowane/planowane·100`) wszystkich komisji
    w danym semestrze, przypisana do `(sezon, rok)`.
  - Dołączane do wiersza edycji, gdy istnieje dopasowanie; brak → `KPI%` puste dla tej edycji.
  - **Notka w UI:** „KPI% liczone z niewielu okresów — korelacje orientacyjne, nabiorą sensu po
    zebraniu kolejnych semestrów."
- **Czysta funkcja `correlationMatrix(rows, variables) → { a, b, r, significant }[]`** — reuse
  `pearson`/`pearsonTest`; pomija pary z `<3` wspólnych nie-pustych wartości (`r = null`).
- **Wizualizacja:** heatmapa macierzy (kolor = znak i siła `r`: emerald dodatnie, czerwień ujemne,
  intensywność = |r|) + scatter wybranej pary (klik w komórkę) z linią trendu i interpretacją
  (`pearsonTest`).

### 5b. Osobny widok wewnątrz-KPI
- **Zbiór per (komisja × semestr):** zmienne `projekty_planowane, projekty_zrealizowane, realizacja%, z-score`.
- Ta sama `correlationMatrix` + heatmapa, trzymana w osobnej sekcji/zakładce modułu.
- Pozwala odpowiedzieć np. „czy komisje z większą liczbą planowanych projektów mają niższą realizację?".

## 6. Statystyka — nowe czyste funkcje (`lib/stats.ts`, każda z testami TDD)

| Funkcja | Sygnatura | Reuse |
|---|---|---|
| `survivalCurve` | `(avg: number, max: number) → { sem: number; pct: number }[]` | — |
| `buildFunnel` | `(rekr: Rekrutacja[], koh: Kohorta[], opts: { edycja?: string; threshold: number }) → FunnelStage[]` | `survivalCurve` |
| `parseSemestr` | `(s: string) → { sezon: Sezon; rok: number } | null` | — |
| `orgKpiByEdition` | `(periods: KpiPeriod[]) → Map<string, number>` (klucz `"sezon-rok"`) | `parseSemestr` |
| `correlationMatrix` | `(rows: Record<string,number|null>[], vars: string[]) → CorrCell[]` | `pearson`, `pearsonTest` |

`matInv3`/`matInv4` w OLS dostają przy okazji **guard na macierz osobliwą** (det≈0 → zwrot ostrzeżenia
zamiast NaN) — ulepszenie z master-spec §9, bo i tak dotykamy `lib/stats.ts`.

## 7. Komponenty i pliki

- `components/modules/RetencjaClient.tsx` — przebudowa `/retencja` (krzywe + OLS).
- `components/modules/LejekClient.tsx` — `/lejek`.
- `components/modules/KorelacjeClient.tsx` — `/korelacje` (dwie sekcje: główna + wewnątrz-KPI).
- `components/ui/Slider.tsx` — suwak progu/„co jeśli" (reużywalny).
- `components/ui/Heatmap.tsx` — heatmapa macierzy korelacji.
- Reuse z Etapu 1a: `BentoCard`, `KpiTile`, `chartTheme`, `applyFilters`, `useFilters`, `useAnalyticsData`.
- Każda strona modułu jak w Etapie 1a: server `page.tsx` z `<Suspense>` + klient.

## 8. Nie-cele (poza Etapem 2)

- Zmiana schematu Supabase / dane retencji per semestr (świadomie aproksymacja).
- Alerty/anomalie, eksport PDF/PNG, „co jeśli"/symulacje prognoz, nowe grupy KPI (to Etap 3).
- Pełne podłączenie zapisów do Supabase (Etap 3).
- Responsywność mobilna (desktop-first).

## 9. Założenia i ryzyka

- **Aproksymacja retencji** to model, nie pomiar — komunikowane w UI; akceptowalne na tym etapie.
- **`parseSemestr`** zakłada format `"<letni|zimowy> RRRR/RRRR"`; nierozpoznane semestry nie wchodzą do
  agregatu KPI (degradacja łagodna, bez błędu).
- **Mała próba** (kilkanaście edycji, 1 semestr KPI w demo) — korelacje i krzywe orientacyjne;
  moduły pokazują ostrzeżenia przy `n<3`.

## 10. Kryteria sukcesu

- `/retencja` pokazuje porównywalne krzywe przeżycia kohort z oznaczeniem szacunku.
- `/lejek` działa w obu widokach, suwak progu przelicza etap „Utrzymani" na żywo, podświetla największy wyciek.
- `/korelacje` pokazuje główną heatmapę (z `KPI%`) + osobny widok wewnątrz-KPI; klik w komórkę → scatter.
- Nowe funkcje `lib/stats.ts` pokryte testami; `tsc --noEmit` czysto; `npm test` zielone; build OK.
- Wszystko działa w trybie demo (bez konfiguracji Supabase).

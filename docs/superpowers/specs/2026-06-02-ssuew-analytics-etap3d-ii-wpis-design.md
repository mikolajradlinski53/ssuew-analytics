# SSUEW Analytics 2.0 — Etap 3d-ii: Wpis danych — Design

- **Data:** 2026-06-02
- **Status:** Zatwierdzony, gotowy do planu
- **Część Etapu 3 / 3d.** Po 3d-i (auth). Następnie: **3d-iii Projekty** (encja + tabela). Workflow: bezpośrednio na `main`; weryfikacja na żywym Supabase.

---

## 1. Cel

Formularze wpisu danych (rekrutacja, KPI komisji + custom KPI, kohorta) zapisujące na żywo do Supabase
jako zalogowany user, podłączenie kohort i komisji na żywo, oraz brakujące endpointy. Bez zmiany
schematu (encja `projekt` = 3d-iii).

## 2. Endpointy API (server client, wzorzec z 3d-i)

- **`/api/kohorty`** — GET (publiczny; demo `[]`) + POST (`authenticated`, w przeciwnym razie 401):
  `upsert` na `kohorty` z `onConflict: 'edycja'`. Walidacja pól.
- **`/api/komisje-lista`** — GET (publiczny): słownik `komisje` (z prawdziwymi `uuid`) do dropdowna
  w formularzu KPI. (Dotychczas hook odwoływał się do nieistniejącego `/api/komisje-lista`.)

## 3. Podłączenie danych na żywo (`lib/useAnalyticsData.ts`)

- `fetchAll` pobiera 4 endpointy: `/api/rekrutacje`, `/api/komisje` (KPI), `/api/kohorty`, `/api/komisje-lista`.
- Każdy dataset: **live jeśli niepusty, inaczej demo** (`rekrutacje`, `kpiPeriods`, `kohorty`, `komisje`).
- `usingDemo` = brak jakichkolwiek danych live.
- Nowa akcja **`addKohorta(payload)`** (POST `/api/kohorty`, potem `refresh()`), obok istniejących
  `addRekrutacja`/`addKpi`.

## 4. Moduł `/wpis` (gated)

- **Gating:** sprawdzenie sesji (`createClient().auth.getUser()` + `onAuthStateChange`). Niezalogowany →
  „Zaloguj się, by wpisywać dane" + link do `/login`. Zalogowany → formularze.
- **Trzy sekcje** (przełącznik):
  1. **Rekrutacja:** edycja, sezon, rok, zgłoszenia, przyjęci → `addRekrutacja`.
  2. **KPI komisji:** komisja (select z `komisje` live), semestr, planowane, zrealizowane, notatka,
     **dynamiczne wiersze custom KPI (klucz–wartość)** → składane w `kpi_custom` (Record<string,string>)
     → `addKpi`.
  3. **Kohorta:** edycja, sezon, rok, liczebność, avg retencja, max retencja, in_progress → `addKohorta`.
- Po sukcesie: komunikat OK + `refresh()` (wykresy/Przegląd się aktualizują). Błąd → komunikat z treścią.
- **Helper `customRowsToObject(rows) → Record<string,string>`** (czysty, TDD): pomija puste klucze.

## 5. Pliki

- Nowe: `app/api/kohorty/route.ts`, `app/api/komisje-lista/route.ts`, `components/modules/WpisClient.tsx`,
  `lib/wpis.ts` (`customRowsToObject` + test).
- Modyfikowane: `lib/useAnalyticsData.ts` (live wiring + `addKohorta`), `app/wpis/page.tsx` (Suspense + klient).
- Reuse: `useAnalyticsData`, `createClient` (browser, auth), `BentoCard`, typy z `@/types`.

## 6. Weryfikacja na żywo (Supabase użytkownika)

1. Zalogowany (z 3d-i) wchodzi na `/wpis`.
2. Zapisuje testową **kohortę** (np. `T'99`) → sukces → pojawia się na `/retencja` po `refresh()`.
3. Zapisuje **KPI komisji** z jednym custom KPI → sukces; (custom widoczne docelowo, tu sprawdzamy zapis).
4. Potwierdzamy, że niezalogowany dostaje gating, a zapis bez sesji → 401 (RLS/endpoint).
- **Nie ujawniamy** sekretów.

## 7. Nie-cele 3d-ii

- Encja `projekt`, tabela `projekty`, `/projekty`, `/api/projekty` (3d-iii).
- Edycja/usuwanie istniejących rekordów (tylko upsert przez formularz).
- Wyświetlanie custom KPI w module Komisje (opcjonalne, poza MVP wpisu).

## 8. Ryzyka / założenia

- **ID komisji:** dropdown KPI musi używać prawdziwych `uuid` z `/api/komisje-lista` (nie demo `k1..k6`),
  inaczej FK insert się nie powiedzie. Dlatego komisje muszą być live przy zalogowanym zapisie.
- Tabele i seed z `schema.sql` istnieją (komisje zaseedowane) — użytkownik potwierdza.
- Tryb demo działa bez logowania (odczyt), zapis wymaga sesji.

## 9. Kryteria sukcesu

- Zalogowany zapisuje rekrutację/KPI/kohortę → dane lądują w Supabase i odświeżają widoki.
- Niezalogowany widzi gating; zapis bez sesji → 401.
- `customRowsToObject` pokryte testem; `tsc` czysto; `npm test` zielone; build OK; demo działa.

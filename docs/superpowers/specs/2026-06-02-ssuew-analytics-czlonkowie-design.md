# SSUEW Analytics — Podprojekt A: Widok per-osoba (członkowie) — Design

- **Data:** 2026-06-02
- **Status:** Zatwierdzony (makieta v4 potwierdzona), workflow: bezpośrednio na `main`.
- **Prywatność:** nazwiska TYLKO w Supabase (za logowaniem). Demo w kodzie = zaślepione (inicjały).

---

## 1. Cel

Moduł `/czlonkowie`: dla wybranej kohorty interaktywna siatka **osoba × semestr** (do W'27),
edytowalne statusy, klikalne komórki, podsumowanie + krzywa przeżycia liczone na bieżąco, autosave
do Supabase. Realne nazwiska tylko na żywo; demo zaślepione.

## 2. Model danych

```ts
type CzlonekStatus = 'aktywny' | 'wspierający' | 'alumn' | 'zawieszone' | 'nieaktywny'
interface Czlonek {
  id: string
  kohorta_edycja: string     // np. "J'24"
  imie_nazwisko: string      // na żywo prawdziwe; demo: 'Członek A' / inicjały
  status: CzlonekStatus
  aktywnosc: number[]        // stan per semestr: 0=nieaktywny, 1=aktywny, 2=wspierający
  created_at: string
}
```
- Kolumny semestrów generowane z kohorty: `kolejneSemestry(sezon, rok, count)` (helper, TDD).
- Tabela `czlonkowie` w `schema.sql` + RLS (public read, auth insert/update). **Bez seedu nazwisk**
  w repo — użytkownik wpisuje realne dane w swojej bazie.

## 3. Statystyka (`lib/stats.ts`, TDD)

- `kolejneSemestry(sezon, rok, count) → { label, sezon, rok }[]` — etykiety kolejnych semestrów.
- `memberStatusCounts(members) → Record<CzlonekStatus, number>`.
- `survivalFromMembers(members) → number[]` — `[100, %aktywnych po 1 sem, ...]` (aktywnosc[i] > 0).

## 4. Endpoint

- `/api/czlonkowie` — GET (publiczny; demo `[]`), POST (authenticated: nowy członek),
  PATCH (authenticated: aktualizacja `status`/`aktywnosc` po `id`).

## 5. Dane / hook

- `lib/useCzlonkowie.ts` — pobiera członków (live/fallback demo `DEMO_CZLONKOWIE` zaślepione),
  `addCzlonek`, `updateCzlonek(id, patch)`. (Osobny hook, by nie rozdymać `useAnalyticsData`.)

## 6. Moduł `/czlonkowie`

- **Selektor kohorty** (z `kohorty`).
- **Siatka:** wiersze = członkowie wybranej kohorty; kolumny = semestry (`kolejneSemestry`).
  - Klik komórki → cykl 0→1→2→0 (kolor: pusty/emerald/fiolet); aktualizuje `aktywnosc` + autosave.
  - Status: select (5 statusów) → autosave.
  - Σ na wierszu = liczba komórek > 0.
- **Podsumowanie (live):** liczby statusów + avg Σ + sparkline krzywej przeżycia (`survivalFromMembers`).
- **Edycja:** włączona gdy `isConfigured` (apka i tak za logowaniem). W demo → read-only + notka.
- **Autosave:** zmiana → `updateCzlonek` (PATCH); błąd cichy (krótki status). Dodawanie członka:
  prosty input „+ dodaj osobę".
- Sidebar: nowa pozycja „Członkowie" (`/czlonkowie`).

## 7. Nie-cele

- Import z arkusza (na razie ręcznie/przez formularz). Edycja semestrów wstecz poza horyzontem W'27.
- Łączenie z modułem Retencja (zostaje na `Kohorta.survival`; integracja później).

## 8. Kryteria sukcesu

- `/czlonkowie`: wybór kohorty → siatka; klik komórek/zmiana statusu przelicza podsumowanie i krzywą
  na bieżąco; w realnej instancji autosave do Supabase. Demo zaślepione, read-only.
- Helpery z testami; `tsc` czysto; `npm test` zielone; build OK.

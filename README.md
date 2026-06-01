# SSUEW Analytics Platform

Dashboard analityczny dla **Samorządu Studentów Uniwersytetu Ekonomicznego we Wrocławiu** —
narzędzie wspierające Wiceprzewodniczącego ds. Strategii i Działań Operacyjnych w monitorowaniu
i prognozowaniu kluczowych wskaźników organizacji.

Aplikacja liczy statystyki **bez zewnętrznych bibliotek matematycznych** — korelacja Pearsona,
test t Welcha, regresja wieloraka OLS i z-score są zaimplementowane od zera w
[`lib/stats.ts`](lib/stats.ts).

## Moduły

| Moduł | Co analizuje | Metody statystyczne |
|-------|--------------|---------------------|
| **Rekrutacje** | Zgłoszenia vs przyjęci, conversion rate, sezonowość | Korelacja Pearsona, test t Welcha, prognoza liniowa |
| **Retention** | Średnia liczba semestrów aktywności kohort | Regresja wieloraka OLS (trend, sezon, liczebność) |
| **Komisje** | Realizacja KPI komisji per semestr | Z-score, ranking względem normy organizacyjnej |
| **Wpisz dane** | Formularze dodawania rekrutacji i KPI | — |

## Stack technologiczny

- **Next.js 16** (App Router) + **React 19**
- **TypeScript 5**
- **Tailwind CSS 4**
- **Recharts** — wykresy
- **Supabase** — baza danych (opcjonalnie; bez konfiguracji aplikacja działa w trybie demo)

## Uruchomienie lokalne

```bash
# 1. Zainstaluj zależności
npm install

# 2. Uruchom serwer deweloperski
npm run dev
```

Aplikacja wystartuje na [http://localhost:3000](http://localhost:3000).

> **Tryb demo:** bez skonfigurowanego Supabase aplikacja korzysta z historycznych danych SSUEW
> (zaszytych w [`lib/useAnalyticsData.ts`](lib/useAnalyticsData.ts)), więc działa od razu po
> `npm run dev`.

## Konfiguracja Supabase (opcjonalnie)

Aby zapisywać prawdziwe dane:

1. Utwórz projekt na [supabase.com](https://supabase.com).
2. W **SQL Editor** wklej i wykonaj zawartość [`lib/schema.sql`](lib/schema.sql) — utworzy tabele
   i wgra dane historyczne.
3. W katalogu projektu utwórz plik `.env.local`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

4. Zrestartuj serwer. Formularze w zakładce „Wpisz dane" zaczną zapisywać do bazy, a dashboard
   automatycznie odświeży wykresy.

> ℹ️ Klucz `NEXT_PUBLIC_SUPABASE_ANON_KEY` jest **publiczny z założenia** — dostęp do danych
> kontroluje Row Level Security skonfigurowane w `schema.sql`. Mimo to plik `.env.local` jest
> ignorowany przez `.gitignore` i nie trafia do repozytorium.

## Struktura projektu

```
app/
  api/              # API routes (Supabase)
  layout.tsx        # root layout
  page.tsx          # wejście — renderuje Dashboard
components/modules/
  Dashboard.tsx     # główny komponent z zakładkami
  Module*.tsx       # widoki poszczególnych modułów
lib/
  stats.ts          # ręcznie pisana statystyka
  supabase.ts       # klient Supabase
  useAnalyticsData.ts  # hook pobierający dane (z fallbackiem demo)
  schema.sql        # schemat bazy + dane historyczne
types/
  index.ts          # typy domenowe
```

## Uwaga metodologiczna

Analizy opierają się na niewielkiej liczbie obserwacji (kilka–kilkanaście edycji), dlatego prognozy
i istotności statystyczne traktuj **orientacyjnie**, jako wsparcie decyzji, a nie twardy dowód.
Wartości p są przybliżane progowo, a modele sygnalizują niskie dopasowanie w polach `warning`.

## Skrypty

| Komenda | Działanie |
|---------|-----------|
| `npm run dev` | serwer deweloperski |
| `npm run build` | build produkcyjny |
| `npm run start` | uruchomienie buildu |
| `npm run lint` | ESLint |

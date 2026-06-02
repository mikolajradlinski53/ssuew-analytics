# SSUEW Analytics 2.0 — Specyfikacja designu

- **Data:** 2026-06-02
- **Autor:** mikolajradlinski53 (z Claude)
- **Status:** Zatwierdzony kierunek, jeden kompletny spec (wdrożenie etapowe)
- **Repozytorium:** https://github.com/mikolajradlinski53/ssuew-analytics

---

## 1. Cel i kontekst

Przebudowa istniejącego dashboardu SSUEW Analytics z **statycznego, mało interaktywnego
narzędzia** w **gęstą, w pełni interaktywną platformę analityczną** w ciemnym stylu „command deck".

Punkt wyjścia (stan obecny): Next.js 16 + React 19 + Tailwind 4, 3 moduły (rekrutacje, retencja,
komisje) na zakładkach, statystyka pisana ręcznie w `lib/stats.ts`, dane z Supabase z fallbackiem
demo. Tylko rekrutacje są w pełni podłączone na żywo; retencja/KPI chodzą na danych demo.

Cel przebudowy: nowy interfejs **oraz** rozbudowa analiz (lejek, krzywe kohort, korelacje, alerty,
eksport, elastyczne grupy KPI), na **realnym backendzie Supabase**.

## 2. Użytkownik i scenariusze

- **Główny użytkownik:** autor (Wiceprzewodniczący ds. Strategii) + Zarząd SSUEW.
- **Kontekst:** robocze narzędzie na desktopie, gęste dane, dużo interakcji, „dla wtajemniczonych".
  Mobile jest drugorzędny (ma działać, ale nie jest priorytetem).
- **Scenariusze:**
  1. Szybki rzut oka na stan organizacji (strona Przegląd).
  2. Drążenie konkretnego obszaru (klik → szczegóły, filtry, porównania).
  3. Wprowadzenie nowych danych (rekrutacja, KPI, nowy projekt/grupa KPI).
  4. Przygotowanie materiału na spotkanie Zarządu (eksport widoku do PDF/PNG).

## 3. Architektura informacji

**Stały lewy pasek (sidebar)** z modułami + **górny pasek** z globalnymi filtrami i statusem.

Moduły w sidebarze:

1. **Przegląd** — bento „command deck" z najważniejszym ze wszystkich domen.
2. **Rekrutacje**
3. **Retencja**
4. **Komisje**
5. **Lejek**
6. **Korelacje**
7. **Alerty**
8. **＋ Wpisz dane** (wyróżniony na dole)

**Górny pasek (globalny):** filtr sezonu (jesień/wiosna/oba), zakres lat (suwak/select),
filtr komisji, wskaźnik trybu (live / demo). Filtry działają na żywo i są zapisywane w **URL**
(stan współdzielony / linkowalny).

## 4. Moduły — szczegóły

Każdy moduł opisany: **cel · dane wejściowe · obliczenia · wizualizacje · interakcje**.

### 4.1 Przegląd (bento)
- **Cel:** jeden ekran ze stanem organizacji.
- **Dane:** agregaty ze wszystkich domen.
- **Wizualizacje (kafelki bento):** 4 KPI (avg conversion, retencja historyczna, przyjęci ostatniej
  edycji, średnia realizacja KPI komisji), wykres trendu zgłoszenia/przyjęci, krzywa retencji,
  karta alertu (najważniejsza anomalia), pasek z-score komisji, mini „co jeśli".
- **Interakcje:** klik w dowolny kafelek → przejście do pełnego modułu (lub drawer ze szczegółem).

### 4.2 Rekrutacje
- **Cel:** analiza skuteczności rekrutacji w czasie i wg sezonu.
- **Dane:** tabela `rekrutacje` (edycja, sezon, rok, zgłoszenia, przyjęci).
- **Obliczenia (zostają z `lib/stats.ts`, odświeżone):** conversion rate, korelacja Pearsona
  (zgłoszenia↔przyjęci) z testem istotności, test t Welcha (sezonowość), prognoza liniowa.
- **Wizualizacje:** słupki zgłoszenia/przyjęci, linia CR%, scatter z linią trendu.
- **Interakcje:** filtry globalne, bogate tooltipy (wartość + interpretacja), drill-down na edycję.

### 4.3 Retencja
- **Cel:** zrozumienie zatrzymania członków.
- **Dane:** tabela `kohorty`.
- **Obliczenia:** regresja wieloraka OLS (trend, sezon, liczebność) — istniejąca, **plus krzywe
  przeżycia (survival)**: % aktywnych po 1, 2, 3… semestrach per kohorta.
- **Wizualizacje:** krzywe retencji wielu kohort na jednym wykresie, tabela współczynników OLS,
  prognoza kolejnej edycji.
- **Interakcje:** wybór kohort do porównania, tooltipy z interpretacją β, filtr sezonu.

### 4.4 Komisje
- **Cel:** benchmarking realizacji KPI komisji.
- **Dane:** `komisje` + `kpi_periods` (możliwość wielu semestrów → trend).
- **Obliczenia:** z-score realizacji względem normy organizacyjnej (istniejące), **plus trend w
  czasie per komisja**.
- **Wizualizacje:** ranking z-score, trend realizacji per komisja, tabela ze statusami.
- **Interakcje:** klik w komisję → historia jej KPI; filtr semestru.

### 4.5 Lejek (nowy)
- **Cel:** pokazać pełną ścieżkę: **zgłoszenie → przyjęcie → aktywność → retencja** i gdzie
  „wycieka" najwięcej osób.
- **Dane:** `rekrutacje` (zgłoszenia, przyjęci) + `kohorty` (n_czlonkow, retencja) per edycja.
- **Obliczenia:** współczynniki przejścia między etapami (%), identyfikacja największego spadku.
- **Wizualizacje:** wykres lejka (funnel) z procentami konwersji między etapami.
- **Interakcje:** wybór edycji/kohorty, tooltip z liczbami i % na każdym etapie.

### 4.6 Korelacje (nowy)
- **Cel:** sprawdzić zależności **między domenami** (np. czy wyższy CR rekrutacji → lepsza retencja).
- **Dane:** połączone metryki per edycja (CR, retencja, liczebność, realizacja KPI gdy dostępne).
- **Obliczenia:** macierz korelacji Pearsona (reuse `pearsonTest`), z istotnością.
- **Wizualizacje:** heatmapa macierzy korelacji + scatter wybranej pary z linią trendu.
- **Interakcje:** wybór pary zmiennych do scatter, tooltip z r/R²/p i interpretacją.

### 4.7 Alerty (nowy)
- **Cel:** automatyczne „na co uważać".
- **Dane:** wszystkie metryki z analiz.
- **Obliczenia:** detekcja anomalii progami z-score (|z| > 1 ostrzeżenie, |z| > 2 krytyczne),
  wykrywanie trendów spadkowych (np. malejąca retencja).
- **Wizualizacje:** lista kart alertów posortowana wg ważności, z interpretacją i rekomendacją.
- **Interakcje:** klik w alert → przejście do źródłowego modułu; **eksport widoku do PDF/PNG**.

### 4.8 Wpisz dane
- **Cel:** dodawanie/edycja danych na żywo do Supabase.
- **Formularze:**
  1. **Rekrutacja** (istniejący): edycja, sezon, rok, zgłoszenia, przyjęci.
  2. **KPI komisji** (istniejący): komisja, semestr, projekty planowane/zrealizowane, notatka.
  3. **Kohorta** (nowy): edycja, liczebność, retencja — żeby retencja działała na żywo.
  4. **Nowy projekt / grupa KPI** (nowy): elastyczne dodatkowe KPI (pole `kpi_custom` jsonb już
     istnieje w schemacie) — definiowanie własnych metryk per komisja/projekt.
- **Interakcje:** walidacja, podgląd wyliczeń (CR%, realizacja%) na żywo, potwierdzenia zapisu.

## 5. Interaktywność — wzorce wspólne

- **Filtry globalne:** sezon, zakres lat, komisja — w górnym pasku, stan w URL, reakcja na żywo.
- **Drill-down:** klik w kafelek/słupek/punkt → szczegół w **drawerze** (panel z prawej) lub
  przejście do modułu.
- **Bogate tooltipy:** nie sama liczba — wartość + interpretacja statystyczna + odniesienie do
  średniej/normy.
- **Porównania:** zestawianie okresów/kohort obok siebie.
- **„Co jeśli" / symulacje:** suwaki zmieniające założenia (np. CR +10%) i przeliczające prognozy
  na żywo.

## 6. Warstwa danych i backend (Supabase)

- **Realny backend Supabase** (użytkownik konfiguruje `.env.local`; plik poza repo).
- **Schemat:** bazuje na istniejącym `lib/schema.sql` (`rekrutacje`, `kohorty`, `komisje`,
  `kpi_periods`). Rozszerzenia:
  - **API endpoint dla kohort** (`/api/kohorty`) — dziś brakuje, retencja chodzi na demo.
  - **Elastyczne grupy KPI / projekty** — wykorzystanie istniejącego `kpi_custom` (jsonb) +
    formularz do definiowania własnych metryk.
- **RLS:** jak obecnie (publiczny odczyt, zapis dla authenticated). Docelowo OAuth domeny
  `@samorzad.ue.wroc.pl` (poza zakresem tego wdrożenia — patrz Nie-cele).
- **Tryb demo:** zostaje jako fallback (flaga `usingDemo`), gdy backend pusty/niewdrożony —
  każdy moduł musi działać bez konfiguracji.

## 7. Design system — „Command Deck" (ciemny)

- **Tokeny kolorów:**
  - tło `#0E1116`, głębsze tło `#090B0E`, panel `#161B22`, obrys `#21262D`
  - tekst `#E6EDF3`, tekst wygaszony `#7D8590`
  - akcent primary (emerald) `#2EE6A6`, akcent secondary (violet) `#8B7CF6`
  - alert: czerwień (tło `#2a1416`, tekst `#ff8a8a`), ostrzeżenie: bursztyn/złoto `#d9b06a`
- **Typografia:** sans systemowy; **cyfry tabularne** (`font-variant-numeric: tabular-nums`) dla
  metryk; nagłówki sekcji 11–15px, metryki 20–22px, etykiety 9–11px uppercase z trackingiem.
- **Spacing/promienie:** gęsto, gap 6–8px w bento, promienie 8–10px, obrys 1px zamiast cieni.
- **Komponenty (biblioteka):** `KpiTile`, `Panel`/`BentoCard`, `ChartWrapper` (recharts w ciemnym
  motywie), `InsightBox`, `Tooltip`, `Drawer`, `FilterBar`, `Sidebar`, `AlertCard`, `WhatIfSlider`.
- **Wykresy:** recharts z ciemnym motywem (siatka `#21262D`, osie `#7D8590`, serie w kolorach
  akcentów). Spójny wrapper, żeby motyw był w jednym miejscu.

## 8. Architektura techniczna

- **Stack:** zostaje Next.js 16 (App Router) + React 19 + Tailwind 4 + recharts + Supabase.
- **Struktura (propozycja):**
  - `app/` — layout (sidebar shell) + **realne routy modułów** (`/`, `/rekrutacje`, `/retencja`,
    `/komisje`, `/lejek`, `/korelacje`, `/alerty`, `/wpis`) dla linkowalności i głębokich linków.
    (Decyzja podjęta; dokładny podział na komponenty doprecyzuje plan.)
  - `app/api/` — endpointy: `rekrutacje`, `komisje` (kpi), **`kohorty` (nowy)**, ewentualnie
    `projekty`/`kpi-custom`.
  - `components/ui/` — biblioteka design systemu (komponenty z §7).
  - `components/modules/` — po jednym katalogu/komponencie na moduł, **mały i skupiony**.
  - `lib/stats.ts` — statystyka (rozszerzona o survival, macierz korelacji; reuse istniejących
    funkcji).
  - `lib/` — hooki danych per domena, klient Supabase, motyw wykresów.
  - `types/` — typy domenowe (rozszerzone).
- **Stan filtrów:** w URL (query params) + cienki kontekst/hook do odczytu.
- **Zasada:** każdy moduł i komponent ma jeden jasny cel, komunikuje się przez jawne propsy,
  da się go zrozumieć i testować osobno.

## 9. Statystyka — ulepszenia metodologiczne

- **Zabezpieczenie macierzy osobliwej** w `matInv3`/`matInv4` (det≈0 → zwróć ostrzeżenie zamiast
  NaN).
- p-value nadal przybliżane progowo — **wyraźnie komunikowane** w UI jako orientacyjne (mała próba).
- Modele pokazują `warning` przy niskim dopasowaniu / małym n (zostaje).
- Reuse istniejących funkcji (`pearsonTest`, `welchT`, `zScores`, `olsMultiple`) wszędzie, gdzie się
  da — bez duplikacji.

## 10. Nie-cele (YAGNI / poza zakresem)

- Pełne OAuth / logowanie po domenie uczelni (zostaje na przyszłość; RLS jak teraz).
- Aplikacja mobilna / PWA (desktop-first; ma działać responsywnie, ale bez dedykowanego mobile UX).
- Wielojęzyczność (tylko polski).
- Zaawansowane modele ML / predykcje poza regresją liniową/OLS.
- Współpraca wieloosobowa w czasie rzeczywistym, komentarze, historia zmian.

## 11. Etapy wdrożenia (kolejność realizacji w ramach jednego spec)

1. **Fundament:** design system (Command Deck) + szkielet (sidebar + górny pasek filtrów + routing)
   + **Przegląd** (bento) + przebudowa 3 istniejących modułów + realne Supabase z endpointem kohort.
2. **Nowe analizy:** Lejek + krzywe retencji kohort + Korelacje.
3. **Inteligencja:** Alerty/anomalie + eksport PDF/PNG + dodawanie nowych grup KPI/projektów +
   „co jeśli"/symulacje.

(Plan wdrożenia rozbije to na konkretne, atomowe zadania.)

## 12. Założenia i otwarte pytania

- **Założenie:** dane historyczne demo pozostają jako seed (są też w `schema.sql`).
- **Otwarte:** biblioteka do eksportu PDF/PNG (np. `html-to-image` + `jspdf`) — wybór w fazie planu.
- **Otwarte:** dokładny model „nowej grupy KPI / projektu" (struktura `kpi_custom`) — doprecyzowanie
  przy module Wpisz dane.

## 13. Kryteria sukcesu

- Wszystkie 8 modułów działa w trybie demo bez konfiguracji **oraz** na żywych danych Supabase.
- Spójny ciemny design system zastosowany wszędzie (jeden zestaw komponentów).
- Filtry globalne, drill-down, tooltipy, porównania i „co jeśli" działają i są płynne.
- `npm run build` przechodzi czysto (TypeScript bez błędów), brak NaN w analizach przy brzegowych
  danych.
- Retencja i KPI komisji pokazują **żywe** dane po zapisaniu (nie tylko demo).

# SSUEW Analytics — Podprojekt D: Polish (logo, animacje, skeleton) — Design

- **Data:** 2026-06-02
- **Status:** Zatwierdzony, workflow: bezpośrednio na `main`.
- **Część milestone'u v2.** Kolejne: A (per-osoba), B (KPI), C (wpis).

---

## 1. Cel

Cross-cutting polish: logo Samorządu zamiast „S", animowane „giełdowe" cyferki (count-up), skeleton
loading w modułach. Bez zmian danych/logiki — sama warstwa prezentacji.

## 2. Logo

- `components/ui/LogoMark.tsx` — `'use client'`: próbuje `<img src="/logo.svg">`; przy błędzie ładowania
  (brak pliku) **fallback na „S"** (obecny znak). Sidebar używa `LogoMark` zamiast literalnego „S".
- Użytkownik wrzuca `public/logo.svg` (lub `.png` — wtedy zmiana ścieżki). Bez pliku działa fallback.

## 3. Animowane liczby (count-up / ticker)

- `components/ui/AnimatedNumber.tsx` — `'use client'`: animuje od poprzedniej wartości do nowej
  (`requestAnimationFrame`, easing `easeOutCubic`, ~700 ms). Props: `value: number`, `decimals?`,
  `prefix?`, `suffix?`, `duration?`. Renderuje `<span class="tabular">`.
- **Reduced motion:** `prefers-reduced-motion: reduce` → ustawia wartość natychmiast (bez animacji).
- Pure helper `easeOutCubic` + `formatNumber(value, decimals)` w `lib/format.ts` (TDD).
- Zastosowanie: kafelki KPI w Przeglądzie i module KPI (wartości liczbowe), avg ratio, sumy.

## 4. Skeleton loading

- `components/ui/Skeleton.tsx` — pulsujący blok (`animate-pulse bg-deck-panel rounded`).
- `components/ui/ModuleSkeleton.tsx` — gotowy układ ładowania (rząd 3–4 kafelków + 1–2 bloki wykresów),
  używany w stanie `loading` modułów zamiast tekstu „Ładowanie…".
- Moduły (Overview, KPI, Rekrutacje, Retencja, Lejek, Korelacje, Prognozy, Alerty) podmieniają
  `loading` branch na `<ModuleSkeleton />`.

## 5. Pliki

- Nowe: `lib/format.ts` (+ test), `components/ui/AnimatedNumber.tsx` (+ test), `components/ui/Skeleton.tsx`,
  `components/ui/ModuleSkeleton.tsx`, `components/ui/LogoMark.tsx`.
- Modyfikowane: `components/ui/Sidebar.tsx` (LogoMark), moduły (skeleton + AnimatedNumber w kafelkach).

## 6. Nie-cele

- Animacje wykresów (recharts ma własne), przejścia między stronami, dźwięki.
- Pełna parametryzacja logo (rozmiar/warianty) — jeden znak w topbarze.

## 7. Kryteria sukcesu

- Logo z `public/logo.svg` (lub fallback „S"). Kafelki KPI „dobijają" wartości animacją; reduced-motion
  respektowane. Moduły pokazują skeleton zamiast tekstu. `tsc` czysto; `npm test` zielone; build OK.

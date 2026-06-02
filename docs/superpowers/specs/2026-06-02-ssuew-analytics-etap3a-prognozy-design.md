# SSUEW Analytics 2.0 — Etap 3a: Prognozy i symulacje — Design

- **Data:** 2026-06-02
- **Status:** Zatwierdzony, gotowy do planu
- **Część Etapu 3** (Inteligencja). Pozostałe podprojekty: 3b moduły Rekrutacje/Komisje, 3c Alerty+eksport, 3d backend+wpis.

---

## 1. Cel

Nowy moduł `/prognozy`: prognozy rekrutacji i retencji **z przedziałem niepewności** oraz
interaktywny **symulator „co jeśli"** (3 scenariusze + porównanie). Na istniejących danych/statystyce,
bez zależności od backendu — działa w trybie demo.

## 2. Prognozy z przedziałem niepewności

- **Rekrutacje:** regresja liniowa `przyjęci ~ nr_edycji`, prognoza na 2 kolejne edycje z przedziałem
  predykcji `ŷ ± SE_pred`, gdzie `SE_pred = s·√(1 + 1/n + (x₀−x̄)²/Sxx)`, `s` = błąd standardowy reszt.
  Przedział **rośnie z odległością** prognozy (uczciwie). Dolny brzeg ucinany do 0.
- **Retencja:** model OLS (trend, sezon, liczebność) → predykcja następnej edycji + przedział z reszt.
- **Wizualizacja:** wykres historii (linia) + prognozy (linia przerywana) + zacieniony pas niepewności
  (recharts `Area` z wartością `[lo, hi]`).
- **Oznaczenie:** „prognoza orientacyjna — mała próba".

## 3. Symulator „co jeśli" (3 sekcje, przeliczanie na żywo)

1. **Rekrutacja:** suwaki `zgłoszenia` (np. 0–60) + `CR%` (0–100) → `przyjęci = round(zgłoszenia·CR/100)`;
   obok pokazana prognoza trendu dla odniesienia.
2. **Retencja:** suwak `liczebność` + przełącznik `sezon` (jesień/wiosna) → przewidywana `avg retencja`
   z modelu OLS (`retentionModel.predict`).
3. **Utrzymanie:** suwaki `przyjęci` + `avg retencja` + `próg N sem.` →
   `utrzymani = round(przyjęci·exp(−N/retencja))` (reuse `retentionFraction` z Etapu 2).

## 4. Porównanie scenariuszy

- Przycisk „Zapisz scenariusz" zapamiętuje aktualne ustawienia suwaków + wyniki pod nazwą
  (stan w komponencie, max 3, bez persystencji).
- Zapisane scenariusze pokazywane obok siebie w tabeli/kartach (np. „optymistyczny" vs „ostrożny")
  z wynikami każdej sekcji.

## 5. Statystyka — nowe czyste funkcje (`lib/stats.ts`, TDD)

| Funkcja | Sygnatura | Uwagi |
|---|---|---|
| `linearForecast` | `(y: number[], steps: number) → ForecastPoint[]` | `ForecastPoint = { i, yhat, lo, hi }`; przedział predykcji rosnący z odległością; `lo` ≥ 0 |
| `retentionModel` | `(kohorty: Kohorta[]) → RetentionModel \| null` | `RetentionModel = { predict(edNr,sezon01,nCzl), r2, n, residualSd, nextEdNr, meanNCzl }`; `null` gdy <4 ukończonych kohort |

Reuse: `mean`, `olsMultiple`, `retentionFraction`. `retentionModel` powiela kilka linii setupu OLS z
`analyzeRetention` (akceptowalne — `analyzeRetention` zostaje nietknięte, by nie ruszać jego testów/zachowania).

## 6. Komponenty i pliki

- `app/prognozy/page.tsx` — server + `<Suspense>` + klient.
- `components/modules/PrognozyClient.tsx` — orkiestracja: 2 wykresy prognoz (rekrutacje, retencja) + `<Symulator/>`.
- `components/modules/Symulator.tsx` — 3 sekcje suwaków + porównanie scenariuszy (stan lokalny).
- `Sidebar.tsx` — nowa pozycja `{ href: '/prognozy', label: 'Prognozy', glyph: '◔' }` w `NAV` (przed „Alerty").
- Reuse: `Slider`, `BentoCard`, `chartTheme`, `useAnalyticsData`, `useFilters`, `applyFilters`, recharts.

## 7. Nie-cele (poza 3a)

- Pełny redesign modułów Rekrutacje/Komisje (3b).
- Alerty/anomalie, eksport PDF/PNG (3c).
- Realne zapisy do Supabase, nowe grupy KPI (3d).
- Persystencja scenariuszy (trzymane tylko w stanie komponentu).

## 8. Ryzyka / założenia

- **Mała próba** (≤8 edycji) → przedziały szerokie i orientacyjne; komunikowane w UI.
- `retentionModel` wymaga ≥4 ukończonych kohort; inaczej sekcja retencji symulatora pokazuje
  „za mało danych do modelu".
- Współliniowe dane → guard z Etapu 2 w `olsMultiple` chroni przed NaN.

## 9. Kryteria sukcesu

- `/prognozy` pokazuje prognozy rekrutacji i retencji z pasem niepewności.
- Symulator: 3 sekcje przeliczają wynik na żywo przy ruchu suwaków.
- Można zapisać i porównać ≥2 scenariusze.
- Nowe funkcje stats pokryte testami; `tsc` czysto; `npm test` zielone; build OK; działa na demo.

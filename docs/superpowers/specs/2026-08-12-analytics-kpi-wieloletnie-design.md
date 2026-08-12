# Analytics — KPI wieloletnie

**Data:** 2026-08-12
**Status:** projekt zatwierdzony

---

## 1. Cel

Umożliwić wpisywanie dowolnej liczby lat do modułu KPI bez dotykania kodu, i pokazywać
metrykę jako **przebieg przez lata**, a nie jako pojedyncze porównanie dwóch okresów.

Rok 2026/2027 zaczyna się teraz. Bez tej zmiany moduł zacznie się psuć przy pierwszym wpisie.

---

## 2. Dlaczego teraz

Obecny model trzyma dwa okresy jako **kolumny jednego wiersza**:

```
kategoria | nazwa | okres_poprzedni | wartosc_poprzednia | okres_biezacy | wartosc_biezaca
```

Zakładka „Rocznik" w `WpisClient` nie nadpisuje wierszy, tylko **dopisuje nowe**. Dane nie
przepadają — ale pojawiają się trzy problemy, które narastają z każdym rokiem:

1. **Każdy rok jest zapisany dwa razy.** 2025/2026 jako `okres_biezacy` starego wiersza
   i jako `okres_poprzedni` nowego. Przy rozbieżności nie ma reguły, który zapis jest prawdą.
2. **Lista mnoży się przez lata.** 17 metryk → 34 wiersze po pierwszym roku, 51 po drugim,
   z powtórzoną nazwą „Adapciak" w każdej kopii.
3. **Kod nie wie, że to ta sama metryka.** `kpiByKategoria` grupuje wyłącznie po kategorii,
   więc alerty odpalą się osobno dla każdej kopii tej samej rzeczy.

Dopisanie kolumny `okres_trzeci` nie pomaga — za rok potrzeba czwartej. Pola dwuokresowe
występują w 102 miejscach w 11 plikach; każdy nowy rok byłby przeglądem całego kodu.

---

## 3. Nowy kształt arkusza

Powstaje **nowa zakładka `kpi_punkty`** o czterech kolumnach:

```
kategoria | nazwa | okres | wartosc
```

```
Koordynatorzy | Adapciak | 2024/2025 | 2
Koordynatorzy | Adapciak | 2025/2026 | 1
Koordynatorzy | Adapciak | 2026/2027 | 3
```

Jeden wiersz to jeden pomiar. **Dodanie roku to dopisanie wierszy — kodu nie dotykasz już nigdy.**

### Dlaczego nowa zakładka, a nie przebudowa starej

Stara zakładka `kpi` **zostaje nietknięta jako archiwum**. Nie ma zmiany nazw, nie ma okna,
w którym aplikacja czyta arkusz w połowie przerobiony, i jest dokąd wrócić, gdyby migracja
wyszła krzywo. Cena to jedna nadmiarowa zakładka w arkuszu — tanio.

### Migracja

Funkcja `migrujKpi()` w `Kod.gs`, uruchamiana ręcznie z edytora Apps Script:

1. Czyta wszystkie wiersze zakładki `kpi`.
2. Z każdego wiersza robi **dwa punkty**: `(okres_poprzedni, wartosc_poprzednia)`
   oraz `(okres_biezacy, wartosc_biezaca)`.
3. Kluczuje po trójce `(kategoria, nazwa, okres)`. Przy kolizji **wygrywa wiersz późniejszy**
   w arkuszu — jeśli kiedykolwiek poprawiałeś liczbę, poprawka jest niżej.
4. Pomija punkty z pustą lub nieliczbową wartością.
5. **Czyści `kpi_punkty` przed zapisem**, więc dwukrotne uruchomienie nie tworzy duplikatów.
6. Zapisuje posortowane po `kategoria, nazwa, okres`.

Kolejność wdrożenia — trzy kroki, żadnego zmieniania nazw:

1. Wklej nowy `Kod.gs`, uruchom `migrujKpi()`.
2. Obejrzyj zakładkę `kpi_punkty` — 17 metryk ma dać 34 punkty.
3. Wypchnij aplikację. Od tej chwili czyta `kpi_punkty`.

---

## 4. Typy

```ts
/** Jeden pomiar — tak, jak leży w arkuszu. */
export interface PunktKpi {
  okres: string      // '2025/2026'
  wartosc: number
}

/** Metryka w czasie — jednostka, którą widzi interfejs. */
export interface SeriaKpi {
  kategoria: string
  nazwa: string
  punkty: PunktKpi[]   // posortowane rosnąco po okresie, bez powtórzeń
}
```

`KpiMetric` przestaje mieć pola dwuokresowe i staje się surowym wierszem arkusza:

```ts
export interface KpiMetric {
  id: string
  kategoria: string
  nazwa: string
  okres: string
  wartosc: number
  created_at: string
}
```

**Metryka jest rozpoznawana po parze `(kategoria, nazwa)`.** Zmiana nazwy rozrywa serię na dwie.
To świadoma cena: alternatywą byłyby sztuczne identyfikatory, które trzeba by przepisywać
ręcznie w arkuszu — a arkusz ma zostać miejscem, gdzie da się wpisać dane bez instrukcji obsługi.

---

## 5. Sklejanie serii — `lib/kpi/serie.ts`

Jedna czysta funkcja, cała logika w jednym miejscu:

```ts
export function serieZWierszy(wiersze: KpiMetric[]): SeriaKpi[]
```

Reguły:

- Grupuje po `(kategoria, nazwa)`.
- W obrębie serii **usuwa powtórzone okresy** — wygrywa wiersz o późniejszym `created_at`.
- Sortuje punkty rosnąco: wyciąga z okresu pierwszą czterocyfrową liczbę i porównuje ją
  liczbowo; gdy w którymś okresie jej nie ma, schodzi do `localeCompare`. Dzięki temu
  `'2024/2025'` i ewentualne `'letni 2025/2026'` układają się poprawnie.
- Serie sortuje po `kategoria`, potem `nazwa`.

Funkcje pomocnicze w tym samym pliku:

```ts
/** Iloraz dwóch ostatnich punktów. Zwraca 0 przy krótszej serii albo zerowym mianowniku. */
export function ilorazSerii(s: SeriaKpi): number

/** Ostatni punkt serii albo null dla serii pustej. */
export function ostatniPunkt(s: SeriaKpi): PunktKpi | null

/** Serie zgrupowane po kategorii — następca `kpiByKategoria`. */
export function serieWgKategorii(serie: SeriaKpi[]): Map<string, SeriaKpi[]>
```

`ilorazSerii` zastępuje dotychczasowe `kpiRatio` i zachowuje jego umowę: **0 znaczy
„nie da się policzyć"** i wszędzie jest odfiltrowywane przed liczeniem średnich.

---

## 6. Wiersz na liście KPI

```
Adapciak        1     [wykres]      ↘ 50%
Gala            5     [wykres]      ↗ 500%
```

Od lewej: nazwa metryki, **ostatnia wartość**, wykres przebiegu, procent rok-do-roku.

Procent stoi w osobnej kolumnie wyrównanej do prawej — tak jak dziś — żeby dało się przelecieć
listę wzrokiem bez czytania wykresów. Wykres jest tłem, nie zamiast liczby.

---

## 7. Wykres — `components/modules/WykresSerii.tsx`

Czysty SVG, **bez Rechartsa**. Na stronie stoi kilkanaście takich wykresów naraz;
Recharts montuje własny kontener i obserwator rozmiaru na każdy z nich, co przy tej liczbie
byłoby widoczne przy ładowaniu.

Forma dobiera się do długości serii:

| Punktów | Forma | Dlaczego |
|---|---|---|
| 0–1 | kreska bazowa, bez danych | Nie ma czego rysować |
| 2 | dwa słupki | Odcinek z dwóch punktów udawałby trend, którego nie ma |
| 3+ | linia z kropkami | Dopiero tu widać kierunek |

Rozmiar `120 × 28` px, `viewBox` skalowany do zakresu wartości serii. Kolor bierze się
z kierunku ostatniej zmiany przez `currentColor`: klasa `text-deck-accent` przy wzroście,
`text-deck-danger` przy spadku, `text-deck-muted` przy braku zmiany.

Dostępność: `<title>` wewnątrz SVG wypisuje serię słowami — `„Adapciak: 2024/2025 — 2,
2025/2026 — 1"` — więc czytnik ekranu dostaje treść, a nie sam kształt.
Element `<svg>` dostaje `role="img"`.

---

## 8. Wpisywanie danych

Zakładka **„Rocznik"** zostaje i jest właściwym miejscem na nowy rok. Zmienia się jej zapis:
zamiast konstruować parę okresów, pisze **jeden wiersz na metrykę** — `(kategoria, nazwa,
nowy okres, wartość)`. Formularz wygląda tak samo: lista istniejących metryk, przy każdej
pole na nową liczbę, jeden przycisk zapisu.

Podpowiadany okres nadal liczy `nextOkres()` — teraz z ostatniego punktu najdłuższej serii,
a nie z `kpiMetrics[0].okres_biezacy`, które brało wiersz zerowy i zależało od kolejności
w arkuszu.

Zakładka **„Pojedyncza metryka"** upraszcza się do czterech pól: kategoria, nazwa, okres,
wartość. Służy do zakładania nowej metryki i do uzupełniania dziur w historii.

---

## 9. Alerty

Progi bez zmian: spadek poniżej 0,6 to `critical`, poniżej 0,8 to `warning`. Liczone
z **dwóch ostatnich punktów serii** przez `ilorazSerii`.

Znika podwójne odpalanie: jedna seria to jeden alert, niezależnie od tego, ile lat obejmuje.

Alert „spadek trzeci rok z rzędu" **odłożony** — przy dwóch punktach historii nie ma z czego
go policzyć. Wraca do rozważenia, gdy serie urosną do czterech lat.

---

## 10. Dwie nowe rodziny metryk

Po migracji nie wymagają kodu. Wchodzą jako wiersze:

| Co liczysz | kategoria | nazwa | okres | wartosc |
|---|---|---|---|---|
| Frekwencja na zebraniach komisji | `Frekwencja P.KA.` | `Październik` | `2025/2026` | `14` |
| Rekrutacja do projektu w obszarze | `Rekrutacja — Kultura` | `Gala` | `2024/2025` | `31` |

Kategoria niesie wymiar (komisja albo obszar), nazwa niesie rzecz (miesiąc albo projekt).
To ten sam kształt, co istniejąca kategoria `Koordynatorzy`, więc lista i wykresy działają
bez zmian. Historia z dwóch lat wchodzi tak samo — jako wiersze z odpowiednim okresem.

---

## 11. Zmiany w plikach

| Plik | Zmiana |
|---|---|
| `apps-script/Kod.gs` | Schemat zakładki `kpi_punkty`; funkcja `migrujKpi()` |
| `types/index.ts` | `KpiMetric` na cztery pola; nowe `PunktKpi`, `SeriaKpi` |
| `lib/kpi/serie.ts` | **nowy** — `serieZWierszy`, `ilorazSerii`, `ostatniPunkt` |
| `lib/stats.ts` | `kpiSummary` i `buildAlerts` liczą z serii; `kpiRatio` i `kpiByKategoria` znikają — zastępują je `ilorazSerii` i `serieWgKategorii` |
| `lib/stats.kpi-yoy.test.ts`, `lib/stats.alerts.test.ts` | Przepisane na serie — zbudowane na starym typie i inaczej się nie skompilują |
| `lib/useAnalyticsData.ts` | `addKpiMetricsBulk` pisze punkty; `kpiMetrics` uzupełnione o `serie` |
| `app/api/kpi/route.ts` | Walidacja czterech pól zamiast sześciu |
| `components/modules/WykresSerii.tsx` | **nowy** — SVG przebiegu |
| `components/modules/KpiClient.tsx` | Wiersz z wykresem; grupowanie po kategorii z serii |
| `components/modules/WpisClient.tsx` | „Rocznik" i „Pojedyncza metryka" na nowy model |

Matematyka pozostałych modułów — retencja, lejek, rekrutacje, kohorty — pozostaje nietknięta.
`kpiByKomisja` i typ `KpiPeriod` też zostają: dotyczą innej zakładki i innego modułu.

---

## 12. Testy

| Co | Jak |
|---|---|
| `serieZWierszy` | Dwa wiersze tej samej metryki dają jedną serię z posortowanymi punktami. Powtórzony okres zostawia nowszy `created_at`. Różne `nazwa` w tej samej kategorii dają osobne serie. Okresy sortują się liczbowo, nie leksykalnie. |
| `ilorazSerii` | Seria jednopunktowa → 0. Ostatnia poprzednia wartość 0 → 0. Punkty 2 → 1 dają 0,5 i liczą się z **końca** serii, nie z początku. |
| `WykresSerii` | Dwa punkty rysują dwa `<rect>`. Pięć punktów rysuje jedną `<polyline>`. Seria jednopunktowa nie wywala się i nie rysuje linii. `<title>` zawiera wszystkie okresy. |
| `KpiClient` | Metryka z pięcioma latami pojawia się w **jednym** wierszu, nie w pięciu. Procent bierze się z dwóch ostatnich punktów. |
| `buildAlerts` | Seria ze spadkiem daje **jeden** alert, nie po jednym na rok. Seria jednopunktowa nie daje alertu. |
| `WpisClient` | „Rocznik" wysyła jeden punkt na metrykę z podanym okresem. Podpowiadany okres bierze się z najdłuższej serii. |
| `migrujKpi` | Test jednostkowy czystej funkcji przekształcającej (sama logika, bez API Arkuszy): wiersze z nakładającymi się parami dają zbiór unikalnych punktów; wiersz z pustą wartością jest pomijany. |

---

## 13. Ryzyka

| Ryzyko | Waga | Co z tym robimy |
|---|---|---|
| Zmiana nazwy metryki rozrywa serię | średnia | Świadoma cena za brak sztucznych identyfikatorów; opisane w `Kod.gs` przy schemacie |
| Dwukrotne uruchomienie `migrujKpi()` | średnia | Funkcja czyści zakładkę przed zapisem |
| Aplikacja wypchnięta przed migracją | średnia | Czyta `kpi_punkty`, której jeszcze nie ma → moduł pokazuje pustkę, nie błąd. Stara zakładka nietknięta, więc cofnięcie to wypchnięcie poprzedniej wersji |
| Wykres nieczytelny przy wielu punktach | niska | Przy 8+ punktach kropki znikają, zostaje sama linia |
| Lista wolniej się skanuje wzrokiem | niska | Procent w wyrównanej kolumnie po prawej; wykres bez osi i podpisów |

---

## 14. Decyzje odłożone

- **Alert „spadek trzeci rok z rzędu"** — wraca, gdy serie będą miały cztery lata.
- **Rozwijanie wiersza w duży wykres po kliknięciu** — sensowne, ale przy dwóch punktach
  nie ma czego powiększać. Wraca razem z powyższym.
- **Kondycja projektów** — osobny moduł, osobny spec. Ma inny kształt danych: budżet,
  przedłużenia, partnerzy w dwóch rodzajach, opisowe problemy. Nie da się go upchnąć
  w model „jedna liczba na okres".

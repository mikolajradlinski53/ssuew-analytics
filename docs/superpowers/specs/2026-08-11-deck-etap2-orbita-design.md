# DECK Etap 2 — Orbita: radar zadań

**Data:** 2026-08-11
**Status:** projekt do zatwierdzenia

---

## 1. Cel

Prywatna tablica zadań w formie radaru: im bliżej środka, tym pilniej. Pozycję wylicza termin,
więc **tablica porządkuje się sama z upływem dnia** — nic nie trzeba przeciągać, żeby odzwierciedlić
to, że coś się zbliża.

Moduł widzi wyłącznie `owner`. Zarząd nie ma do niego dostępu i nie widzi nawet kafelka.

---

## 2. Najprostsza rzecz w całym DECK

Orbita nie potrzebuje warstwy serwerowej. Widzi ją tylko właściciel, a właściciel loguje się
hasłem, więc **ma konto Firebase i pisze do Firestore wprost**. Żadnego `/api/orbita`, żadnego
Admin SDK, żadnych propozycji ani ról.

Reguła Firestore jest jednolinijkowa: dostęp do `users/{uid}/**` ma wyłącznie ten `uid`.

---

## 3. Model danych

```
users/{uid}/zadania/{zadanieId}
  tytul          string
  termin         string | null    "2026-08-15" albo null dla „kiedyś"
  zrobione       boolean
  zrobioneKiedy  number | null
  utworzone      number
```

Termin trzymamy jako `"RRRR-MM-DD"`, nie znacznik czasu: zadanie ma termin *dnia*, a nie chwili.
Znacznik czasu wprowadzałby pytanie o godzinę i strefę tam, gdzie odpowiedź nikogo nie obchodzi.

---

## 4. Geometria radaru

**Promień koduje pilność.** Czysta funkcja zamienia termin na wartość od 0 (środek) do 1 (krawędź):

| Stan zadania | Promień | Wygląd |
|---|---|---|
| po terminie | 0,10 | pulsuje, kolor alarmu |
| dziś | 0,25 | pełna jasność, akcent |
| do trzech dni | 0,45 | pełna jasność |
| do dwóch tygodni | 0,65 | przygaszone |
| dalej | 0,82 | przygaszone |
| bez terminu — „kiedyś" | 0,95 | ledwo widoczne |
| **zrobione** | 0,95 | wyblakłe, przekreślone |

**Zrobione lądują na zewnętrznym pierścieniu niezależnie od terminu.** To rozstrzygnięcie, którego
nie da się uniknąć: zadanie zrobione, ale po terminie, siedziałoby w samym środku i pulsowało
alarmem, mimo że nie ma już nic do zrobienia. Środek należy do rzeczy, które czekają.

**Kąt nie koduje niczego** — wybrałeś radar bez obszarów, więc służy wyłącznie do rozłożenia
zadań tak, żeby na siebie nie nachodziły.

Kąt musi być jednak **stały dla danego zadania**, wyliczany z jego identyfikatora tą samą sztuczką
co kolory osób w Planerze. Losowanie przy każdym renderowaniu sprawiłoby, że zadania skakałyby
po ekranie przy każdej zmianie czegokolwiek — a losowanie z pozycji na liście przesuwałoby
wszystkie pozostałe za każdym razem, gdy jedno dochodzi lub znika.

---

## 5. Radar to nie wszystko

Radar świetnie pokazuje **rozkład**, ale fatalnie nadaje się do odhaczania dwudziestu drobiazgów
po kolei. Dlatego obok niego stoi **widok listy** — te same zadania, posortowane po terminie,
z polami do zaznaczenia.

Przełącznik jak w Planerze. Radar jest domyślny, bo po to powstaje.

**Przy zrobionych dochodzi przełącznik „pokaż zrobione", domyślnie włączony.** Wybrałeś, żeby
zostawały na radarze — i tak będzie. Ale ostrzegałem, że w ciągu tygodnia radar się od nich zapcha,
więc dokładam wyłącznik. To nie cofa Twojej decyzji, tylko daje wyjście, gdy zrobi się ciasno.

---

## 6. Dodawanie zadania

Jedno pole tekstowe u góry i opcjonalna data obok. Enter dodaje i zostawia pole otwarte na kolejne —
zapisywanie myśli w biegu nie może wymagać klikania.

Bez priorytetów, etykiet i opisów. Priorytet **jest** terminem: rzecz pilna dostaje bliższą datę.
Druga skala pilności obok pierwszej tylko rozmywałaby obraz.

---

## 7. Struktura plików

| Plik | Odpowiedzialność |
|---|---|
| `lib/orbita/typy.ts` | Typ `Zadanie` |
| `lib/orbita/pozycja.ts` | Termin → promień, identyfikator → kąt, opis pilności — czyste funkcje |
| `lib/orbita/zapis.ts` | Subskrypcja i zapisy w Firestore |
| `app/orbita/page.tsx` | Serwer: wpuszcza wyłącznie `owner` |
| `components/orbita/OrbitaClient.tsx` | Powłoka: widok, filtr zrobionych, dodawanie |
| `components/orbita/Radar.tsx` | Okręgi, punkty, etykiety |
| `components/orbita/Lista.tsx` | Ta sama treść jako lista do odhaczania |
| `firestore.rules` | Reguła na `users/{uid}` |

---

## 8. Testy

| Co | Jak |
|---|---|
| `lib/orbita/pozycja.ts` | Termin wczorajszy → promień 0,10. Dzisiejszy → 0,25. Za dwa dni → 0,45. Za miesiąc → 0,82. `null` → 0,95. Zadanie zrobione → 0,95 niezależnie od terminu. Ten sam identyfikator zawsze daje ten sam kąt; różne identyfikatory dają różne. |
| `Radar` | Rysuje tyle punktów, ile zadań. Zadanie po terminie dostaje klasę alarmu. Kliknięcie punktu woła podgląd z właściwym zadaniem. |
| `Lista` | Sortuje po terminie, bezterminowe na końcu. Zaznaczenie woła przełączenie z identyfikatorem. |
| `OrbitaClient` | Wyłączenie „pokaż zrobione" ukrywa zrobione w obu widokach. |
| `app/orbita/page.tsx` | Rola `board` dostaje przekierowanie, nie pustą stronę. |

---

## 9. Ryzyka

| Ryzyko | Waga | Co z tym robimy |
|---|---|---|
| Zrobione zapychają radar | średnia | Wyłącznik „pokaż zrobione"; wygaszanie po czasie odrzucone Twoją decyzją |
| Punkty nachodzą na siebie przy wielu zadaniach z tego samego dnia | średnia | Kąt z identyfikatora rozrzuca je równomiernie; przy zbiegu promień dostaje drobne odchylenie |
| Radar nieczytelny na telefonie | niska | Poniżej 640 px pokazujemy od razu listę — radar wymaga kwadratu, którego tam nie ma |
| `board` trafia na `/orbita` z linku | niska | Strona przekierowuje, a kafelek w kokpicie i tak się dla niego nie renderuje |

---

## 10. Decyzje odłożone

- Zadania powtarzalne — Planer pokazał, że warto najpierw zobaczyć, ile wpisywania to kosztuje.
- Powiązanie zadania z wydarzeniem z Planera — kuszące, ale wymaga rozstrzygnięcia, co się dzieje
  przy usunięciu wydarzenia.
- Odznaka z liczbą zaległych na kafelku kokpitu — sensowna, ale najpierw chcę zobaczyć, ile ich
  realnie bywa.

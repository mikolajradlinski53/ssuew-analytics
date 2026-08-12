# DECK Etap 3a — Planer semestru: fundament

**Data:** 2026-08-11
**Status:** projekt do zatwierdzenia
**Poprzednik:** [Etap 1 — fundament kokpitu](2026-08-04-deck-etap1-fundament-design.md)

---

## 1. Cel

`SemestrPlanner.jsx` przestaje być ulotnym szkicem i staje się modułem DECK pod `/planer`:
kalendarz semestru z trwałym zapisem, wykrywaniem kolizji osób i sal, widokiem miesiąca
i całego semestru, w ciemnej szacie reszty aplikacji.

Po tym etapie **układasz semestr od zera i to działa** — odświeżenie strony niczego nie kasuje.

### Dlaczego podzielone na 3a i 3b

Wybrany zakres — semestry z archiwum, pełna edycja wydarzeń, Firestore na żywo, propozycje
ze skrzynką, tryb wspólnej sesji, kolizje, dwa widoki, komentarze, obecność online i przepisanie
całej warstwy wizualnej — to dwa moduły, nie jeden. Etap 3a dowozi rzecz użyteczną samodzielnie;
3b dokłada na nią warstwę dla zarządu. Gdyby 3b nigdy nie powstał, Planer i tak spełnia swoje
zadanie dla jednej osoby.

**Etap 3a (ten dokument):** semestry, wydarzenia, Firestore, dwa widoki, kolizje, ciemny wygląd,
edycja przez `owner`, podgląd dla `board`.

**Etap 3b (osobny dokument):** propozycje i skrzynka, tryb wspólnej sesji, komentarze przy
wydarzeniach, obecność online.

---

## 2. Wymaganie wstępne

**Firestore nie jest włączony** w projekcie `project-deck2627` — sprawdzone 11 sierpnia 2026,
API zwraca `403 Cloud Firestore API has not been used in project (...) before or it is disabled`.

Zanim ruszy implementacja: konsola Firebase → **Firestore Database → Create database** →
tryb **produkcyjny** (reguły piszemy sami, tryb testowy otwiera bazę dla każdego) → lokalizacja
**eur3 (europe-west)**, bo dane dotyczą osób w Polsce i nie ma powodu trzymać ich za oceanem.

Lokalizacji **nie da się później zmienić** bez zakładania bazy od nowa.

---

## 3. Model danych

```
semestry/{semestrId}
  nazwa            "Zimowy 2026/2027"
  miesiace         [{ m: 10, y: 2026 }, … ]     kolejność = kolejność w widoku
  archiwalny       bool
  utworzony        timestamp

semestry/{semestrId}/wydarzenia/{wydarzenieId}
  tytul            "ZEBRANIE ZARZĄDU"
  kategoria        'UE' | 'SSUEW' | 'PROJEKTY' | 'ZEBRANIA' | 'ZEBRANIA/INNE' | 'INNE' | 'APLIKACJE'
  rok, miesiac, dzien
  godzina          "18:00" albo null
  sala             "9J" albo null
  osoby            ['Marcel', 'Jula', …]  — 'wszyscy' znaczy cały zarząd
  zmienione        timestamp
  przez            uid
```

`semestrId` jest czytelny dla człowieka: `2026Z` (zimowy 2026/27), `2027L` (letni). Dzięki temu
adres `/planer?semestr=2026Z` da się odczytać, a w konsoli Firebase widać, co jest czym.

**Dzień, miesiąc i rok trzymamy osobno, nie jako datę.** Kalendarz operuje kratkami miesiąca,
a nie punktami w czasie; przeciągnięcie zmienia wyłącznie `dzien`. Data z pełną strefą czasową
wprowadzałaby pytanie „która godzina w jakiej strefie" tam, gdzie odpowiedź nikogo nie obchodzi.

**Dzień tygodnia nie jest przechowywany**, choć dziś siedzi w danych. Wylicza się z daty jedną
funkcją; przechowywany może się rozjechać z resztą pól przy przesunięciu i wtedy kłamie.

**Sala nie jest wyciągana z tytułu.** Dziś robi to wyrażenie regularne (`roomOf`), które w tytule
„SKS 18:00 - 120 A" znajduje `120A`. To działa przypadkiem i psuje się przy tytule w rodzaju
„Spotkanie 3 osób". Sala staje się osobnym polem, a jednorazowy skrypt migracyjny przepisuje
istniejące dane przez dotychczasowe wyrażenie i pokazuje wynik do zatwierdzenia.

---

## 4. Uprawnienia

Reguły Firestore, nie tylko warstwa interfejsu:

| Kto | Semestry | Wydarzenia |
|---|---|---|
| `owner` | odczyt i zapis | odczyt i zapis |
| `board` | odczyt | **tylko odczyt** (zapis dochodzi w 3b jako propozycje) |
| niezalogowany | brak | brak |

Firestore nie wie nic o naszych rolach, bo te siedzą w zmiennych środowiskowych Vercela.
Rozwiązanie: **własne oświadczenie w tokenie** (custom claim) `rola` nadawane raz, ręcznie,
przez konsolę Firebase Admin — dwa konta, jedna operacja na kadencję.

Reguła sprawdza `request.auth.token.rola == 'owner'`.

**Osoby wchodzące kodem nie mają konta Firebase**, więc nie mogą czytać Firestore bezpośrednio.
Dla nich dane idą przez `/api/planer`, gdzie serwer sprawdza bilet kodowy i czyta Firestore
swoimi uprawnieniami. Ta trasa jest wyłącznie do odczytu — zapis wymaga konta z hasłem.

To jedyne miejsce, w którym dwie drogi wejścia zbudowane w Etapie 1 wymagają różnej obsługi.

**Konsekwencja dla osób na kodzie: nie mają zmian na żywo.** Subskrypcja `onSnapshot` wymaga
połączenia z Firestore, a trasa `/api/planer` zwraca zwykły zrzut. Dostają więc stan z chwili
wejścia i muszą odświeżyć stronę, żeby zobaczyć nowsze. Dla podglądu kalendarza to wystarcza;
gdyby przestało, w Etapie 3b można dołożyć odpytywanie co kilkadziesiąt sekund.

**Konsekwencja dla Ciebie, warta powiedzenia wprost.** Rolę `owner` ma skrzynka
`kontakt@samorzad.ue.wroc.pl`, a Twój prywatny adres jest w `DECK_BOARD_EMAILS`. To znaczy, że
**logując się swoim adresem, Planera tylko oglądasz** — żeby układać semestr, musisz wejść na
konto instytucji. Wynika to wprost z Twojej decyzji, że instytucja ma pierwszeństwo przed osobą,
i tak zostaje; zapisuję to tutaj, żeby nie było zaskoczeniem przy pierwszym użyciu.

---

## 5. Struktura plików

Dzisiejsze 578 linii w jednym pliku rozpada się według odpowiedzialności:

| Plik | Za co odpowiada |
|---|---|
| `lib/planer/daty.ts` | Dni w miesiącu, dzień tygodnia, pierwszy dzień, minuty z godziny |
| `lib/planer/kolizje.ts` | Wykrywanie nakładek osób i sal — czysta funkcja, bez sieci |
| `lib/planer/typy.ts` | `Wydarzenie`, `Semestr`, `Kategoria` |
| `lib/planer/semestry.ts` | Generowanie `semestrId` i listy miesięcy z roku akademickiego |
| `lib/firebase/firestore.ts` | Inicjalizacja i subskrypcje `onSnapshot` |
| `app/planer/page.tsx` | Serwer: rola, wybór semestru, przekierowanie bez sesji |
| `components/planer/PlanerClient.tsx` | Powłoka: przełącznik widoku, filtry, stan wybranego wydarzenia |
| `components/planer/WidokMiesiaca.tsx` | Siatka dni, przeciąganie |
| `components/planer/WidokSemestru.tsx` | Pięć miesięcy naraz, zagęszczenie, kolizje |
| `components/planer/KartaWydarzenia.tsx` | Pojedyncze wydarzenie w kratce |
| `components/planer/PanelWydarzenia.tsx` | Szczegóły, edycja, usunięcie |
| `components/planer/PasekFiltrow.tsx` | Kategorie, osoba, wybór semestru |

Wartość tego podziału jest w dwóch pierwszych plikach: `kolizje.ts` i `daty.ts` są czystymi
funkcjami, więc da się je przetestować bez przeglądarki i bez Firestore — a to tam siedzi cała
logika, którą łatwo zepsuć niezauważenie.

---

## 6. Wykrywanie kolizji

Reguła zostaje ta, którą już masz, bo jest dobra:

**Osoby** — ta sama osoba ma co najmniej dwa wydarzenia tego samego dnia. Kolizja jest *twarda*,
gdy oba mają godzinę i dzieli je mniej niż 90 minut; w przeciwnym razie *miękka* (ostrzeżenie,
że dzień jest napięty).

**Sale** — ta sama sala, ten sam dzień, godziny w odstępie krótszym niż 90 minut. Tylko twarde,
bo bez godziny nie da się orzec konfliktu sali.

`'wszyscy'` nie bierze udziału w liczeniu kolizji osób — inaczej każde zebranie zarządu kolidowałoby
z każdym innym wydarzeniem tego dnia i ostrzeżenia straciłyby sens.

Zmiana wobec dzisiejszego kodu: liczenie przenosi się do czystej funkcji przyjmującej listę
wydarzeń i zwracającej mapę `dzien → kolizje`, zamiast siedzieć w komponencie.

---

## 7. Widoki

**Miesiąc** — siatka siedmiu kolumn, wydarzenia jako karty w kratkach, przeciąganie między dniami.
Dzień z kolizją dostaje znacznik. Kliknięcie karty otwiera panel boczny.

**Semestr** — pięć miesięcy obok siebie, każdy jako miniatura z zagęszczeniem wydarzeń i liczbą
kolizji. Do patrzenia z lotu ptaka przy układaniu planu; kliknięcie miesiąca wchodzi w widok
miesięczny.

**Filtry** wspólne dla obu: kategorie (przełączane) i osoba. Filtr osoby pokazuje też wydarzenia
oznaczone `'wszyscy'`, bo one jej dotyczą.

---

## 8. Wygląd

Ciemny, zgodny z resztą DECK: `deck-card` na panelach, `deck-input` w formularzach, akcent mentowy.

Siedem kolorów kategorii zostaje rozpoznawalnych, ale wymaga przeliczenia — dzisiejsze wartości
dobrano pod białe tło i na ciemnym część z nich (`#2563eb`, `#7c3aed`) traci kontrast wobec tekstu.
Każda kategoria dostaje parę: nasycony kolor na obramowanie i kropkę oraz mocno przyciemniony
wariant na tło karty.

Kalendarz musi zostać czytelny przy dużym zagęszczeniu, więc karta wydarzenia w kratce pokazuje
tylko kolor kategorii, godzinę i skrócony tytuł. Reszta jest w panelu bocznym.

---

## 9. Koszt

Darmowy poziom Firestore to 50 tys. odczytów i 20 tys. zapisów dziennie.

Semestr to około 150 wydarzeń. Wejście w Planer z aktywną subskrypcją `onSnapshot` kosztuje
150 odczytów, a każda zmiana — jeden. Przy pięciu osobach wchodzących po kilka razy dziennie
mówimy o rzędzie 3–5 tys. odczytów. Mieścimy się z zapasem.

Subskrypcja obejmuje **tylko bieżący semestr**, nie archiwum. Bez tego każde wejście czytałoby
wszystkie semestry historii i koszt rósłby z każdą kadencją.

---

## 10. Testy

| Co | Jak |
|---|---|
| `lib/planer/daty.ts` | Dni w miesiącu dla lutego w roku przestępnym, poniedziałek jako pierwszy dzień tygodnia, minuty z `"18:00"` i z pustej godziny |
| `lib/planer/kolizje.ts` | Dwie osoby tego samego dnia bez godzin → miękka; z godzinami w odstępie 60 minut → twarda; w odstępie 120 minut → brak; `'wszyscy'` nie tworzy kolizji; ta sama sala w odstępie 30 minut → twarda |
| `lib/planer/semestry.ts` | Rok akademicki 2026/27 → `2026Z` i pięć miesięcy od października do lutego |
| `WidokMiesiaca` | Renderuje kratki dla właściwej liczby dni; wydarzenie trafia do swojego dnia; filtr kategorii ukrywa karty |
| `app/planer/page.tsx` | Bez sesji przekierowuje na `/login`; rola `board` nie widzi przycisków edycji |

Zgodnie z praktyką projektu — testy przed implementacją każdej z tych jednostek.

---

## 11. Ryzyka

| Ryzyko | Waga | Co z tym robimy |
|---|---|---|
| Firestore niewłączony blokuje wszystko | wysoka | Wymaganie wstępne z sekcji 2, do wykonania przed pierwszym zadaniem |
| Custom claims wymagają Firebase Admin SDK | średnia | Jednorazowe nadanie przez konsolę; gdyby okazało się uciążliwe, zapasowo lista adresów w regułach Firestore wpisana wprost |
| Reguły bezpieczeństwa napisane źle otwierają bazę | wysoka | Reguły powstają razem z modelem, nie po; tryb produkcyjny od początku, nigdy testowy |
| Osoby na kodzie nie mają konta Firebase | średnia | Odczyt przez `/api/planer` z weryfikacją biletu kodowego po stronie serwera |
| Wprowadzanie 150 wydarzeń ręcznie zniechęci | średnia | Formularz przyjmuje wydarzenie w kilku polach i zostaje otwarty na kolejne; kopiowanie z poprzedniego semestru dochodzi w 3b, jeśli okaże się potrzebne |
| `xlsx` importowany, ale niezainstalowany | niska | Import znika z tego etapu — dane wpisujesz w aplikacji, zgodnie z decyzją z rozmowy |

---

## 12. Co dochodzi w Etapie 3b

Propozycje zmian ze skrzynką i akceptacją, tryb wspólnej sesji przełączający zarząd w zapis
na żywo, komentarze przy wydarzeniach oraz podgląd obecności online.

Obecność jest z tej czwórki najdroższa — wymaga zapisów co kilkadziesiąt sekund. Projekt 3b
powinien ją ograniczyć do czasu, gdy tryb wspólnej sesji jest włączony, bo tylko wtedy
odpowiedź na pytanie „kto tu jest" ma znaczenie.

---

## 13. Decyzje odłożone

- Powtarzalne wydarzenia (cotygodniowe zebrania) — dziś każde jest osobnym wpisem. Do rozważenia,
  gdy okaże się, ile wpisywania to naprawdę kosztuje.
- Eksport semestru do pliku — sensowny dopiero, gdy będzie co eksportować.
- Powiadomienia o zmianach — poza zakresem, wymagałyby zadania działającego w tle.

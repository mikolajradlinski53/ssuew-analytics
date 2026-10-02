# Planer — Sesje Operacyjne do końca

**Data:** 2026-10-02
**Status:** projekt do zatwierdzenia
**Poprzednicy:** [Etap 3b — propozycje i tryb wspólny](2026-08-11-deck-etap3b-planer-wspolpraca-design.md),
[Etap 3c — rozmowa i obecność](2026-08-11-deck-etap3c-planer-rozmowa-design.md)

---

## 1. Cel

Sesja Operacyjna to zebranie zarządu, na którym układa się kalendarz semestru. Dziś Planer
obsługuje ją przełącznikiem zapisu na żywo, ale sam kalendarz jest za mało czytelny, żeby
na nim pracować: każde wydarzenie wygląda tak samo, nie ma wydarzeń wielodniowych ani godziny
końca, osoby i sale wpisuje się z palca, a wyniku sesji nie da się nikomu wysłać.

Po tym etapie:

- ważność wydarzenia widać na pierwszy rzut oka,
- wydarzenie może trwać cały dzień, kilka dni albo od godziny do godziny,
- osoby i budynki wybiera się z listy,
- miesiąc pobiera się jako plik Excela do wysłania lub wydruku,
- zarząd w trakcie sesji naprawdę może zapisywać (dziś nie może — patrz §8).

---

## 2. Kategorie i ranga

Sześć kategorii w kolejności ważności. Ranga to liczba, od której zależy wygląd i kolejność
w kratce; nie jest zapisywana w wydarzeniu, wynika z kategorii.

| Ranga | Klucz | Etykieta | Kolor | Uwagi |
|---|---|---|---|---|
| 1 | `ZEBRANIA` | Zebrania | `#60a5fa` | wchłania dawne `ZEBRANIA/INNE` |
| 2 | `SSUEW` | SSUEW | `#2dd4bf` | |
| 3 | `PROJEKTY` | Projekty | `#fbbf24` | obejmuje odprawy projektów |
| 4 | `UE` | Wydarzenia UE | `#818cf8` | |
| 5 | `APLIKACJE` | Aplikacje | `#fb7185` | bez numeru rangi na karcie |
| 6 | `INNE` | Inne | `#a78bfa` | bez numeru rangi na karcie |

Odprawy projektów są w kategorii Projekty, bez osobnej kategorii.

---

## 3. Model danych

Podejście: **rozszerzenie modelu i tłumaczenie starych dokumentów przy odczycie.** Bez
migracji danych — stary dokument dostaje nowe pola przy pierwszej edycji.

```
semestry/{semestrId}/wydarzenia/{id}
  tytul        string
  kategoria    Kategoria                 sześć kluczy z §2
  rok, miesiac, dzien   number           dzień STARTU
  dni          number ≥ 1                NOWE — liczba dni trwania, domyślnie 1
  calyDzien    bool                      NOWE — domyślnie false
  godzina      "HH:MM" | null            start
  godzinaDo    "HH:MM" | null            NOWE — koniec, opcjonalny
  budynek      KodBudynku | null         NOWE
  sala         string | null             numer sali, a przy budynku 'POZA' — nazwa miejsca
  osoby        string[]                  bez zmian; 'wszyscy' = cały zarząd

ustawienia/sklad                         NOWE
  osoby        string[]                  etykiety osób, kolejność = kolejność przycisków
```

**`dni` zamiast daty końca.** Przesunięcie zmienia wyłącznie start; długość zostaje. Przejście
przez granicę miesiąca (30.10–2.11) liczy arytmetyka dat. Formularz pokazuje pole „do dnia”,
a zamiana na `dni` dzieje się przy zapisie.

**`calyDzien` a `godzina: null`.** To dwie różne informacje: „trwa cały dzień” i „godzina
jeszcze nieustalona”. Przy `calyDzien: true` pola godzin są ignorowane i zapisywane jako `null`.

**Budynki** — lista na stałe w kodzie (`lib/planer/budynki.ts`):
A, B, C, D, E, Z, P, CKU, SJO, B/L, B/J, SWFiS, PRZEGUB, ŚLĘŻAK, SIMPLEX, W, oraz `POZA`
(„Poza uczelnią”). Dodanie budynku to zmiana jednej tablicy.

**Osoby zapisywane po etykiecie**, tak jak dziś. Stare wydarzenia działają bez zmian, a eksport
ma czytelne nazwy. Zmiany nazwy osoby nie przewidujemy (§6).

### Tłumaczenie starych dokumentów — `naWydarzenie`

| Stan w dokumencie | Wynik |
|---|---|
| `kategoria: 'ZEBRANIA/INNE'` | `ZEBRANIA` — **jawnie**, zanim zadziała ogólne „nieznana → INNE” |
| brak `dni` lub wartość < 1 | `1` |
| brak `calyDzien` | `false` |
| brak `godzinaDo`, `budynek` | `null` |
| `sala: "9J"` bez budynku | zostaje jako `sala`, `budynek: null` — nie zgadujemy budynku z tekstu |

---

## 4. Kolizje

`kolizjeWMiesiacu` najpierw **rozwija** każde wydarzenie na dni, w których trwa (z uwzględnieniem
przejścia przez miesiąc), dopiero potem grupuje po dniu.

**Osoby** (bez `'wszyscy'`, jak dziś):

- dwa wydarzenia tej samej osoby tego samego dnia → kolizja miękka,
- **twarda**, gdy:
  - któreś jest całodniowe lub wielodniowe — osoba jest zajęta cały dzień, albo
  - oba mają przedział `godzina–godzinaDo` i przedziały się nakładają, albo
  - któremuś brakuje `godzinaDo` — zostaje dzisiejsza reguła: starty bliżej niż 90 minut.

**Sale:** klucz to para `budynek + sala`. Kolizja, gdy w tym samym miejscu są dwa wydarzenia
z godziną i spełniają ten sam warunek nakładania co osoby. Budynek bez sali i `POZA` nie
dają kolizji sali — „Poza uczelnią” to nie jedno miejsce.

---

## 5. Widok miesiąca

### Karta (wariant A + numery rangi)

| Ranga | Wygląd | Znacznik |
|---|---|---|
| 1 Zebrania | pełny blok w kolorze kategorii, tytuł pogrubiony, ciemny tekst | `1` |
| 2 SSUEW | karta z obrysem i jasnym tłem | `2` |
| 3 Projekty | karta z paskiem po lewej | `3` |
| 4 UE | cienka linia po lewej, bez tła | `4` |
| 5–6 Aplikacje, Inne | sam tekst z kropką w kolorze kategorii | — |

Druga linijka karty: czas i miejsce — „18:00–20:00 · B/L 110L”, „18:00” (sam start), „cały dzień”,
„Poza: Klub Pralnia”. Godzina nieustalona — brak części czasowej.

**Kolejność w kratce:** ranga, potem godzina startu, potem tytuł. Nad siatką legenda z rangami.

### Siatka w rzędach tygodni

Dziś siatka to płaska lista kratek. Pasek przez kilka dni wymaga przebudowy na rzędy tygodni:

- nad kratkami każdego tygodnia jest pas na wydarzenia wielodniowe; nachodzące na siebie
  układają się w kolejne pasy (algorytm „pierwszy wolny pas”),
- pasek łamie się na końcu tygodnia; gdy wydarzenie trwa dalej albo zaczęło się w poprzednim
  miesiącu, krawędź paska ma strzałkę,
- pasek ma wygląd swojej rangi i przeciąga się w całości; strzałki na klawiaturze działają
  jak na karcie (w bok o dzień, w pionie o tydzień) — przesuwają start, długość zostaje,
- do miesiąca trafiają wydarzenia, które **nachodzą** na miesiąc, nie tylko te, które w nim
  startują.

Wydarzenie jednodniowe zostaje kartą w kratce — także całodniowe.

### Widok na telefonie

Lista dni: wydarzenie wielodniowe pojawia się w każdym swoim dniu jako jedna linijka z dopiskiem
„2/4”. Karta w tym samym stylu rangi co na dużym ekranie.

### Semestr i filtry

- Widok semestru liczy wydarzenie w każdym miesiącu, przez który przechodzi.
- Filtr osoby wybiera ze Składu zarządu (plus osoby spoza Składu, które występują w wydarzeniach
  semestru, żeby stare dane dało się dalej filtrować).

---

## 6. Formularz i Skład zarządu

### Formularz (`PanelWydarzenia`)

| Pole | Kontrolka |
|---|---|
| Kategoria | rząd przycisków w kolejności rangi, w kolorach kategorii |
| Data | dzień startu + opcjonalne „do dnia” (nie wcześniej niż start) |
| Czas | przełącznik „cały dzień”; poza nim pola „od” i opcjonalne „do” (nie wcześniej niż „od”) |
| Miejsce | lista budynków + pole sali, podpowiedź „110L”; przy „Poza uczelnią” podpowiedź „nazwa miejsca” |
| Osoby | przycisk „Wszyscy” + przyciski osób ze Składu, wybór wielokrotny |

- „Wszyscy” wyklucza pojedyncze osoby i odwrotnie.
- Osoba zapisana w wydarzeniu, której nie ma w Składzie, pokazuje się jako szary przycisk
  z możliwością odpięcia — nic nie znika bez decyzji.
- Ten sam formularz służy zarządowi do propozycji nowego wydarzenia.

### Skład zarządu

- Przycisk „Skład” w nagłówku Planera, widoczny wyłącznie dla `owner`.
- Prosta lista: dodaj osobę, usuń osobę. Duplikaty (bez względu na wielkość liter) odrzucane.
- Usunięcie ze Składu nie zmienia istniejących wydarzeń.
- Zmiany nazwy nie robimy: wymagałaby przepisania wszystkich wydarzeń osoby, a to rzadka potrzeba.
- `owner` czyta i pisze dokument wprost (reguły Firestore, §9). Zarząd dostaje Skład przez
  `GET /api/planer?semestr=…&zasob=sklad` — osoby na kodzie nie mają dostępu do Firestore.
  Pusty lub nieistniejący dokument = pusta lista (formularz pokazuje wtedy podpowiedź „dodaj
  osoby w Składzie”, a „Wszyscy” działa zawsze).

---

## 7. Eksport miesiąca (.xlsx)

- Przycisk „Pobierz miesiąc” w nagłówku Planera, dla `owner` i zarządu. Dotyczy oglądanego
  miesiąca i **pomija filtry**: eksport zawsze zawiera cały miesiąc, żeby plik wysłany dalej
  nie był po cichu niepełny.
- Plik: `planer-RRRR-MM.xlsx`. Biblioteka **ExcelJS**, ładowana dynamicznie po kliknięciu.

**Karta „Kalendarz”:** wiersze = tygodnie, kolumny = Pn…Nd. Komórka: numer dnia, pod nim
wydarzenia w kolejności rangi, każde w osobnej linijce:
`① 18:00–20:00 Zebranie Zarządu · B/L 110L · Jula, Kuba`.
Linijka w kolorze kategorii (rich text) — w **ciemniejszej odmianie do druku** (pole  w ), bo kolory interfejsu są dobrane pod ciemne tło i na białym arkuszu żółty byłby nieczytelny. Zebrania pogrubione. Wielodniowe w każdym dniu
z dopiskiem „(2/4)”. Dni spoza miesiąca — puste, szare tło. Zawijanie tekstu, szerokie kolumny.

**Karta „Lista”:** jeden wiersz na wydarzenie (wielodniowe raz), sortowanie: data, ranga,
godzina. Kolumny: Data · Dzień tygodnia · Do dnia · Od · Do · Ranga · Kategoria · Nazwa ·
Budynek · Sala · Osoby. Zamrożony nagłówek, autofiltr.

Budowanie zawartości to czysta funkcja `lib/planer/eksport.ts` (wydarzenia + miesiąc →
struktura arkuszy). Zamiana na plik to cienka warstwa w komponencie. Testujemy funkcję.

---

## 8. Sesja Operacyjna — naprawa i domknięcie

### Błąd 0a: osoba na kodzie nie wchodzi do kokpitu

Po wpisaniu kodu logowanie przenosi na `/`. Strona kokpitu sprawdza wyłącznie ciasteczko konta
z hasłem (`deck_session`), więc osobę na kodzie odsyła na `/login` — a tam `useAuth` widzi
zalogowanego i znów przenosi na `/`. Pętla przekierowań dla całego zarządu na kodzie.

Naprawa: jedna funkcja serwerowa `ktoNaStronie()` w `lib/auth/` rozpoznaje obie drogi wejścia
(dziś ten kod jest skopiowany w `app/planer/page.tsx`) i obie strony z niej korzystają. Kokpit
dla osoby na kodzie: rola `board`, w miejscu adresu e-mail — etykieta kodu.

### Błąd 0b: osoba na kodzie widzi pusty Planer i nie wie o sesji

Strona Planera podaje osobom na kodzie `poczatkowe={[]}`, a one nie mają subskrypcji Firestore,
więc kalendarz jest pusty. Stan sesji czytają wyłącznie konta z subskrypcją, więc u osób na kodzie
sesja nigdy się nie włącza: nie ma banera ani odpytywania co 15 s.

Naprawa:

- **pierwszy obraz z serwera** — `app/planer/page.tsx` dla osoby na kodzie czyta przez Admin SDK
  wydarzenia, stan sesji i Skład i podaje je do `PlanerClient`,
- **`GET /api/planer?semestr=…`** zwraca obiekt `{ wydarzenia, sesja, sklad }` zamiast samej
  tablicy; jedyny odbiorca to odpytywanie w `PlanerClient`, zmieniane razem,
- **odpytywanie dla osób na kodzie**: przy włączonej sesji co 15 s pełny obraz (jak w 3b),
  poza sesją co 60 s **tylko stan sesji** (`?zasob=sesja`, jeden odczyt dokumentu) — żeby
  zauważyć start sesji bez czytania całego kalendarza co minutę. Wyłącznie przy widocznej karcie.

Koszt: poza sesją 1 odczyt na minutę na osobę; w sesji tyle, co dziś zakładał 3b.

### Błąd: zarząd w sesji nie może zapisać niczego poza przeciągnięciem

W trakcie sesji `PlanerClient` uznaje zarząd za „piszącego wprost” i woła `zmienWydarzenie` /
`dodajWydarzenie` — bezpośredni zapis do Firestore. Reguły pozwalają na to wyłącznie `owner`,
a osoby na kodzie nie mają konta Firebase. Przez serwer idzie tylko przeciągnięcie (`przenies`).
Skutek: **dodanie, edycja i przesunięcie strzałkami od zarządu w sesji kończą się błędem
uprawnień.**

Naprawa — nowe akcje `POST /api/planer`, dozwolone dla zarządu wyłącznie przy włączonej sesji
(serwer sprawdza tryb sam, jak przy `przenies`):

| Akcja | Działanie |
|---|---|
| `dodaj` | nowe wydarzenie (z walidacją jak niżej) |
| `zmien` | zmiana pól istniejącego wydarzenia |
| `przenies` | bez zmian; obsługuje teraz także przesunięcie o dowolną liczbę dni (klawiatura) |

**Usuwanie zostaje wyłącznie dla `owner`** — także w sesji. Jest nieodwracalne, a w sesji
wszyscy klikają naraz.

`PlanerClient` kieruje zapis zarządu przez serwer (`lib/planer/serwer.ts`), a `owner` dalej
pisze wprost.

### Walidacja wydarzenia na serwerze

Jedna funkcja `sprawdzWydarzenie` (czysta, w `lib/planer/`), używana przez `dodaj`, `zmien`
i `propozycja-nowego`: znana kategoria, poprawna data, `dni` 1–60, godziny w formacie `HH:MM`,
`godzinaDo` ≥ `godzina`, budynek z listy albo `null`, osoby jako lista napisów, tytuł niepusty
i do 200 znaków. Błędne dane → 400 z opisem, co jest nie tak.

### Baner w kokpicie

Zgodnie z §7 Etapu 3b, którego dotąd nie wdrożono: kokpit pokazuje „Sesja Operacyjna trwa ·
1 h 20 min → Planer”, widoczne dla wszystkich ról. Stan czyta serwer (Admin SDK), tak jak
licznik propozycji.

Przy okazji: kokpit i strona Planera mają semestr `'2026Z'` wpisany na sztywno. Dochodzi
`biezacySemestr(data)` w `lib/planer/semestry.ts` i oba miejsca z niej korzystają — inaczej
w marcu Planer dalej otwierałby zimę, a baner i licznik patrzyłyby na zły semestr.
Reguła: **wrzesień–luty → semestr zimowy** (wrzesień to już planowanie zimy; styczeń i luty
należą do zimy poprzedniego roku kalendarzowego), **marzec–sierpień → letni**.

---

## 9. Reguły Firestore

Dochodzi jeden blok:

```
match /ustawienia/{dokument} {
  allow read: if maDostep();
  allow write: if jestWlascicielem();
}
```

Musi stać przed regułą zamykającą wszystko. Wdrożenie reguł: wklejenie w konsoli Firebase
(jak dotąd) — to krok ręczny, opisany w instrukcji wdrożenia.

---

## 10. Struktura plików

| Plik | Zmiana |
|---|---|
| `lib/planer/typy.ts` | nowe pola, sześć kategorii z rangą, `RANGA` |
| `lib/planer/budynki.ts` | NOWY — lista budynków |
| `lib/planer/mapowanie.ts` | tłumaczenie starych dokumentów |
| `lib/planer/trwanie.ts` | NOWY — rozwinięcie wydarzenia na dni, nachodzenie na miesiąc, data końca ↔ `dni` |
| `lib/planer/kolizje.ts` | rozwinięcie na dni, przedziały, całodniowe, klucz miejsca |
| `lib/planer/pasy.ts` | NOWY — układ pasków wielodniowych w tygodniu |
| `lib/planer/walidacja.ts` | NOWY — `sprawdzWydarzenie` |
| `lib/planer/eksport.ts` | NOWY — struktura arkuszy |
| `lib/planer/sklad.ts` | NOWY — subskrypcja / zapis Składu (owner) |
| `lib/planer/serwer.ts` | `dodaj`, `zmien`, `przesun`, `pobierzSklad` |
| `app/api/planer/route.ts` | akcje `dodaj`, `zmien`, przesunięcie o N dni, `zasob=sklad`, walidacja |
| `components/planer/KartaWydarzenia.tsx` | styl rangi, druga linijka |
| `components/planer/PasekWielodniowy.tsx` | NOWY |
| `components/planer/WidokMiesiaca.tsx` | rzędy tygodni, pasy, sortowanie po randze, legenda |
| `components/planer/PanelWydarzenia.tsx` | nowe kontrolki |
| `components/planer/WyborOsob.tsx` | NOWY |
| `components/planer/Sklad.tsx` | NOWY — edycja Składu |
| `components/planer/PobierzMiesiac.tsx` | NOWY — przycisk eksportu |
| `components/planer/PlanerClient.tsx` | ścieżki zapisu zarządu, Skład, eksport |
| `lib/auth/naStronie.ts` | NOWY — `ktoNaStronie()` dla stron serwerowych |
| `lib/planer/semestry.ts` | `biezacySemestr(data)` |
| `components/deck/DeckHub.tsx`, `app/page.tsx` | baner sesji, bieżący semestr |
| `app/planer/page.tsx` | bieżący semestr zamiast `'2026Z'` |
| `firestore.rules` | blok `ustawienia` |

---

## 11. Kolejność wdrożenia

Każda faza zostawia działający Planer.

0. **Zarząd na kodzie w ogóle wchodzi** — kokpit dla obu dróg wejścia (błąd 0a), pierwszy obraz
   i odpytywanie Planera (błąd 0b). Najpierw, bo bez tego reszta nie dociera do większości zarządu.
1. **Model i logika** — typy, budynki, tłumaczenie, trwanie, kolizje, walidacja. Bez zmian
   w wyglądzie, poza tym, że „Zeb./inne” znika z filtrów.
2. **Zapis** — akcje serwera dla sesji (naprawa błędu z §8), formularz z nowymi polami, Skład.
3. **Widok** — karta rangi, rzędy tygodni, paski, telefon, semestr.
4. **Eksport i kokpit** — .xlsx, baner sesji, bieżący semestr.

---

## 12. Testy

| Co | Przypadki |
|---|---|
| `mapowanie` | `ZEBRANIA/INNE` → `ZEBRANIA` (nie `INNE`); brak nowych pól → wartości domyślne |
| `trwanie` | 3 dni w środku miesiąca; 30.10 + 4 dni → 30, 31.10, 1, 2.11; data końca ↔ `dni` w obie strony; nachodzenie na miesiąc |
| `kolizje` | nakładające się przedziały → twarda; rozłączne → miękka; całodniowe + inne tej osoby → twarda; ten sam numer sali w różnych budynkach → brak kolizji; `POZA` → brak kolizji sali |
| `pasy` | dwa nachodzące paski → dwa pasy; rozłączne → jeden pas; łamanie na granicy tygodnia |
| `walidacja` | każdy błędny przypadek z §8 → opis błędu; poprawne → `null` |
| `semestry` | 2026-10-02 → `2026Z`; 2027-02-15 → `2026Z`; 2027-03-01 → `2026L`; 2027-09-01 → `2027Z` |
| `eksport` | kolejność w komórce po randze; wielodniowe w każdym dniu z „(n/m)”; lista: wielodniowe raz; nazwy dni tygodnia |
| `POST /api/planer` | zarząd bez sesji: `dodaj`/`zmien` → 403; w sesji → 200; usuwanie przez zarząd → 403 zawsze; błędne dane → 400 |
| `GET /api/planer` | zwraca `{ wydarzenia, sesja, sklad }`; `zasob=sesja` → sam stan sesji; bez biletu → 401 |
| `ktoNaStronie` | ciasteczko hasła → rola z adresu; samo ciasteczko kodu → `board` z etykietą; brak obu → `null` |
| `KartaWydarzenia` | numer rangi dla 1–4, brak dla 5–6; „cały dzień”; „od 18:00”; miejsce „Poza: …” |
| `WyborOsob` | „Wszyscy” odznacza pojedyncze osoby i odwrotnie; osoba spoza Składu jako szary przycisk |
| `PanelWydarzenia` | „do dnia” wcześniej niż start zablokowane; „cały dzień” chowa godziny |

---

## 13. Ryzyka

| Ryzyko | Waga | Co z tym robimy |
|---|---|---|
| Stare zebrania po cichu w „Inne” | wysoka | jawne tłumaczenie `ZEBRANIA/INNE` + test |
| Zarząd w sesji z szerszymi prawami zapisu | średnia | serwer sprawdza sesję przy każdym zapisie; usuwanie tylko `owner`; walidacja danych |
| Reguły Firestore niewdrożone | średnia | Skład dla `owner` zawiedzie głośno; krok w instrukcji wdrożenia |
| Przebudowa siatki psuje przeciąganie | średnia | istniejące testy `WidokMiesiaca` zostają i muszą przejść |
| Rozmiar ExcelJS | niska | import dynamiczny po kliknięciu |

---

## 14. Poza zakresem

- Dziennik zmian z sesji („kto co przesunął”).
- Zmiana nazwy osoby w Składzie.
- Wydarzenia cykliczne jako seria (zostaje dzisiejsze „powtórz co tydzień” tworzące osobne wpisy).
- Usuwanie przez zarząd i propozycja usunięcia.
- Ogólny przegląd wyglądu i UX całego DECK — osobny temat, kolejny w kolejce.

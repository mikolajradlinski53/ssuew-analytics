# DECK Etap 3c — Planer: komentarze i obecność

**Data:** 2026-08-11
**Status:** projekt do zatwierdzenia
**Poprzednik:** [Etap 3b — propozycje i tryb wspólnej sesji](2026-08-11-deck-etap3b-planer-wspolpraca-design.md)

---

## 1. Cel

Przy wydarzeniu da się porozmawiać, a na Sesji Operacyjnej widać, kto jest pod ręką i co ogląda.
To domyka Planer: 3a dał kalendarz, 3b prawo głosu, 3c — rozmowę.

Etap jest mały, bo cała warstwa serwerowa powstała w 3b. Dochodzą dwie kolekcje i dwa komponenty.

---

## 2. Model danych

**Komentarze leżą płasko, nie w podkolekcji wydarzenia.**

```
semestry/{semestrId}/komentarze/{komentarzId}
  wydarzenieId   string
  tresc          string
  autor          string      etykieta kodu albo adres e-mail
  utworzone      number      milisekundy

semestry/{semestrId}/obecnosc/{uid}
  kto            string      etykieta kodu albo adres e-mail
  ostatniZnak    number      milisekundy
  patrzyNa       string|null identyfikator otwartego wydarzenia
```

Podkolekcja przy wydarzeniu wyglądałaby naturalniej, ale wtedy **kropka przy wydarzeniach
z komentarzami wymagałaby odpytania każdej podkolekcji osobno**. Płaska kolekcja daje ją za darmo:
jedna subskrypcja przynosi wszystkie komentarze semestru, a widok grupuje je po `wydarzenieId`.
Alternatywa — licznik na dokumencie wydarzenia — wprowadzałaby zliczanie, które potrafi się
rozjechać z rzeczywistością.

Semestr to rząd wielkości kilkudziesięciu komentarzy, więc jedna subskrypcja niczego nie obciąża.

---

## 3. Obecność i jej koszt

Wybrałeś wariant z awatarami **i** wskazaniem, kto na czym stoi. To najdroższa rzecz w całym
Planerze, więc podaję liczby wprost.

Przy pięciu osobach i ośmiu godzinach dziennie: znak życia co minutę to około **2,4 tys. zapisów**,
a zmiany „patrzę na to wydarzenie" dorzucają kolejne kilkaset. Każdy zapis budzi subskrypcję
u wszystkich pozostałych, więc odczytów wychodzi **około 15 tys. dziennie** — mniej więcej jedna
trzecia darmowego limitu.

**Mieści się, ale nie za darmo.** Trzy ograniczenia, które tnę bez zmiany tego, co widzisz:

- znak życia idzie **tylko przy widocznej karcie** — karta w tle nic nie zapisuje,
- **co 60 sekund**, nie częściej,
- **wygasa po dwóch minutach ciszy**: kto nie odezwał się dłużej, znika z paska. To nie jest
  ustawienie, tylko konieczność — przeglądarka zamknięta gwałtownie nie zdąży się wymeldować,
  a bez wygasania pasek pokazywałby duchy.

`patrzyNa` zmienia się **wyłącznie przy otwarciu panelu wydarzenia**, nie przy najechaniu myszą.
Najechanie generowałoby dziesiątki zapisów na minutę i nic by nie wnosiło.

---

## 4. Kto pisze i którędy

Bez zmian wobec 3b: właściciel pisze wprost do Firestore, cała reszta przez `/api/planer`.

Dochodzą trzy akcje: `komentarz` (dopisz), `obecnosc` (znak życia) oraz `patrze` (zmiana
oglądanego wydarzenia).

**Komentarz może dopisać każdy zalogowany, także na kodzie.** Wybrałeś model „wszyscy widzą
wszystko", więc rozmowa jest wspólna — ograniczanie zapisu do właściciela zamieniłoby ją w tablicę
ogłoszeń.

**Komentarza nie da się usunąć ani poprawić.** Świadomie: kasowanie cudzych wypowiedzi to osobna
decyzja o uprawnieniach, a poprawianie wymaga historii zmian. Jeśli okaże się potrzebne, dołożymy
później — na razie liczy się, żeby rozmowa w ogóle istniała.

---

## 5. Gdzie to widać

**Kropka przy wydarzeniu.** Karta w kratce dostaje małą kropkę, gdy ma komentarze. Bez liczby —
kropka mówi „tu się coś działo", a liczbę widać po otwarciu.

Świadomie **bez odznaki na kafelku kokpitu**: komentarz to rozmowa, nie zadanie do odhaczenia,
i nie powinien dopominać się uwagi tak jak propozycja czekająca na decyzję.

**Wątek w panelu wydarzenia**, pod formularzem: lista wypowiedzi z autorem i godziną plus pole
na nową. Najstarsze u góry, bo wątek czyta się od początku.

**Pasek obecności** u góry Planera: inicjały w kółkach, kolor wyliczany z imienia — ta sama
funkcja, którą masz dziś w starym pliku. Kto ogląda konkretne wydarzenie, ma swój awatar
pokazany również przy tym wydarzeniu w kratce.

---

## 6. Struktura plików

| Plik | Odpowiedzialność |
|---|---|
| `lib/planer/obecnosc.ts` | Odsiew nieaktualnych znaków życia, inicjały, kolor z imienia — czyste funkcje |
| `lib/planer/komentarze.ts` | Typ komentarza i grupowanie po wydarzeniu — czyste funkcje |
| `lib/planer/zapis.ts` | Subskrypcje komentarzy i obecności, zapis dla właściciela |
| `lib/planer/serwer.ts` | Trzy nowe akcje dla zarządu |
| `app/api/planer/route.ts` | Obsługa tych akcji |
| `components/planer/Obecnosc.tsx` | Pasek awatarów |
| `components/planer/Watek.tsx` | Lista komentarzy i pole na nowy |

---

## 7. Testy

| Co | Jak |
|---|---|
| `lib/planer/obecnosc.ts` | Znak sprzed 30 sekund zostaje, sprzed 3 minut odpada. Inicjały z „Jula" to „JU", z „wszyscy" to gwiazdka. Ten sam kolor dla tego samego imienia przy każdym wywołaniu. |
| `lib/planer/komentarze.ts` | Grupowanie po `wydarzenieId`; wydarzenie bez komentarzy nie ma wpisu; kolejność od najstarszego. |
| `POST /api/planer` | Akcja `komentarz` bez sesji → 401, z sesją → 201. Pusta treść → 400. Akcja `obecnosc` zapisuje `uid` pytającego, a nie ten podany w treści żądania. |
| `Watek` | Pusty wątek pokazuje zachętę, nie pustą listę. Wysłanie czyści pole. Sama spacja nie wysyła. |
| `Obecnosc` | Nie pokazuje nikogo przy pustej liście. Odsiewa nieaktualne. Pokazuje inicjały. |

---

## 8. Ryzyka

| Ryzyko | Waga | Co z tym robimy |
|---|---|---|
| Obecność zjada limit odczytów | średnia | Trzy ograniczenia z sekcji 3; przy przekroczeniu wystarczy wydłużyć odstęp do 120 s |
| Duchy w pasku po zamknięciu karty | wysoka | Wygasanie po dwóch minutach ciszy, liczone po stronie odbiorcy |
| Podszycie się pod kogoś w obecności | średnia | Serwer zapisuje `uid` i etykietę **z biletu**, nigdy z treści żądania |
| Wątek rośnie bez końca | niska | Semestr to rząd kilkudziesięciu wypowiedzi; gdyby urósł, dołożymy zwijanie starszych |

---

## 9. Decyzje odłożone

- Usuwanie i poprawianie komentarzy — wymaga rozstrzygnięcia, kto może kasować cudze.
- Wzmianki („@Jula") z powiadomieniem — sensowne dopiero, gdy rozmowa faktycznie ruszy.
- Obecność poza Planerem, w kokpicie — na razie widać ją tam, gdzie ma znaczenie.

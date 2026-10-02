# Warstwa danych DECK — Arkusze Google + Apps Script

`Kod.gs` zamienia arkusz Google w bazę danych dla DECK. Jest wersjonowany w repozytorium,
żeby zmiany były w historii, a nie tylko w edytorze skryptów.

## Uruchomienie — sześć kroków

**1. Nowy arkusz.** Wejdź na <https://sheets.new> i nazwij plik `DECK — dane`. Nie twórz
żadnych zakładek ręcznie; zrobi to skrypt.

**2. Wklej skrypt.** *Rozszerzenia → Apps Script*. Usuń zawartość pliku `Kod.gs` w edytorze
i wklej całą treść [`Kod.gs`](Kod.gs) z tego katalogu. Zapisz (Ctrl+S).

**3. Uruchom `setup`.** Wybierz funkcję `setup` z listy na górze i kliknij *Uruchom*. Google
poprosi o zgodę na dostęp do arkusza — to Twój własny plik, więc zgadzasz się na dostęp
skryptu do samego siebie. Po chwili w arkuszu pojawią się cztery zakładki, a `rekrutacje`,
`kohorty` i `kpi` będą już wypełnione historią SSUEW. `czlonkowie` zostaje pusta, bo nazwisk
nie ma w repozytorium.

**4. Odczytaj token.** Uruchom funkcję `pokazToken` i otwórz *Dziennik wykonania*. Skopiuj
wypisaną wartość — zaczyna się od `GAS_TOKEN=`.

**5. Wdróż jako aplikację internetową.** *Wdróż → Nowe wdrożenie → Aplikacja internetowa*:

| Ustawienie | Wartość |
|---|---|
| Opis | `DECK dane` |
| Wykonuj jako | **Ja** |
| Kto ma dostęp | **Wszyscy** |

Skopiuj adres wdrożenia — kończy się na `/exec`.

**6. Wpisz oba sekrety na Vercelu.** W ustawieniach projektu, *Environment Variables*:

```
GAS_URL    = https://script.google.com/macros/s/…/exec
GAS_TOKEN  = wartość z kroku 4
```

## Dlaczego „dostęp: wszyscy" jest bezpieczne

„Wykonuj jako: ja" oznacza, że skrypt sięga do arkusza moimi uprawnieniami — gdyby wymagał
logowania Google od pytającego, serwer DECK nie mógłby go zawołać, bo serwer nie ma konta Google.

Zabezpieczeniem są więc dwa sekrety zamiast logowania: **adres wdrożenia** (nie da się go zgadnąć)
oraz **token** sprawdzany przy każdym żądaniu. Oba żyją wyłącznie w zmiennych środowiskowych
Vercela i nigdy nie trafiają do kodu wysyłanego do przeglądarki — dlatego DECK woła skrypt
z serwera, a nie bezpośrednio z Twojej karty w przeglądarce.

Gdyby token kiedykolwiek wyciekł: uruchom `zmienToken`, skopiuj nową wartość i podmień
`GAS_TOKEN` na Vercelu. Stary przestaje działać natychmiast.

## Interfejs

Odczyt:

```
GET  {GAS_URL}?token={GAS_TOKEN}&t=rekrutacje
     → [ { id, edycja, sezon, rok, zgloszenia, przyjeci, created_at }, … ]

GET  {GAS_URL}?token={GAS_TOKEN}&t=_ping
     → { ok: true, zakladki: [...], czas: "2026-08-05T…" }
```

Zapis — zawsze `POST` z treścią JSON:

```jsonc
{
  "token": "…",
  "t": "kpi",
  "op": "insert",       // insert | upsert | update
  "rows": [ { … } ]     // zawsze tablica, także dla jednego wiersza
}
```

| Operacja | Działanie |
|---|---|
| `insert` | Dopisuje wiersze na końcu. Nadaje `id` i `created_at`. |
| `upsert` | Nadpisuje wiersz o podanym `id`, a bez `id` — wiersz o tej samej wartości klucza naturalnego (`edycja` w `rekrutacje` i `kohorty`). Gdy nic nie pasuje, dopisuje. Pola nieprzesłane zostają bez zmian. |
| `update` | Poprawia istniejący wiersz; wymaga `id`. Nie tworzy nowych wierszy. Nie rusza `id` ani `created_at`. |

Odpowiedź: `{ ok: true, rows: [ … ] }` albo `{ ok: false, kod: 403, error: "…" }`.

> **Apps Script zawsze odpowiada kodem HTTP 200**, także przy błędzie — nie da się tego zmienić.
> Dlatego prawdziwy kod jedzie w polu `kod` w treści, a klient po stronie DECK sprawdza `ok`,
> a nie status odpowiedzi.

## Zakładki

| Zakładka | Kolumny |
|---|---|
| `rekrutacje` | `id`, `edycja`, `sezon`, `rok`, `zgloszenia`, `przyjeci`, `created_at` |
| `kohorty` | `id`, `edycja`, `sezon`, `rok`, `n_czlonkow`, `avg_retention_sem`, `max_retention_sem`, `in_progress`, `survival`, `created_at` |
| `kpi_punkty` | `id`, `kategoria`, `nazwa`, `okres`, `wartosc`, `created_at` |
| `kpi` | **archiwum** — stary format dwuokresowy, nieczytany przez aplikację |
| `projekty` | `id`, `projekt`, `edycja`, `obszar`, `budzet_plan`, `budzet_wydany`, `przedluzenia`, `aplikujacy`, `uczestnicy`, `partnerzy_fin`, `partnerzy_barter`, `problemy`, `created_at` |
| `czlonkowie` | `id`, `kohorta_edycja`, `imie_nazwisko`, `status`, `aktywnosc`, `created_at` |

Zakładkę `projekty` tworzy `setup()` — pustą, bo danych historycznych o projektach nie ma.
Wpisuje się je z aplikacji (*Wpisz dane → Projekt*) albo prosto w arkuszu.

W `kpi_punkty` **jeden wiersz to jeden pomiar**. Metryka jest rozpoznawana po parze
`kategoria` + `nazwa`, a kolejne lata to kolejne wiersze:

```
Koordynatorzy | Adapciak | 2024/2025 | 2
Koordynatorzy | Adapciak | 2025/2026 | 1
Koordynatorzy | Adapciak | 2026/2027 | 3
```

Dodanie roku to dopisanie wierszy — kodu nie trzeba dotykać. Zmiana nazwy metryki
rozrywa jej historię na dwie serie, więc nazwy raz ustalone lepiej zostawić w spokoju.

`survival` i `aktywnosc` to listy liczb w jednej komórce, po przecinku: `100,100,97,83,63`.
Arkusz ma być czytelny dla człowieka, więc lista wygrywa z JSON-em.

## Zasady edycji ręcznej

Możesz swobodnie dopisywać wiersze prosto w arkuszu — **zostaw puste `id`, a skrypt nada je
przy pierwszym zapisie z aplikacji**. Możesz też przestawiać kolumny miejscami: skrypt czyta
je po nazwie nagłówka, nie po pozycji.

Czego nie robić: nie usuwaj ani nie zmieniaj nazw nagłówków. Brakujący nagłówek to jawny błąd,
a nie ciche zero — celowo, bo zera w kolumnie „zgłoszenia" dałyby wykresy, które wyglądają
wiarygodnie i są nieprawdziwe.

## Aktualizacja skryptu w działającym arkuszu

**Samo zapisanie kodu niczego nie zmienia w aplikacji.** Adres `/exec` serwuje wersję
zamrożoną w chwili wdrożenia — dopóki nie wydasz nowej wersji, DECK rozmawia ze starym kodem.

1. Wklej aktualny `Kod.gs` do edytora Apps Script i zapisz (Ctrl+S).
2. Jeśli w arkuszu nie ma jeszcze `kpi_punkty`: uruchom **`migrujKpi`** (patrz niżej).
3. Uruchom **`setup`** — założy brakujące zakładki (np. pustą `projekty`). Istniejących
   nie rusza i niczego do nich nie wgrywa.
4. *Wdróż → Zarządzaj wdrożeniami* → ołówek przy wdrożeniu `DECK dane` → *Wersja:*
   **Nowa wersja** → *Wdróż*. Adres `/exec` zostaje ten sam, więc na Vercelu nic nie zmieniasz.
   (*Nowe wdrożenie* dałoby nowy adres — wtedy trzeba by podmienić `GAS_URL`.)
5. Sprawdź `_ping` (sekcja niżej) — lista zakładek ma pokazać nowy schemat.

## Migracja KPI na format wieloletni (jednorazowo)

Przejście ze starego modelu dwuokresowego. Aplikacja od wersji z 12.08.2026 czyta wyłącznie
`kpi_punkty` — bez migracji moduł KPI nie dostanie danych.

Wybierz z listy funkcję **`migrujKpi`** i kliknij **Uruchom**. Sprawdź nową zakładkę
`kpi_punkty`: wierszy ma być **dwa razy tyle co w `kpi`** (każdy stary wiersz zawierał dwa
pomiary). Funkcja wypisuje dokładną liczbę w dzienniku.

Stara zakładka `kpi` zostaje nietknięta jako archiwum. Nic jej już nie czyta, ale jest dokąd
wrócić, gdyby migracja wyszła krzywo. `migrujKpi()` można puścić wielokrotnie — czyści
`kpi_punkty` przed zapisem, więc nie narobi duplikatów.

## Sprawdzenie, czy działa

Wklej w przeglądarkę adres wdrożenia z `&t=_ping` i swoim tokenem. Poprawna odpowiedź:

```json
{ "ok": true, "zakladki": ["rekrutacje","kohorty","kpi","kpi_punkty","projekty","czlonkowie","kody"], "czas": "…" }
```

Odpowiedź `{ "ok": false, "kod": 403 }` oznacza zły token. Strona logowania Google zamiast
JSON-a oznacza, że wdrożenie ma ustawione „Kto ma dostęp" inne niż *Wszyscy*.

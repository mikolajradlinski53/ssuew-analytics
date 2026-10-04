# D.E.C.K. - pamięć asystenta

Data: 2026-10-04 · Stan: zaakceptowany projekt

## 1. Cel

Asystent D.E.C.K. pamięta między dniami i urządzeniami:

- **rozmowy** - zapisane wątki, do których można wrócić;
- **notatki** - krótkie ustalenia (np. „Zebrania zarządu zawsze w środy”, „cel retencji 3,5 sem.”), które asystent dostaje przy każdym pytaniu i przy odprawie.

Dziś historia czatu żyje w `sessionStorage` jednej karty i znika po jej zamknięciu, a asystent nie zna żadnych ustaleń spoza danych.

## 2. Decyzje użytkownika

| Temat | Decyzja |
|---|---|
| Co pamiętać | Rozmowy i notatki |
| Skąd notatki | Asystent proponuje pod odpowiedzią, użytkownik zatwierdza (i może poprawić); można też dopisać, poprawić i usunąć ręcznie |
| Gdzie | Wszystko w kokpicie, w panelu „Zapytaj D.E.C.K.” - bez nowej strony |
| Przechowanie | Rozmowy do ręcznego wyczyszczenia na koniec kadencji („Wyczyść wszystkie rozmowy”); notatki do usunięcia |
| Dostęp | Tylko właściciel (jak cały asystent); zarząd nie widzi rozmów ani notatek |

## 3. Dane

Firestore, wyłącznie przez Admin SDK z serwera. Kolekcje nie mają reguł klienta, więc zamyka je reguła końcowa - przeglądarka (także właściciela) nie czyta ich wprost.

**`asystentRozmowy/{id}`**

```ts
{
  tytul: string            // pierwsze pytanie przycięte do 60 znaków
  utworzono: number        // ms
  zmieniono: number        // ms, ostatnia wiadomość - sortowanie listy
  wiadomosci: { rola: 'ja' | 'deck', tresc: string, kiedy: number }[]
}
```

- Do 200 wiadomości w rozmowie (dokument Firestore ma limit 1 MB; 200 × do 4000 znaków mieści się z zapasem). Po osiągnięciu limitu kolejne pytanie jest odrzucane z prośbą o nową rozmowę.
- Do modelu idzie ostatnie 20 wiadomości (jak dziś).

**`asystentNotatki/{id}`**

```ts
{
  tresc: string            // 1-300 znaków, przycięta
  utworzono: number
  zrodlo: 'reczna' | 'rozmowa'
}
```

- Najwyżej 50 notatek; 51. jest odrzucana z komunikatem.

## 4. Co widzi asystent

**Czat** - przy każdym pytaniu:
1. obraz projektu (jak dziś, `zbudujKontekst`), który teraz zawiera też `notatki: string[]`;
2. ostatnią odprawę (podsumowanie + zagrożenia), jeśli jest;
3. ostatnie 20 wiadomości wątku.

**Odprawa** - notatki są częścią obrazu projektu. Zmiana notatek zmienia ślad, więc odświeża odprawę na dotychczasowych zasadach (najwyżej raz na godzinę).

**Propozycja notatki** - czat odpowiada ustrukturyzowanie (schemat JSON w jednym wywołaniu):

```ts
{ odpowiedz: string, propozycjaNotatki: string | null }
```

Instrukcja czatu dostaje akapit: proponuj notatkę tylko wtedy, gdy w rozmowie padło trwałe ustalenie, cel, zasada albo fakt o organizacji, którego nie ma w danych; nie proponuj czegoś, co już jest w notatkach; jedno krótkie zdanie, do 300 znaków. Odpowiedź jest sprawdzana jak odprawa - niezgodna ze schematem to błąd `format`.

## 5. Serwer

Wszystkie trasy: brak sesji - 401, zarząd - 403.

| Trasa | Działanie |
|---|---|
| `POST /api/asystent/czat` | `{ rozmowaId?: string, pytanie: string }` → czyta wątek (albo zakłada nowy), dopisuje pytanie, pyta Gemini, dopisuje odpowiedź, zwraca `{ rozmowaId, odpowiedz, propozycja }` |
| `GET /api/asystent/rozmowy` | 30 ostatnich: `{ id, tytul, zmieniono }[]` |
| `GET /api/asystent/rozmowy/[id]` | cała rozmowa |
| `DELETE /api/asystent/rozmowy/[id]` | usuwa jedną |
| `DELETE /api/asystent/rozmowy` | usuwa wszystkie (koniec kadencji) |
| `GET /api/asystent/notatki` | lista, najnowsze na górze |
| `POST /api/asystent/notatki` | `{ tresc, zrodlo }` → nowa; 409 przy 50 |
| `PATCH /api/asystent/notatki/[id]` | `{ tresc }` |
| `DELETE /api/asystent/notatki/[id]` | usuwa |

Gdy Gemini zawiedzie, pytanie zostaje zapisane w wątku (żeby nie zginęło), a odpowiedź HTTP niesie komunikat błędu jak dziś. Ponowienie wysyła to samo pytanie z flagą `ponow: true` - serwer nie dopisuje go drugi raz.

## 5a. Moduły

| Plik | Odpowiedzialność |
|---|---|
| `lib/asystent/pamiec.ts` | czyste funkcje: walidacja notatki, tytuł rozmowy, dopisywanie wiadomości z limitem, schemat i odczyt odpowiedzi czatu |
| `lib/asystent/pamiecDane.ts` | serwer: odczyt/zapis rozmów i notatek (Admin SDK) |
| `lib/asystent/czat.ts` | rozszerzony o notatki i odprawę w rozmowie oraz instrukcję propozycji |
| `lib/asystent/kontekst.ts` | `DaneProjektu.notatki` i pole `notatki` w obrazie |
| `lib/firebase/admin.ts` | `rozmowyRef`, `notatkiRef` |
| `app/api/asystent/czat/route.ts` | nowy kontrakt |
| `app/api/asystent/rozmowy/route.ts`, `[id]/route.ts` | wątki |
| `app/api/asystent/notatki/route.ts`, `[id]/route.ts` | notatki |
| `components/deck/CzatDeck.tsx` | przełączniki Rozmowa / Wątki / Notatki, propozycja notatki |

## 6. Kokpit

Panel „Zapytaj D.E.C.K.” (rozwijany jak dziś):

- u góry przełączniki **Rozmowa | Wątki | Notatki** i przycisk **Nowa rozmowa**;
- **Rozmowa** - czat; przy propozycji pod odpowiedzią ramka „Zapamiętać: …?” z polem do poprawki i przyciskami **Zapisz** / **Pomiń**; gdy Gemini zawiedzie, pytanie zostaje w wątku z dopiskiem „bez odpowiedzi” i przyciskiem **Ponów**;
- **Wątki** - lista (tytuł, data), klik otwiera, kosz usuwa; na dole **Wyczyść wszystkie rozmowy** z potwierdzeniem;
- **Notatki** - lista z edycją w miejscu i usuwaniem, pole **Dodaj notatkę**, licznik „12/50”;
- panel pamięta ostatnio otwarty wątek (identyfikator w `localStorage` przeglądarki - sama treść jest w bazie).

Dotychczasowy zapis rozmowy w `sessionStorage` znika.

## 7. Testy

| Co | Przypadki |
|---|---|
| `pamiec.ts` | notatka: puste/za długie/przycięcie; tytuł z pierwszego pytania; limit 200 wiadomości; odczyt odpowiedzi czatu (z propozycją, bez, zły kształt) |
| `czat.ts` | rozmowa dla Gemini zawiera notatki i odprawę; brak odprawy nie psuje rozmowy |
| `kontekst.ts` | notatki w obrazie; zmiana notatek zmienia ślad |
| trasy | 401/403; nowa rozmowa dostaje id i tytuł; kolejne pytanie dopisuje się do wątku; ponowienie nie dubluje pytania; 409 przy 50 notatkach; usuwanie jednej i wszystkich rozmów |
| `CzatDeck` | przełączniki; wysłanie i odpowiedź; propozycja - zapis z poprawką i pominięcie; otwarcie wątku z listy; usunięcie wątku; dodanie, edycja i usunięcie notatki |

## 8. Ryzyka

| Ryzyko | Co z tym robimy |
|---|---|
| Notatki rosną bez kontroli | Limit 50 × 300 znaków; propozycje wymagają zatwierdzenia |
| Dane osobowe w bazie na długo | Tylko serwer i właściciel; „Wyczyść wszystkie rozmowy” na koniec kadencji |
| Model proponuje notatkę przy każdej odpowiedzi | Instrukcja „tylko trwałe ustalenia, nie powtarzaj notatek”; zawsze jest „Pomiń” |
| Odpowiedź JSON gorzej się czyta w czacie | Formatowanie (akapity, „- ”, **pogrubienie**) zostaje wewnątrz pola `odpowiedz` |

# DECK Etap 3b — Planer: propozycje i tryb wspólnej sesji

**Data:** 2026-08-11
**Status:** projekt do zatwierdzenia
**Poprzednik:** [Etap 3a — Planer, fundament](2026-08-11-deck-etap3a-planer-fundament-design.md)

---

## 1. Cel

Planer przestaje być kalendarzem jednej osoby. Zarząd zyskuje prawo głosu: przeciągnięcie
wydarzenia tworzy **propozycję**, która czeka w skrzynce na Twoją akceptację, a na czas Sesji
Operacyjnej możesz przełączyć wszystkich w **zapis na żywo**.

### Dlaczego znowu podzielone

Wybrany zakres to cztery rzeczy: propozycje ze skrzynką, tryb wspólnej sesji, komentarze przy
wydarzeniach i obecność online. Tak jak przy 3a, to więcej niż jeden etap.

**Etap 3b (ten dokument):** warstwa zapisu dla zarządu — propozycje przeniesienia i nowego
wydarzenia, skrzynka z akceptacją, tryb wspólnej sesji, licznik oczekujących.

**Etap 3c (osobny dokument):** komentarze przy wydarzeniach i obecność online. Obie rzeczy
opierają się na tej samej warstwie serwerowej, więc po 3b są znacznie mniejsze.

Podział nie jest rezygnacją z komentarzy ani obecności — jest kolejnością.

---

## 2. Odkrycie, które kształtuje cały etap

**Większość zarządu wchodzi kodem, a osoby na kodzie nie mają konta Firebase.** Reguły Firestore
sprawdzają `request.auth.token.email`, którego one nie mają, więc nie zapiszą niczego bezpośrednio
— ani propozycji, ani później komentarza czy znaku obecności.

Wniosek: **warstwa współpracy jest warstwą serwerową.** Wszystkie zapisy zarządu idą przez
`/api/planer`, gdzie serwer sprawdza bilet (hasło albo kod) i zapisuje własnymi uprawnieniami
przez Admin SDK.

Konsekwencja, którą przyjmujemy świadomie: **także konto `board` z hasłem pisze przez serwer**,
mimo że mogłoby dostać dostęp w regułach. Jedna ścieżka zapisu zamiast dwóch to jedno miejsce,
w którym sprawdza się uprawnienia — a przy dwóch łatwo o rozjazd, w którym jedna droga pozwala
na coś, czego druga zabrania.

Reguły Firestore zostają bez zmian: bezpośredni zapis ma wyłącznie `owner`.

---

## 3. Model danych

Dochodzi kolekcja propozycji i — po raz pierwszy — **dokument semestru**, którego w 3a świadomie
nie tworzyliśmy:

```
semestry/{semestrId}
  trybWspolny        bool         czy zarząd zapisuje na żywo
  trybWspolnyOd      timestamp    kiedy włączony (do pokazania w banerze)
  trybWspolnyPrzez   string       kto włączył

semestry/{semestrId}/propozycje/{propozycjaId}
  rodzaj             'przeniesienie' | 'nowe'
  autor              etykieta kodu ("Jula") albo adres e-mail
  utworzone          timestamp

  // przy rodzaju 'przeniesienie'
  wydarzenieId       string
  zDnia, naDzien     number
  tytulWydarzenia    string       kopia na czas wyświetlenia w skrzynce

  // przy rodzaju 'nowe'
  wydarzenie         { tytul, kategoria, rok, miesiac, dzien, godzina, sala, osoby }
```

**`tytulWydarzenia` jest kopią, nie odnośnikiem.** Skrzynka ma pokazać „przenieś ZEBRANIE ZARZĄDU
z 7 na 9" nawet wtedy, gdy wydarzenie zdążyło zniknąć — inaczej wpis w skrzynce byłby pusty
i nie dałoby się go świadomie odrzucić.

**Usunięcia nie da się zaproponować.** Wybrałeś zakres „przeniesienie i nowe"; propozycja
usunięcia wymagałaby rozstrzygania, co zrobić, gdy w międzyczasie ktoś to wydarzenie przesunął.

---

## 4. Ścieżki zapisu

| Kto | Co robi | Którędy |
|---|---|---|
| `owner` | przesuwa, dodaje, usuwa, akceptuje, odrzuca | wprost do Firestore (reguły pozwalają) |
| `board` z hasłem | zgłasza propozycje; w trybie wspólnym zapisuje wprost | `/api/planer` |
| `board` na kodzie | to samo | `/api/planer` |

`POST /api/planer` przyjmuje jedną z operacji:

```jsonc
{ "semestr": "2026Z", "akcja": "propozycja-przeniesienia",
  "wydarzenieId": "…", "naDzien": 9 }

{ "semestr": "2026Z", "akcja": "propozycja-nowego",
  "wydarzenie": { … } }

// tylko przy włączonym trybie wspólnym — serwer to sprawdza, nie klient
{ "semestr": "2026Z", "akcja": "przenies", "wydarzenieId": "…", "naDzien": 9 }
```

**Serwer sam sprawdza, czy tryb wspólny jest włączony.** Klient też o tym wie, ale wyłącznie po to,
żeby pokazać właściwy interfejs — decyzja zapada po stronie, której nie da się oszukać.

Włączanie i wyłączanie trybu to zapis w dokumencie semestru, więc robi to wyłącznie `owner`,
wprost do Firestore.

---

## 5. Akceptacja propozycji

Akceptacja robi dwie rzeczy naraz: nanosi zmianę i kasuje propozycję. To musi być **jeden zapis
wsadowy** (`writeBatch`) — inaczej awaria między jednym a drugim zostawiłaby propozycję
zaakceptowaną i wciąż wiszącą w skrzynce, a Ty zaakceptowałbyś ją drugi raz.

**Propozycja może się zdezaktualizować.** Zanim ją przyjmiesz, wydarzenie mogło zniknąć albo
ktoś mógł je już przesunąć. Przed nałożeniem zmiany sprawdzamy, czy wydarzenie nadal istnieje:

- **nie istnieje** → skrzynka pokazuje „wydarzenia już nie ma" i oferuje wyłącznie odrzucenie,
- **istnieje, ale jest w innym dniu niż `zDnia`** → skrzynka pokazuje ostrzeżenie „ktoś już to
  przesunął na 11", a przyjęcie nadal działa i ustawia dzień z propozycji.

Drugi przypadek celowo nie blokuje: propozycja mówi, gdzie coś ma być, a nie skąd wychodzi.

---

## 6. Licznik oczekujących

Kafelek „Planer semestru" w kokpicie dostaje odznakę z liczbą propozycji — tak jak Analytics
pokazuje alerty. Widzisz ją przy każdym wejściu do DECK, bez powiadomień i bez proszenia
o zgodę w przeglądarce.

Kokpit jest komponentem serwerowym, więc liczbę czyta Admin SDK — ten sam, który już obsługuje
`/api/planer`. Nagłówek Planera pokazuje ją drugi raz, tam liczoną z subskrypcji na żywo.

Odznakę widzi wyłącznie `owner`; dla zarządu liczba nierozpatrzonych propozycji nie znaczy nic,
bo i tak nie może ich rozpatrzyć.

---

## 7. Tryb wspólnej sesji

Przełącznik widoczny wyłącznie dla `owner`. Gdy włączony:

- zarząd przeciąga wydarzenia i zmiany nanoszą się od razu, bez skrzynki,
- **każdy widzi wyraźny baner** „Sesja Operacyjna trwa — wszyscy zapisują na żywo", z godziną
  włączenia i przyciskiem wyłączenia dla `owner`.

Wybrałeś wyłączanie ręczne, więc baner jest tym mocniejszy — to jedyne zabezpieczenie przed
zapomnieniem. **Zapomniany włączony tryb to bezterminowe prawo zapisu dla całego zarządu**,
i tak to zostawiamy zgodnie z Twoją decyzją. Baner widać na Planerze i w kokpicie, żeby dało się
o tym przypomnieć sobie także spoza modułu.

**Ciebie tryb nie dotyczy.** Jako `owner` zapisujesz zawsze, niezależnie od przełącznika —
on rządzi wyłącznie tym, czy zarząd pisze wprost, czy przez skrzynkę.

**Osoby na kodzie w trybie wspólnym odpytują co 15 sekund.** Nie mają konta Firebase, więc nie
mają subskrypcji na żywo (to zostaje z Etapu 3a). Poza sesją odświeżenie strony wystarcza, ale
gdy wszyscy siedzą razem i przesuwają terminy, piętnastosekundowe opóźnienie jest granicą
znośności. Odpytywanie chodzi wyłącznie przy włączonym trybie i widocznej karcie.

---

## 8. Struktura plików

| Plik | Odpowiedzialność |
|---|---|
| `lib/planer/propozycje.ts` | Typy propozycji i czysta logika: czy propozycja jest aktualna, jak ją opisać |
| `lib/planer/serwer.ts` | Klient `/api/planer` po stronie przeglądarki |
| `app/api/planer/route.ts` | Rozszerzenie o `POST` z czterema akcjami |
| `lib/firebase/admin.ts` | Wspólna inicjalizacja Admin SDK (dziś siedzi w trasie) |
| `components/planer/Skrzynka.tsx` | Lista propozycji, akceptacja, odrzucenie |
| `components/planer/BanerSesji.tsx` | Baner trybu wspólnego + przełącznik |

Wyciągnięcie Admin SDK z trasy do `lib/firebase/admin.ts` jest konieczne, bo używa go teraz także
kokpit — a przy dwóch kopiach inicjalizacji Firebase rzuca błędem o powtórzonej aplikacji.

---

## 9. Koszt

Firestore: 50 tys. odczytów i 20 tys. zapisów dziennie za darmo.

Propozycje to garść dokumentów dziennie — koszt pomijalny. Subskrypcja skrzynki dotyczy wyłącznie
`owner`, więc jedna osoba, nie pięć.

Prawdziwy koszt przyjdzie z obecnością w Etapie 3c i wybrałeś tam wariant najdroższy: znak
obecności zawsze, gdy ktoś ma otwarty Planer. Przy pięciu osobach i ośmiu godzinach dziennie to
około 2,4 tys. zapisów i 12 tys. odczytów dziennie. Mieści się w limicie, ale zjada jego jedną
czwartą po to, żeby pokazać awatary. W 3c zejdę z tym tak nisko, jak się da bez zmiany Twojej
decyzji: znak obecności tylko przy widocznej karcie i co 60 sekund zamiast częściej.

---

## 10. Testy

| Co | Jak |
|---|---|
| `lib/planer/propozycje.ts` | Propozycja przeniesienia wydarzenia, którego nie ma → „nieaktualna". Wydarzenie w innym dniu niż `zDnia` → „przesunięte", ale wciąż wykonalna. Opis propozycji dla obu rodzajów. |
| `POST /api/planer` | Bez sesji → 401. Rola `board` przy wyłączonym trybie wspólnym: `propozycja-przeniesienia` → 201, `przenies` → 403. Przy włączonym: `przenies` → 200. Rola `owner` nie potrzebuje trybu. Nieznana akcja → 400. |
| `Skrzynka` | Pusta skrzynka pokazuje komunikat, nie pustą listę. Propozycja nieaktualna nie ma przycisku przyjęcia. Przyjęcie woła funkcję z identyfikatorem propozycji. |
| `BanerSesji` | Zarząd widzi baner bez przycisku wyłączenia; `owner` z przyciskiem. |

---

## 11. Ryzyka

| Ryzyko | Waga | Co z tym robimy |
|---|---|---|
| Zapomniany tryb wspólny daje bezterminowy zapis | **wysoka** | Baner na Planerze i w kokpicie; wygaszanie odrzucone Twoją decyzją |
| Sprawdzanie trybu tylko po stronie klienta | wysoka | Serwer sprawdza niezależnie przy każdym zapisie |
| Akceptacja przerwana w połowie | średnia | Jeden zapis wsadowy zamiast dwóch osobnych |
| Propozycja do nieistniejącego wydarzenia | średnia | Kopia tytułu w propozycji plus sprawdzenie przed przyjęciem |
| Dwie kopie inicjalizacji Admin SDK | średnia | Wspólny `lib/firebase/admin.ts` |
| Zarząd na kodzie nie widzi zmian na żywo | niska | Zostaje z 3a; w trybie wspólnej sesji dochodzi odpytywanie co 15 sekund, bo wtedy opóźnienie faktycznie przeszkadza |

---

## 12. Decyzje odłożone

- Historia zmian („kto co przesunął") — sensowna dopiero, gdy zarząd zacznie realnie zapisywać.
- Odrzucenie z uzasadnieniem — na razie odrzucenie jest ciche; jeśli okaże się, że ludzie pytają
  „czemu nie", dojdzie pole na powód.
- Propozycja usunięcia wydarzenia — poza wybranym zakresem.

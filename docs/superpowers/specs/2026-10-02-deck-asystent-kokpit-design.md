# D.E.C.K. - asystent AI, kokpit i logowanie

**Data:** 2026-10-02
**Status:** zatwierdzony w rozmowie („git i lecimy”)
**Nazwa:** D.E.C.K. = Diagnostic Evaluation of Change & KPIs

---

## 1. Cel

Kokpit przestaje być wyrzutnią kafelków. Jego sercem jest **asystent D.E.C.K.** - model językowy,
który zna dane całego projektu, interpretuje wskaźniki, wskazuje obszary zagrożenia i pozwala
o nich rozmawiać. Przy okazji kokpit i logowanie dostają uporządkowany wygląd (wariant A:
ciemne tło, miętowy akcent; deszcz Matrixa, glitch i animowane logi **zostają**).

Zakres tego etapu:

1. **Odprawa** - asystent sam pisze podsumowanie, zagrożenia i sprawy na dziś.
2. **Czat** - rozmowa z asystentem, który ma te same dane.
3. **Kokpit** - panel asystenta zamiast paska „Dziś”, kafelki, stopka-pasek statusu.
4. **Logowanie** - marka D.E.C.K., dekoracyjne liczby, animacja cyfr kodu.

Poza zakresem: pomoc w pisaniu (szkice komunikatów), asystent na stronach modułów.

---

## 2. Decyzje użytkownika

| Pytanie | Decyzja |
|---|---|
| Model | **Gemini, darmowy poziom** |
| Imiona i nazwiska | **Wysyłane wprost.** Świadoma decyzja: dla użytkowników z UE Google stosuje warunki płatne także do darmowego poziomu (bez używania danych do ulepszania produktów), mimo ogólnej prośby regulaminu, by nie wysyłać danych osobowych. Źródło: ai.google.dev/gemini-api/terms. |
| Kto widzi asystenta | **Tylko owner.** Zarząd widzi w tym miejscu same fakty. |
| Odświeżanie odprawy | **Po zmianie danych, najwyżej raz na godzinę**, plus przycisk „Odśwież”. |
| Liczby na logowaniu | **Dekoracja z neutralnymi podpisami** (sygnał, szyfrowanie, węzły), nie udają KPI. |
| Stopka | **Wariant A - pasek statusu** z prawdziwymi danymi. |
| Kafelek Planera | Tytuł **„Sesja Operacyjna”**, kilka zdań opisu i najbliższe wydarzenia. |

Klucz API zakłada osoba pełnoletnia (wymóg regulaminu: 18+).

---

## 3. Asystent

### 3.1. Obraz projektu (`lib/asystent/kontekst.ts`)

Czysta funkcja `zbudujKontekst(dane)` składa zwięzły obiekt (JSON) z tego, co i tak liczą moduły:

| Część | Zawartość |
|---|---|
| `kpi` | dla każdej serii: kategoria, nazwa, ostatni okres i wartość, iloraz rok do roku, kierunek trendu |
| `rekrutacje` | ostatnie edycje: zgłoszenia, przyjęci, konwersja |
| `retencja` | kohorty: liczebność, średnia retencja, czy w toku |
| `alerty` | lista z `buildAlerts` (tytuł, poziom, opis) |
| `projekty` | najnowsza edycja: projekty z flagami kondycji (`kondycjaEdycji`) |
| `planer` | semestr; wydarzenia z najbliższych 21 dni (tytuł, kategoria, data, czas, miejsce, osoby); kolizje; stan sesji; liczba propozycji; Skład |
| `czlonkowie` | liczba osób w każdym statusie, w podziale na kohorty |
| `meta` | dzisiejsza data, dzień tygodnia |

Wejście czysto danymi (już pobranymi), wyjście deterministyczne - ten sam stan danych daje ten
sam obiekt, a więc ten sam ślad (§3.4). Rozmiar: celujemy w kilka-kilkanaście tysięcy tokenów.

### 3.2. Klient Gemini (`lib/asystent/gemini.ts`)

- REST `generateContent` przez `fetch` (bez dodatkowej paczki), klucz w nagłówku `x-goog-api-key`.
- Zmienne: `GEMINI_API_KEY` (wymagana), `GEMINI_MODEL` (opcjonalna; domyślny model z rodziny
  Flash dostępny w darmowym poziomie - konkretny identyfikator ustalamy przy wdrożeniu,
  wywołując listę modeli na kluczu użytkownika).
- Limit czasu 25 s. Błędy zamieniane na `BladAsystenta` z kodem: `brak-klucza`, `limit` (429),
  `odmowa` (blokada treści), `siec`, `format` (odpowiedź niezgodna ze schematem).
- Każdy tekst z modelu przechodzi przez `bezDlugichMyslnikow` (zamiana „—” i „–” na „-”) -
  instrukcja to mówi, kod tego pilnuje.

### 3.3. Odprawa

**Instrukcja systemowa** (stała, po polsku): rola asystenta D.E.C.K. dla Wiceprzewodniczącego
ds. Strategii; tylko na podstawie przekazanych danych, bez zmyślania; każdy wniosek z liczbą;
zagrożenia uszeregowane od najpoważniejszego; zwięźle; zwykły „-”.

**Odpowiedź w ustalonym schemacie** (`responseMimeType: application/json` + `responseSchema`):

```
{
  podsumowanie: string,                      // 2-4 zdania
  zagrozenia: [{
    obszar: 'kpi' | 'rekrutacja' | 'retencja' | 'projekty' | 'planer' | 'zespol',
    waga: 'wysoka' | 'srednia' | 'niska',
    tytul: string,
    uzasadnienie: string                     // z liczbami
  }],                                        // 0-5
  dzis: string[]                             // 0-4 krótkie punkty
}
```

Odpowiedź jest walidowana ręcznie (`sprawdzOdprawe`); niezgodna = błąd `format`. Odnośniki
do modułów dobiera kod po polu `obszar` (model nie wymyśla adresów).

### 3.4. Zapamiętanie i odświeżanie

- Dokument Firestore `asystent/odprawa`: `{ slad, odprawa, utworzono, model }`. Kolekcja
  `asystent` nie ma reguły klienta - jest zamknięta regułą końcową; czyta i pisze tylko serwer
  (Admin SDK).
- **Ślad** = SHA-256 z `JSON.stringify(kontekst)` bez `meta`, żeby sam upływ czasu w ciągu
  dnia nie unieważniał odprawy. Zmianę dnia obsługuje osobny warunek niżej.
- Kokpit (owner) przy wejściu:
  1. czyta zapisaną odprawę i wyświetla ją od razu,
  2. jeśli ślad się różni **albo** odprawa jest z poprzedniego dnia, **i** minęła ≥1 h od
     ostatniej - zleca nową w tle (`after()` z `next/server`); będzie przy następnym wejściu.
- `POST /api/asystent/odprawa` (owner) - generuje od razu i zwraca nową; przycisk „Odśwież”.
- Gdy zapisanej odprawy nie ma (pierwsze uruchomienie) - panel faktów + generowanie w tle.

### 3.5. Czat

- `POST /api/asystent/czat` (owner): `{ wiadomosci: [{ rola: 'ja' | 'deck', tresc }] }` →
  `{ odpowiedz: string }`. Serwer dokłada świeży obraz projektu jako kontekst rozmowy.
- Historia żyje w przeglądarce (stan komponentu + `sessionStorage`), do 20 ostatnich wiadomości
  w zapytaniu. Bez zapisu w bazie.
- Odpowiedź jako prosty tekst z akapitami i wypunktowaniami (bez zewnętrznej biblioteki
  markdown - obsługujemy akapity, `- ` i `**pogrubienie**`).
- Błędy po ludzku: `limit` → „Darmowy limit Gemini na tę chwilę wyczerpany - spróbuj za
  minutę”; `brak-klucza` → instrukcja konfiguracji.

### 3.6. Panel faktów (zapasowy i dla zarządu)

Deterministyczny, bez AI: trwająca sesja, najbliższe wydarzenie dziś/jutro, propozycje (owner),
alerty. Pokazywany: zarządowi zawsze; ownerowi, gdy asystent nie ma odprawy albo zwrócił błąd.

---

## 4. Kokpit

Kolejność od góry:

1. **Nagłówek** - „D.E.C.K.” z glitchem, pod spodem „Diagnostic Evaluation of Change & KPIs”;
   po prawej konto, rola, data, wylogowanie.
2. **Panel „Odprawa D.E.C.K.”** (owner) - godzina wygenerowania, „Odśwież”, podsumowanie,
   zagrożenia (kolor wagi, odnośnik do modułu), „dziś”. Pod spodem **„Zapytaj D.E.C.K.”** -
   rozwijany czat. Zarząd: panel faktów.
3. **Moduły** - Analytics (jak dziś); **Sesja Operacyjna** (2 zdania opisu + 2 najbliższe
   wydarzenia); Orbita (owner, wkrótce); Strony (wkrótce).
4. **Stopka - pasek statusu**: `D.E.C.K.` z kursorem · arkusz + czas odpowiedzi · Firestore ·
   sposób logowania · metryki i alerty · godzina odświeżenia. Kropka stanu: zielona/żółta/czerwona.

Deszcz Matrixa zostaje. Wszystkie dane dopływają strumieniem (jak po poprawce wydajności);
odprawa czytana z Firestore nie czeka na Gemini.

---

## 5. Logowanie

- „SSUEW Analytics / Private strategy command” → **„D.E.C.K.” + pełna nazwa**.
- Deszcz Matrixa, dekodowany nagłówek, animowane logi - **zostają**.
- `LiveDigits`: podpisy **sygnał / szyfrowanie / węzły**, wartości abstrakcyjne (nie procenty
  i nie „sem.”).
- **Animacja cyfr kodu przy wpisywaniu**: każda wpisana cyfra krótko „dekoduje się”
  (przewijające się znaki kończące na właściwej). Dziś przy wpisywaniu nie animuje się nic;
  w trakcie wdrożenia odtwarzamy w prawdziwej przeglądarce, co dokładnie jest zepsute
  w obecnym formularzu (także animacje zbierania kratek), i naprawiamy przyczynę.

---

## 6. Pliki

| Plik | Odpowiedzialność |
|---|---|
| `lib/asystent/kontekst.ts` | NOWY - `zbudujKontekst`, `sladKontekstu` |
| `lib/asystent/gemini.ts` | NOWY - wywołanie API, błędy, `bezDlugichMyslnikow` |
| `lib/asystent/odprawa.ts` | NOWY - instrukcja, schemat, `sprawdzOdprawe`, odnośniki po obszarze |
| `lib/asystent/czat.ts` | NOWY - składanie rozmowy, limit historii |
| `lib/asystent/dane.ts` | NOWY (serwer) - pobranie wszystkich danych do kontekstu, odczyt/zapis `asystent/odprawa` |
| `lib/asystent/fakty.ts` | NOWY - panel faktów (czysta funkcja) |
| `app/api/asystent/odprawa/route.ts` | NOWY - POST, owner |
| `app/api/asystent/czat/route.ts` | NOWY - POST, owner |
| `components/deck/PanelOdprawy.tsx` | NOWY |
| `components/deck/CzatDeck.tsx` | NOWY |
| `components/deck/PanelFaktow.tsx` | NOWY |
| `components/deck/PasekStatusu.tsx` | NOWY - stopka A |
| `components/deck/DeckHub.tsx` | układ, kafelek Sesji Operacyjnej, nazwa |
| `app/page.tsx` | strumienie: odprawa, fakty, najbliższe wydarzenia, status |
| `app/login/page.tsx`, `components/ui/LiveDigits.tsx`, `components/deck/KodInput.tsx` | logowanie |

---

## 7. Kolejność wdrożenia

1. **Rdzeń asystenta** - kontekst, klient Gemini, odprawa (schemat, walidacja), zapis w Firestore,
   API odprawy. Testowalne bez interfejsu.
2. **Kokpit** - panel odprawy, panel faktów, kafelek Sesji Operacyjnej, pasek statusu.
3. **Czat** - API i komponent.
4. **Logowanie** - marka, liczby, diagnoza i naprawa animacji kodu.
5. **Wdrożenie** - użytkownik zakłada klucz w Google AI Studio i wpisuje `GEMINI_API_KEY` na
   Vercelu; ustalamy model i sprawdzamy limity darmowego poziomu.

---

## 8. Testy

| Co | Przypadki |
|---|---|
| `kontekst` | deterministyczny (ten sam stan → ten sam ślad); wydarzenia tylko z 21 dni; brak arkusza → puste sekcje, nie wyjątek |
| `gemini` | brak klucza → `brak-klucza`; 429 → `limit`; zablokowana odpowiedź → `odmowa`; myślniki zamieniane (fetch zaślepiony) |
| `odprawa` | poprawna odpowiedź przechodzi; brak pola / zła waga / >5 zagrożeń → `format`; odnośnik po obszarze |
| odświeżanie | ten sam ślad i <1 h → bez generowania; inny ślad i ≥1 h → generowanie; nowy dzień → generowanie |
| API | bez sesji 401; zarząd 403; owner 200 |
| `fakty` | sesja, najbliższe wydarzenie, propozycje tylko owner, brak → „Nic pilnego” |
| komponenty | panel odprawy rysuje zagrożenia z wagą i odnośnikiem; czat wysyła historię i pokazuje błąd limitu; pasek statusu kolory kropek |

---

## 9. Ryzyka

| Ryzyko | Waga | Co z tym robimy |
|---|---|---|
| Limity darmowego poziomu | średnia | Odprawa najwyżej raz na godzinę i tylko po zmianie danych; czat z czytelnym komunikatem przy 429 |
| Model zmyśla | średnia | Instrukcja „tylko z danych, z liczbami”; schemat odpowiedzi; odnośniki dobiera kod |
| Dane osobowe w Google | decyzja | Opisana w §2; dla UE warunki płatne |
| Odprawa wyciekająca do zarządu | wysoka | Kolekcja zamknięta regułami; API i panel tylko dla owner |
| Wolny Gemini blokuje kokpit | średnia | Odprawa z Firestore, generowanie w tle (`after`) |

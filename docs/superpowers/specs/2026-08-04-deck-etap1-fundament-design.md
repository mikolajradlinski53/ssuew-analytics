# DECK — Etap 1: fundament kokpitu

**Data:** 2026-08-04
**Status:** projekt do zatwierdzenia
**Poprzednik:** SSUEW Analytics (etapy 1–4, `docs/superpowers/specs/2026-06-02-*`)

---

## 1. Cel

SSUEW Analytics przestaje być całą aplikacją i staje się jednym z modułów **DECK** — prywatnego
centrum dowodzenia, z którego prowadzę wszystkie swoje działania: analitykę samorządu, kalendarz
semestru, nadzorowane strony i własne zadania.

Etap 1 dostarcza fundament: powłokę z kafelkami, logowanie Google i przeniesienie Analytics
z Supabase na Arkusze Google. Reszta kafelków dochodzi na gotowy szkielet w kolejnych etapach.

Nazwa **DECK** jest spójna z istniejącym design systemem w kodzie (`deck-card`, `deck-button`,
`deck-scan` w `app/globals.css`) — nazwa produktu i nazwa warstwy wizualnej to od teraz to samo
słowo.

### Dlaczego teraz

Supabase to dziś jedyny element, który może przestać działać i zabrać ze sobą dane. Analityka
jest już utrzymywana w Arkuszach Google, więc Supabase nie wnosi nic poza ryzykiem. Przeniesienie
warstwy danych jest pilniejsze niż nowe kafelki — dlatego jest w Etapie 1, a nie później.

---

## 2. Architektura całości

```
                        ┌──────────────────────────┐
                        │   Przeglądarka (DECK)    │
                        │   Next.js 16 / React 19  │
                        └────────────┬─────────────┘
              logowanie Google       │
        ┌──────────────────────────┐ │ ┌─────────────────────────────┐
        │  Firebase Auth           │◄┼─┤  Google Identity Services   │
        │  (tożsamość + rola)      │ │ │  (token do Search Console)  │
        └──────────────────────────┘ │ └──────────────┬──────────────┘
                                     │                │ bezpośrednio
                    ┌────────────────┼────────────┐   │ z przeglądarki
                    │                │            │   ▼
                    ▼                ▼            │ ┌──────────────────┐
        ┌───────────────────┐  ┌───────────────┐  │ │ Search Console   │
        │ Next.js API       │  │  Firestore    │  │ │ API              │
        │ /api/*            │  │  (realtime)   │  │ └──────────────────┘
        │ token GAS ukryty  │  │  Planner,     │  │
        └─────────┬─────────┘  │  Orbita       │  │
                  │            └───────────────┘  │
                  ▼                                │
        ┌───────────────────┐                      │
        │ Apps Script       │                      │
        │ Web App (JSON)    │                      │
        └─────────┬─────────┘                      │
                  ▼                                │
        ┌───────────────────┐                      │
        │ Arkusze Google    │  ◄───────────────────┘
        │ dane Analytics    │     (edytuję ręcznie, jak dotąd)
        └───────────────────┘
```

**Jedna aplikacja Next.js, nie kilka.** Wszystkie moduły dzielą design system, logowanie
i deployment. Osobne aplikacje oznaczałyby trzy razy tę samą konfigurację i logowanie od nowa
przy każdym przejściu między kafelkami.

### Podział odpowiedzialności między backendami

| Warstwa | Co trzyma | Dlaczego akurat tam |
|---|---|---|
| **Arkusze + Apps Script** | Rekrutacje, kohorty, KPI, członkowie | Dane wpisuję ręcznie i chcę je dalej widzieć jako tabelę. Zmieniają się kilka razy w semestrze, więc wolność edycji w arkuszu jest warta wolniejszego odczytu. |
| **Firestore** | Wydarzenia Plannera, propozycje zmian, komentarze, zadania Orbity | Dane zmieniają się w trakcie rozmowy i muszą być widoczne dla wszystkich natychmiast. Realtime dostajemy bez pisania kodu. |
| **Firebase Auth** | Tożsamość i rola | Logowanie Google, które i tak mam, plus jeden mechanizm dla wszystkich modułów. |
| **Search Console API** | Statystyki nadzorowanych stron | Dane są już u Google, tylko po nie sięgamy. Nie kopiujemy ich do siebie. |
| **Vercel** | Kod, bez stanu | Funkcje `/api/*` są bezstanowe: pilnują sekretów i cache'ują, nic nie przechowują. |

> **Uwaga o „minimalizacji backendu".** Funkcje `/api/*` zostają, ale nie są backendem
> w kłopotliwym sensie: nie mają bazy, migracji, kopii zapasowych ani rachunku. Robią dwie rzeczy,
> których przeglądarka zrobić nie może — chronią token do Apps Script i cache'ują wolne odpowiedzi.
> Alternatywa, czyli wołanie Apps Script prosto z przeglądarki, wymagałaby umieszczenia tokenu
> w kodzie strony i walki z CORS przy zapisach. To byłoby mniej kodu i wyraźnie gorszy pomysł.

---

## 3. Routing i struktura

```
/                    DECK — kokpit z kafelkami
/analytics           Przegląd (dziś: /)
/analytics/rekrutacje, /retencja, /czlonkowie, /kpi,
          /lejek, /korelacje, /prognozy, /alerty, /wpis
/planer              SemestrPlanner            (Etap 3)
/orbita              tablica zadań             (Etap 2)
/strony              Search Console            (Etap 4)
/login               logowanie Google
```

Przeniesienie: `app/{rekrutacje,retencja,…}/page.tsx` → `app/analytics/{…}/page.tsx`,
dotychczasowe `app/page.tsx` → `app/analytics/page.tsx`. Nowe `app/page.tsx` to kokpit.

`AppShell` z sidebarem obsługuje wyłącznie `/analytics/*` — przenosi się do
`app/analytics/layout.tsx`. Kokpit ma własną, pełnoekranową powłokę bez sidebara: to strona,
z której się wychodzi, a nie w której się siedzi. Ścieżki w `NAV` (`components/ui/Sidebar.tsx`)
dostają prefiks `/analytics` plus pozycję powrotną „← DECK" na górze.

### Nowe i zmienione pliki

```
app/page.tsx                       kokpit (nowy)
app/analytics/layout.tsx           AppShell (przeniesiony z app/layout.tsx)
app/analytics/**/page.tsx          moduły (przeniesione)
app/api/session/route.ts           wymiana tokenu Firebase na ciasteczko (nowy)
components/deck/DeckHub.tsx        siatka kafelków (nowy)
components/deck/DeckTile.tsx       pojedynczy kafelek (nowy)
components/deck/DeckPulse.tsx      pasek stanu systemu (nowy)
lib/auth/firebase.ts               inicjalizacja Firebase (nowy)
lib/auth/useAuth.ts                hook sesji i roli (nowy)
lib/auth/verify.ts                 weryfikacja tokenu po stronie serwera (nowy)
lib/gas/client.ts                  klient Apps Script: limit czasu, cache, obsługa błędów (nowy)
lib/gas/schema.ts                  nazwy zakładek i ich typy domenowe (nowy)
lib/auth/role.ts                   adres e-mail → rola (nowy)
lib/auth/guard.ts                  strażnik tras API (nowy)
apps-script/Kod.gs                 źródło skryptu, wersjonowane w repo (nowy)
middleware.ts                      zastępuje proxy.ts
```

`lib/gas/` jest rozbity na klienta i mapowanie schematu celowo: parsowanie wierszy arkusza to
osobna, w pełni testowalna funkcja, która nie potrzebuje sieci.

---

## 4. Logowanie i uprawnienia

**Firebase Auth, dostawca Google.** Logowanie przez `signInWithPopup`.

**Role.** Dwie, wyznaczone przez adres e-mail:

- `owner` — jeden adres, mój. Odczyt i zapis wszędzie.
- `board` — adresy zarządu. Odczyt Analytics, pełna praca w Plannerze, **brak dostępu do Orbity**.

Lista adresów żyje w zmiennych środowiskowych Vercela (`DECK_OWNER_EMAIL`,
`DECK_BOARD_EMAILS` rozdzielone przecinkami). W Etapie 1 nie ma jeszcze Firestore, a lista zmienia
się raz na kadencję — zmienna środowiskowa jest właściwym narzędziem. Etap 2 przenosi ją do
Firestore, gdy i tak będzie tam dokument konfiguracyjny.

**Kto nie jest na liście, nie wchodzi.** Konto Google każdy ma; sam fakt zalogowania nie daje
niczego. Po zalogowaniu spoza listy: wylogowanie i komunikat „To konto nie ma dostępu do DECK".

### Sesja po stronie serwera

Firebase Auth działa w przeglądarce, a `middleware.ts` musi wiedzieć, czy wpuścić na stronę:

1. Po zalogowaniu klient wysyła token ID na `POST /api/session`.
2. Trasa weryfikuje token, sprawdza listę adresów i ustawia ciasteczko `httpOnly` `deck_session`
   z tokenem oraz rolą.
3. `middleware.ts` sprawdza obecność ciasteczka i przekierowuje na `/login`, gdy go brak.
4. **Trasy `/api/*` weryfikują token naprawdę** — podpis, wystawcę, odbiorcę i termin ważności —
   przy każdym zapisie.

Rozdział jest zamierzony: middleware odpowiada za wygodę (nie pokazuj pustych ekranów), API
odpowiada za bezpieczeństwo (nie zapisz cudzych danych). Weryfikacja podpisu w middleware przy
każdym żądaniu o obrazek byłaby kosztem bez pożytku.

Weryfikacja: `jose` z `createRemoteJWKSet` na
`https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`,
wystawca `https://securetoken.google.com/<projectId>`, odbiorca `<projectId>`. Biblioteka `jose`
działa w środowisku Edge, więc nie wciągamy `firebase-admin` ani konta serwisowego.
**Do potwierdzenia na starcie wdrożenia** — jeśli ten adres JWKS okaże się niedostępny, zapasowo
`firebase-admin` na trasie Node.

---

## 5. Warstwa danych: Arkusze + Apps Script

### 5.1 Arkusz

Jeden plik **`DECK — dane`**, cztery zakładki. Pierwszy wiersz to nagłówki, pierwsza kolumna to `id`.

| Zakładka | Kolumny |
|---|---|
| `rekrutacje` | `id`, `edycja`, `sezon`, `rok`, `zgloszenia`, `przyjeci`, `created_at` |
| `kohorty` | `id`, `edycja`, `sezon`, `rok`, `n_czlonkow`, `avg_retention_sem`, `max_retention_sem`, `in_progress`, `survival`, `created_at` |
| `kpi` | `id`, `kategoria`, `nazwa`, `okres_poprzedni`, `wartosc_poprzednia`, `okres_biezacy`, `wartosc_biezaca`, `created_at` |
| `czlonkowie` | `id`, `kohorta_edycja`, `imie_nazwisko`, `status`, `aktywnosc`, `created_at` |

`survival` i `aktywnosc` to listy liczb w jednej komórce, rozdzielone przecinkami (`1,0.9,0.72`).
Arkusz jest do czytania ludzkim okiem, więc tablica w komórce jest czytelniejsza niż JSON.

Puste `id` skrypt uzupełnia przy pierwszym zapisie — mogę dodać wiersz ręcznie w arkuszu i nie
martwić się identyfikatorem. `created_at` też uzupełnia skrypt.

### 5.2 Apps Script

Jedno wdrożenie Web App, „wykonuj jako ja", „dostęp: wszyscy". Źródło w repo w `apps-script/Kod.gs`,
żeby zmiany były w historii, a nie tylko w edytorze skryptów.

```
GET  ?token=…&t=rekrutacje                      → [ {…}, {…} ]
GET  ?token=…&t=_ping                           → { ok:true, zakladki:[…] }
POST { token, t, op, rows:[ {…} ] }             → { ok:true, rows:[ {…} ] }
```

Trzy operacje, bo tyle wymagają dzisiejsze trasy — `/api/kpi` przyjmuje zarówno pojedynczą
metrykę, jak i całą tablicę (zapis całego rocznika naraz), a do tego `PATCH` po `id` dla edycji
w miejscu:

| `op` | Działanie | Kto tego potrzebuje |
|---|---|---|
| `insert` | Dopisuje wiersze, nadaje `id` i `created_at` | `POST /api/kpi` (pojedynczo i wsadowo), `POST /api/czlonkowie` |
| `upsert` | Nadpisuje wiersz o danym `id`, a bez `id` — o tej samej wartości klucza naturalnego (`edycja`). Gdy nic nie pasuje, dopisuje | `POST /api/rekrutacje`, `POST /api/kohorty` |
| `update` | Poprawia istniejący wiersz po `id`, nie tworzy nowych | `PATCH /api/kpi`, `PATCH /api/czlonkowie` |

`rows` jest zawsze tablicą, także dla jednego wiersza — jeden kształt żądania zamiast dwóch.
Pola nieprzesłane przy `upsert` i `update` zostają bez zmian, więc edycja jednej komórki
nie kasuje reszty wiersza.

**Apps Script zawsze odpowiada kodem HTTP 200**, również przy błędzie — tego nie da się zmienić.
Prawdziwy kod jedzie więc w treści (`{ ok:false, kod:403, error:'…' }`), a `lib/gas/client.ts`
sprawdza pole `ok`, nie status odpowiedzi. To jest pułapka, w którą łatwo wpaść przy pisaniu
klienta i dlatego jest tu zapisana.

Zapisy są obejmowane blokadą (`LockService`) — dwa równoczesne dopisania bez niej mogłyby trafić
w ten sam wiersz.

Ponieważ dostęp ma „każdy", **adres wdrożenia jest sekretem, a token jest drugim zamkiem**. Oba
istnieją wyłącznie w zmiennych środowiskowych Vercela (`GAS_URL`, `GAS_TOKEN`) i nigdy nie trafiają
do kodu wysyłanego do przeglądarki. Token porównywany jest w skrypcie stałoczasowo. Nieznana wartość
`t` lub zły token dają `403` bez wyjaśnienia, co poszło nie tak.

### 5.3 Trasy API

Trasy `/api/rekrutacje`, `/api/kpi`, `/api/kohorty`, `/api/czlonkowie` **zachowują dotychczasowe
kontrakty JSON**. Zmienia się wyłącznie ich wnętrze: zamiast klienta Supabase wołają
`lib/gas/client.ts`. Dzięki temu `lib/useAnalyticsData.ts`, `lib/useCzlonkowie.ts` i wszystkie
komponenty modułów zostają nietknięte — to najbardziej wartościowa właściwość tego projektu,
bo cała przetestowana warstwa analityczna przechodzi migrację bez jednej zmiany.

**Cache.** Odczyt: `fetch(gasUrl, { next: { revalidate: 300, tags: ['analytics'] } })`. Zapis:
po sukcesie `revalidateTag('analytics')`. Apps Script odpowiada w 1–3 s; bez cache'u każde wejście
w moduł czekałoby tyle na dane. Z cache'em czeka jedna osoba raz na pięć minut, a po własnym zapisie
widzę zmianę natychmiast.

**Zapis.** `POST` weryfikuje token, wymaga roli `owner`, waliduje pola i dopiero wtedy woła skrypt.
Odpowiedzi błędów zachowują dzisiejsze kody: `401` bez logowania, `400` przy brakach, `503` gdy
brak konfiguracji.

### 5.4 Gdy Apps Script nie odpowiada

Dzisiejsze zachowanie zostaje: puste lub błędne odpowiedzi przełączają aplikację na dane
demonstracyjne zaszyte w `lib/useAnalyticsData.ts` (`usingDemo`), z widocznym oznaczeniem w interfejsie.
Dochodzi limit czasu 8 sekund na wywołanie skryptu — analogicznie do dzisiejszego
`lib/supabase/timeout.ts`, który zostaje przerobiony na `lib/gas/timeout.ts`.

---

## 6. Kokpit DECK

### 6.1 Układ

Pełny ekran, bez sidebara. Trzy strefy pionowo:

```
┌─────────────────────────────────────────────────────────────┐
│  DECK                                    poniedziałek 4 sie │  ← sygnatura
│  Mikołaj · owner                              02:41 do …    │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────┐ ┌────────────┐ ┌────────────┐   │
│  │  SSUEW ANALYTICS      │ │  PLANER    │ │  ORBITA    │   │  ← kafelki
│  │  ╭─╮                  │ │  paź 2025  │ │            │   │
│  │  ╰─╯ ~~~~~~~~~~~~~~~  │ │  ▪▪▪ 12    │ │   ◉ ◉ ·    │   │
│  │  61.1% konwersji  ↑   │ │  wydarzeń  │ │  3 na dziś │   │
│  └───────────────────────┘ └────────────┘ └────────────┘   │
│  ┌────────────┐ ┌──────────────────────────────────────┐   │
│  │  STRONY    │ │  + kolejny moduł                     │   │
│  └────────────┘ └──────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  puls: dane 4 sie 09:12 · arkusz OK · sesja aktywna         │  ← stopka stanu
└─────────────────────────────────────────────────────────────┘
```

Siatka jest nierówna celowo. Kafelek Analytics jest największy, bo to moduł, do którego wchodzę
najczęściej; równa siatka sześciu identycznych kwadratów nie niosłaby żadnej informacji o tym,
co jest ważne.

Żywa makieta tego układu — z pełną warstwą ruchu, radarem Orbity i prawdziwymi liczbami SSUEW —
jest do obejrzenia pod adresem <https://claude.ai/code/artifact/76382d40-46bf-4f73-8b56-ea3a350415fd>.

### 6.2 Kafelki

Każdy kafelek to **żywy podgląd, nie ikona z podpisem**. Kafelek, który pokazuje tylko nazwę,
zmusza do wejścia, żeby się czegokolwiek dowiedzieć — a wtedy kokpit jest tylko dodatkowym
kliknięciem po drodze.

| Kafelek | Co pokazuje bez wchodzenia | Skąd | Etap |
|---|---|---|---|
| **SSUEW Analytics** | Konwersja ostatniej rekrutacji z kierunkiem zmiany, iskierka trendu z ostatnich edycji, liczba aktywnych alertów | `/api/*` | 1 |
| **Planer semestru** | Bieżący miesiąc, liczba wydarzeń, najbliższe wydarzenie, licznik kolizji | dane statyczne w Etapie 1, Firestore w Etapie 3 | 1 → 3 |
| **Orbita** | Liczba zadań na dziś i zaległych | wyłączony (kłódka) w Etapie 1 | 2 |
| **Strony** | Liczba nadzorowanych witryn | wyłączony w Etapie 1 | 4 |

Kafelki etapów 2–4 są widoczne od Etapu 1, ale wyszarzone i opisane („wkrótce"). Puste miejsca
w siatce wyglądałyby na usterkę, a wyszarzone kafelki pokazują, dokąd to zmierza.

Kafelek Orbity dla roli `board` nie renderuje się w ogóle — nie jest wyszarzony, tylko go nie ma.

### 6.3 Ruch

Zasady, nie lista efektów. Design system ma już `deck-rise`, `deck-sheen`, `deck-scan`,
`deck-border-flow`, `deck-float`, `deck-pop` i `deck-meter` — kokpit z nich korzysta zamiast
wprowadzać drugi, konkurencyjny język animacji.

1. **Wejście ma kolejność.** Kafelki pojawiają się kaskadą, opóźnienie 60 ms na kafelek,
   `deck-rise`. Kolejność prowadzi wzrok od największego kafelka do najmniejszego.
2. **Kafelek reaguje na kursor.** Delikatne przechylenie w stronę kursora (maksymalnie 6°)
   i poświata podążająca za wskaźnikiem — pozycja jako zmienna CSS ustawiana w `pointermove`,
   bez ponownego renderowania Reacta.
3. **Wejście w moduł to docelowo rozwinięcie, nie przeskok** — kafelek rozszerza się w pełny
   widok przez natywne View Transitions. Rzecz przeniesiona do Etapu 5: dopóki trzy z czterech
   kafelków są zablokowane, nie ma czego rozwijać, a przejście warto zaprojektować raz, dla
   kompletu modułów.
4. **Liczby dojeżdżają.** `AnimatedNumber` (już istnieje) na każdej wartości w kafelku.
5. **Tło żyje wolno.** Istniejąca siatka z `body::before` plus jedna powolna orbita świetlna;
   cykl 20 s lub dłuższy, żeby nie odbierać uwagi.
6. **Tylko `transform` i `opacity`.** Żadnych animacji `width`, `top` czy `box-shadow`
   w pętli — te zmuszają przeglądarkę do przeliczania układu strony w każdej klatce.
7. **`prefers-reduced-motion` wyłącza ruch.** Dziś w `globals.css` tego nie ma, a część animacji
   działa w nieskończonej pętli. To jest usterka dostępności do naprawienia w Etapie 1: jedna
   reguła `@media` skracająca wszystkie animacje i przejścia do 0,01 ms.

Punkty 6 i 7 są nienegocjowalne — bez nich „mnóstwo animacji" zamienia się w zacinający się
interfejs, który u części osób wywołuje mdłości.

---

## 7. Co znika

Usuwane w Etapie 1:

- `@supabase/ssr`, `@supabase/supabase-js` z `package.json`
- `lib/supabase/` w całości (`client.ts`, `server.ts`, `config.ts`, `timeout.ts`, `config.test.ts`)
- `proxy.ts` → zastąpione przez `middleware.ts`
- `lib/schema.sql`, `lib/migracja-v2.sql` → przenoszone do `docs/archiwum/` jako zapis historyczny
- Formularz e-mail i hasło w `app/login/page.tsx` → przycisk „Zaloguj przez Google";
  cała oprawa wizualna strony logowania zostaje

Cała logika obliczeniowa w `lib/stats.ts` — korelacje, regresja, krzywe przeżycia, prognozy,
alerty — **zostaje bez zmian**. Ponad dziesięć plików testowych (`stats.*.test.ts`, `filters`,
`format`, `period`, `overview`) musi przechodzić przed i po migracji; są głównym dowodem, że
niczego nie zepsuliśmy.

Jeden wyjątek, znaleziony przy pisaniu planu: `buildAlerts` i wnioski wykonawcze niosą własne
adresy jako literały (`href: '/kpi'` i osiem podobnych). Po przenosinach modułów pod `/analytics`
te dziewięć napisów trzeba poprawić, inaczej każdy alert prowadziłby na stronę 404. To zmiana
adresów, nie obliczeń — ale nie da się uczciwie powiedzieć, że plik jest nietknięty. Trzy asercje
w `stats.alerts.test.ts` sprawdzają te adresy i również wymagają aktualizacji.

---

## 8. Testy

| Co | Jak |
|---|---|
| `apps-script/Kod.gs` | Zamiana wiersza na typ (puste komórki, `survival` po przecinkach, `in_progress` jako `PRAWDA`/`TRUE`/`1`, brakujący nagłówek) mieszka w skrypcie, więc vitest jej nie uruchomi. Sprawdzana ręcznie po wdrożeniu: odczyt `_ping`, a potem porównanie wykresów z liczbami w arkuszu. |
| `lib/gas/schema.ts` | Nazwy zakładek zgadzają się ze skryptem; `jestTabela` odrzuca nazwę spoza schematu. |
| `lib/gas/client.ts` | Testy ze zaślepionym `fetch`: poprawna odpowiedź, `ok:false` z kodem ze skryptu, HTML zamiast JSON-a, przekroczony czas, brak konfiguracji. |
| `lib/auth/verify.ts` | Token ważny, wygasły, zły odbiorca, zły podpis, adres spoza listy. |
| Trasy `/api/*` | Zapis bez logowania → `401`, z rolą `board` → `403`, z rolą `owner` → `201`. |
| Kokpit | `DeckTile` renderuje wartości; kafelek zablokowany nie ma odnośnika; rola `board` nie widzi Orbity. |
| Regresja | Cały dotychczasowy zestaw `vitest` przechodzi bez zmian w plikach testowych. |

Zgodnie z praktyką projektu — testy pisane przed implementacją każdej z tych jednostek.

---

## 9. Ryzyka

| Ryzyko | Waga | Co z tym robimy |
|---|---|---|
| Apps Script odpowiada 1–3 s | wysoka | Cache 300 s z unieważnianiem po zapisie; limit czasu 8 s z odpadnięciem na dane demonstracyjne |
| Limity Apps Script (ok. 20 tys. wywołań dziennie) | niska | Cache sprowadza ruch do kilkudziesięciu wywołań dziennie |
| Adres wdrożenia skryptu wycieka | średnia | Token jako drugi zamek; oba tylko po stronie serwera; rotacja tokenu to zmiana jednej zmiennej |
| Adres JWKS Firebase inny niż zakładam | średnia | Sprawdzić jako pierwsze zadanie wdrożenia; zapasowo `firebase-admin` na trasie Node |
| Ktoś przestawi kolumny w arkuszu | średnia | Skrypt czyta po nagłówkach, nie po pozycji; brakujący nagłówek to jawny błąd, nie ciche zero |
| Rozjazd między Etapem 1 a Etapem 3 w Plannerze | niska | Kafelek Plannera w Etapie 1 czyta dane statyczne przez ten sam interfejs, który w Etapie 3 dostanie Firestore |

---

## 10. Dalsze etapy

Każdy dostaje własny dokument projektowy i własny plan. Kolejność jest zmienna poza Etapem 1.

**Etap 2 — Orbita.** Prywatna tablica zadań jako radar: promień koduje pilność wyliczoną z terminu,
kąt koduje obszar. Firestore `users/{uid}/tasks`, reguły dopuszczające wyłącznie właściciela.
Widok listy jako równoprawna alternatywa dla radaru — radar świetnie pokazuje rozkład, ale nie
nadaje się do odhaczania dwudziestu drobiazgów po kolei. Wprowadza Firestore przy niskiej stawce,
zanim oprzemy na nim Plannera.

**Etap 3 — Planer semestru.** `SemestrPlanner.jsx` przechodzi na TypeScript i rozpada się na moduły
(dziś 578 linii i wszystko w jednym pliku: dane, obliczanie kolizji, kalendarz, formularze).
Dane wędrują do Firestore, przez co dzisiejszy udawany tryb „live" staje się prawdziwy.
Do zrobienia przy okazji: `xlsx` nie jest w `package.json`, więc plik w obecnej postaci nie
przeszedłby budowania.

**Etap 4 — Strony.** Google Identity Services wydaje osobny token z zakresem
`webmasters.readonly`, przeglądarka pyta Search Console bezpośrednio. Kliknięcia, wyświetlenia,
CTR, pozycja i najlepsze zapytania per witryna. Token pobierany osobno od logowania Firebase,
bo ten z logowania wygasa po godzinie i nie odnawia się sam.

**Etap 5 — dopieszczenie.** Przejścia między modułami, dźwięk (wyłączony domyślnie), skróty
klawiszowe, paleta poleceń, tryb pełnoekranowy „na ścianę".

---

## 11. Decyzje odłożone

- Czy Analytics pozostaje pod `/analytics`, czy dostaje własną poddomenę — do rozstrzygnięcia,
  gdy pojawi się szósty kafelek.
- Czy zarząd potrzebuje własnej, okrojonej wersji kokpitu — do rozstrzygnięcia po Etapie 3, gdy
  zarząd faktycznie zacznie z niego korzystać.
- Powiadomienia (poczta, Discord) przy alertach — poza zakresem, wymagałyby zadania działającego
  w tle, czyli dokładnie tego backendu, którego chcemy uniknąć.

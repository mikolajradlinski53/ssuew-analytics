# DECK

Prywatne centrum dowodzenia wspierające Wiceprzewodniczącego ds. Strategii i Działań Operacyjnych
**Samorządu Studentów Uniwersytetu Ekonomicznego we Wrocławiu**.

Kokpit z kafelkami, z którego prowadzi się wszystkie działania. Pierwszym i na razie jedynym
działającym modułem jest **SSUEW Analytics** — dashboard analityczny samorządu.

## Moduły

| Kafelek | Co robi | Stan |
|---|---|---|
| **SSUEW Analytics** | Rekrutacje, retencja kohort, KPI rok-do-roku, lejek, korelacje, prognozy, alerty | działa |
| **Orbita** | Prywatna tablica zadań jako radar: bliżej środka znaczy pilniej | etap 2 |
| **Planer semestru** | Kalendarz semestru z wykrywaniem kolizji osób i sal, widok miesiąca i całego semestru | działa |
| **Strony** | Kliknięcia, wyświetlenia i pozycje nadzorowanych witryn z Search Console | etap 4 |

Analytics liczy statystyki **bez zewnętrznych bibliotek matematycznych** — korelacja Pearsona,
test t Welcha, regresja wieloraka OLS i z-score są zaimplementowane od zera
w [`lib/stats.ts`](lib/stats.ts).

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5** + **Tailwind CSS 4**
- **Recharts** — wykresy
- **Firebase Auth** — logowanie e-mailem i hasłem, weryfikacja tokenu przez `jose`
- **Arkusze Google + Apps Script** — baza danych bez bazy danych

### Dlaczego taki backend

Aplikacja nie ma własnej bazy. Dane analityczne mieszkają w arkuszu Google, prowadzonym i tak
ręcznie, a [Apps Script](apps-script/README.md) wystawia je jako JSON. Trasy `/api/*` w Next.js
istnieją po to, żeby robić dwie rzeczy, których przeglądarka zrobić nie może: chronić token
do skryptu i cache'ować wolne odpowiedzi (Apps Script odpowiada 1–3 s).

## Uruchomienie

```bash
npm install
cp .env.example .env.local   # i uzupełnij — patrz niżej
npm run dev
```

Aplikacja wystartuje na [http://localhost:3000](http://localhost:3000).

Bez skonfigurowanego arkusza Analytics działa na danych historycznych SSUEW zaszytych
w [`lib/useAnalyticsData.ts`](lib/useAnalyticsData.ts) i oznacza to w interfejsie.

### Konfiguracja

**Firebase** — załóż projekt na [console.firebase.google.com](https://console.firebase.google.com),
w *Authentication → Sign-in method* włącz **E-mail/hasło**, a z *Project settings → Your apps*
przepisz `apiKey`, `authDomain` i `projectId` do `.env.local`. Dwa konta zakładasz ręcznie
w *Authentication → Users* — rejestracja własna jest wyłączona.

**Dwie drogi wejścia.** Konto z hasłem mają dwie osoby: `DECK_OWNER_EMAIL` (pełne uprawnienia,
jako jedyny widzi Orbitę) i `DECK_BOARD_EMAILS`. Reszta zarządu wchodzi **kodem** z zakładki
`kody` w arkuszu — kod wiąże się z przeglądarką przy pierwszym użyciu i od tej pory tylko ona
nim wejdzie. Kod zawsze daje rolę `board`; pełne uprawnienia wymagają hasła.

**`DECK_SESSION_SECRET`** podpisuje bilety sesji kodowych. Minimum 32 znaki — bez niego
aplikacja odmawia działania zamiast po cichu wpuszczać kogokolwiek.

**Arkusz** — sześć kroków w [`apps-script/README.md`](apps-script/README.md). Skrypt sam zakłada
zakładki i wgrywa dane historyczne.

**Firestore** (dla Planera) — konsola Firebase → *Firestore Database* → *Create database*
→ tryb **produkcyjny**, lokalizacja **eur3**. Lokalizacji nie da się później zmienić. Reguły
wklej z [`firestore.rules`](firestore.rules). Reguły sprawdzają adres e-mail wprost z tokenu,
więc nie trzeba żadnych własnych oświadczeń ani Admin SDK — ale **te same dwa adresy muszą być
w `firestore.rules` i w zmiennych Vercela**. Zmieniasz w jednym miejscu, zmień i w drugim.

**`FIREBASE_SERVICE_ACCOUNT`** jest potrzebny tylko po to, żeby osoby wchodzące kodem mogły
czytać Planer: nie mają konta Firebase, więc reguły Firestore ich nie wpuszczą i dane idą
przez `/api/planer`.

## Struktura

```
app/
  page.tsx            kokpit DECK
  analytics/          moduły analityczne (własna powłoka z sidebarem)
  api/                trasy danych i sesji
  login/              logowanie Google
components/
  deck/               kafelki kokpitu
  planer/             kalendarz semestru
  modules/            widoki modułów analitycznych
  ui/                 wspólne komponenty i powłoka
lib/
  stats.ts            ręcznie pisana statystyka
  gas/                klient Apps Script
  auth/               tożsamość, role, strażnik tras
  planer/             daty, kolizje, semestry — czyste funkcje
  firebase/           inicjalizacja Firestore
firestore.rules       reguły bezpieczeństwa bazy (wersjonowane tutaj)
apps-script/
  Kod.gs              backend na Arkuszach (wersjonowany tutaj)
docs/
  superpowers/        projekty i plany wdrożeń
  archiwum/           schemat wycofanej bazy Supabase
```

## Uwaga metodologiczna

Analizy opierają się na niewielkiej liczbie obserwacji (kilka–kilkanaście edycji), dlatego
prognozy i istotności statystyczne należy traktować **orientacyjnie**, jako wsparcie decyzji,
a nie twardy dowód. Wartości p są przybliżane progowo, a modele sygnalizują niskie dopasowanie
w polach `warning`.

## Skrypty

| Komenda | Działanie |
|---|---|
| `npm run dev` | serwer deweloperski |
| `npm run build` | build produkcyjny |
| `npm run start` | uruchomienie buildu |
| `npm run lint` | ESLint |
| `npm test` | vitest |

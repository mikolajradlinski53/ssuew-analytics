# SSUEW Analytics 2.0 — Etap 3d-i: Logowanie (Supabase Auth) — Design

- **Data:** 2026-06-02
- **Status:** Zatwierdzony, gotowy do planu
- **Część Etapu 3 / 3d.** 3d podzielone: **3d-i Auth** (ten spec) → **3d-ii Wpis danych**.
- Workflow: bezpośrednio na `main`. Weryfikacja na żywym Supabase użytkownika.

---

## 1. Cel

Wprowadzić logowanie e-mail+hasło (Supabase Auth, sesje cookie przez `@supabase/ssr`), tak by
zapisy do bazy wykonywały się jako rola `authenticated` (RLS w `schema.sql` przechodzi). Fundament
pod formularze wpisu (3d-ii). Odczyt pozostaje publiczny; tryb demo działa nadal bez konfiguracji.

## 2. Architektura klienta Supabase

Restrukturyzacja z jednego modułowego klienta anon na trzy warstwy (`@supabase/ssr`):

- `lib/supabase/client.ts` — `createBrowserClient(url, anon)` dla komponentów klienckich.
- `lib/supabase/server.ts` — `createServerClient(url, anon, { cookies })` (async, `await cookies()`)
  dla API routes / komponentów serwerowych; sesja czytana z cookies → żądania jako zalogowany user.
- `lib/supabase/config.ts` — `isConfigured` (sprawdza, czy URL ≠ placeholder) + stałe URL/anon.
- `middleware.ts` (root) — odświeża sesję (cookies) na każdym żądaniu wg wzorca Supabase SSR.

Dotychczasowy `lib/supabase.ts` zostaje jako cienki re-export `isConfigured` (zgodność istniejących
importów) lub zostaje zmigrowany; API routes przechodzą na `lib/supabase/server.ts`.

## 3. API routes

`/api/rekrutacje` i `/api/komisje` (GET/POST) używają server clienta z sesją:
- GET — bez zmian funkcjonalnych (odczyt publiczny; w demo zwraca `[]`).
- POST — wykonuje się jako `authenticated` (RLS insert/update OK). Gdy brak sesji → zwraca 401.

## 4. UI logowania

- **`/login`** — formularz e-mail + hasło → `supabase.auth.signInWithPassword`; błąd inline; po sukcesie
  redirect na `/`.
- **Topbar (`AppShell`)** — komponent `AuthStatus`: gdy zalogowany pokazuje e-mail + „Wyloguj"
  (`signOut`); gdy nie — link „Zaloguj" do `/login`. Reaguje na zmianę sesji (`onAuthStateChange`).
- Eksport i odczyt działają niezależnie od logowania; zapisy (3d-ii) będą wymagać sesji.

## 5. Konfiguracja / env

- Używa istniejących `NEXT_PUBLIC_SUPABASE_URL` i `NEXT_PUBLIC_SUPABASE_ANON_KEY` (sesja = autoryzacja,
  bez service-role). `.env*` pozostaje w `.gitignore`.
- Wymaga włączonego providera „Email" w Supabase Auth.

## 6. Weryfikacja na żywo (Supabase użytkownika)

1. Użytkownik tworzy testowego usera w panelu Supabase (Authentication → Users → Add user, auto-confirm)
   — pomija SMTP/potwierdzenia.
2. `npm run dev` → `/login` → logowanie → potwierdzenie sesji (e-mail w topbarze) i wylogowania.
3. Potwierdzenie, że żądanie POST jako authenticated nie jest blokowane przez RLS (pełny zapis przez
   formularz w 3d-ii).
- **Nie ujawniamy** kluczy ani haseł w logach/czacie.

## 7. Nie-cele 3d-i

- Formularze wpisu danych, `/api/kohorty`, nowe grupy KPI (3d-ii).
- Rejestracja przez UI / SMTP / reset hasła, Google OAuth, ograniczenie do domeny uczelni.
- Role/uprawnienia ponad „zalogowany = może pisać".

## 8. Ryzyka / założenia

- **`@supabase/ssr` + middleware** to standardowy, ale wrażliwy na szczegóły wzorzec (obsługa cookies
  w `getAll/setAll`); trzymamy się oficjalnego wzorca.
- Tabele i polityki RLS z `schema.sql` muszą istnieć w bazie (użytkownik potwierdza konfigurację).
- Tryb demo (brak env) musi dalej działać — `isConfigured` chroni ścieżki.

## 9. Kryteria sukcesu

- Logowanie/wylogowanie działa na żywym Supabase; topbar pokazuje stan sesji.
- API routes działają przez server client; POST jako authenticated nie jest blokowany przez RLS.
- Tryb demo nadal działa bez konfiguracji; `tsc` czysto; `npm test` zielone; build OK.

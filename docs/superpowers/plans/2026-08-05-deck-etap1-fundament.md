# DECK Etap 1 — fundament kokpitu

> **Dla wykonawcy:** WYMAGANY PODSKILL: użyj `superpowers:subagent-driven-development`
> (zalecane) albo `superpowers:executing-plans`, żeby wykonać ten plan zadanie po zadaniu.
> Kroki mają składnię `- [ ]` do odhaczania.

**Cel:** SSUEW Analytics staje się modułem DECK — powstaje kokpit z kafelkami, logowanie Google
zastępuje Supabase Auth, a dane wędrują z Supabase do Arkuszy Google przez Apps Script.

**Architektura:** Trasy `/api/*` zachowują dotychczasowe kontrakty JSON i tylko w środku wołają
Apps Script zamiast Supabase — dzięki temu `lib/stats.ts`, hooki i komponenty modułów zostają
nietknięte. Tożsamość daje Firebase Auth; ciasteczko sesji obsługuje przekierowania w middleware,
a trasy zapisu weryfikują token naprawdę. Kokpit żyje pod `/`, moduły analityczne przenoszą się
pod `/analytics/*`.

**Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind 4, vitest + Testing Library,
`firebase` (klient), `jose` (weryfikacja tokenu), Apps Script + Arkusze Google.

**Projekt:** `docs/superpowers/specs/2026-08-04-deck-etap1-fundament-design.md`
**Backend danych:** `apps-script/Kod.gs` — już napisany i zakomitowany; ten plan go tylko konsumuje.

---

## Zanim zaczniesz

Zadania 1–6 działają na zaślepionym `fetch` i nie potrzebują niczego z zewnątrz. Dopiero
zadanie 12 wymaga działającego arkusza, a zadanie 8 — projektu Firebase.

**Arkusz:** wykonaj sześć kroków z [`apps-script/README.md`](../../../apps-script/README.md).
Efekt: `GAS_URL` i `GAS_TOKEN`.

**Firebase:** <https://console.firebase.google.com> → nowy projekt → *Authentication* →
*Sign-in method* → włącz **Google**. W *Project settings* → *Your apps* → *Web app* skopiuj
`apiKey`, `authDomain` i `projectId`.

Plik `.env.local` (nie trafia do repozytorium):

```env
GAS_URL=https://script.google.com/macros/s/…/exec
GAS_TOKEN=…
DECK_OWNER_EMAIL=mikolaj.radlinski@wp.pl
DECK_BOARD_EMAILS=ktos@example.com,ktos.inny@example.com
NEXT_PUBLIC_FIREBASE_API_KEY=…
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=…firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=…
```

---

## Świadome odstępstwa od projektu

Trzy rzeczy wyszły inaczej, niż zakładał dokument projektowy. Nie są przeoczeniem:

**Nie ma `lib/gas/timeout.ts`.** Limit czasu siedzi w `lib/gas/client.ts` i działa przez
`AbortController`, a nie przez `Promise.race` jak dawny `lib/supabase/timeout.ts`. Różnica jest
istotna: `Promise.race` tylko przestaje czekać, a połączenie leci dalej w tle. `AbortController`
faktycznie je zrywa. Osobny plik na cztery linijki byłby podziałem bez korzyści.

**Zamiana wiersza arkusza na typ jest testowana ręcznie, nie przez vitest.** Projekt zakładał
`lib/gas/schema.ts` z testami parsowania (puste komórki, `PRAWDA` jako prawda, `survival`
po przecinkach). Ta logika wylądowała w `apps-script/Kod.gs`, w funkcji `zamien` — a vitest nie
uruchomi Apps Scriptu. Jest to świadomy koszt tego, że typowanie dzieje się przy źródle danych,
a nie po dwóch stronach naraz. Sprawdzasz to punktem 4 listy kontrolnej na końcu planu.

**View Transitions przechodzą do Etapu 5.** Dokument wymieniał je w punkcie 6.3 (Etap 1),
ale sam też planował „przejścia między modułami" w Etapie 5. Rozwiązanie sprzeczności: w Etapie 1
powstaje kaskada wejścia, poświata za kursorem i dojeżdżające liczby; rozwijanie kafelka w pełny
widok modułu wymaga najpierw istnienia wszystkich modułów.

## Struktura plików

| Plik | Odpowiedzialność |
|---|---|
| `lib/gas/config.ts` | Odczyt `GAS_URL` / `GAS_TOKEN`, flaga `isConfigured` |
| `lib/gas/schema.ts` | Nazwy zakładek i przypisanie ich do typów domenowych |
| `lib/gas/client.ts` | Jedyne miejsce, które rozmawia z Apps Script: limit czasu, pułapka HTTP 200, cache |
| `lib/auth/role.ts` | Adres e-mail → rola. Czysta funkcja, bez sieci |
| `lib/auth/verify.ts` | Weryfikacja tokenu Firebase (`jose`) |
| `lib/auth/firebase.ts` | Inicjalizacja Firebase po stronie przeglądarki |
| `lib/auth/useAuth.ts` | Hook sesji: użytkownik, rola, logowanie, wylogowanie |
| `app/api/session/route.ts` | Wymiana tokenu na ciasteczko `deck_session` |
| `middleware.ts` | Przekierowanie na `/login` bez ciasteczka |
| `components/deck/DeckTile.tsx` | Pojedynczy kafelek: żywy, zablokowany albo ukryty |
| `components/deck/DeckHub.tsx` | Siatka kafelków i stopka stanu |
| `app/page.tsx` | Kokpit |
| `app/analytics/layout.tsx` | Powłoka modułów analitycznych (dawny `AppShell`) |

Znika: `lib/supabase/**`, `proxy.ts`, `@supabase/*` z `package.json`.

---

## Faza A — warstwa danych

### Zadanie 1: Konfiguracja Apps Script

**Pliki:**
- Utwórz: `lib/gas/config.ts`
- Test: `lib/gas/config.test.ts`

- [ ] **Krok 1: Napisz test, który nie przechodzi**

```ts
// lib/gas/config.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('gas config', () => {
  beforeEach(() => vi.resetModules())
  afterEach(() => vi.unstubAllEnvs())

  it('nie jest skonfigurowany bez zmiennych środowiskowych', async () => {
    vi.stubEnv('GAS_URL', '')
    vi.stubEnv('GAS_TOKEN', '')
    const { isConfigured } = await import('@/lib/gas/config')
    expect(isConfigured).toBe(false)
  })

  it('nie jest skonfigurowany, gdy brakuje samego tokenu', async () => {
    vi.stubEnv('GAS_URL', 'https://script.google.com/macros/s/abc/exec')
    vi.stubEnv('GAS_TOKEN', '')
    const { isConfigured } = await import('@/lib/gas/config')
    expect(isConfigured).toBe(false)
  })

  it('jest skonfigurowany, gdy są oba', async () => {
    vi.stubEnv('GAS_URL', 'https://script.google.com/macros/s/abc/exec')
    vi.stubEnv('GAS_TOKEN', 'tajne')
    const { isConfigured, GAS_URL } = await import('@/lib/gas/config')
    expect(isConfigured).toBe(true)
    expect(GAS_URL).toContain('/exec')
  })
})
```

- [ ] **Krok 2: Uruchom test i sprawdź, że nie przechodzi**

Uruchom: `npm test -- lib/gas/config.test.ts`
Oczekiwane: FAIL — `Cannot find module '@/lib/gas/config'`

- [ ] **Krok 3: Napisz minimalną implementację**

```ts
// lib/gas/config.ts
export const GAS_URL = process.env.GAS_URL ?? ''
export const GAS_TOKEN = process.env.GAS_TOKEN ?? ''

/** Bez obu sekretów aplikacja działa na danych demonstracyjnych — tak jak dotąd bez Supabase. */
export const isConfigured = GAS_URL !== '' && GAS_TOKEN !== ''
```

- [ ] **Krok 4: Uruchom test i sprawdź, że przechodzi**

Uruchom: `npm test -- lib/gas/config.test.ts`
Oczekiwane: PASS, 3 testy

- [ ] **Krok 5: Zatwierdź**

```bash
git add lib/gas/config.ts lib/gas/config.test.ts
git commit -m "feat(gas): konfiguracja adresu i tokenu Apps Script"
```

---

### Zadanie 2: Nazwy zakładek i typy

**Pliki:**
- Utwórz: `lib/gas/schema.ts`
- Test: `lib/gas/schema.test.ts`

- [ ] **Krok 1: Napisz test, który nie przechodzi**

```ts
// lib/gas/schema.test.ts
import { describe, it, expect } from 'vitest'
import { TABELE, jestTabela } from '@/lib/gas/schema'

describe('schemat zakładek', () => {
  it('zna cztery zakładki arkusza', () => {
    expect(TABELE).toEqual(['rekrutacje', 'kohorty', 'kpi', 'czlonkowie'])
  })

  it('rozpoznaje poprawną nazwę zakładki', () => {
    expect(jestTabela('kpi')).toBe(true)
  })

  it('odrzuca nazwę spoza schematu', () => {
    expect(jestTabela('uzytkownicy')).toBe(false)
  })
})
```

- [ ] **Krok 2: Uruchom test i sprawdź, że nie przechodzi**

Uruchom: `npm test -- lib/gas/schema.test.ts`
Oczekiwane: FAIL — `Cannot find module '@/lib/gas/schema'`

- [ ] **Krok 3: Napisz minimalną implementację**

```ts
// lib/gas/schema.ts
import type { Rekrutacja, Kohorta, KpiMetric, Czlonek } from '@/types'

/** Nazwy zakładek w arkuszu. Muszą się zgadzać z kluczami SCHEMAT w apps-script/Kod.gs. */
export const TABELE = ['rekrutacje', 'kohorty', 'kpi', 'czlonkowie'] as const

export type Tabela = (typeof TABELE)[number]

/** Przypisanie zakładki do typu domenowego — dzięki temu gasList('kpi') zwraca KpiMetric[]. */
export interface TabelaTypy {
  rekrutacje: Rekrutacja
  kohorty: Kohorta
  kpi: KpiMetric
  czlonkowie: Czlonek
}

export function jestTabela(nazwa: string): nazwa is Tabela {
  return (TABELE as readonly string[]).includes(nazwa)
}
```

- [ ] **Krok 4: Uruchom test i sprawdź, że przechodzi**

Uruchom: `npm test -- lib/gas/schema.test.ts`
Oczekiwane: PASS, 3 testy

- [ ] **Krok 5: Zatwierdź**

```bash
git add lib/gas/schema.ts lib/gas/schema.test.ts
git commit -m "feat(gas): nazwy zakladek i przypisanie do typow domenowych"
```

---

### Zadanie 3: Klient Apps Script — odczyt

**Pliki:**
- Utwórz: `lib/gas/client.ts`
- Test: `lib/gas/client.test.ts`

Uwaga o pułapce: Apps Script **zawsze** odpowiada kodem HTTP 200, także przy błędzie. Klient musi
sprawdzać pole `ok` w treści, a nie `res.ok`. Gdy wdrożenie ma zły poziom dostępu, Google zwraca
stronę logowania w HTML — wtedy `JSON.parse` rzuca wyjątkiem i to też trzeba obsłużyć.

- [ ] **Krok 1: Napisz test, który nie przechodzi**

```ts
// lib/gas/client.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

function odpowiedz(tresc: string) {
  return { text: () => Promise.resolve(tresc) } as unknown as Response
}

describe('gasList', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('GAS_URL', 'https://script.google.com/macros/s/abc/exec')
    vi.stubEnv('GAS_TOKEN', 'tajne')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('zwraca listę wierszy', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      odpowiedz('[{"id":"1","edycja":"J\'25","rok":2025}]'),
    ))
    const { gasList } = await import('@/lib/gas/client')
    const dane = await gasList('rekrutacje')
    expect(dane).toHaveLength(1)
    expect(dane[0].edycja).toBe("J'25")
  })

  it('dokłada token i nazwę zakładki do adresu', async () => {
    const f = vi.fn().mockResolvedValue(odpowiedz('[]'))
    vi.stubGlobal('fetch', f)
    const { gasList } = await import('@/lib/gas/client')
    await gasList('kpi')
    expect(f.mock.calls[0][0]).toContain('token=tajne')
    expect(f.mock.calls[0][0]).toContain('t=kpi')
  })

  it('zamienia odpowiedź ok:false na GasError z kodem ze skryptu', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      odpowiedz('{"ok":false,"kod":403,"error":"Brak dostepu"}'),
    ))
    const { gasList, GasError } = await import('@/lib/gas/client')
    await expect(gasList('kpi')).rejects.toBeInstanceOf(GasError)
    await expect(gasList('kpi')).rejects.toMatchObject({ kod: 403 })
  })

  it('zamienia odpowiedź w HTML na czytelny błąd', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      odpowiedz('<!DOCTYPE html><html>Zaloguj się</html>'),
    ))
    const { gasList } = await import('@/lib/gas/client')
    await expect(gasList('kpi')).rejects.toMatchObject({ kod: 502 })
  })

  it('zamienia zerwane czytanie treści na GasError, a nie surowy wyjątek', async () => {
    // Połączenie urywa się już po nagłówkach, w trakcie pobierania treści.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      text: () => Promise.reject(new Error('socket hang up')),
    } as unknown as Response))
    const { gasList, GasError } = await import('@/lib/gas/client')
    await expect(gasList('kpi')).rejects.toBeInstanceOf(GasError)
    await expect(gasList('kpi')).rejects.toMatchObject({ kod: 504 })
  })

  it('zwraca pustą listę, gdy skrypt nie jest skonfigurowany', async () => {
    vi.stubEnv('GAS_URL', '')
    vi.stubEnv('GAS_TOKEN', '')
    const f = vi.fn()
    vi.stubGlobal('fetch', f)
    const { gasList } = await import('@/lib/gas/client')
    expect(await gasList('kpi')).toEqual([])
    expect(f).not.toHaveBeenCalled()
  })
})
```

- [ ] **Krok 2: Uruchom test i sprawdź, że nie przechodzi**

Uruchom: `npm test -- lib/gas/client.test.ts`
Oczekiwane: FAIL — `Cannot find module '@/lib/gas/client'`

- [ ] **Krok 3: Napisz minimalną implementację**

```ts
// lib/gas/client.ts
import { GAS_URL, GAS_TOKEN, isConfigured } from './config'
import type { Tabela, TabelaTypy } from './schema'

const LIMIT_CZASU_MS = 8000
const CACHE_S = 300

export class GasError extends Error {
  readonly kod: number
  constructor(wiadomosc: string, kod: number) {
    super(wiadomosc)
    this.name = 'GasError'
    this.kod = kod
  }
}

type Init = RequestInit & { next?: { revalidate?: number; tags?: string[] } }

/**
 * Apps Script odpowiada kodem 200 nawet przy błędzie — prawdziwy kod jest w treści.
 * Dlatego nigdzie tu nie sprawdzamy `res.ok`; to byłby fałszywy spokój.
 */
async function wywolaj(url: string, init: Init): Promise<unknown> {
  const przerwij = new AbortController()
  const zegar = setTimeout(() => przerwij.abort(), LIMIT_CZASU_MS)

  // Pobranie treści jest wewnątrz tego samego `try` co `fetch` z dwóch powodów:
  // połączenie może urwać się już po nagłówkach, a limit 8 s ma obejmować całą
  // wymianę, nie samo nawiązanie połączenia.
  let tresc: string
  try {
    const res = await fetch(url, { ...init, signal: przerwij.signal })
    tresc = await res.text()
  } catch (e) {
    const przerwane = e instanceof Error && e.name === 'AbortError'
    throw new GasError(
      przerwane
        ? `Apps Script nie odpowiedział w ${LIMIT_CZASU_MS / 1000} s`
        : 'Nie udało się połączyć z Apps Script',
      504,
    )
  } finally {
    clearTimeout(zegar)
  }

  let dane: unknown
  try {
    dane = JSON.parse(tresc)
  } catch {
    throw new GasError(
      'Apps Script zwrócił treść, która nie jest JSON-em — sprawdź, czy wdrożenie ma dostęp „Wszyscy”',
      502,
    )
  }

  if (dane && typeof dane === 'object' && !Array.isArray(dane)) {
    const koperta = dane as { ok?: boolean; kod?: number; error?: string }
    if (koperta.ok === false) {
      throw new GasError(koperta.error ?? 'Błąd Apps Script', koperta.kod ?? 500)
    }
  }
  return dane
}

/** Odczyt całej zakładki. Wynik jest cache'owany na 5 minut pod znacznikiem `analytics`. */
export async function gasList<T extends Tabela>(t: T): Promise<TabelaTypy[T][]> {
  if (!isConfigured) return []
  const url = `${GAS_URL}?token=${encodeURIComponent(GAS_TOKEN)}&t=${t}`
  const dane = await wywolaj(url, { next: { revalidate: CACHE_S, tags: ['analytics'] } })
  if (!Array.isArray(dane)) throw new GasError('Skrypt zwrócił coś innego niż listę', 502)
  return dane as TabelaTypy[T][]
}
```

- [ ] **Krok 4: Uruchom test i sprawdź, że przechodzi**

Uruchom: `npm test -- lib/gas/client.test.ts`
Oczekiwane: PASS, 6 testów

- [ ] **Krok 5: Zatwierdź**

```bash
git add lib/gas/client.ts lib/gas/client.test.ts
git commit -m "feat(gas): klient odczytu z obsluga pulapki HTTP 200"
```

---

### Zadanie 4: Klient Apps Script — zapis

**Pliki:**
- Modyfikuj: `lib/gas/client.ts`
- Test: `lib/gas/client.write.test.ts`

- [ ] **Krok 1: Napisz test, który nie przechodzi**

```ts
// lib/gas/client.write.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

function odpowiedz(tresc: string) {
  return { text: () => Promise.resolve(tresc) } as unknown as Response
}

describe('gasWrite', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('GAS_URL', 'https://script.google.com/macros/s/abc/exec')
    vi.stubEnv('GAS_TOKEN', 'tajne')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('wysyła token, zakładkę, operację i wiersze', async () => {
    const f = vi.fn().mockResolvedValue(odpowiedz('{"ok":true,"rows":[{"id":"a"}]}'))
    vi.stubGlobal('fetch', f)
    const { gasWrite } = await import('@/lib/gas/client')
    await gasWrite('kpi', 'insert', [{ kategoria: 'SKS', nazwa: 'Maj' }])

    const [, init] = f.mock.calls[0]
    const body = JSON.parse(init.body)
    expect(init.method).toBe('POST')
    expect(body).toMatchObject({ token: 'tajne', t: 'kpi', op: 'insert' })
    expect(body.rows).toHaveLength(1)
  })

  it('zwraca wiersze z koperty odpowiedzi', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      odpowiedz('{"ok":true,"rows":[{"id":"a"},{"id":"b"}]}'),
    ))
    const { gasWrite } = await import('@/lib/gas/client')
    const wynik = await gasWrite('kpi', 'insert', [{}, {}])
    expect(wynik).toHaveLength(2)
  })

  it('rzuca GasError, gdy skrypt odmawia', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      odpowiedz('{"ok":false,"kod":404,"error":"Nie ma wiersza"}'),
    ))
    const { gasWrite, GasError } = await import('@/lib/gas/client')
    await expect(gasWrite('kpi', 'update', [{ id: 'x' }])).rejects.toBeInstanceOf(GasError)
  })

  it('rzuca GasError 503, gdy skrypt nie jest skonfigurowany', async () => {
    vi.stubEnv('GAS_URL', '')
    vi.stubEnv('GAS_TOKEN', '')
    const { gasWrite } = await import('@/lib/gas/client')
    await expect(gasWrite('kpi', 'insert', [{}])).rejects.toMatchObject({ kod: 503 })
  })
})
```

- [ ] **Krok 2: Uruchom test i sprawdź, że nie przechodzi**

Uruchom: `npm test -- lib/gas/client.write.test.ts`
Oczekiwane: FAIL — `gasWrite is not a function`

- [ ] **Krok 3: Dopisz implementację na końcu `lib/gas/client.ts`**

```ts
export type Operacja = 'insert' | 'upsert' | 'update'

/**
 * Zapis nigdy nie jest cache'owany. `rows` jest zawsze tablicą — także dla jednego wiersza,
 * żeby po stronie skryptu istniał jeden kształt żądania zamiast dwóch.
 */
export async function gasWrite<T extends Tabela>(
  t: T,
  op: Operacja,
  rows: Record<string, unknown>[],
): Promise<TabelaTypy[T][]> {
  if (!isConfigured) throw new GasError('Apps Script nie jest skonfigurowany', 503)

  const dane = await wywolaj(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: GAS_TOKEN, t, op, rows }),
    cache: 'no-store',
  })

  const koperta = dane as { rows?: unknown }
  if (!Array.isArray(koperta.rows)) throw new GasError('Skrypt nie zwrócił zapisanych wierszy', 502)
  return koperta.rows as TabelaTypy[T][]
}
```

- [ ] **Krok 4: Uruchom test i sprawdź, że przechodzi**

Uruchom: `npm test -- lib/gas/client.write.test.ts`
Oczekiwane: PASS, 4 testy

- [ ] **Krok 5: Zatwierdź**

```bash
git add lib/gas/client.ts lib/gas/client.write.test.ts
git commit -m "feat(gas): zapis wsadowy przez Apps Script"
```

---

## Faza B — tożsamość

### Zadanie 5: Adres e-mail na rolę

**Pliki:**
- Utwórz: `lib/auth/role.ts`
- Test: `lib/auth/role.test.ts`

- [ ] **Krok 1: Napisz test, który nie przechodzi**

```ts
// lib/auth/role.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { rolaDla } from '@/lib/auth/role'

afterEach(() => vi.unstubAllEnvs())

describe('rolaDla', () => {
  it('rozpoznaje właściciela', () => {
    vi.stubEnv('DECK_OWNER_EMAIL', 'ja@example.com')
    vi.stubEnv('DECK_BOARD_EMAILS', '')
    expect(rolaDla('ja@example.com')).toBe('owner')
  })

  it('rozpoznaje zarząd z listy po przecinkach', () => {
    vi.stubEnv('DECK_OWNER_EMAIL', 'ja@example.com')
    vi.stubEnv('DECK_BOARD_EMAILS', 'a@example.com, b@example.com')
    expect(rolaDla('b@example.com')).toBe('board')
  })

  it('nie zważa na wielkość liter ani spacje', () => {
    vi.stubEnv('DECK_OWNER_EMAIL', 'ja@example.com')
    vi.stubEnv('DECK_BOARD_EMAILS', '')
    expect(rolaDla('  JA@Example.COM ')).toBe('owner')
  })

  it('odmawia adresowi spoza listy', () => {
    vi.stubEnv('DECK_OWNER_EMAIL', 'ja@example.com')
    vi.stubEnv('DECK_BOARD_EMAILS', 'a@example.com')
    expect(rolaDla('ktos@obcy.pl')).toBeNull()
  })

  it('odmawia pustemu adresowi, nawet gdy lista jest pusta', () => {
    vi.stubEnv('DECK_OWNER_EMAIL', '')
    vi.stubEnv('DECK_BOARD_EMAILS', '')
    expect(rolaDla('')).toBeNull()
    expect(rolaDla(null)).toBeNull()
    expect(rolaDla(undefined)).toBeNull()
  })
})
```

- [ ] **Krok 2: Uruchom test i sprawdź, że nie przechodzi**

Uruchom: `npm test -- lib/auth/role.test.ts`
Oczekiwane: FAIL — `Cannot find module '@/lib/auth/role'`

- [ ] **Krok 3: Napisz minimalną implementację**

```ts
// lib/auth/role.ts

/** `owner` zapisuje wszędzie, `board` czyta Analytics i pracuje w Plannerze, `null` nie wchodzi. */
export type Rola = 'owner' | 'board'

function normalizuj(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase()
}

/**
 * Samo konto Google nie daje niczego — dostęp mają wyłącznie adresy z listy.
 * Lista żyje w zmiennych środowiskowych, bo zmienia się raz na kadencję.
 */
export function rolaDla(email: string | null | undefined): Rola | null {
  const kto = normalizuj(email)
  if (!kto) return null

  if (kto === normalizuj(process.env.DECK_OWNER_EMAIL)) return 'owner'

  const zarzad = (process.env.DECK_BOARD_EMAILS ?? '')
    .split(',')
    .map(normalizuj)
    .filter(Boolean)

  return zarzad.includes(kto) ? 'board' : null
}
```

- [ ] **Krok 4: Uruchom test i sprawdź, że przechodzi**

Uruchom: `npm test -- lib/auth/role.test.ts`
Oczekiwane: PASS, 6 testów

- [ ] **Krok 5: Zatwierdź**

```bash
git add lib/auth/role.ts lib/auth/role.test.ts
git commit -m "feat(auth): mapowanie adresu e-mail na role"
```

---

### Zadanie 6: Weryfikacja tokenu Firebase

**Pliki:**
- Utwórz: `lib/auth/verify.ts`
- Test: `lib/auth/verify.test.ts`
- Modyfikuj: `package.json`

- [ ] **Krok 1: Zainstaluj `jose`**

```bash
npm install jose
```

`jose` weryfikuje podpis w środowisku Edge, więc nie wciągamy `firebase-admin` ani konta
serwisowego. Sprawdź, czy adres kluczy odpowiada — to była pozycja ryzyka w projekcie:

```bash
curl -s "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com" | head -c 120
```

Oczekiwane: JSON zaczynający się od `{"keys":[`. Gdyby wrócił błąd, przełącz się na
`firebase-admin` w trasie z `runtime = 'nodejs'` i odnotuj to w projekcie.

- [ ] **Krok 2: Napisz test, który nie przechodzi**

```ts
// lib/auth/verify.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const jwtVerify = vi.fn()
vi.mock('jose', () => ({
  jwtVerify: (...a: unknown[]) => jwtVerify(...a),
  createRemoteJWKSet: () => 'jwks',
}))

describe('zweryfikujToken', () => {
  beforeEach(() => {
    vi.resetModules()
    jwtVerify.mockReset()
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'deck-test')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('zwraca uid i e-mail z ważnego tokenu', async () => {
    jwtVerify.mockResolvedValue({ payload: { sub: 'u1', email: 'ja@example.com' } })
    const { zweryfikujToken } = await import('@/lib/auth/verify')
    expect(await zweryfikujToken('abc')).toEqual({ uid: 'u1', email: 'ja@example.com' })
  })

  it('sprawdza wystawcę i odbiorcę zgodnie z projektem Firebase', async () => {
    jwtVerify.mockResolvedValue({ payload: { sub: 'u1', email: 'a@b.c' } })
    const { zweryfikujToken } = await import('@/lib/auth/verify')
    await zweryfikujToken('abc')
    expect(jwtVerify.mock.calls[0][2]).toEqual({
      issuer: 'https://securetoken.google.com/deck-test',
      audience: 'deck-test',
    })
  })

  it('zwraca null przy tokenie odrzuconym przez podpis', async () => {
    jwtVerify.mockRejectedValue(new Error('signature verification failed'))
    const { zweryfikujToken } = await import('@/lib/auth/verify')
    expect(await zweryfikujToken('zly')).toBeNull()
  })

  it('zwraca null, gdy token nie niesie adresu e-mail', async () => {
    jwtVerify.mockResolvedValue({ payload: { sub: 'u1' } })
    const { zweryfikujToken } = await import('@/lib/auth/verify')
    expect(await zweryfikujToken('abc')).toBeNull()
  })
})
```

- [ ] **Krok 3: Uruchom test i sprawdź, że nie przechodzi**

Uruchom: `npm test -- lib/auth/verify.test.ts`
Oczekiwane: FAIL — `Cannot find module '@/lib/auth/verify'`

- [ ] **Krok 4: Napisz minimalną implementację**

```ts
// lib/auth/verify.ts
import { createRemoteJWKSet, jwtVerify } from 'jose'

const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'

export interface Tozsamosc {
  uid: string
  email: string
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

/**
 * Zwraca tożsamość albo `null` — bez rozróżniania, co dokładnie było nie tak.
 * Wywołujący ma odmówić dostępu, a nie tłumaczyć pytającemu, którego warunku nie spełnił.
 */
export async function zweryfikujToken(token: string): Promise<Tozsamosc | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? ''
  if (!projectId || !token) return null

  if (!jwks) jwks = createRemoteJWKSet(new URL(JWKS_URL))

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    })
    const uid = typeof payload.sub === 'string' ? payload.sub : ''
    const email = typeof payload.email === 'string' ? payload.email : ''
    if (!uid || !email) return null
    return { uid, email }
  } catch {
    return null
  }
}
```

- [ ] **Krok 5: Uruchom test i sprawdź, że przechodzi**

Uruchom: `npm test -- lib/auth/verify.test.ts`
Oczekiwane: PASS, 4 testy

- [ ] **Krok 6: Zatwierdź**

```bash
git add lib/auth/verify.ts lib/auth/verify.test.ts package.json package-lock.json
git commit -m "feat(auth): weryfikacja tokenu Firebase przez jose"
```

---

### Zadanie 7: Strażnik tras API

**Pliki:**
- Utwórz: `lib/auth/guard.ts`
- Test: `lib/auth/guard.test.ts`

- [ ] **Krok 1: Napisz test, który nie przechodzi**

```ts
// lib/auth/guard.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const zweryfikujToken = vi.fn()
vi.mock('@/lib/auth/verify', () => ({ zweryfikujToken: (t: string) => zweryfikujToken(t) }))

function zada(ciasteczko?: string) {
  return {
    cookies: { get: (n: string) => (ciasteczko && n === 'deck_session' ? { value: ciasteczko } : undefined) },
  } as never
}

describe('ktoPyta', () => {
  beforeEach(() => {
    vi.resetModules()
    zweryfikujToken.mockReset()
    vi.stubEnv('DECK_OWNER_EMAIL', 'ja@example.com')
    vi.stubEnv('DECK_BOARD_EMAILS', 'zarzad@example.com')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('zwraca null bez ciasteczka', async () => {
    const { ktoPyta } = await import('@/lib/auth/guard')
    expect(await ktoPyta(zada())).toBeNull()
    expect(zweryfikujToken).not.toHaveBeenCalled()
  })

  it('zwraca null, gdy token jest nieważny', async () => {
    zweryfikujToken.mockResolvedValue(null)
    const { ktoPyta } = await import('@/lib/auth/guard')
    expect(await ktoPyta(zada('zly-token'))).toBeNull()
  })

  it('zwraca rolę owner dla właściciela', async () => {
    zweryfikujToken.mockResolvedValue({ uid: 'u1', email: 'ja@example.com' })
    const { ktoPyta } = await import('@/lib/auth/guard')
    expect(await ktoPyta(zada('token'))).toEqual({ uid: 'u1', email: 'ja@example.com', rola: 'owner' })
  })

  it('zwraca null dla ważnego tokenu spoza listy adresów', async () => {
    zweryfikujToken.mockResolvedValue({ uid: 'u9', email: 'obcy@example.com' })
    const { ktoPyta } = await import('@/lib/auth/guard')
    expect(await ktoPyta(zada('token'))).toBeNull()
  })
})
```

- [ ] **Krok 2: Uruchom test i sprawdź, że nie przechodzi**

Uruchom: `npm test -- lib/auth/guard.test.ts`
Oczekiwane: FAIL — `Cannot find module '@/lib/auth/guard'`

- [ ] **Krok 3: Napisz minimalną implementację**

```ts
// lib/auth/guard.ts
import type { NextRequest } from 'next/server'
import { zweryfikujToken } from './verify'
import { rolaDla, type Rola } from './role'

export interface Pytajacy {
  uid: string
  email: string
  rola: Rola
}

/**
 * Prawdziwa weryfikacja: podpis, wystawca, odbiorca, termin ważności i lista adresów.
 * Middleware sprawdza jedynie obecność ciasteczka — bezpieczeństwo mieszka tutaj.
 */
export async function ktoPyta(req: NextRequest): Promise<Pytajacy | null> {
  const token = req.cookies.get('deck_session')?.value
  if (!token) return null

  const tozsamosc = await zweryfikujToken(token)
  if (!tozsamosc) return null

  const rola = rolaDla(tozsamosc.email)
  if (!rola) return null

  return { uid: tozsamosc.uid, email: tozsamosc.email, rola }
}
```

- [ ] **Krok 4: Uruchom test i sprawdź, że przechodzi**

Uruchom: `npm test -- lib/auth/guard.test.ts`
Oczekiwane: PASS, 4 testy

- [ ] **Krok 5: Zatwierdź**

```bash
git add lib/auth/guard.ts lib/auth/guard.test.ts
git commit -m "feat(auth): straznik tras API czytajacy ciasteczko sesji"
```

---

### Zadanie 8: Firebase po stronie przeglądarki

**Pliki:**
- Utwórz: `lib/auth/firebase.ts`, `lib/auth/useAuth.ts`
- Modyfikuj: `package.json`

Ten kod rozmawia z prawdziwym Firebase, więc nie ma tu testów jednostkowych — sprawdzasz go
ręcznie w zadaniu 10, po podpięciu strony logowania.

- [ ] **Krok 1: Zainstaluj `firebase`**

```bash
npm install firebase
```

- [ ] **Krok 2: Napisz inicjalizację**

```ts
// lib/auth/firebase.ts
'use client'
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth'

const konfiguracja = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
}

export const firebaseSkonfigurowany = konfiguracja.apiKey !== '' && konfiguracja.projectId !== ''

/** Next odświeża moduły w trybie deweloperskim, więc inicjalizacja musi być idempotentna. */
function aplikacja(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(konfiguracja)
}

export function auth(): Auth {
  return getAuth(aplikacja())
}

export function dostawcaGoogle(): GoogleAuthProvider {
  return new GoogleAuthProvider()
}
```

- [ ] **Krok 3: Napisz hook sesji**

```ts
// lib/auth/useAuth.ts
'use client'
import { useCallback, useEffect, useState } from 'react'
import { onIdTokenChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { auth, dostawcaGoogle, firebaseSkonfigurowany } from './firebase'

export interface StanSesji {
  user: User | null
  rola: 'owner' | 'board' | null
  laduje: boolean
  blad: string | null
}

export function useAuth() {
  const [stan, setStan] = useState<StanSesji>({ user: null, rola: null, laduje: true, blad: null })

  useEffect(() => {
    if (!firebaseSkonfigurowany) {
      setStan({ user: null, rola: null, laduje: false, blad: 'Firebase nie jest skonfigurowany' })
      return
    }
    // onIdTokenChanged, nie onAuthStateChanged: token wygasa po godzinie i Firebase
    // odnawia go sam — ciasteczko musi jechać za nim, inaczej zapisy zaczną zwracać 401.
    return onIdTokenChanged(auth(), async (user) => {
      if (!user) {
        await fetch('/api/session', { method: 'DELETE' })
        setStan({ user: null, rola: null, laduje: false, blad: null })
        return
      }
      const token = await user.getIdToken()
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (!res.ok) {
        await signOut(auth())
        setStan({ user: null, rola: null, laduje: false, blad: 'To konto nie ma dostępu do DECK' })
        return
      }
      const { rola } = await res.json()
      setStan({ user, rola, laduje: false, blad: null })
    })
  }, [])

  const zaloguj = useCallback(async () => {
    setStan((s) => ({ ...s, blad: null }))
    try {
      await signInWithPopup(auth(), dostawcaGoogle())
    } catch (e) {
      const anulowane = e instanceof Error && e.message.includes('popup-closed-by-user')
      if (!anulowane) setStan((s) => ({ ...s, blad: 'Logowanie się nie powiodło' }))
    }
  }, [])

  const wyloguj = useCallback(async () => {
    await signOut(auth())
  }, [])

  return { ...stan, zaloguj, wyloguj }
}
```

- [ ] **Krok 4: Sprawdź, że projekt się kompiluje**

Uruchom: `npx tsc --noEmit`
Oczekiwane: brak błędów w `lib/auth/*`

- [ ] **Krok 5: Zatwierdź**

```bash
git add lib/auth/firebase.ts lib/auth/useAuth.ts package.json package-lock.json
git commit -m "feat(auth): logowanie Google i hook sesji"
```

---

### Zadanie 9: Trasa sesji i middleware

**Pliki:**
- Utwórz: `app/api/session/route.ts`, `middleware.ts`
- Usuń: `proxy.ts`
- Test: `app/api/session/route.test.ts`

- [ ] **Krok 1: Napisz test, który nie przechodzi**

```ts
// app/api/session/route.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const zweryfikujToken = vi.fn()
vi.mock('@/lib/auth/verify', () => ({ zweryfikujToken: (t: string) => zweryfikujToken(t) }))

function zada(body: unknown) {
  return { json: () => Promise.resolve(body) } as never
}

describe('POST /api/session', () => {
  beforeEach(() => {
    vi.resetModules()
    zweryfikujToken.mockReset()
    vi.stubEnv('DECK_OWNER_EMAIL', 'ja@example.com')
    vi.stubEnv('DECK_BOARD_EMAILS', '')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('odmawia bez tokenu', async () => {
    const { POST } = await import('@/app/api/session/route')
    expect((await POST(zada({}))).status).toBe(401)
  })

  it('odmawia adresowi spoza listy', async () => {
    zweryfikujToken.mockResolvedValue({ uid: 'u9', email: 'obcy@example.com' })
    const { POST } = await import('@/app/api/session/route')
    const res = await POST(zada({ token: 'abc' }))
    expect(res.status).toBe(403)
  })

  it('ustawia ciasteczko i zwraca rolę właściciela', async () => {
    zweryfikujToken.mockResolvedValue({ uid: 'u1', email: 'ja@example.com' })
    const { POST } = await import('@/app/api/session/route')
    const res = await POST(zada({ token: 'abc' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ rola: 'owner', email: 'ja@example.com' })
    expect(res.cookies.get('deck_session')?.value).toBe('abc')
    expect(res.cookies.get('deck_session')?.httpOnly).toBe(true)
  })
})
```

- [ ] **Krok 2: Uruchom test i sprawdź, że nie przechodzi**

Uruchom: `npm test -- app/api/session/route.test.ts`
Oczekiwane: FAIL — `Cannot find module '@/app/api/session/route'`

- [ ] **Krok 3: Napisz trasę sesji**

```ts
// app/api/session/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { zweryfikujToken } from '@/lib/auth/verify'
import { rolaDla } from '@/lib/auth/role'

const GODZINA_S = 60 * 60

export async function POST(req: NextRequest) {
  const { token } = await req.json().catch(() => ({ token: null }))
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Brak tokenu' }, { status: 401 })
  }

  const tozsamosc = await zweryfikujToken(token)
  if (!tozsamosc) return NextResponse.json({ error: 'Token nieważny' }, { status: 401 })

  const rola = rolaDla(tozsamosc.email)
  if (!rola) return NextResponse.json({ error: 'To konto nie ma dostępu do DECK' }, { status: 403 })

  const res = NextResponse.json({ rola, email: tozsamosc.email })
  res.cookies.set('deck_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    // Token Firebase i tak żyje godzinę; dłuższe ciasteczko dawałoby tylko
    // złudzenie sesji, którą trasy API i tak odrzucą.
    maxAge: GODZINA_S,
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('deck_session')
  return res
}
```

- [ ] **Krok 4: Uruchom test i sprawdź, że przechodzi**

Uruchom: `npm test -- app/api/session/route.test.ts`
Oczekiwane: PASS, 3 testy

- [ ] **Krok 5: Zamień `proxy.ts` na `middleware.ts`**

```ts
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'

const PUBLICZNE = ['/login']

/**
 * Wyłącznie wygoda: nie pokazuj pustych ekranów bez sesji.
 * Bezpieczeństwo siedzi w trasach /api/*, które weryfikują podpis tokenu.
 * Weryfikacja podpisu przy każdym żądaniu o obrazek byłaby kosztem bez pożytku.
 */
export function middleware(req: NextRequest) {
  const sciezka = req.nextUrl.pathname
  if (PUBLICZNE.includes(sciezka) || sciezka.startsWith('/api')) return NextResponse.next()

  if (!req.cookies.get('deck_session')) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

```bash
git rm proxy.ts
```

- [ ] **Krok 6: Uruchom cały zestaw testów**

Uruchom: `npm test`
Oczekiwane: wszystkie przechodzą poza `lib/supabase/config.test.ts`, który znika w zadaniu 13

- [ ] **Krok 7: Zatwierdź**

```bash
git add app/api/session middleware.ts
git commit -m "feat(auth): ciasteczko sesji i middleware zamiast proxy Supabase"
```

---

### Zadanie 10: Strona logowania na Google

**Pliki:**
- Modyfikuj: `app/login/page.tsx`

Zachowaj całą oprawę wizualną (`LiveDigits`, `deck-scan`, `deck-orbit`, teksty). Zmienia się
wyłącznie formularz: dwa pola i przycisk ustępują jednemu przyciskowi Google.

- [ ] **Krok 1: Podmień logikę i formularz**

W `app/login/page.tsx` usuń importy `createClient`, `isConfigured` oraz stany `email`, `haslo`,
`err`, `busy` wraz z funkcją `submit`. Wstaw w ich miejsce:

```tsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react'
import { useAuth } from '@/lib/auth/useAuth'
import { LiveDigits } from '@/components/ui/LiveDigits'
import { LogoMark } from '@/components/ui/LogoMark'
```

Wewnątrz komponentu zamiast dotychczasowych stanów:

```tsx
const router = useRouter()
const { user, laduje, blad, zaloguj } = useAuth()

useEffect(() => {
  if (user) {
    router.push('/')
    router.refresh()
  }
}, [user, router])
```

A cały `<form>` zastąp:

```tsx
<div className="deck-card w-full rounded-lg p-6">
  <div className="mb-6">
    <div className="grid h-12 w-12 place-items-center rounded-lg border border-deck-accent/35 bg-deck-accent/12 text-deck-accent shadow-[0_0_28px_rgba(46,230,166,0.24)]">
      <LockKeyhole size={22} />
    </div>
    <h2 className="mt-4 text-2xl font-semibold text-deck-text">Autoryzacja</h2>
    <p className="mt-1 text-[11px] leading-5 text-deck-muted">
      Wejście kontem Google. Dostęp mają wyłącznie adresy z listy zarządu.
    </p>
  </div>

  {blad && (
    <div className="mb-4 rounded-lg border border-deck-danger-border bg-deck-danger-bg/70 px-3 py-2 text-[11px] text-deck-danger">
      {blad}
    </div>
  )}

  <button
    type="button"
    onClick={zaloguj}
    disabled={laduje}
    className="deck-button flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold disabled:opacity-50"
  >
    {laduje ? 'Sprawdzanie sesji...' : 'Zaloguj przez Google'}
    <ArrowRight size={16} />
  </button>

  <div className="mt-5 grid grid-cols-3 gap-2 text-center">
    {['GOOGLE', 'ALLOWLIST', 'LIVE'].map((item) => (
      <div key={item} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-2 text-[10px] text-deck-muted">
        {item}
      </div>
    ))}
  </div>
</div>
```

- [ ] **Krok 2: Sprawdź ręcznie w przeglądarce**

Uruchom: `npm run dev`, wejdź na <http://localhost:3000/login>

Sprawdź trzy rzeczy:
1. Kliknięcie przycisku otwiera okno Google.
2. Zalogowanie adresem z `DECK_OWNER_EMAIL` przenosi na `/`.
3. Zalogowanie innym adresem pokazuje „To konto nie ma dostępu do DECK" i nie wpuszcza.

- [ ] **Krok 3: Zatwierdź**

```bash
git add app/login/page.tsx
git commit -m "feat(auth): logowanie Google zamiast e-maila i hasla"
```

---

### Zadanie 11: Wskaźnik sesji w nagłówku

**Pliki:**
- Modyfikuj: `components/ui/AuthStatus.tsx`

- [ ] **Krok 1: Przepisz komponent na Firebase**

```tsx
// components/ui/AuthStatus.tsx
'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogIn, LogOut, UserCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth/useAuth'

export function AuthStatus() {
  const router = useRouter()
  const { user, rola, wyloguj } = useAuth()

  if (!user) {
    return (
      <Link href="/login" className="deck-chip flex h-9 items-center gap-2 rounded-lg px-3 text-[11px] text-deck-muted transition hover:text-deck-text">
        <LogIn size={14} />
        Zaloguj
      </Link>
    )
  }

  async function wyjdz() {
    await wyloguj()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="deck-chip flex h-9 items-center gap-2 rounded-lg px-2">
      <UserCircle size={15} className="text-deck-accent" />
      <span className="max-w-[150px] truncate text-[10px] text-deck-muted">{user.email}</span>
      {rola && (
        <span className="rounded border border-deck-accent/30 bg-deck-accent/10 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-deck-accent">
          {rola}
        </span>
      )}
      <button
        type="button"
        onClick={wyjdz}
        className="grid h-6 w-6 place-items-center rounded-md text-deck-muted transition hover:bg-white/8 hover:text-deck-text"
        title="Wyloguj"
      >
        <LogOut size={13} />
      </button>
    </div>
  )
}
```

- [ ] **Krok 2: Zatwierdź**

```bash
git add components/ui/AuthStatus.tsx
git commit -m "feat(auth): wskaznik sesji z rola w nagłowku"
```

---

## Faza C — przełączenie tras na arkusz

### Zadanie 12: Trasa rekrutacji

**Pliki:**
- Modyfikuj: `app/api/rekrutacje/route.ts`
- Test: `app/api/rekrutacje/route.test.ts`

Wzorzec z tego zadania powtarza się w zadaniu 13 dla trzech pozostałych tras.

- [ ] **Krok 1: Napisz test, który nie przechodzi**

```ts
// app/api/rekrutacje/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const gasList = vi.fn()
const gasWrite = vi.fn()
const ktoPyta = vi.fn()

vi.mock('@/lib/gas/client', () => ({
  gasList: (...a: unknown[]) => gasList(...a),
  gasWrite: (...a: unknown[]) => gasWrite(...a),
  GasError: class extends Error { kod = 500 },
}))
vi.mock('@/lib/auth/guard', () => ({ ktoPyta: (...a: unknown[]) => ktoPyta(...a) }))
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }))

function zada(body: unknown) {
  return { json: () => Promise.resolve(body) } as never
}

describe('/api/rekrutacje', () => {
  beforeEach(() => {
    vi.resetModules()
    gasList.mockReset()
    gasWrite.mockReset()
    ktoPyta.mockReset()
  })

  it('GET zwraca wiersze z arkusza', async () => {
    gasList.mockResolvedValue([{ id: '1', edycja: "J'25" }])
    const { GET } = await import('@/app/api/rekrutacje/route')
    const res = await GET()
    expect(await res.json()).toEqual([{ id: '1', edycja: "J'25" }])
    expect(gasList).toHaveBeenCalledWith('rekrutacje')
  })

  it('POST bez sesji zwraca 401', async () => {
    ktoPyta.mockResolvedValue(null)
    const { POST } = await import('@/app/api/rekrutacje/route')
    const res = await POST(zada({ edycja: "J'26", sezon: 'jesien', rok: 2026, zgloszenia: 1, przyjeci: 1 }))
    expect(res.status).toBe(401)
    expect(gasWrite).not.toHaveBeenCalled()
  })

  it('POST z rolą board zwraca 403', async () => {
    ktoPyta.mockResolvedValue({ uid: 'u2', email: 'z@e.com', rola: 'board' })
    const { POST } = await import('@/app/api/rekrutacje/route')
    const res = await POST(zada({ edycja: "J'26", sezon: 'jesien', rok: 2026, zgloszenia: 1, przyjeci: 1 }))
    expect(res.status).toBe(403)
    expect(gasWrite).not.toHaveBeenCalled()
  })

  it('POST z brakiem pól zwraca 400', async () => {
    ktoPyta.mockResolvedValue({ uid: 'u1', email: 'a@b.c', rola: 'owner' })
    const { POST } = await import('@/app/api/rekrutacje/route')
    expect((await POST(zada({ edycja: "J'26" }))).status).toBe(400)
  })

  it('POST z rolą owner zapisuje przez upsert i zwraca 201', async () => {
    ktoPyta.mockResolvedValue({ uid: 'u1', email: 'a@b.c', rola: 'owner' })
    gasWrite.mockResolvedValue([{ id: 'x', edycja: "J'26" }])
    const { POST } = await import('@/app/api/rekrutacje/route')
    const res = await POST(zada({ edycja: "J'26", sezon: 'jesien', rok: 2026, zgloszenia: 90, przyjeci: 30 }))
    expect(res.status).toBe(201)
    expect(gasWrite).toHaveBeenCalledWith('rekrutacje', 'upsert', [
      { edycja: "J'26", sezon: 'jesien', rok: 2026, zgloszenia: 90, przyjeci: 30 },
    ])
  })
})
```

- [ ] **Krok 2: Uruchom test i sprawdź, że nie przechodzi**

Uruchom: `npm test -- app/api/rekrutacje/route.test.ts`
Oczekiwane: FAIL — trasa wciąż woła Supabase

- [ ] **Krok 3: Przepisz trasę**

```ts
// app/api/rekrutacje/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { gasList, gasWrite, GasError } from '@/lib/gas/client'
import { ktoPyta } from '@/lib/auth/guard'

export async function GET() {
  try {
    return NextResponse.json(await gasList('rekrutacje'))
  } catch (e) {
    const kod = e instanceof GasError ? e.kod : 500
    return NextResponse.json({ error: (e as Error).message }, { status: kod })
  }
}

export async function POST(req: NextRequest) {
  const pytajacy = await ktoPyta(req)
  if (!pytajacy) return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })
  if (pytajacy.rola !== 'owner') return NextResponse.json({ error: 'Brak uprawnień do zapisu' }, { status: 403 })

  const body = await req.json()
  const { edycja, sezon, rok, zgloszenia, przyjeci } = body
  if (!edycja || !sezon || !rok || zgloszenia == null || przyjeci == null) {
    return NextResponse.json({ error: 'Brakujące pola' }, { status: 400 })
  }

  try {
    const [wiersz] = await gasWrite('rekrutacje', 'upsert', [{ edycja, sezon, rok, zgloszenia, przyjeci }])
    revalidateTag('analytics')
    return NextResponse.json(wiersz, { status: 201 })
  } catch (e) {
    const kod = e instanceof GasError ? e.kod : 500
    return NextResponse.json({ error: (e as Error).message }, { status: kod })
  }
}
```

- [ ] **Krok 4: Uruchom test i sprawdź, że przechodzi**

Uruchom: `npm test -- app/api/rekrutacje/route.test.ts`
Oczekiwane: PASS, 6 testów

- [ ] **Krok 5: Zatwierdź**

```bash
git add app/api/rekrutacje
git commit -m "feat(gas): trasa rekrutacji czyta i zapisuje do arkusza"
```

---

### Zadanie 13: Pozostałe trasy i usunięcie Supabase

**Pliki:**
- Modyfikuj: `app/api/kohorty/route.ts`, `app/api/kpi/route.ts`, `app/api/czlonkowie/route.ts`
- Usuń: `lib/supabase/` w całości
- Modyfikuj: `package.json`
- Przenieś: `lib/schema.sql`, `lib/migracja-v2.sql` → `docs/archiwum/`

- [ ] **Krok 1: Przepisz trasę kohort**

```ts
// app/api/kohorty/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { gasList, gasWrite, GasError } from '@/lib/gas/client'
import { ktoPyta } from '@/lib/auth/guard'

export async function GET() {
  try {
    return NextResponse.json(await gasList('kohorty'))
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: e instanceof GasError ? e.kod : 500 })
  }
}

export async function POST(req: NextRequest) {
  const pytajacy = await ktoPyta(req)
  if (!pytajacy) return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })
  if (pytajacy.rola !== 'owner') return NextResponse.json({ error: 'Brak uprawnień do zapisu' }, { status: 403 })

  const { edycja, sezon, rok, n_czlonkow, avg_retention_sem, max_retention_sem, in_progress } = await req.json()
  if (!edycja || !sezon || !rok || n_czlonkow == null || avg_retention_sem == null || max_retention_sem == null) {
    return NextResponse.json({ error: 'Brakujące pola' }, { status: 400 })
  }

  try {
    const [wiersz] = await gasWrite('kohorty', 'upsert', [{
      edycja, sezon, rok, n_czlonkow, avg_retention_sem, max_retention_sem,
      in_progress: in_progress ?? false,
    }])
    revalidateTag('analytics')
    return NextResponse.json(wiersz, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: e instanceof GasError ? e.kod : 500 })
  }
}
```

- [ ] **Krok 2: Przepisz trasę KPI**

Zachowaj tryb wsadowy (tablica w treści) i `PATCH` — używa ich `lib/useAnalyticsData.ts`.

```ts
// app/api/kpi/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { gasList, gasWrite, GasError } from '@/lib/gas/client'
import { ktoPyta } from '@/lib/auth/guard'

const POLA = ['kategoria', 'nazwa', 'okres_poprzedni', 'wartosc_poprzednia', 'okres_biezacy', 'wartosc_biezaca'] as const

function kompletny(w: Record<string, unknown>): boolean {
  return POLA.every((p) => w?.[p] !== undefined && w?.[p] !== null && w?.[p] !== '')
}

function wybierz(w: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(POLA.map((p) => [p, w[p]]))
}

async function strażnik(req: NextRequest) {
  const pytajacy = await ktoPyta(req)
  if (!pytajacy) return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })
  if (pytajacy.rola !== 'owner') return NextResponse.json({ error: 'Brak uprawnień do zapisu' }, { status: 403 })
  return null
}

function blad(e: unknown) {
  return NextResponse.json({ error: (e as Error).message }, { status: e instanceof GasError ? e.kod : 500 })
}

export async function GET() {
  try {
    return NextResponse.json(await gasList('kpi'))
  } catch (e) {
    return blad(e)
  }
}

export async function POST(req: NextRequest) {
  const odmowa = await strażnik(req)
  if (odmowa) return odmowa

  const body = await req.json()
  const wchodzace: Record<string, unknown>[] = Array.isArray(body) ? body : [body]
  const poprawne = wchodzace.filter(kompletny).map(wybierz)
  if (!poprawne.length) {
    return NextResponse.json({ error: Array.isArray(body) ? 'Brak prawidłowych wierszy' : 'Brakujące pola' }, { status: 400 })
  }

  try {
    const wiersze = await gasWrite('kpi', 'insert', poprawne)
    revalidateTag('analytics')
    return NextResponse.json(Array.isArray(body) ? wiersze : wiersze[0], { status: 201 })
  } catch (e) {
    return blad(e)
  }
}

export async function PATCH(req: NextRequest) {
  const odmowa = await strażnik(req)
  if (odmowa) return odmowa

  const body = await req.json()
  if (!body?.id) return NextResponse.json({ error: 'Brak id' }, { status: 400 })

  const zmiany: Record<string, unknown> = { id: body.id }
  POLA.forEach((p) => { if (body[p] !== undefined) zmiany[p] = body[p] })

  try {
    const [wiersz] = await gasWrite('kpi', 'update', [zmiany])
    revalidateTag('analytics')
    return NextResponse.json(wiersz)
  } catch (e) {
    return blad(e)
  }
}
```

- [ ] **Krok 3: Przepisz trasę członków**

Ta trasa wymaga logowania **także do odczytu** — to nazwiska, nie liczby. Odczyt jest dostępny
dla obu ról; zapis, jak wszędzie, tylko dla `owner`.

```ts
// app/api/czlonkowie/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { gasList, gasWrite, GasError } from '@/lib/gas/client'
import { ktoPyta } from '@/lib/auth/guard'

function blad(e: unknown) {
  return NextResponse.json({ error: (e as Error).message }, { status: e instanceof GasError ? e.kod : 500 })
}

export async function GET(req: NextRequest) {
  if (!(await ktoPyta(req))) return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })
  try {
    return NextResponse.json(await gasList('czlonkowie'))
  } catch (e) {
    return blad(e)
  }
}

export async function POST(req: NextRequest) {
  const pytajacy = await ktoPyta(req)
  if (!pytajacy) return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })
  if (pytajacy.rola !== 'owner') return NextResponse.json({ error: 'Brak uprawnień do zapisu' }, { status: 403 })

  const { kohorta_edycja, imie_nazwisko, status, aktywnosc } = await req.json()
  if (!kohorta_edycja || !imie_nazwisko) return NextResponse.json({ error: 'Brakujące pola' }, { status: 400 })

  try {
    const [wiersz] = await gasWrite('czlonkowie', 'insert', [{
      kohorta_edycja, imie_nazwisko, status: status ?? 'aktywny', aktywnosc: aktywnosc ?? [],
    }])
    revalidateTag('analytics')
    return NextResponse.json(wiersz, { status: 201 })
  } catch (e) {
    return blad(e)
  }
}

export async function PATCH(req: NextRequest) {
  const pytajacy = await ktoPyta(req)
  if (!pytajacy) return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })
  if (pytajacy.rola !== 'owner') return NextResponse.json({ error: 'Brak uprawnień do zapisu' }, { status: 403 })

  const body = await req.json()
  if (!body?.id) return NextResponse.json({ error: 'Brak id' }, { status: 400 })

  const zmiany: Record<string, unknown> = { id: body.id }
  ;(['imie_nazwisko', 'status', 'aktywnosc'] as const).forEach((p) => {
    if (body[p] !== undefined) zmiany[p] = body[p]
  })

  try {
    const [wiersz] = await gasWrite('czlonkowie', 'update', [zmiany])
    revalidateTag('analytics')
    return NextResponse.json(wiersz)
  } catch (e) {
    return blad(e)
  }
}
```

- [ ] **Krok 4: Usuń Supabase**

```bash
git rm -r lib/supabase
mkdir -p docs/archiwum
git mv lib/schema.sql docs/archiwum/schema.sql
git mv lib/migracja-v2.sql docs/archiwum/migracja-v2.sql
npm uninstall @supabase/ssr @supabase/supabase-js
```

- [ ] **Krok 5: Sprawdź, że nic nie zostało**

Uruchom: `grep -rn "supabase" app components lib types --include="*.ts" --include="*.tsx"`
Oczekiwane: brak wyników

Uruchom: `npx tsc --noEmit`
Oczekiwane: brak błędów

- [ ] **Krok 6: Uruchom cały zestaw testów**

Uruchom: `npm test`
Oczekiwane: wszystkie przechodzą — łącznie z nietkniętymi `lib/stats.*.test.ts`

- [ ] **Krok 7: Zatwierdź**

```bash
git add -A
git commit -m "feat(gas): pozostale trasy na arkuszu, usuniecie Supabase"
```

---

## Faza D — kokpit

### Zadanie 14: Przeniesienie modułów pod `/analytics`

**Pliki:**
- Przenieś: `app/{rekrutacje,retencja,czlonkowie,kpi,lejek,korelacje,prognozy,alerty,wpis}` → `app/analytics/…`
- Przenieś: `app/page.tsx` → `app/analytics/page.tsx`
- Utwórz: `app/analytics/layout.tsx`
- Modyfikuj: `app/layout.tsx`, `components/ui/Sidebar.tsx`, `components/ui/AppShell.tsx`

- [ ] **Krok 1: Przenieś pliki**

```bash
mkdir -p app/analytics
git mv app/page.tsx app/analytics/page.tsx
for m in rekrutacje retencja czlonkowie kpi lejek korelacje prognozy alerty wpis; do
  git mv "app/$m" "app/analytics/$m"
done
```

- [ ] **Krok 2: Przenieś powłokę do układu analityki**

```tsx
// app/analytics/layout.tsx
import type { ReactNode } from 'react'
import { AppShell } from '@/components/ui/AppShell'

export default function AnalyticsLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>
}
```

Z `app/layout.tsx` usuń `AppShell` — kokpit ma własną powłokę:

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DECK',
  description: 'Prywatne centrum dowodzenia — analityka SSUEW, planer semestru, zadania i strony',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className="antialiased">{children}</body>
    </html>
  )
}
```

W `components/ui/AppShell.tsx` usuń gałąź `if (pathname === '/login')` — logowanie nie przechodzi
już przez tę powłokę. Usuń też nieużywany import `usePathname`.

- [ ] **Krok 3: Zaktualizuj nawigację**

W `components/ui/Sidebar.tsx` podmień stałą `NAV`:

```tsx
export const NAV = [
  { href: '/analytics', label: 'Przegląd', icon: LayoutDashboard },
  { href: '/analytics/rekrutacje', label: 'Rekrutacje', icon: BarChart3 },
  { href: '/analytics/retencja', label: 'Retencja', icon: Activity },
  { href: '/analytics/czlonkowie', label: 'Członkowie', icon: Users },
  { href: '/analytics/kpi', label: 'KPI', icon: LineChart },
  { href: '/analytics/lejek', label: 'Lejek', icon: GitBranch },
  { href: '/analytics/korelacje', label: 'Korelacje', icon: Brain },
  { href: '/analytics/prognozy', label: 'Prognozy', icon: Sparkles },
  { href: '/analytics/alerty', label: 'Alerty', icon: AlertTriangle },
] as const
```

Nad listą, wewnątrz `<aside>` tuż po karcie z logo, dodaj powrót do kokpitu:

```tsx
<Link
  href="/"
  className="deck-row mb-1 flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-deck-muted transition hover:text-deck-text"
>
  <ArrowLeft size={14} />
  DECK
</Link>
```

Dopisz `ArrowLeft` do importu z `lucide-react`.

- [ ] **Krok 4: Popraw ścieżki zaszyte w `lib/stats.ts`**

To jest miejsce, w którym najłatwiej zostawić zepsute odnośniki: alerty i wnioski wykonawcze
niosą własne `href` jako **literały w obiektach**, więc szukanie po `href="` ich nie znajdzie.
Bez tej poprawki każdy alert prowadziłby po migracji na stronę 404.

Uruchom: `grep -n "href: '/" lib/stats.ts`
Oczekiwane: 9 trafień w liniach 554, 556, 569, 579, 597, 750, 762, 774, 786.

Popraw wszystkie dziewięć — `'/kpi'` → `'/analytics/kpi'`, `'/retencja'` → `'/analytics/retencja'`,
`'/rekrutacje'` → `'/analytics/rekrutacje'`, `'/lejek'` → `'/analytics/lejek'`:

```bash
sed -i "s|href: '/kpi'|href: '/analytics/kpi'|g;
        s|href: '/retencja'|href: '/analytics/retencja'|g;
        s|href: '/rekrutacje'|href: '/analytics/rekrutacje'|g;
        s|href: '/lejek'|href: '/analytics/lejek'|g" lib/stats.ts
```

Sprawdź: `grep -c "href: '/analytics/" lib/stats.ts` → oczekiwane `9`.

To jedyna zmiana w `lib/stats.ts` w całym etapie. Nie dotyka żadnego obliczenia — wyłącznie
adresy, pod które prowadzą alerty.

- [ ] **Krok 5: Popraw pozostałe odnośniki w JSX**

Uruchom: `grep -rn 'href="/' app components | grep -v "/login\|/analytics"`
Oczekiwane: jedno trafienie — `components/ui/Sidebar.tsx` z `href="/wpis"`. Zmień na
`href="/analytics/wpis"`.

- [ ] **Krok 6: Popraw testy, które asertują stare ścieżki**

Trzy asercje w `lib/stats.alerts.test.ts` i dwie w `components/ui/Sidebar.test.tsx` sprawdzają
adresy sprzed przenosin. Zmień oczekiwane wartości na nowe:

```ts
// lib/stats.alerts.test.ts — linie 22, 27, 37
expect(crit!.href).toBe('/analytics/kpi')
expect(alerts.some((a) => a.severity === 'warning' && a.href === '/analytics/kpi')).toBe(true)
expect(buildAlerts([], cohorts, []).some((a) => a.href === '/analytics/retencja')).toBe(true)
```

```ts
// components/ui/Sidebar.test.tsx — linie 28, 29
expect(screen.getByRole('link', { name: /Rekrutacje/ })).toHaveAttribute('href', '/analytics/rekrutacje')
expect(screen.getByRole('link', { name: /Wpisz dane/ })).toHaveAttribute('href', '/analytics/wpis')
```

- [ ] **Krok 7: Sprawdź testy i typy**

Uruchom: `npm test && npx tsc --noEmit`
Oczekiwane: wszystko przechodzi

- [ ] **Krok 6: Zatwierdź**

```bash
git add -A
git commit -m "refactor(deck): moduly analityczne przenosza sie pod /analytics"
```

---

### Zadanie 15: Kafelek kokpitu

**Pliki:**
- Utwórz: `components/deck/DeckTile.tsx`
- Test: `components/deck/DeckTile.test.tsx`

- [ ] **Krok 1: Napisz test, który nie przechodzi**

```tsx
// components/deck/DeckTile.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { DeckTile } from '@/components/deck/DeckTile'

describe('DeckTile', () => {
  it('kafelek żywy jest odnośnikiem do modułu', () => {
    render(<DeckTile stan="zywy" href="/analytics" etykieta="moduł 01" tytul="SSUEW Analytics">treść</DeckTile>)
    expect(screen.getByRole('link', { name: /SSUEW Analytics/ })).toHaveAttribute('href', '/analytics')
  })

  it('kafelek zablokowany nie jest odnośnikiem', () => {
    render(<DeckTile stan="zablokowany" href="/strony" etykieta="moduł 04" tytul="Strony">treść</DeckTile>)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('Strony')).toBeInTheDocument()
  })

  it('kafelek zablokowany pokazuje etap, w którym powstanie', () => {
    render(<DeckTile stan="zablokowany" href="/orbita" etykieta="moduł 03" tytul="Orbita" wkrotce="etap 2">x</DeckTile>)
    expect(screen.getByText('etap 2')).toBeInTheDocument()
  })

  it('rozciąga się na dwie kolumny przy span=2', () => {
    const { container } = render(<DeckTile stan="zywy" href="/a" etykieta="e" tytul="t" span={2}>x</DeckTile>)
    expect(container.firstElementChild?.className).toContain('col-span-2')
  })

  it('pokazuje odznakę, gdy została podana', () => {
    render(<DeckTile stan="zywy" href="/a" etykieta="e" tytul="t" odznaka="2 alerty">x</DeckTile>)
    expect(screen.getByText('2 alerty')).toBeInTheDocument()
  })
})
```

- [ ] **Krok 2: Uruchom test i sprawdź, że nie przechodzi**

Uruchom: `npm test -- components/deck/DeckTile.test.tsx`
Oczekiwane: FAIL — `Cannot find module '@/components/deck/DeckTile'`

- [ ] **Krok 3: Napisz implementację**

```tsx
// components/deck/DeckTile.tsx
'use client'
import type { ReactNode, PointerEvent } from 'react'
import Link from 'next/link'

export type StanKafelka = 'zywy' | 'zablokowany'

type Props = {
  stan: StanKafelka
  href: string
  etykieta: string
  tytul: string
  odznaka?: string
  wkrotce?: string
  span?: 1 | 2
  rows?: 1 | 2
  children: ReactNode
}

const spanClass = { 1: '', 2: 'col-span-2' } as const
const rowsClass = { 1: '', 2: 'row-span-2' } as const

/**
 * Poświata idzie za kursorem przez zmienne CSS, nie przez stan Reacta —
 * ruch myszy nie może powodować przerysowania drzewa.
 */
function sledzKursor(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
  el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
}

export function DeckTile({ stan, href, etykieta, tytul, odznaka, wkrotce, span = 1, rows = 1, children }: Props) {
  const uklad = `${spanClass[span]} ${rowsClass[rows]}`.trim()

  const naglowek = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-deck-muted/70">{etykieta}</div>
        <h2 className="mt-1 text-[17px] font-semibold leading-tight tracking-[-0.015em] text-deck-text text-balance">{tytul}</h2>
      </div>
      {odznaka && (
        <span className="deck-chip flex-none rounded-full px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-deck-accent">
          {odznaka}
        </span>
      )}
      {wkrotce && (
        <span className="flex-none font-mono text-[9.5px] uppercase tracking-[0.14em] text-deck-muted/60">{wkrotce}</span>
      )}
    </div>
  )

  if (stan === 'zablokowany') {
    return (
      <section className={`${uklad} deck-tile-locked rounded-lg p-[18px] flex flex-col gap-3`}>
        {naglowek}
        <div className="flex-1 text-deck-muted/70">{children}</div>
      </section>
    )
  }

  return (
    <Link
      href={href}
      onPointerMove={sledzKursor}
      className={`${uklad} deck-card deck-tile group flex flex-col gap-3 rounded-lg p-[18px] no-underline`}
    >
      <div className="relative z-10 flex flex-1 flex-col gap-3">
        {naglowek}
        <div className="flex-1">{children}</div>
      </div>
    </Link>
  )
}
```

- [ ] **Krok 4: Dopisz style kafelka do `app/globals.css`**

```css
/* Poświata podążająca za kursorem — pozycję ustawia DeckTile przez --mx/--my. */
.deck-tile::after {
  content: "";
  position: absolute;
  inset: -1px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 240ms ease;
  background: radial-gradient(340px circle at var(--mx, 50%) var(--my, 50%), rgba(46, 230, 166, 0.13), transparent 68%);
  animation: none;
}

.deck-tile:hover::after,
.deck-tile:focus-visible::after {
  opacity: 1;
}

.deck-tile-locked {
  border: 1px dashed rgba(148, 163, 184, 0.16);
  background: rgba(255, 255, 255, 0.016);
}
```

Uwaga: `.deck-card::after` obsługuje już obracającą się obwódkę. Klasa `.deck-tile` nadpisuje
`animation` i `background` na tym samym pseudoelemencie — dlatego w kafelkach widać poświatę
zamiast obwódki, a nie obie naraz.

- [ ] **Krok 5: Uruchom test i sprawdź, że przechodzi**

Uruchom: `npm test -- components/deck/DeckTile.test.tsx`
Oczekiwane: PASS, 6 testów

- [ ] **Krok 6: Zatwierdź**

```bash
git add components/deck app/globals.css
git commit -m "feat(deck): kafelek kokpitu ze stanami zywy i zablokowany"
```

---

### Zadanie 16: Kokpit

**Pliki:**
- Utwórz: `components/deck/DeckHub.tsx`, `app/page.tsx`
- Test: `components/deck/DeckHub.test.tsx`

- [ ] **Krok 1: Napisz test, który nie przechodzi**

```tsx
// components/deck/DeckHub.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { DeckHub } from '@/components/deck/DeckHub'

const dane = { konwersja: 61.1, retencja: 3.81, kpiWzrosty: 20, kpiRazem: 28, alerty: 2 }

describe('DeckHub', () => {
  it('pokazuje kafelek Analytics jako odnośnik', () => {
    render(<DeckHub rola="owner" email="ja@e.com" dane={dane} />)
    expect(screen.getByRole('link', { name: /SSUEW Analytics/ })).toHaveAttribute('href', '/analytics')
  })

  it('pokazuje Orbitę właścicielowi', () => {
    render(<DeckHub rola="owner" email="ja@e.com" dane={dane} />)
    expect(screen.getByText('Orbita')).toBeInTheDocument()
  })

  it('ukrywa Orbitę przed zarządem — nie wyszarza, tylko nie renderuje', () => {
    render(<DeckHub rola="board" email="z@e.com" dane={dane} />)
    expect(screen.queryByText('Orbita')).toBeNull()
  })

  it('pokazuje liczbę alertów na kafelku Analytics', () => {
    render(<DeckHub rola="owner" email="ja@e.com" dane={dane} />)
    expect(screen.getByText('2 alerty')).toBeInTheDocument()
  })
})
```

- [ ] **Krok 2: Uruchom test i sprawdź, że nie przechodzi**

Uruchom: `npm test -- components/deck/DeckHub.test.tsx`
Oczekiwane: FAIL — `Cannot find module '@/components/deck/DeckHub'`

- [ ] **Krok 3: Napisz implementację**

```tsx
// components/deck/DeckHub.tsx
'use client'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { LogoMark } from '@/components/ui/LogoMark'
import { DeckTile } from './DeckTile'
import type { Rola } from '@/lib/auth/role'

export interface DaneKokpitu {
  konwersja: number
  retencja: number
  kpiWzrosty: number
  kpiRazem: number
  alerty: number
}

type Props = { rola: Rola; email: string; dane: DaneKokpitu }

export function DeckHub({ rola, email, dane }: Props) {
  const dzis = new Date().toLocaleDateString('pl-PL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="mx-auto flex min-h-screen max-w-[1360px] flex-col gap-7 p-[clamp(16px,2.4vw,34px)]">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-white/8 pb-[18px]">
        <div className="flex items-center gap-3.5">
          <LogoMark />
          <div>
            <h1 className="text-[27px] font-extrabold leading-none tracking-[0.26em] text-deck-text">DECK</h1>
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-deck-muted/70">
              prywatne centrum dowodzenia
            </p>
          </div>
        </div>
        <div className="text-right font-mono text-[11.5px] text-deck-muted">
          <div className="flex items-center justify-end gap-2">
            <span className="text-deck-text">{email}</span>
            <span className="rounded-full border border-deck-accent/34 bg-deck-accent/10 px-2 py-0.5 text-[9.5px] uppercase tracking-[0.16em] text-deck-accent">
              {rola}
            </span>
          </div>
          <div className="mt-1.5 text-[10.5px] uppercase tracking-[0.12em] text-deck-muted/70">{dzis}</div>
        </div>
      </header>

      <main className="grid flex-1 auto-rows-[minmax(168px,auto)] grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DeckTile
          stan="zywy"
          href="/analytics"
          etykieta="moduł 01 · analityka"
          tytul="SSUEW Analytics"
          odznaka={dane.alerty > 0 ? `${dane.alerty} alerty` : undefined}
          span={2}
          rows={2}
        >
          <div className="flex h-full flex-col justify-between gap-4">
            <div className="flex items-baseline gap-2.5 tabular-nums">
              {/* AnimatedNumber renderuje własny <span> i nie przyjmuje className — styl idzie na opakowanie. */}
              <span className="text-[clamp(30px,3.4vw,46px)] font-bold leading-none tracking-[-0.035em]">
                <AnimatedNumber value={dane.konwersja} decimals={1} />
              </span>
              <span className="text-[13px] font-medium text-deck-muted">% konwersji</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5 border-t border-white/8 pt-3.5">
              <Statystyka etykieta="retencja" wartosc={dane.retencja} miejsca={2} jednostka="sem." />
              <Statystyka etykieta="KPI r/r" wartosc={dane.kpiWzrosty} miejsca={0} jednostka={`/ ${dane.kpiRazem} wzrostów`} />
              <Statystyka etykieta="alerty" wartosc={dane.alerty} miejsca={0} jednostka="otwarte" />
            </div>
          </div>
        </DeckTile>

        <DeckTile stan="zablokowany" href="/planer" etykieta="moduł 02 · kalendarz" tytul="Planer semestru" wkrotce="etap 3">
          <p className="text-[12px] leading-relaxed">Kalendarz semestru z wykrywaniem kolizji osób i sal.</p>
        </DeckTile>

        {rola === 'owner' && (
          <DeckTile stan="zablokowany" href="/orbita" etykieta="moduł 03 · zadania" tytul="Orbita" wkrotce="etap 2">
            <p className="text-[12px] leading-relaxed">Radar zadań — bliżej środka znaczy pilniej.</p>
          </DeckTile>
        )}

        <DeckTile stan="zablokowany" href="/strony" etykieta="moduł 04 · search console" tytul="Strony" wkrotce="etap 4">
          <p className="text-[12px] leading-relaxed">Kliknięcia, wyświetlenia i pozycje nadzorowanych witryn.</p>
        </DeckTile>
      </main>

      <footer className="flex flex-wrap items-center gap-5 border-t border-white/8 pt-3.5 font-mono text-[10.5px] tracking-[0.06em] text-deck-muted/70">
        <span className="inline-flex items-center gap-2">
          <i className="h-1.5 w-1.5 rounded-full bg-deck-accent shadow-[0_0_9px_var(--color-deck-accent)]" />
          <b className="font-medium text-deck-muted">arkusz</b> podłączony
        </span>
        <span className="inline-flex items-center gap-2">
          <i className="h-1.5 w-1.5 rounded-full bg-deck-accent shadow-[0_0_9px_var(--color-deck-accent)]" />
          <b className="font-medium text-deck-muted">sesja</b> Google, aktywna
        </span>
      </footer>
    </div>
  )
}

function Statystyka({ etykieta, wartosc, miejsca, jednostka }: { etykieta: string; wartosc: number; miejsca: number; jednostka: string }) {
  return (
    <div>
      <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-deck-muted/70">{etykieta}</div>
      <div className="mt-1.5 text-[19px] font-semibold tracking-[-0.02em] tabular-nums text-deck-text">
        <AnimatedNumber value={wartosc} decimals={miejsca} />
        <span className="ml-1 text-[11px] font-medium text-deck-muted">{jednostka}</span>
      </div>
    </div>
  )
}
```

- [ ] **Krok 4: Napisz stronę kokpitu**

Kokpit nie liczy niczego sam — konwersję i retencję bierze z `computeOverview`, a alerty
z `buildAlerts`. Te same funkcje zasilają moduły, więc liczba na kafelku nie może się rozjechać
z liczbą w środku modułu.

```tsx
// app/page.tsx
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { zweryfikujToken } from '@/lib/auth/verify'
import { rolaDla } from '@/lib/auth/role'
import { gasList } from '@/lib/gas/client'
import { computeOverview } from '@/lib/overview'
import { buildAlerts } from '@/lib/stats'
import { DeckHub } from '@/components/deck/DeckHub'

export default async function KokpitPage() {
  const token = (await cookies()).get('deck_session')?.value ?? ''
  const tozsamosc = await zweryfikujToken(token)
  const rola = rolaDla(tozsamosc?.email)
  if (!tozsamosc || !rola) redirect('/login')

  // Awaria arkusza nie może zabrać całego kokpitu — kafelek pokaże zera,
  // a pozostałe moduły dalej działają.
  const [rekrutacje, kohorty, kpi] = await Promise.all([
    gasList('rekrutacje').catch(() => []),
    gasList('kohorty').catch(() => []),
    gasList('kpi').catch(() => []),
  ])

  // Trzeci argument to KpiPeriod[], którego aplikacja nie pobiera — tak samo
  // wywołuje to OverviewClient.
  const m = computeOverview(rekrutacje, kohorty, [])
  const konwersja =
    m.lastApplications && m.lastApplications > 0 && m.lastAccepted != null
      ? (m.lastAccepted / m.lastApplications) * 100
      : 0

  return (
    <DeckHub
      rola={rola}
      email={tozsamosc.email}
      dane={{
        konwersja,
        retencja: m.histRetention ?? 0,
        kpiWzrosty: kpi.filter((x) => x.wartosc_biezaca > x.wartosc_poprzednia).length,
        kpiRazem: kpi.length,
        alerty: buildAlerts(rekrutacje, kohorty, kpi).length,
      }}
    />
  )
}
```

- [ ] **Krok 5: Uruchom testy i sprawdź w przeglądarce**

Uruchom: `npm test -- components/deck/DeckHub.test.tsx`
Oczekiwane: PASS, 4 testy

Uruchom: `npm run dev` i wejdź na <http://localhost:3000>

Sprawdź: kafelki wjeżdżają kaskadą, poświata idzie za kursorem po kafelku Analytics, liczby
dojeżdżają do wartości, kliknięcie kafelka prowadzi do `/analytics`, a „← DECK" w bocznym pasku
wraca do kokpitu.

- [ ] **Krok 6: Zatwierdź**

```bash
git add app/page.tsx components/deck
git commit -m "feat(deck): kokpit z kafelkami modulow"
```

---

### Zadanie 17: Kaskada wejścia i ograniczony ruch

**Pliki:**
- Modyfikuj: `app/globals.css`, `components/deck/DeckHub.tsx`

Ten krok domyka wymaganie dostępności z projektu: dziś część animacji chodzi w nieskończonej
pętli, a `prefers-reduced-motion` nie jest w ogóle obsługiwane.

- [ ] **Krok 1: Dopisz kaskadę wejścia do `app/globals.css`**

```css
/* Kafelki wjeżdżają po kolei — kolejność prowadzi wzrok od największego do najmniejszego. */
.deck-tile,
.deck-tile-locked {
  animation: deck-rise 640ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.deck-tile:nth-child(1),  .deck-tile-locked:nth-child(1)  { animation-delay: 0ms; }
.deck-tile:nth-child(2),  .deck-tile-locked:nth-child(2)  { animation-delay: 90ms; }
.deck-tile:nth-child(3),  .deck-tile-locked:nth-child(3)  { animation-delay: 170ms; }
.deck-tile:nth-child(4),  .deck-tile-locked:nth-child(4)  { animation-delay: 250ms; }
.deck-tile:nth-child(5),  .deck-tile-locked:nth-child(5)  { animation-delay: 330ms; }
```

- [ ] **Krok 2: Dopisz obsługę ograniczonego ruchu na końcu `app/globals.css`**

```css
/*
  Bez tego „mnóstwo animacji" zamienia się w interfejs, który u części osób
  wywołuje mdłości — a kilka animacji w tym pliku chodzi w nieskończonej pętli.
*/
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Krok 3: Sprawdź, że ustawienie działa**

W Chrome: DevTools → Ctrl+Shift+P → „Emulate CSS prefers-reduced-motion: reduce". Odśwież `/`.

Oczekiwane: kafelki są od razu na miejscu, nic nie pulsuje ani nie krąży, a wszystko pozostaje
czytelne i klikalne.

- [ ] **Krok 4: Uruchom pełną weryfikację**

```bash
npm test && npx tsc --noEmit && npm run lint && npm run build
```

Oczekiwane: wszystko przechodzi, build kończy się sukcesem.

- [ ] **Krok 5: Zatwierdź**

```bash
git add app/globals.css components/deck
git commit -m "feat(deck): kaskada wejscia kafelkow i obsluga prefers-reduced-motion"
```

---

### Zadanie 18: Dokumentacja

**Pliki:**
- Modyfikuj: `README.md`
- Utwórz: `.env.example`

- [ ] **Krok 1: Utwórz `.env.example`**

```env
# Warstwa danych — Arkusze Google przez Apps Script (apps-script/README.md)
GAS_URL=
GAS_TOKEN=

# Lista dostępu. Owner zapisuje wszędzie; board czyta Analytics i pracuje w Plannerze.
DECK_OWNER_EMAIL=
DECK_BOARD_EMAILS=

# Firebase — Authentication z dostawcą Google
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
```

- [ ] **Krok 2: Zaktualizuj `README.md`**

Zmień tytuł na `# DECK` i opis na centrum dowodzenia z modułami. W sekcji stacku wymień Firebase
Auth i Arkusze Google zamiast Supabase. Sekcję „Konfiguracja Supabase" zastąp odnośnikami do
`apps-script/README.md` i `.env.example`. W strukturze projektu dopisz `app/analytics/`,
`components/deck/`, `lib/gas/`, `lib/auth/` i `apps-script/`. Usuń wzmianki o `lib/schema.sql`
(plik jest teraz w `docs/archiwum/`).

- [ ] **Krok 3: Zatwierdź**

```bash
git add README.md .env.example
git commit -m "docs(deck): README i .env.example po migracji z Supabase"
```

---

## Po wykonaniu

Uruchom pełną weryfikację i dopiero potem mów, że gotowe:

```bash
npm test && npx tsc --noEmit && npm run lint && npm run build
```

Ręcznie sprawdź pięć rzeczy:

1. Wejście na `/` bez sesji przenosi na `/login`.
2. Logowanie adresem właściciela wpuszcza do kokpitu; obcym — odmawia z komunikatem.
3. Kafelek Analytics prowadzi do `/analytics`, a „← DECK" wraca.
4. Formularz w `/analytics/wpis` zapisuje wiersz, który po chwili widać w arkuszu.
5. Po zapisie liczby na kokpicie i w modułach są nowe — bez czekania pięciu minut na cache.

Wtedy: `superpowers:finishing-a-development-branch`.

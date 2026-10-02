# Planer — Sesje Operacyjne do końca: plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Cel:** zarząd na kodzie wchodzi do DECK i uczestniczy w Sesji Operacyjnej, a kalendarz zyskuje rangę kategorii, wydarzenia wielodniowe i od–do, budynki, Skład zarządu i eksport miesiąca do .xlsx.

**Architektura:** model wydarzenia rozszerzony o opcjonalne pola, tłumaczone przy odczycie (`naWydarzenie`) — bez migracji danych. Czysta logika w `lib/planer/` (trwanie, kolizje, pasy, walidacja, eksport) z testami; komponenty tylko ją wyświetlają. Zarząd zapisuje wyłącznie przez `/api/planer`, które samo sprawdza sesję i waliduje dane.

**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, Firestore (klient + Admin SDK), Vitest + Testing Library, ExcelJS (nowa zależność, ładowana dynamicznie).

**Spec:** [docs/superpowers/specs/2026-10-02-planer-sesje-operacyjne-design.md](../specs/2026-10-02-planer-sesje-operacyjne-design.md)

**Konwencje repo:** komentarze i nazwy po polsku; commity `typ(zakres): opis` bez polskich znaków w temacie, zakończone linią `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Testy: `npx vitest run <plik>`. Typy: `npx tsc --noEmit`. Lint: `npx eslint .`.

---

## Mapa plików

| Plik | Odpowiedzialność | Zadanie |
|---|---|---|
| `lib/auth/guard.ts` | `ktoZCiasteczek` — rozpoznanie obu dróg wejścia z wartości ciasteczek | 1 |
| `lib/auth/naStronie.ts` | NOWY — `ktoNaStronie()` dla stron serwerowych | 1 |
| `lib/planer/semestry.ts` | `biezacySemestr(data)` | 2 |
| `lib/planer/stan.ts` | NOWY — czyste mapowania stanu sesji i Składu, opis trwania | 3 |
| `lib/planer/obraz.ts` | NOWY — serwerowy odczyt obrazu Planera (Admin SDK) | 4 |
| `lib/firebase/admin.ts` | `ustawieniaRef` | 4 |
| `app/api/planer/route.ts` | GET zwraca obraz; POST `dodaj`/`zmien`; walidacja | 4, 10 |
| `app/page.tsx`, `app/planer/page.tsx` | obie drogi wejścia, bieżący semestr, pierwszy obraz | 5, 20 |
| `components/planer/PlanerClient.tsx` | odpytywanie, ścieżki zapisu, Skład, eksport | 5, 11, 12, 14, 17, 19 |
| `lib/planer/budynki.ts` | NOWY — lista budynków | 6 |
| `lib/planer/typy.ts` | sześć kategorii z rangą i kolorem do druku, nowe pola | 6 |
| `lib/planer/mapowanie.ts` | tłumaczenie starych dokumentów | 6 |
| `lib/planer/trwanie.ts` | NOWY — daty, rozwinięcie na dni, nachodzenie na miesiąc | 7 |
| `lib/planer/kolizje.ts` | rozwinięcie na dni, przedziały, całodniowe, klucz miejsca | 8 |
| `lib/planer/walidacja.ts` | NOWY — `sprawdzWydarzenie` | 9 |
| `lib/planer/serwer.ts` | `dodajPrzezSerwer`, `zmienPrzezSerwer` | 10 |
| `lib/planer/sklad.ts` | NOWY — subskrypcja i zapis Składu (klient) | 12 |
| `components/planer/Sklad.tsx` | NOWY — edycja Składu | 12 |
| `firestore.rules` | blok `ustawienia` | 12 |
| `components/planer/WyborOsob.tsx` | NOWY — wybór osób przyciskami | 13 |
| `components/planer/PanelWydarzenia.tsx` | formularz z nowymi polami | 6, 11, 14 |
| `lib/planer/opis.ts` | NOWY — opis czasu, miejsca, osób; kolejność w kratce | 15 |
| `components/planer/KartaWydarzenia.tsx` | wygląd rangi, druga linijka | 15 |
| `lib/planer/pasy.ts` | NOWY — tygodnie miesiąca, odcinki i pasy wielodniowych | 16 |
| `components/planer/PasekWielodniowy.tsx` | NOWY | 17 |
| `components/planer/WidokMiesiaca.tsx` | rzędy tygodni, paski, legenda, kolejność rangi | 8, 17 |
| `components/planer/WidokSemestru.tsx` | wielodniowe w każdym miesiącu | 8 |
| `lib/planer/eksport.ts` | NOWY — struktura arkuszy | 18 |
| `components/planer/PobierzMiesiac.tsx` | NOWY — budowa i pobranie .xlsx | 19 |
| `components/deck/DeckHub.tsx` | baner sesji | 20 |

---

# FAZA 0 — zarząd na kodzie w ogóle wchodzi

Bez tej fazy nic z dalszych nie dociera do większości zarządu: osoba na kodzie krąży między `/` a `/login` (błąd 0a), a w Planerze widzi pusty kalendarz i nie wie o sesji (błąd 0b).

## Zadanie 1: Rozpoznanie obu dróg wejścia na stronach serwerowych

**Pliki:**
- Modyfikacja: `lib/auth/guard.ts` (funkcja `ktoPyta`)
- Nowy: `lib/auth/naStronie.ts`
- Test: `lib/auth/guard.test.ts`, nowy `lib/auth/naStronie.test.ts`

- [ ] **Krok 1: Test `ktoZCiasteczek` — dopisz na końcu bloku `describe('ktoPyta', …)` w `lib/auth/guard.test.ts`**

```ts
  it('ktoZCiasteczek rozpoznaje sam bilet kodu — tak wchodzi zarząd bez hasła', async () => {
    odczytajSesjeKodu.mockResolvedValue({ kod: 'Jula', urzadzenie: 'u1', rola: 'board' })
    const { ktoZCiasteczek } = await import('@/lib/auth/guard')
    expect(await ktoZCiasteczek(undefined, 'bilet')).toEqual({ uid: 'kod:Jula', email: 'Jula', rola: 'board' })
  })

  it('ktoZCiasteczek bez obu ciasteczek zwraca null', async () => {
    const { ktoZCiasteczek } = await import('@/lib/auth/guard')
    expect(await ktoZCiasteczek(undefined, undefined)).toBeNull()
  })
```

- [ ] **Krok 2: Test `ktoNaStronie` — utwórz `lib/auth/naStronie.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const ciasteczka: Record<string, string> = {}
const ktoZCiasteczek = vi.fn()

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (n: string) => (ciasteczka[n] ? { value: ciasteczka[n] } : undefined),
  }),
}))
vi.mock('@/lib/auth/guard', () => ({
  ktoZCiasteczek: (...a: unknown[]) => ktoZCiasteczek(...a),
}))

describe('ktoNaStronie', () => {
  beforeEach(() => {
    for (const k of Object.keys(ciasteczka)) delete ciasteczka[k]
    ktoZCiasteczek.mockReset().mockResolvedValue(null)
  })

  it('podaje dalej bilet kodu — kokpit nie może go pominąć', async () => {
    ciasteczka.deck_kod = 'bilet'
    const { ktoNaStronie } = await import('@/lib/auth/naStronie')
    await ktoNaStronie()
    expect(ktoZCiasteczek).toHaveBeenCalledWith(undefined, 'bilet')
  })

  it('podaje dalej token konta z hasłem', async () => {
    ciasteczka.deck_session = 'token'
    const { ktoNaStronie } = await import('@/lib/auth/naStronie')
    await ktoNaStronie()
    expect(ktoZCiasteczek).toHaveBeenCalledWith('token', undefined)
  })
})
```

- [ ] **Krok 3: Uruchom — mają paść**

Run: `npx vitest run lib/auth/guard.test.ts lib/auth/naStronie.test.ts`
Oczekiwane: FAIL — `ktoZCiasteczek is not a function`, brak modułu `naStronie`.

- [ ] **Krok 4: W `lib/auth/guard.ts` zastąp całą funkcję `ktoPyta` (od `export async function ktoPyta` do jej zamykającej klamry) tym kodem**

```ts
/**
 * Rozpoznanie z samych wartości ciasteczek. Wspólne dla tras API (`ktoPyta`)
 * i stron serwerowych (`ktoNaStronie`) — gdy strona sprawdzała tylko hasło,
 * osoba na kodzie krążyła między kokpitem a logowaniem.
 */
export async function ktoZCiasteczek(token?: string, bilet?: string): Promise<Pytajacy | null> {
  if (token) {
    const tozsamosc = await zweryfikujToken(token)
    const rola = tozsamosc ? rolaDla(tozsamosc.email) : null
    if (tozsamosc && rola) return { uid: tozsamosc.uid, email: tozsamosc.email, rola }
  }

  if (bilet) {
    const sesja = await odczytajSesjeKodu(bilet)
    if (sesja) return { uid: `kod:${sesja.kod}`, email: sesja.kod, rola: sesja.rola }
  }

  return null
}

export async function ktoPyta(req: NextRequest): Promise<Pytajacy | null> {
  return ktoZCiasteczek(req.cookies.get('deck_session')?.value, req.cookies.get('deck_kod')?.value)
}
```

- [ ] **Krok 5: Utwórz `lib/auth/naStronie.ts`**

```ts
import { cookies } from 'next/headers'
import { ktoZCiasteczek, type Pytajacy } from './guard'

/** Strony serwerowe (kokpit, Planer): te same dwie drogi wejścia co trasy API. */
export async function ktoNaStronie(): Promise<Pytajacy | null> {
  const c = await cookies()
  return ktoZCiasteczek(c.get('deck_session')?.value, c.get('deck_kod')?.value)
}
```

- [ ] **Krok 6: Uruchom — mają przejść**

Run: `npx vitest run lib/auth/`
Oczekiwane: PASS, łącznie z dotychczasowymi testami `ktoPyta`.

- [ ] **Krok 7: Commit**

```bash
git add lib/auth/guard.ts lib/auth/guard.test.ts lib/auth/naStronie.ts lib/auth/naStronie.test.ts
git commit -m "feat(auth): rozpoznanie obu drog wejscia takze na stronach serwerowych"
```

---

## Zadanie 2: Bieżący semestr zamiast `'2026Z'` na sztywno

**Pliki:**
- Modyfikacja: `lib/planer/semestry.ts`
- Test: `lib/planer/semestry.test.ts`

- [ ] **Krok 1: Dopisz na końcu `lib/planer/semestry.test.ts`**

```ts
import { biezacySemestr } from '@/lib/planer/semestry'

describe('biezacySemestr', () => {
  it('październik to zima bieżącego roku akademickiego', () => {
    expect(biezacySemestr(new Date(2026, 9, 2)).id).toBe('2026Z')
  })

  it('luty należy jeszcze do zimy z poprzedniego roku kalendarzowego', () => {
    expect(biezacySemestr(new Date(2027, 1, 15)).id).toBe('2026Z')
  })

  it('od marca lato', () => {
    expect(biezacySemestr(new Date(2027, 2, 1)).id).toBe('2026L')
  })

  it('wrzesień to już planowanie kolejnej zimy', () => {
    expect(biezacySemestr(new Date(2027, 8, 1)).id).toBe('2027Z')
  })
})
```

Jeśli plik nie importuje jeszcze `describe`/`it`/`expect` z `vitest` w tej samej linii, scal import z istniejącym na górze pliku.

- [ ] **Krok 2: Uruchom — ma paść**

Run: `npx vitest run lib/planer/semestry.test.ts`
Oczekiwane: FAIL — `biezacySemestr is not a function`.

- [ ] **Krok 3: Dopisz na końcu `lib/planer/semestry.ts`**

```ts
/**
 * Semestr na dany dzień. Wrzesień liczymy już do zimy — to miesiąc układania
 * jej kalendarza. Styczeń i luty należą do zimy z poprzedniego roku
 * kalendarzowego (rok akademicki 2026/2027 to zima `2026Z`).
 */
export function biezacySemestr(data: Date): Semestr {
  const m = data.getMonth() + 1
  const y = data.getFullYear()
  if (m >= 9) return opisSemestru(y, 'Z')
  if (m <= 2) return opisSemestru(y - 1, 'Z')
  return opisSemestru(y - 1, 'L')
}
```

- [ ] **Krok 4: Uruchom — ma przejść**

Run: `npx vitest run lib/planer/semestry.test.ts`
Oczekiwane: PASS.

- [ ] **Krok 5: Commit**

```bash
git add lib/planer/semestry.ts lib/planer/semestry.test.ts
git commit -m "feat(planer): biezacy semestr liczony z daty"
```

---

## Zadanie 3: Czyste mapowania stanu sesji i Składu

Stan sesji jest dziś składany w `zapis.ts`, który ma `'use client'` — serwer nie może go użyć. Przenosimy mapowanie do pliku bez dyrektywy, obok dochodzą funkcje Składu.

**Pliki:**
- Nowy: `lib/planer/stan.ts`, test `lib/planer/stan.test.ts`
- Modyfikacja: `lib/planer/zapis.ts` (interfejs `StanSesjiWspolnej`, `subskrybujTrybWspolny`)
- Modyfikacja: `components/planer/BanerSesji.tsx` (funkcja `trwanie`)

- [ ] **Krok 1: Utwórz `lib/planer/stan.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import {
  naStanSesji, naSklad, dodajDoSkladu, usunZeSkladu, opiszTrwanie,
} from '@/lib/planer/stan'

describe('naStanSesji', () => {
  it('brak dokumentu semestru to wyłączona sesja', () => {
    expect(naStanSesji(undefined)).toEqual({ wlaczony: false, od: null, przez: null })
  })

  it('czyta włączoną sesję', () => {
    expect(naStanSesji({ trybWspolny: true, trybWspolnyOd: 1000, trybWspolnyPrzez: 'ja' }))
      .toEqual({ wlaczony: true, od: 1000, przez: 'ja' })
  })
})

describe('Skład', () => {
  it('naSklad odrzuca puste i nie-tekstowe wpisy', () => {
    expect(naSklad({ osoby: ['Jula', '', 3, '  ', 'Kuba'] })).toEqual(['Jula', 'Kuba'])
    expect(naSklad(undefined)).toEqual([])
  })

  it('dodaje osobę bez spacji na brzegach', () => {
    expect(dodajDoSkladu(['Jula'], '  Kuba ')).toEqual(['Jula', 'Kuba'])
  })

  it('nie dubluje osoby niezależnie od wielkości liter', () => {
    const sklad = ['Jula']
    expect(dodajDoSkladu(sklad, 'jula')).toBe(sklad)
  })

  it('nie przyjmuje słowa „wszyscy” — to zarezerwowany znacznik całego zarządu', () => {
    const sklad = ['Jula']
    expect(dodajDoSkladu(sklad, 'Wszyscy')).toBe(sklad)
  })

  it('usuwa osobę', () => {
    expect(usunZeSkladu(['Jula', 'Kuba'], 'Jula')).toEqual(['Kuba'])
  })
})

describe('opiszTrwanie', () => {
  it('poniżej godziny same minuty', () => {
    expect(opiszTrwanie(0, 25 * 60_000)).toBe('25 min')
  })

  it('godziny i minuty', () => {
    expect(opiszTrwanie(0, 80 * 60_000)).toBe('1 h 20 min')
  })
})
```

- [ ] **Krok 2: Uruchom — ma paść**

Run: `npx vitest run lib/planer/stan.test.ts`
Oczekiwane: FAIL — brak modułu.

- [ ] **Krok 3: Utwórz `lib/planer/stan.ts`**

```ts
/**
 * Czyste mapowania stanu, które czytają OBIE strony — przeglądarka
 * (subskrypcje) i serwer (`/api/planer`, strony). Plik celowo bez
 * `'use client'`, z tego samego powodu co `mapowanie.ts`.
 */

export interface StanSesjiWspolnej {
  wlaczony: boolean
  od: number | null
  przez: string | null
}

export const SESJA_WYLACZONA: StanSesjiWspolnej = { wlaczony: false, od: null, przez: null }

/** Brak dokumentu semestru to normalny stan przed pierwszym włączeniem sesji. */
export function naStanSesji(d: Record<string, unknown> | undefined): StanSesjiWspolnej {
  return {
    wlaczony: d?.trybWspolny === true,
    od: typeof d?.trybWspolnyOd === 'number' ? d.trybWspolnyOd : null,
    przez: typeof d?.trybWspolnyPrzez === 'string' ? d.trybWspolnyPrzez : null,
  }
}

export function naSklad(d: Record<string, unknown> | undefined): string[] {
  const osoby = d?.osoby
  if (!Array.isArray(osoby)) return []
  return osoby.filter((o): o is string => typeof o === 'string' && o.trim() !== '')
}

/**
 * Zwraca TĘ SAMĄ tablicę, gdy nie ma czego dodać — wywołujący poznaje po
 * tożsamości, że osoba już była. „wszyscy” jest zarezerwowane: oznacza cały
 * zarząd i jest pomijane przy kolizjach.
 */
export function dodajDoSkladu(sklad: string[], osoba: string): string[] {
  const nowa = osoba.trim()
  if (!nowa || nowa.toLowerCase() === 'wszyscy') return sklad
  if (sklad.some((o) => o.toLowerCase() === nowa.toLowerCase())) return sklad
  return [...sklad, nowa]
}

export function usunZeSkladu(sklad: string[], osoba: string): string[] {
  return sklad.filter((o) => o !== osoba)
}

/** Czas trwania sesji. Sesję wyłącza się ręcznie, więc to jedyne, co czyni zapomnienie widocznym. */
export function opiszTrwanie(od: number, teraz: number): string {
  const minuty = Math.max(0, Math.floor((teraz - od) / 60_000))
  const h = Math.floor(minuty / 60)
  const m = minuty % 60
  return h > 0 ? `${h} h ${m} min` : `${m} min`
}
```

- [ ] **Krok 4: W `lib/planer/zapis.ts` usuń interfejs `StanSesjiWspolnej` (linie z `export interface StanSesjiWspolnej {` do jego klamry) i zastąp ciało `subskrybujTrybWspolny`**

Na górze pliku, pod istniejącymi importami, dopisz:

```ts
import { naStanSesji, type StanSesjiWspolnej } from './stan'

export type { StanSesjiWspolnej }
```

Nowa funkcja:

```ts
export function subskrybujTrybWspolny(
  semestrId: string,
  gdyZmiana: (s: StanSesjiWspolnej) => void,
): () => void {
  // Brak dokumentu semestru to normalny stan przed pierwszym włączeniem sesji,
  // więc błąd tu oznacza wyłącznie problem z uprawnieniami — logujemy i milczymy.
  return onSnapshot(semestrDoc(semestrId), (zrzut) => gdyZmiana(naStanSesji(zrzut.data())))
}
```

- [ ] **Krok 5: W `components/planer/BanerSesji.tsx` usuń lokalną funkcję `trwanie` i użyj wspólnej**

Dopisz import `import { opiszTrwanie } from '@/lib/planer/stan'` i zamień `trwanie(stan.od)` na `opiszTrwanie(stan.od, Date.now())`.

- [ ] **Krok 6: Uruchom testy i typy**

Run: `npx vitest run lib/planer/stan.test.ts components/planer/BanerSesji.test.tsx && npx tsc --noEmit`
Oczekiwane: PASS, brak błędów typów.

- [ ] **Krok 7: Commit**

```bash
git add lib/planer/stan.ts lib/planer/stan.test.ts lib/planer/zapis.ts components/planer/BanerSesji.tsx
git commit -m "refactor(planer): stan sesji i Sklad jako czyste mapowania wspolne dla serwera"
```

---

## Zadanie 4: GET `/api/planer` zwraca cały obraz Planera

**Pliki:**
- Modyfikacja: `lib/firebase/admin.ts`
- Nowy: `lib/planer/obraz.ts`
- Modyfikacja: `app/api/planer/route.ts` (GET, `trybWspolnyWlaczony`)
- Test: `app/api/planer/route.test.ts`

- [ ] **Krok 1: Dopisz na końcu `lib/firebase/admin.ts`**

```ts
export function ustawieniaRef(nazwa: string) {
  return bazaAdmin().collection('ustawienia').doc(nazwa)
}
```

- [ ] **Krok 2: Utwórz `lib/planer/obraz.ts`**

```ts
import { semestrRef, ustawieniaRef, wydarzeniaRef } from '@/lib/firebase/admin'
import { naWydarzenie } from './mapowanie'
import { naSklad, naStanSesji, type StanSesjiWspolnej } from './stan'
import type { Wydarzenie } from './typy'

/** Wszystko, czego Planer potrzebuje na start — dla osób bez konta Firebase. */
export interface ObrazPlanera {
  wydarzenia: Wydarzenie[]
  sesja: StanSesjiWspolnej
  sklad: string[]
}

/**
 * Odczyt przez Admin SDK omija reguły Firestore. Wołać wyłącznie po sprawdzeniu,
 * kto pyta (trasa API, strona serwerowa).
 */
export async function stanSesji(semestrId: string): Promise<StanSesjiWspolnej> {
  const zrzut = await semestrRef(semestrId).get()
  return naStanSesji(zrzut.data())
}

export async function obrazPlanera(semestrId: string): Promise<ObrazPlanera> {
  const [wydarzenia, sesja, sklad] = await Promise.all([
    wydarzeniaRef(semestrId).get().then((z) => z.docs.map((d) => naWydarzenie(d.id, d.data()))),
    stanSesji(semestrId),
    ustawieniaRef('sklad').get().then((z) => naSklad(z.data())),
  ])
  return { wydarzenia, sesja, sklad }
}
```

- [ ] **Krok 3: Rozszerz zaślepki w `app/api/planer/route.test.ts`**

Pod istniejącymi `const … = vi.fn()` na górze dopisz:

```ts
const wydarzeniaDocs = vi.fn((): { id: string; data: () => Record<string, unknown> }[] => [])
const dodajWydarzenie = vi.fn()
const skladDane = vi.fn((): Record<string, unknown> | undefined => undefined)
```

Zastąp cały blok `vi.mock('@/lib/firebase/admin', …)`:

```ts
vi.mock('@/lib/firebase/admin', () => ({
  propozycjeRef: () => ({ add: (d: unknown) => dodajPropozycje(d) }),
  wydarzeniaRef: () => ({
    doc: (id: string) => ({ update: (d: unknown) => zmienDzien(id, d) }),
    add: (d: unknown) => dodajWydarzenie(d),
    get: async () => ({ docs: wydarzeniaDocs() }),
  }),
  semestrRef: () => ({ get: async () => ({ data: () => ({ trybWspolny: trybWspolny() }) }) }),
  ustawieniaRef: () => ({ get: async () => ({ data: () => skladDane() }) }),
  komentarzeRef: () => ({ add: (d: unknown) => dodajKomentarz(d) }),
  obecnoscRef: () => ({ doc: (uid: string) => ({ set: (d: unknown) => zapiszObecnosc(uid, d) }) }),
}))
```

W `beforeEach` istniejącego `describe('POST /api/planer', …)` dopisz:

```ts
    wydarzeniaDocs.mockReset().mockReturnValue([])
    dodajWydarzenie.mockReset()
    skladDane.mockReset().mockReturnValue(undefined)
```

- [ ] **Krok 4: Dopisz testy GET na końcu `app/api/planer/route.test.ts`**

```ts
function pyta(adres: string) {
  return { nextUrl: new URL(adres, 'http://deck.test') } as never
}

describe('GET /api/planer', () => {
  beforeEach(() => {
    vi.resetModules()
    ktoPyta.mockReset().mockResolvedValue({ uid: 'kod:482913', email: 'Jula', rola: 'board' })
    trybWspolny.mockReset().mockReturnValue(true)
    wydarzeniaDocs.mockReset().mockReturnValue([
      { id: 'w1', data: () => ({ tytul: 'A', kategoria: 'ZEBRANIA', rok: 2026, miesiac: 10, dzien: 7 }) },
    ])
    skladDane.mockReset().mockReturnValue({ osoby: ['Jula', 'Kuba'] })
  })

  it('bez biletu odmawia', async () => {
    ktoPyta.mockResolvedValue(null)
    const { GET } = await import('@/app/api/planer/route')
    expect((await GET(pyta('/api/planer?semestr=2026Z'))).status).toBe(401)
  })

  it('zwraca wydarzenia, stan sesji i Skład naraz', async () => {
    const { GET } = await import('@/app/api/planer/route')
    const dane = await (await GET(pyta('/api/planer?semestr=2026Z'))).json()
    expect(dane.wydarzenia[0].id).toBe('w1')
    expect(dane.sesja.wlaczony).toBe(true)
    expect(dane.sklad).toEqual(['Jula', 'Kuba'])
  })

  it('zasob=sesja zwraca sam stan sesji — bez czytania kalendarza', async () => {
    const { GET } = await import('@/app/api/planer/route')
    const dane = await (await GET(pyta('/api/planer?semestr=2026Z&zasob=sesja'))).json()
    expect(dane).toEqual({ sesja: { wlaczony: true, od: null, przez: null } })
    expect(wydarzeniaDocs).not.toHaveBeenCalled()
  })
})
```

- [ ] **Krok 5: Uruchom — ma paść**

Run: `npx vitest run app/api/planer/route.test.ts`
Oczekiwane: FAIL w `GET /api/planer` (stary GET zwraca tablicę).

- [ ] **Krok 6: W `app/api/planer/route.ts` zastąp funkcję `GET` i `trybWspolnyWlaczony`**

Import na górze — zamień linię z `naWydarzenie` na:

```ts
import { obrazPlanera, stanSesji } from '@/lib/planer/obraz'
```

i usuń `semestrRef, wydarzeniaRef` z importu `@/lib/firebase/admin` tylko jeśli nie są już nigdzie używane (`wydarzeniaRef` zostaje — używa go `przenies`; `semestrRef` usuń).

```ts
/**
 * Odczyt Planera dla osób wchodzących kodem: nie mają konta Firebase, więc
 * reguły Firestore ich nie wpuszczą. `zasob=sesja` to tani odczyt jednego
 * dokumentu — odpytujemy nim poza sesją, żeby zauważyć jej start.
 */
export async function GET(req: NextRequest) {
  const kto = await ktoPyta(req)
  if (!kto) return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })

  const semestrId = req.nextUrl.searchParams.get('semestr')
  if (!semestrId) return NextResponse.json({ error: 'Brak semestru' }, { status: 400 })

  try {
    if (req.nextUrl.searchParams.get('zasob') === 'sesja') {
      return NextResponse.json({ sesja: await stanSesji(semestrId) })
    }
    return NextResponse.json(await obrazPlanera(semestrId))
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

/** Czy zarząd może w tej chwili zapisywać wprost. Rozstrzyga serwer, nie klient. */
async function trybWspolnyWlaczony(semestrId: string): Promise<boolean> {
  return (await stanSesji(semestrId)).wlaczony
}
```

- [ ] **Krok 7: Uruchom testy i typy**

Run: `npx vitest run app/api/planer/route.test.ts && npx tsc --noEmit`
Oczekiwane: PASS w obu `describe`; brak błędów typów.

- [ ] **Krok 8: Commit**

```bash
git add lib/firebase/admin.ts lib/planer/obraz.ts app/api/planer/route.ts app/api/planer/route.test.ts
git commit -m "feat(planer): GET zwraca caly obraz Planera i tani stan sesji"
```

---

## Zadanie 5: Kokpit i Planer dla osób na kodzie

**Pliki:**
- Modyfikacja: `app/page.tsx` (cały plik)
- Modyfikacja: `app/planer/page.tsx` (cały plik)
- Modyfikacja: `components/planer/PlanerClient.tsx` (props, stan, odpytywanie, pasek błędu)

- [ ] **Krok 1: Zastąp `app/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { ktoNaStronie } from '@/lib/auth/naStronie'
import { gasList } from '@/lib/gas/client'
import { computeOverview } from '@/lib/overview'
import { buildAlerts } from '@/lib/stats'
import { serieZWierszy, ilorazSerii } from '@/lib/kpi/serie'
import { DeckHub } from '@/components/deck/DeckHub'
import { propozycjeRef } from '@/lib/firebase/admin'
import { biezacySemestr } from '@/lib/planer/semestry'

export default async function KokpitPage() {
  // Obie drogi wejścia. Sprawdzanie samego hasła odsyłało osoby na kodzie
  // na /login, a stamtąd useAuth odsyłał je z powrotem — pętla.
  const kto = await ktoNaStronie()
  if (!kto) redirect('/login')

  const semestr = biezacySemestr(new Date())

  // Awaria arkusza nie może zabrać całego kokpitu — kafelek pokaże zera,
  // a pozostałe moduły dalej działają.
  const [rekrutacje, kohorty, punkty] = await Promise.all([
    gasList('rekrutacje').catch(() => []),
    gasList('kohorty').catch(() => []),
    gasList('kpi_punkty').catch(() => []),
  ])
  const serie = serieZWierszy(punkty)

  // Trzeci argument to KpiPeriod[], którego aplikacja nie pobiera — tak samo
  // wywołuje to OverviewClient.
  const m = computeOverview(rekrutacje, kohorty, [])
  const konwersja =
    m.lastApplications && m.lastApplications > 0 && m.lastAccepted != null
      ? (m.lastAccepted / m.lastApplications) * 100
      : 0

  // Odznakę widzi wyłącznie właściciel — dla zarządu liczba nierozpatrzonych
  // propozycji nic nie znaczy, bo i tak ich nie rozpatrzy.
  // Awaria Firestore nie może zabrać kokpitu, stąd zero zamiast wyjątku.
  const propozycje =
    kto.rola === 'owner'
      ? await propozycjeRef(semestr.id)
          .count()
          .get()
          .then((s) => s.data().count)
          .catch(() => 0)
      : 0

  return (
    <DeckHub
      rola={kto.rola}
      email={kto.email}
      dane={{
        konwersja,
        retencja: m.histRetention ?? 0,
        kpiWzrosty: serie.filter((s) => ilorazSerii(s) > 1).length,
        kpiRazem: serie.length,
        alerty: buildAlerts(rekrutacje, kohorty, serie).length,
        propozycje,
      }}
    />
  )
}
```

- [ ] **Krok 2: Zastąp `app/planer/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ktoNaStronie } from '@/lib/auth/naStronie'
import { biezacySemestr } from '@/lib/planer/semestry'
import { obrazPlanera, type ObrazPlanera } from '@/lib/planer/obraz'
import { PlanerClient } from '@/components/planer/PlanerClient'

export default async function PlanerPage() {
  const kto = await ktoNaStronie()
  if (!kto) redirect('/login')

  const semestr = biezacySemestr(new Date())

  // Konta z hasłem subskrybują Firestore same. Osoba na kodzie nie ma konta
  // Firebase — bez obrazu z serwera widziała pusty kalendarz.
  const naZywo = !kto.uid.startsWith('kod:')
  const poczatkowy: ObrazPlanera | null = naZywo
    ? null
    : await obrazPlanera(semestr.id).catch(() => null)

  return (
    <main className="mx-auto w-full max-w-[1360px] p-[clamp(16px,2.4vw,34px)]">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/"
            className="mb-2 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-deck-muted transition hover:text-deck-text"
          >
            <ArrowLeft size={12} /> DECK
          </Link>
          <h1 className="text-lg font-semibold text-deck-text">Planer semestru</h1>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-deck-muted/70">
            {semestr.nazwa}
          </p>
        </div>
        {kto.rola !== 'owner' && (
          <span className="deck-chip rounded-lg px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-deck-muted">
            podgląd
          </span>
        )}
      </header>

      <PlanerClient
        semestr={semestr}
        rola={kto.rola}
        kto={kto.email}
        poczatkowy={poczatkowy}
        naZywo={naZywo}
      />
    </main>
  )
}
```

- [ ] **Krok 3: `PlanerClient` — props i stan początkowy**

Importy: dopisz

```ts
import { SESJA_WYLACZONA } from '@/lib/planer/stan'
import type { ObrazPlanera } from '@/lib/planer/obraz'
```

W `type Props` zastąp pole `poczatkowe` polem:

```ts
  /** Obraz z serwera dla osób na kodzie; konta z hasłem dostają dane z subskrypcji (`null`). */
  poczatkowy: ObrazPlanera | null
```

W sygnaturze komponentu zamień `poczatkowe` na `poczatkowy`, a dwie linie stanu:

```ts
  const [wydarzenia, setWydarzenia] = useState<Wydarzenie[]>(poczatkowy?.wydarzenia ?? [])
```

```ts
  const [sesja, setSesja] = useState<StanSesjiWspolnej>(poczatkowy?.sesja ?? SESJA_WYLACZONA)
```

- [ ] **Krok 4: `PlanerClient` — zastąp efekt odpytywania (ten z `setInterval(…, 15000)`) tym kodem**

```ts
  /**
   * Pobranie stanu przez serwer — dla osób na kodzie, które nie mają
   * subskrypcji Firestore. `tylkoSesja` czyta jeden dokument zamiast całego
   * kalendarza.
   */
  const odswiez = useCallback(async (tylkoSesja = false) => {
    const r = await fetch(`/api/planer?semestr=${semestr.id}${tylkoSesja ? '&zasob=sesja' : ''}`)
    if (!r.ok) return
    const d = await r.json()
    if (d.sesja) setSesja(d.sesja)
    if (Array.isArray(d.wydarzenia)) setWydarzenia(d.wydarzenia)
  }, [semestr.id])

  // Poza sesją co minutę sprawdzamy wyłącznie, czy się zaczęła; w trakcie
  // sesji co 15 sekund pobieramy cały obraz — wtedy opóźnienie naprawdę
  // przeszkadza. Tylko przy widocznej karcie.
  useEffect(() => {
    if (naZywo) return
    const wSesji = sesja.wlaczony
    const krok = () => {
      if (!document.hidden) void odswiez(!wSesji).catch(() => {})
    }
    // Po wykryciu startu sesji nie czekamy 15 sekund na pierwszy pełny obraz.
    if (wSesji) krok()
    const id = setInterval(krok, wSesji ? 15_000 : 60_000)
    return () => clearInterval(id)
  }, [naZywo, sesja.wlaczony, odswiez])
```

- [ ] **Krok 5: `PlanerClient` — pasek błędu bez podwójnego prefiksu**

Komunikaty w `setBlad` mają już własny opis („Nie udało się pobrać kalendarza: …”), a pasek doklejał drugi. Zamień w `bladPaska` tekst `Nie udało się pobrać kalendarza: {blad}` na samo `{blad}`, a w funkcji `przenies` zamień `setBlad((e as Error).message)` na `` setBlad(`Nie udało się zapisać: ${(e as Error).message}`) ``.

- [ ] **Krok 6: Typy, lint, testy, build**

Run: `npx tsc --noEmit && npx eslint . && npx vitest run && npx next build`
Oczekiwane: wszystko czysto. Szczególnie `react-hooks/set-state-in-effect` nie może się zgłosić — `setState` w `odswiez` dzieje się po `await`.

- [ ] **Krok 7: Sprawdzenie ręczne (dev)**

Run: `npm run dev`, w przeglądarce w trybie incognito zaloguj się kodem z zakładki `kody` arkusza.
Oczekiwane: po wpisaniu kodu ląduje kokpit (nie wraca na `/login`); Planer pokazuje wydarzenia semestru.

- [ ] **Krok 8: Commit**

```bash
git add app/page.tsx app/planer/page.tsx components/planer/PlanerClient.tsx
git commit -m "fix(planer): zarzad na kodzie wchodzi do kokpitu, widzi kalendarz i start sesji"
```

---

# FAZA 1 — model i logika

## Zadanie 6: Sześć kategorii z rangą, budynki, nowe pola wydarzenia

Zmiana typu `Wydarzenie` dotyka każdego testu, który buduje wydarzenie — wszystkie poprawiamy w tym samym zadaniu, żeby `tsc` nie stał czerwony między commitami.

**Pliki:**
- Nowy: `lib/planer/budynki.ts`, test `lib/planer/budynki.test.ts`
- Modyfikacja: `lib/planer/typy.ts` (cały plik), `lib/planer/mapowanie.ts` (cały plik)
- Modyfikacja: `components/planer/PanelWydarzenia.tsx` (funkcja `pusty`)
- Testy: `lib/planer/typy.test.ts`, `lib/planer/mapowanie.test.ts` oraz fikstury w `lib/planer/kolizje.test.ts`, `lib/planer/propozycje.test.ts`, `components/planer/KartaWydarzenia.test.tsx`, `components/planer/PanelWydarzenia.test.tsx`, `components/planer/Skrzynka.test.tsx`, `components/planer/WidokMiesiaca.test.tsx`, `components/planer/WidokSemestru.test.tsx`

- [ ] **Krok 1: Utwórz `lib/planer/budynki.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { BUDYNKI, POZA, jestBudynkiem, etykietaBudynku } from '@/lib/planer/budynki'

describe('budynki', () => {
  it('zna budynki UEW i miejsce poza uczelnią', () => {
    expect(BUDYNKI).toContain('B/L')
    expect(BUDYNKI).toContain('ŚLĘŻAK')
    expect(jestBudynkiem('CKU')).toBe(true)
    expect(jestBudynkiem(POZA)).toBe(true)
  })

  it('odrzuca nieznany budynek', () => {
    expect(jestBudynkiem('X')).toBe(false)
  })

  it('nie ma duplikatów', () => {
    expect(new Set(BUDYNKI).size).toBe(BUDYNKI.length)
  })

  it('„POZA” ma ludzką etykietę, budynek — swój kod', () => {
    expect(etykietaBudynku(POZA)).toBe('Poza uczelnią')
    expect(etykietaBudynku('B/J')).toBe('B/J')
  })
})
```

- [ ] **Krok 2: Zastąp `lib/planer/typy.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { KATEGORIE, KLUCZE_KATEGORII, jestKategoria, numerRangi } from '@/lib/planer/typy'

describe('kategorie', () => {
  it('sześć kategorii w kolejności ważności', () => {
    expect(KLUCZE_KATEGORII).toEqual(['ZEBRANIA', 'SSUEW', 'PROJEKTY', 'UE', 'APLIKACJE', 'INNE'])
  })

  it('każda ma etykietę, rangę, kolor obrysu, tło i kolor do druku', () => {
    for (const klucz of KLUCZE_KATEGORII) {
      const k = KATEGORIE[klucz]
      expect(k.etykieta.length).toBeGreaterThan(0)
      expect(k.obrys).toMatch(/^#[0-9a-f]{6}$/i)
      expect(k.druk).toMatch(/^#[0-9a-f]{6}$/i)
      expect(k.tlo).toMatch(/^rgba\(/)
    }
  })

  it('numer rangi mają tylko cztery najważniejsze kategorie', () => {
    expect(numerRangi('ZEBRANIA')).toBe(1)
    expect(numerRangi('UE')).toBe(4)
    expect(numerRangi('APLIKACJE')).toBeNull()
    expect(numerRangi('INNE')).toBeNull()
  })

  it('dawna kategoria „Zeb./inne” nie jest już kategorią', () => {
    expect(jestKategoria('ZEBRANIA/INNE')).toBe(false)
    expect(jestKategoria('WYCIECZKA')).toBe(false)
  })
})
```

- [ ] **Krok 3: Zastąp `lib/planer/mapowanie.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { naWydarzenie } from '@/lib/planer/mapowanie'

describe('naWydarzenie', () => {
  it('składa wydarzenie z dokumentu Firestore', () => {
    const w = naWydarzenie('abc', {
      tytul: 'ZEBRANIE ZARZĄDU', kategoria: 'ZEBRANIA',
      rok: 2026, miesiac: 10, dzien: 7, dni: 2, calyDzien: false,
      godzina: '18:00', godzinaDo: '20:00', budynek: 'B/L', sala: '110L', osoby: ['Jula'],
    })
    expect(w).toEqual({
      id: 'abc', tytul: 'ZEBRANIE ZARZĄDU', kategoria: 'ZEBRANIA',
      rok: 2026, miesiac: 10, dzien: 7, dni: 2, calyDzien: false,
      godzina: '18:00', godzinaDo: '20:00', budynek: 'B/L', sala: '110L', osoby: ['Jula'],
    })
  })

  it('stary dokument bez nowych pól dostaje wartości domyślne', () => {
    // Dokumenty zapisane przed Sesjami Operacyjnymi nie mają dni, godziny
    // końca ani budynku. Bez migracji — tłumaczymy przy odczycie.
    const w = naWydarzenie('x', { tytul: 'Coś', kategoria: 'SSUEW', rok: 2026, miesiac: 10, dzien: 1, sala: '9J' })
    expect(w).toMatchObject({ dni: 1, calyDzien: false, godzinaDo: null, budynek: null, sala: '9J' })
  })

  it('dawne „Zeb./inne” trafia do Zebrań, nie do Innych', () => {
    expect(naWydarzenie('x', { kategoria: 'ZEBRANIA/INNE' }).kategoria).toBe('ZEBRANIA')
  })

  it('nieznana kategoria to INNE', () => {
    expect(naWydarzenie('x', { kategoria: 'WYCIECZKA' }).kategoria).toBe('INNE')
    expect(naWydarzenie('x', { kategoria: 'toString' }).kategoria).toBe('INNE')
  })

  it('nieznany budynek i błędna liczba dni wracają do wartości bezpiecznych', () => {
    const w = naWydarzenie('x', { budynek: 'X', dni: 0 })
    expect(w.budynek).toBeNull()
    expect(w.dni).toBe(1)
  })

  it('puste napisy zamienia na null', () => {
    const w = naWydarzenie('x', { godzina: '', godzinaDo: '', sala: '' })
    expect(w.godzina).toBeNull()
    expect(w.godzinaDo).toBeNull()
    expect(w.sala).toBeNull()
  })
})
```

- [ ] **Krok 4: Uruchom — mają paść**

Run: `npx vitest run lib/planer/budynki.test.ts lib/planer/typy.test.ts lib/planer/mapowanie.test.ts`
Oczekiwane: FAIL (brak modułu `budynki`, siedem kategorii, brak `numerRangi`, brak nowych pól).

- [ ] **Krok 5: Utwórz `lib/planer/budynki.ts`**

```ts
/**
 * Budynki UEW do wyboru przy wydarzeniu. Lista na stałe w kodzie — zmienia się
 * rzadziej niż raz na kadencję, a dodanie budynku to dopisanie jednego napisu.
 */
export const BUDYNKI = [
  'A', 'B', 'C', 'D', 'E', 'Z', 'P', 'CKU', 'SJO', 'B/L', 'B/J',
  'SWFiS', 'PRZEGUB', 'ŚLĘŻAK', 'SIMPLEX', 'W',
] as const

/** Miejsce spoza uczelni — wtedy pole sali przechowuje nazwę miejsca. */
export const POZA = 'POZA'

export function jestBudynkiem(kod: string): boolean {
  return kod === POZA || (BUDYNKI as readonly string[]).includes(kod)
}

export function etykietaBudynku(kod: string): string {
  return kod === POZA ? 'Poza uczelnią' : kod
}
```

- [ ] **Krok 6: Zastąp `lib/planer/typy.ts`**

```ts
export type Kategoria = 'ZEBRANIA' | 'SSUEW' | 'PROJEKTY' | 'UE' | 'APLIKACJE' | 'INNE'

export interface Miesiac {
  m: number
  y: number
}

export interface Wydarzenie {
  id: string
  tytul: string
  kategoria: Kategoria
  /** Dzień STARTU. */
  rok: number
  miesiac: number
  dzien: number
  /**
   * Ile dni trwa; 1 = jednodniowe. Liczba zamiast daty końca: przesunięcie
   * zmienia tylko start, a długość zostaje.
   */
  dni: number
  /** „Cały dzień” to co innego niż „godzina jeszcze nieustalona” (`godzina: null`). */
  calyDzien: boolean
  /** Start, "18:00", albo null. */
  godzina: string | null
  /** Koniec, "20:00", albo null, gdy podano sam start. */
  godzinaDo: string | null
  /** Kod z `BUDYNKI` albo 'POZA'. */
  budynek: string | null
  /** Numer sali ("110L"), a przy budynku 'POZA' — nazwa miejsca. */
  sala: string | null
  /** 'wszyscy' znaczy cały zarząd i nie bierze udziału w liczeniu kolizji. */
  osoby: string[]
}

export interface Semestr {
  id: string
  nazwa: string
  miesiace: Miesiac[]
  archiwalny: boolean
}

interface StylKategorii {
  etykieta: string
  /** 1 = najważniejsza. Decyduje o wyglądzie karty i kolejności w kratce. */
  ranga: number
  /** Nasycony kolor na obrys i kropkę. */
  obrys: string
  /** Przezroczysta wersja obrysu — kładzie się na ciemnym bez utraty kontrastu tekstu. */
  tlo: string
  /** Ciemniejsza odmiana do eksportu: kolory interfejsu giną na białym arkuszu. */
  druk: string
}

/** Kolejność ważności ustalona na Sesji Operacyjnej: Zebrania → … → Inne. */
export const KATEGORIE: Record<Kategoria, StylKategorii> = {
  ZEBRANIA:  { etykieta: 'Zebrania',      ranga: 1, obrys: '#60a5fa', tlo: 'rgba(96, 165, 250, 0.14)',  druk: '#1d4ed8' },
  SSUEW:     { etykieta: 'SSUEW',         ranga: 2, obrys: '#2dd4bf', tlo: 'rgba(45, 212, 191, 0.14)',  druk: '#0f766e' },
  PROJEKTY:  { etykieta: 'Projekty',      ranga: 3, obrys: '#fbbf24', tlo: 'rgba(251, 191, 36, 0.14)',  druk: '#b45309' },
  UE:        { etykieta: 'Wydarzenia UE', ranga: 4, obrys: '#818cf8', tlo: 'rgba(129, 140, 248, 0.14)', druk: '#4338ca' },
  APLIKACJE: { etykieta: 'Aplikacje',     ranga: 5, obrys: '#fb7185', tlo: 'rgba(251, 113, 133, 0.14)', druk: '#be123c' },
  INNE:      { etykieta: 'Inne',          ranga: 6, obrys: '#a78bfa', tlo: 'rgba(167, 139, 250, 0.14)', druk: '#6d28d9' },
}

export const KLUCZE_KATEGORII = (Object.keys(KATEGORIE) as Kategoria[]).sort(
  (a, b) => KATEGORIE[a].ranga - KATEGORIE[b].ranga,
)

export function jestKategoria(nazwa: string): nazwa is Kategoria {
  return (KLUCZE_KATEGORII as string[]).includes(nazwa)
}

/** Numer rangi na karcie. Aplikacje i Inne go nie mają — tam byłby szumem. */
export function numerRangi(k: Kategoria): number | null {
  const r = KATEGORIE[k].ranga
  return r <= 4 ? r : null
}

/** Wartości pól, których nie było przed Sesjami Operacyjnymi. */
export const POLA_DOMYSLNE: Pick<Wydarzenie, 'dni' | 'calyDzien' | 'godzinaDo' | 'budynek'> = {
  dni: 1,
  calyDzien: false,
  godzinaDo: null,
  budynek: null,
}

/** Wydarzenie bez identyfikatora — tyle, ile trzeba, żeby je utworzyć. */
export type NoweWydarzenie = Omit<Wydarzenie, 'id'>
```

- [ ] **Krok 7: Zastąp `lib/planer/mapowanie.ts`**

```ts
import { jestBudynkiem } from './budynki'
import { POLA_DOMYSLNE, jestKategoria, type Kategoria, type Wydarzenie } from './typy'

/** Kategorie z wcześniejszych wersji Planera i ich obecne odpowiedniki. */
const DAWNE_KATEGORIE = new Map<string, Kategoria>([['ZEBRANIA/INNE', 'ZEBRANIA']])

function kategoria(x: unknown): Kategoria {
  if (typeof x !== 'string') return 'INNE'
  // Najpierw jawne tłumaczenie: ogólne „nieznana → INNE” wrzuciłoby dawne
  // zebrania do najmniej ważnej kategorii.
  return DAWNE_KATEGORIE.get(x) ?? (jestKategoria(x) ? x : 'INNE')
}

const tekstLubNull = (x: unknown): string | null => (typeof x === 'string' && x ? x : null)

/**
 * Dokument Firestore na typ domenowy.
 *
 * Plik celowo NIE ma dyrektywy `'use client'`: mapowania potrzebują dwie strony
 * — przeglądarka przez `zapis.ts` i serwer przez `/api/planer`.
 *
 * Braki uzupełniamy zamiast rzucać wyjątkiem: wiersz może być dopisany ręcznie
 * w konsoli albo pochodzić ze starszej wersji aplikacji (sprzed wielodniowych,
 * godziny końca i budynków), a jedno niekompletne wydarzenie nie może wysadzić
 * całego kalendarza.
 */
export function naWydarzenie(id: string, dane: Record<string, unknown>): Wydarzenie {
  const dni = Number(dane.dni)
  return {
    id,
    tytul: typeof dane.tytul === 'string' ? dane.tytul : '',
    kategoria: kategoria(dane.kategoria),
    rok: Number(dane.rok) || 0,
    miesiac: Number(dane.miesiac) || 0,
    dzien: Number(dane.dzien) || 0,
    dni: Number.isInteger(dni) && dni >= 1 ? dni : POLA_DOMYSLNE.dni,
    calyDzien: dane.calyDzien === true,
    godzina: tekstLubNull(dane.godzina),
    godzinaDo: tekstLubNull(dane.godzinaDo),
    budynek: typeof dane.budynek === 'string' && jestBudynkiem(dane.budynek) ? dane.budynek : null,
    sala: tekstLubNull(dane.sala),
    osoby: Array.isArray(dane.osoby) ? dane.osoby.map(String) : [],
  }
}
```

- [ ] **Krok 8: `PanelWydarzenia.tsx` — formularz nowego wydarzenia z domyślnymi polami**

Dopisz `POLA_DOMYSLNE` do importu z `@/lib/planer/typy` i zastąp funkcję `pusty`:

```ts
function pusty(miesiac: Miesiac, dzien: number | null | undefined): NoweWydarzenie {
  return {
    tytul: '', kategoria: 'ZEBRANIA', rok: miesiac.y, miesiac: miesiac.m,
    dzien: dzien ?? 1, godzina: null, sala: null, osoby: [], ...POLA_DOMYSLNE,
  }
}
```

- [ ] **Krok 9: Fikstury testów — każde literalne `Wydarzenie`/`NoweWydarzenie` dostaje nowe pola**

W każdym z plików dopisz `POLA_DOMYSLNE` do importu z `@/lib/planer/typy` (albo dodaj import `import { POLA_DOMYSLNE } from '@/lib/planer/typy'`, gdy plik importuje stamtąd tylko typy), a w każdym literale wydarzenia dopisz `...POLA_DOMYSLNE` **po** polu `osoby`. Przykład z `KartaWydarzenia.test.tsx`:

```ts
const w: Wydarzenie = {
  id: '1', tytul: 'ZEBRANIE ZARZĄDU', kategoria: 'ZEBRANIA',
  rok: 2026, miesiac: 10, dzien: 7, godzina: '18:00', sala: '9J', osoby: ['Jula'],
  ...POLA_DOMYSLNE,
}
```

Lista miejsc:
- `components/planer/KartaWydarzenia.test.tsx` — `w`,
- `components/planer/PanelWydarzenia.test.tsx` — `w`,
- `components/planer/Skrzynka.test.tsx` — `wydarzenie`,
- `components/planer/WidokMiesiaca.test.tsx` — oba elementy tablicy `wydarzenia`,
- `components/planer/WidokSemestru.test.tsx` — trzy elementy tablicy `wydarzenia`,
- `lib/planer/propozycje.test.ts` — `wydarzenie` oraz `nowe.wydarzenie`,
- `lib/planer/kolizje.test.ts` — w funkcji `w()` dopisz `...POLA_DOMYSLNE,` w wierszu przed `...nadpisz`.

Sprawdź, czy nic poza testami nie używa dawnej kategorii:

Run: `git grep -n "ZEBRANIA/INNE" -- app components lib`
Oczekiwane: jedyne trafienia w `lib/planer/mapowanie.ts` i testach.

- [ ] **Krok 10: Testy i typy**

Run: `npx vitest run lib/planer components/planer && npx tsc --noEmit`
Oczekiwane: PASS; brak błędów typów.

- [ ] **Krok 11: Commit**

```bash
git add lib/planer/budynki.ts lib/planer/budynki.test.ts lib/planer/typy.ts lib/planer/typy.test.ts lib/planer/mapowanie.ts lib/planer/mapowanie.test.ts components/planer/PanelWydarzenia.tsx lib/planer/kolizje.test.ts lib/planer/propozycje.test.ts components/planer/KartaWydarzenia.test.tsx components/planer/PanelWydarzenia.test.tsx components/planer/Skrzynka.test.tsx components/planer/WidokMiesiaca.test.tsx components/planer/WidokSemestru.test.tsx
git commit -m "feat(planer): szesc kategorii z ranga, budynki i pola wydarzen wielodniowych"
```

---

## Zadanie 7: Trwanie wydarzenia — daty, dni, nachodzenie na miesiąc

**Pliki:**
- Nowy: `lib/planer/trwanie.ts`, test `lib/planer/trwanie.test.ts`

- [ ] **Krok 1: Utwórz `lib/planer/trwanie.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import {
  przesunDate, dniMiedzy, koniec, dniTrwaniaWMiesiacu, nachodziNaMiesiac, naIso, zIso, porownajDaty,
} from '@/lib/planer/trwanie'

const zjazd = { rok: 2026, miesiac: 10, dzien: 30, dni: 4 }

describe('trwanie', () => {
  it('koniec przechodzi przez granicę miesiąca', () => {
    expect(koniec(zjazd)).toEqual({ rok: 2026, miesiac: 11, dzien: 2 })
  })

  it('jednodniowe kończy się w dniu startu', () => {
    expect(koniec({ rok: 2026, miesiac: 10, dzien: 7, dni: 1 })).toEqual({ rok: 2026, miesiac: 10, dzien: 7 })
  })

  it('rozkłada dni trwania na miesiące', () => {
    expect(dniTrwaniaWMiesiacu(zjazd, { m: 10, y: 2026 })).toEqual([30, 31])
    expect(dniTrwaniaWMiesiacu(zjazd, { m: 11, y: 2026 })).toEqual([1, 2])
  })

  it('wie, na które miesiące nachodzi', () => {
    expect(nachodziNaMiesiac(zjazd, { m: 11, y: 2026 })).toBe(true)
    expect(nachodziNaMiesiac(zjazd, { m: 12, y: 2026 })).toBe(false)
  })

  it('liczy dni od–do włącznie', () => {
    expect(dniMiedzy({ rok: 2026, miesiac: 10, dzien: 30 }, { rok: 2026, miesiac: 11, dzien: 2 })).toBe(4)
    expect(dniMiedzy({ rok: 2026, miesiac: 10, dzien: 7 }, { rok: 2026, miesiac: 10, dzien: 7 })).toBe(1)
  })

  it('przesuwa datę przez koniec roku', () => {
    expect(przesunDate({ rok: 2026, miesiac: 12, dzien: 31 }, 1)).toEqual({ rok: 2027, miesiac: 1, dzien: 1 })
  })

  it('nie gubi dnia na zmianie czasu', () => {
    // 25.10.2026 to przejście na czas zimowy — doba ma 25 godzin.
    expect(dniMiedzy({ rok: 2026, miesiac: 10, dzien: 24 }, { rok: 2026, miesiac: 10, dzien: 26 })).toBe(3)
  })

  it('porównuje daty', () => {
    expect(porownajDaty({ rok: 2026, miesiac: 10, dzien: 1 }, { rok: 2026, miesiac: 9, dzien: 30 })).toBeGreaterThan(0)
  })

  it('zamienia na ISO i z powrotem', () => {
    expect(naIso({ rok: 2026, miesiac: 3, dzien: 5 })).toBe('2026-03-05')
    expect(zIso('2026-03-05')).toEqual({ rok: 2026, miesiac: 3, dzien: 5 })
    expect(zIso('')).toBeNull()
    expect(zIso('bzdura')).toBeNull()
  })
})
```

- [ ] **Krok 2: Uruchom — ma paść**

Run: `npx vitest run lib/planer/trwanie.test.ts`
Oczekiwane: FAIL — brak modułu.

- [ ] **Krok 3: Utwórz `lib/planer/trwanie.ts`**

```ts
import type { Miesiac, Wydarzenie } from './typy'

export interface Data {
  rok: number
  miesiac: number
  dzien: number
}

type Trwajace = Pick<Wydarzenie, 'rok' | 'miesiac' | 'dzien' | 'dni'>

const DOBA = 86_400_000

/**
 * Daty liczymy w UTC: lokalna północ przy zmianie czasu przesuwa się o godzinę
 * i dzielenie przez dobę gubiłoby albo dokładało dzień.
 */
const naMs = (d: Data) => Date.UTC(d.rok, d.miesiac - 1, d.dzien)

function zMs(ms: number): Data {
  const x = new Date(ms)
  return { rok: x.getUTCFullYear(), miesiac: x.getUTCMonth() + 1, dzien: x.getUTCDate() }
}

export function przesunDate(d: Data, oDni: number): Data {
  return zMs(naMs(d) + oDni * DOBA)
}

export function porownajDaty(a: Data, b: Data): number {
  return naMs(a) - naMs(b)
}

/** Liczba dni od–do, oba włącznie: ten sam dzień to 1. */
export function dniMiedzy(od: Data, doDnia: Data): number {
  return Math.round((naMs(doDnia) - naMs(od)) / DOBA) + 1
}

export function poczatek(w: Trwajace): Data {
  return { rok: w.rok, miesiac: w.miesiac, dzien: w.dzien }
}

export function koniec(w: Trwajace): Data {
  return przesunDate(poczatek(w), Math.max(1, w.dni) - 1)
}

export function dniWydarzenia(w: Trwajace): Data[] {
  return Array.from({ length: Math.max(1, w.dni) }, (_, i) => przesunDate(poczatek(w), i))
}

/** Numery dni miesiąca `m`, w których wydarzenie trwa. */
export function dniTrwaniaWMiesiacu(w: Trwajace, m: Miesiac): number[] {
  return dniWydarzenia(w)
    .filter((d) => d.miesiac === m.m && d.rok === m.y)
    .map((d) => d.dzien)
}

/** Do miesiąca należy wydarzenie, które w nim TRWA, nie tylko to, które w nim startuje. */
export function nachodziNaMiesiac(w: Trwajace, m: Miesiac): boolean {
  return dniTrwaniaWMiesiacu(w, m).length > 0
}

const dwie = (n: number) => String(n).padStart(2, '0')

export function naIso(d: Data): string {
  return `${d.rok}-${dwie(d.miesiac)}-${dwie(d.dzien)}`
}

export function zIso(tekst: string): Data | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tekst)
  if (!m) return null
  return { rok: Number(m[1]), miesiac: Number(m[2]), dzien: Number(m[3]) }
}
```

- [ ] **Krok 4: Uruchom — ma przejść**

Run: `npx vitest run lib/planer/trwanie.test.ts`
Oczekiwane: PASS.

- [ ] **Krok 5: Commit**

```bash
git add lib/planer/trwanie.ts lib/planer/trwanie.test.ts
git commit -m "feat(planer): trwanie wydarzen przez granice miesiecy"
```

---

## Zadanie 8: Kolizje dla przedziałów, całodniowych i wielodniowych

`kolizjeWMiesiacu` dostaje drugi argument — miesiąc — bo wydarzenie wielodniowe ze startem w innym miesiącu też zajmuje dni bieżącego. Oba wywołania (`WidokMiesiaca`, `WidokSemestru`) poprawiamy w tym samym zadaniu.

**Pliki:**
- Modyfikacja: `lib/planer/kolizje.ts` (cały plik), test `lib/planer/kolizje.test.ts`
- Modyfikacja: `components/planer/WidokMiesiaca.tsx` (wywołanie i `opiszKolizje`)
- Modyfikacja: `components/planer/WidokSemestru.tsx` (filtr miesiąca i wywołanie)
- Test: `components/planer/WidokSemestru.test.tsx`

- [ ] **Krok 1: W `lib/planer/kolizje.test.ts` dodaj miesiąc do wszystkich wywołań**

Pod funkcją `w()` dopisz `const PAZ = { m: 10, y: 2026 }` i w każdym wywołaniu zamień `kolizjeWMiesiacu([...])` na `kolizjeWMiesiacu([...], PAZ)`.

- [ ] **Krok 2: Dopisz nowe przypadki na końcu `lib/planer/kolizje.test.ts`**

```ts
describe('kolizje — przedziały, całe dni, wiele dni', () => {
  it('nakładające się przedziały od–do to kolizja twarda', () => {
    const k = kolizjeWMiesiacu([
      w({ osoby: ['Jula'], godzina: '16:00', godzinaDo: '19:00' }),
      w({ osoby: ['Jula'], godzina: '18:30', godzinaDo: '20:00' }),
    ], PAZ)
    expect(k.get(7)?.osoby[0].twarda).toBe(true)
  })

  it('przedziały stykające się końcem nie kolidują', () => {
    const k = kolizjeWMiesiacu([
      w({ osoby: ['Jula'], godzina: '17:00', godzinaDo: '18:00' }),
      w({ osoby: ['Jula'], godzina: '18:00', godzinaDo: '19:00' }),
    ], PAZ)
    expect(k.get(7)?.osoby[0].twarda).toBe(false)
  })

  it('osoba na wydarzeniu całodniowym jest zajęta cały dzień', () => {
    const k = kolizjeWMiesiacu([
      w({ osoby: ['Jula'], calyDzien: true }),
      w({ osoby: ['Jula'], godzina: '21:00' }),
    ], PAZ)
    expect(k.get(7)?.osoby[0].twarda).toBe(true)
  })

  it('wyjazd ze startem w październiku koliduje z listopadowym zebraniem tej osoby', () => {
    const k = kolizjeWMiesiacu([
      w({ osoby: ['Jula'], dzien: 30, dni: 4 }),
      w({ osoby: ['Jula'], miesiac: 11, dzien: 1, godzina: '18:00' }),
    ], { m: 11, y: 2026 })
    expect(k.get(1)?.osoby[0]).toMatchObject({ osoba: 'Jula', twarda: true })
  })

  it('ta sama sala w różnych budynkach to dwa miejsca', () => {
    const k = kolizjeWMiesiacu([
      w({ budynek: 'B/L', sala: '110L', godzina: '17:00' }),
      w({ budynek: 'CKU', sala: '110L', godzina: '17:00' }),
    ], PAZ)
    expect(k.get(7)).toBeUndefined()
  })

  it('ten sam budynek i sala w tym samym czasie to kolizja z nazwą miejsca', () => {
    const k = kolizjeWMiesiacu([
      w({ budynek: 'B/L', sala: '110L', godzina: '17:00' }),
      w({ budynek: 'B/L', sala: '110L', godzina: '17:30' }),
    ], PAZ)
    expect(k.get(7)?.sale[0].sala).toBe('B/L 110L')
  })

  it('„Poza uczelnią” nie daje kolizji sali', () => {
    const k = kolizjeWMiesiacu([
      w({ budynek: 'POZA', sala: 'Pralnia', godzina: '20:00' }),
      w({ budynek: 'POZA', sala: 'Pralnia', godzina: '20:00' }),
    ], PAZ)
    expect(k.get(7)).toBeUndefined()
  })
})
```

- [ ] **Krok 3: Uruchom — ma paść**

Run: `npx vitest run lib/planer/kolizje.test.ts`
Oczekiwane: FAIL w nowych przypadkach (stara funkcja ignoruje `godzinaDo`, `calyDzien`, `dni`, `budynek`).

- [ ] **Krok 4: Zastąp `lib/planer/kolizje.ts`**

```ts
import { naMinuty } from './daty'
import { POZA } from './budynki'
import { dniTrwaniaWMiesiacu } from './trwanie'
import type { Miesiac, Wydarzenie } from './typy'

/** Bez godziny końca: starty bliżej niż tyle minut uznajemy za nachodzące. */
const PROG_MINUT = 90

export interface KolizjaOsoby {
  osoba: string
  ile: number
  /** Twarda: wydarzenia naprawdę zderzają się w czasie albo któreś zajmuje cały dzień. */
  twarda: boolean
}

export interface KolizjaSali {
  /** Miejsce czytelne dla człowieka: „B/L 110L” albo sama sala ze starszych wpisów. */
  sala: string
  godziny: string[]
}

export interface KolizjeDnia {
  osoby: KolizjaOsoby[]
  sale: KolizjaSali[]
}

/** Osoba jest zajęta przez cały dzień. */
function zajmujeCalyDzien(w: Wydarzenie): boolean {
  return w.calyDzien || w.dni > 1
}

/**
 * Czy dwa wydarzenia z godziną zderzają się w czasie. Gdy oba mają koniec —
 * nakładanie się przedziałów (stykające się końcem nie kolidują). Gdy któremuś
 * brakuje końca — dotychczasowa reguła: starty bliżej niż 90 minut.
 */
export function kolidujaWCzasie(a: Wydarzenie, b: Wydarzenie): boolean {
  const aOd = naMinuty(a.godzina)
  const bOd = naMinuty(b.godzina)
  if (aOd === null || bOd === null) return false
  const aDo = naMinuty(a.godzinaDo)
  const bDo = naMinuty(b.godzinaDo)
  if (aDo !== null && bDo !== null) return aOd < bDo && bOd < aDo
  return Math.abs(aOd - bOd) < PROG_MINUT
}

function ktorakolwiekPara(lista: Wydarzenie[], warunek: (a: Wydarzenie, b: Wydarzenie) => boolean): boolean {
  for (let i = 0; i < lista.length; i++) {
    for (let j = i + 1; j < lista.length; j++) {
      if (warunek(lista[i], lista[j])) return true
    }
  }
  return false
}

/**
 * Miejsce jako klucz kolizji. Ten sam numer w dwóch budynkach to dwie sale;
 * „Poza uczelnią” to nie jedno miejsce, a sam budynek bez sali to za mało.
 */
function miejsce(w: Wydarzenie): string | null {
  if (!w.sala || w.budynek === POZA) return null
  return w.budynek ? `${w.budynek} ${w.sala}` : w.sala
}

function grupuj<T>(elementy: T[], klucz: (e: T) => string[]): Map<string, T[]> {
  const mapa = new Map<string, T[]>()
  for (const e of elementy) {
    for (const k of klucz(e)) {
      const lista = mapa.get(k) ?? []
      lista.push(e)
      mapa.set(k, lista)
    }
  }
  return mapa
}

/**
 * Kolizje w rozbiciu na dni miesiąca `miesiac`. Wydarzenie wielodniowe liczy się
 * w każdym dniu, w którym trwa — także gdy wystartowało w poprzednim miesiącu.
 * Dzień bez kolizji nie ma wpisu.
 */
export function kolizjeWMiesiacu(wydarzenia: Wydarzenie[], miesiac: Miesiac): Map<number, KolizjeDnia> {
  const poDniach = new Map<number, Wydarzenie[]>()
  for (const w of wydarzenia) {
    for (const d of dniTrwaniaWMiesiacu(w, miesiac)) {
      const lista = poDniach.get(d) ?? []
      lista.push(w)
      poDniach.set(d, lista)
    }
  }

  const wynik = new Map<number, KolizjeDnia>()
  for (const [dzien, lista] of poDniach) {
    const osoby: KolizjaOsoby[] = []
    const sale: KolizjaSali[] = []

    // 'wszyscy' celowo pomijamy — inaczej każde zebranie zarządu kolidowałoby
    // z każdym wydarzeniem tego dnia i ostrzeżenia straciłyby sens.
    for (const [osoba, jej] of grupuj(lista, (e) => e.osoby.filter((o) => o !== 'wszyscy'))) {
      if (jej.length < 2) continue
      const twarda = jej.some(zajmujeCalyDzien) || ktorakolwiekPara(jej, kolidujaWCzasie)
      osoby.push({ osoba, ile: jej.length, twarda })
    }

    for (const [sala, wSali] of grupuj(lista, (e) => {
      const m = miejsce(e)
      return m ? [m] : []
    })) {
      // Bez godzin nie da się orzec konfliktu sali.
      const zGodzina = wSali.filter((e) => e.godzina)
      if (zGodzina.length < 2) continue
      if (!ktorakolwiekPara(zGodzina, kolidujaWCzasie)) continue
      sale.push({ sala, godziny: zGodzina.map((e) => e.godzina as string) })
    }

    if (osoby.length || sale.length) wynik.set(dzien, { osoby, sale })
  }

  return wynik
}
```

- [ ] **Krok 5: Wywołanie w `components/planer/WidokMiesiaca.tsx`**

Zamień `kolizjeWMiesiacu(wydarzenia)` na `kolizjeWMiesiacu(wydarzenia, miesiac)` i w zależnościach `useMemo` dopisz `miesiac`. W `opiszKolizje` zamień tekst twardej kolizji osoby:

```ts
      o.twarda
        ? `${o.osoba}: ${o.ile} wydarzenia nakładają się w czasie`
        : `${o.osoba}: ${o.ile} wydarzenia tego dnia`,
```

- [ ] **Krok 6: `components/planer/WidokSemestru.tsx` — wielodniowe w każdym swoim miesiącu**

Dopisz import `import { nachodziNaMiesiac } from '@/lib/planer/trwanie'` i zamień dwie linie w pętli:

```ts
        const wMiesiacu = wydarzenia.filter((w) => nachodziNaMiesiac(w, m))
        const kolizje = kolizjeWMiesiacu(wMiesiacu, m)
```

Test na końcu `components/planer/WidokSemestru.test.tsx`:

```ts
  it('wyjazd przez przełom miesięcy liczy się w obu', () => {
    const wyjazd: Wydarzenie = {
      id: 'x', tytul: 'Wyjazd', kategoria: 'PROJEKTY', rok: 2026, miesiac: 10, dzien: 30,
      godzina: null, sala: null, osoby: [], ...POLA_DOMYSLNE, dni: 4,
    }
    render(<WidokSemestru miesiace={miesiaceSemestru(2026, 'Z')} wydarzenia={[wyjazd]} onWejdz={vi.fn()} />)
    expect(screen.getAllByText('1 wydarzenie')).toHaveLength(2)
  })
```

- [ ] **Krok 7: Testy i typy**

Run: `npx vitest run lib/planer/kolizje.test.ts components/planer && npx tsc --noEmit`
Oczekiwane: PASS; brak błędów typów.

- [ ] **Krok 8: Commit**

```bash
git add lib/planer/kolizje.ts lib/planer/kolizje.test.ts components/planer/WidokMiesiaca.tsx components/planer/WidokSemestru.tsx components/planer/WidokSemestru.test.tsx
git commit -m "feat(planer): kolizje przedzialow, calych dni i wydarzen wielodniowych"
```

---

## Zadanie 9: Walidacja wydarzenia

Jedna funkcja dla formularza (blokada „Zapisz” z komunikatem) i serwera (odrzucenie z 400). Zwraca **znormalizowaną kopię** — serwer zapisuje tylko znane pola, nigdy treść żądania wprost.

**Pliki:**
- Nowy: `lib/planer/walidacja.ts`, test `lib/planer/walidacja.test.ts`

- [ ] **Krok 1: Utwórz `lib/planer/walidacja.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { sprawdzWydarzenie } from '@/lib/planer/walidacja'

const dobre = {
  tytul: 'Zebranie Zarządu', kategoria: 'ZEBRANIA', rok: 2026, miesiac: 10, dzien: 7,
  dni: 1, calyDzien: false, godzina: '18:00', godzinaDo: '20:00',
  budynek: 'B/L', sala: '110L', osoby: ['Jula'],
}

function blad(x: unknown): string {
  const w = sprawdzWydarzenie(x)
  if (w.ok) throw new Error('miało być odrzucone')
  return w.blad
}

describe('sprawdzWydarzenie', () => {
  it('przyjmuje poprawne wydarzenie', () => {
    const w = sprawdzWydarzenie(dobre)
    expect(w.ok).toBe(true)
  })

  it('zwraca wyłącznie znane pola — reszta treści żądania nie trafia do bazy', () => {
    const w = sprawdzWydarzenie({ ...dobre, id: 'podrobione', zmienione: 1, admin: true })
    expect(w.ok && Object.keys(w.wydarzenie).sort()).toEqual([
      'budynek', 'calyDzien', 'dni', 'dzien', 'godzina', 'godzinaDo',
      'kategoria', 'miesiac', 'osoby', 'rok', 'sala', 'tytul',
    ])
  })

  it('braki nowych pól uzupełnia jak przy starym dokumencie', () => {
    const { dni: _d, calyDzien: _c, godzinaDo: _g, budynek: _b, ...stare } = dobre
    const w = sprawdzWydarzenie(stare)
    expect(w.ok && w.wydarzenie).toMatchObject({ dni: 1, calyDzien: false, godzinaDo: null, budynek: null })
  })

  it('przycina tytuł, salę i osoby', () => {
    const w = sprawdzWydarzenie({ ...dobre, tytul: '  SKS  ', sala: ' 110L ', osoby: [' Jula ', '', 'Kuba'] })
    expect(w.ok && w.wydarzenie).toMatchObject({ tytul: 'SKS', sala: '110L', osoby: ['Jula', 'Kuba'] })
  })

  it('cały dzień czyści godziny', () => {
    const w = sprawdzWydarzenie({ ...dobre, calyDzien: true })
    expect(w.ok && w.wydarzenie).toMatchObject({ calyDzien: true, godzina: null, godzinaDo: null })
  })

  it('odrzuca błędne dane z opisem', () => {
    expect(blad({ ...dobre, tytul: '   ' })).toMatch(/tytuł/i)
    expect(blad({ ...dobre, kategoria: 'ZEBRANIA/INNE' })).toMatch(/kategori/i)
    expect(blad({ ...dobre, miesiac: 11, dzien: 31 })).toMatch(/dzień/i)
    expect(blad({ ...dobre, dni: 0 })).toMatch(/dni/i)
    expect(blad({ ...dobre, dni: 61 })).toMatch(/dni/i)
    expect(blad({ ...dobre, godzina: '25:00' })).toMatch(/GG:MM/)
    expect(blad({ ...dobre, godzinaDo: '17:00' })).toMatch(/po godzinie „od”/)
    expect(blad({ ...dobre, godzina: null })).toMatch(/„od”/)
    expect(blad({ ...dobre, budynek: 'X' })).toMatch(/budynek/i)
    expect(blad({ ...dobre, osoby: 'Jula' })).toMatch(/listą/)
    expect(blad(null)).toMatch(/brak/i)
  })

  it('„Poza uczelnią” jest poprawnym budynkiem', () => {
    expect(sprawdzWydarzenie({ ...dobre, budynek: 'POZA', sala: 'Pralnia' }).ok).toBe(true)
  })
})
```

- [ ] **Krok 2: Uruchom — ma paść**

Run: `npx vitest run lib/planer/walidacja.test.ts`
Oczekiwane: FAIL — brak modułu.

- [ ] **Krok 3: Utwórz `lib/planer/walidacja.ts`**

```ts
import { dniWMiesiacu, naMinuty } from './daty'
import { jestBudynkiem } from './budynki'
import { jestKategoria, type NoweWydarzenie } from './typy'

export type WynikSprawdzenia =
  | { ok: true; wydarzenie: NoweWydarzenie }
  | { ok: false; blad: string }

const GODZINA = /^([01]\d|2[0-3]):[0-5]\d$/
const MAX_DNI = 60
const MAX_OSOB = 30

const blad = (tekst: string): WynikSprawdzenia => ({ ok: false, blad: tekst })

/** `undefined` znaczy: wartość jest, ale błędna. `null` — brak godziny. */
function godzina(x: unknown): string | null | undefined {
  if (x === null || x === undefined || x === '') return null
  return typeof x === 'string' && GODZINA.test(x) ? x : undefined
}

function calkowita(x: unknown, od: number, doWartosci: number): number | null {
  return typeof x === 'number' && Number.isInteger(x) && x >= od && x <= doWartosci ? x : null
}

/**
 * Jedno sprawdzenie dla formularza i serwera. Zwraca znormalizowaną kopię:
 * serwer zapisuje wyłącznie te pola, nigdy treść żądania wprost.
 */
export function sprawdzWydarzenie(x: unknown): WynikSprawdzenia {
  if (typeof x !== 'object' || x === null) return blad('Brak danych wydarzenia')
  const d = x as Record<string, unknown>

  const tytul = typeof d.tytul === 'string' ? d.tytul.trim() : ''
  if (!tytul) return blad('Wpisz tytuł')
  if (tytul.length > 200) return blad('Tytuł jest za długi (do 200 znaków)')

  const kategoria = d.kategoria
  if (typeof kategoria !== 'string' || !jestKategoria(kategoria)) return blad('Nieznana kategoria')

  const rok = calkowita(d.rok, 2000, 2100)
  const miesiac = calkowita(d.miesiac, 1, 12)
  if (rok === null || miesiac === null) return blad('Niepoprawna data')
  const dzien = calkowita(d.dzien, 1, dniWMiesiacu(rok, miesiac))
  if (dzien === null) return blad('Niepoprawny dzień miesiąca')

  const dni = d.dni === undefined ? 1 : calkowita(d.dni, 1, MAX_DNI)
  if (dni === null) return blad(`Wydarzenie może trwać od 1 do ${MAX_DNI} dni`)

  const calyDzien = d.calyDzien === true
  const od = godzina(d.godzina)
  const doGodziny = godzina(d.godzinaDo)
  if (od === undefined || doGodziny === undefined) return blad('Godzina w formacie GG:MM')
  if (!calyDzien && doGodziny !== null && od === null) return blad('Podaj godzinę „od”, zanim podasz „do”')
  if (!calyDzien && od !== null && doGodziny !== null && (naMinuty(doGodziny) as number) <= (naMinuty(od) as number)) {
    return blad('Godzina „do” musi być po godzinie „od”')
  }

  const budynekWejscie = d.budynek
  const budynek =
    budynekWejscie === null || budynekWejscie === undefined || budynekWejscie === ''
      ? null
      : typeof budynekWejscie === 'string' && jestBudynkiem(budynekWejscie)
        ? budynekWejscie
        : undefined
  if (budynek === undefined) return blad('Nieznany budynek')

  const sala = typeof d.sala === 'string' && d.sala.trim() ? d.sala.trim().slice(0, 80) : null

  if (d.osoby !== undefined && !Array.isArray(d.osoby)) return blad('Osoby muszą być listą')
  const osoby = ((d.osoby as unknown[] | undefined) ?? [])
    .filter((o): o is string => typeof o === 'string')
    .map((o) => o.trim().slice(0, 50))
    .filter(Boolean)
    .slice(0, MAX_OSOB)

  return {
    ok: true,
    wydarzenie: {
      tytul, kategoria, rok, miesiac, dzien, dni, calyDzien,
      godzina: calyDzien ? null : od,
      godzinaDo: calyDzien ? null : doGodziny,
      budynek, sala, osoby,
    },
  }
}
```

- [ ] **Krok 4: Uruchom — ma przejść**

Run: `npx vitest run lib/planer/walidacja.test.ts && npx eslint lib/planer`
Oczekiwane: PASS; lint czysty (podkreślnikowe zmienne w teście są dozwolone konfiguracją).

- [ ] **Krok 5: Commit**

```bash
git add lib/planer/walidacja.ts lib/planer/walidacja.test.ts
git commit -m "feat(planer): walidacja wydarzenia wspolna dla formularza i serwera"
```

---

# FAZA 2 — zapis

## Zadanie 10: Serwer przyjmuje `dodaj` i `zmien` od zarządu w sesji

**Pliki:**
- Modyfikacja: `app/api/planer/route.ts` (POST)
- Modyfikacja: `lib/planer/serwer.ts`
- Test: `app/api/planer/route.test.ts`

- [ ] **Krok 1: Dopisz testy wewnątrz `describe('POST /api/planer', …)`**

```ts
  const NOWE = {
    tytul: 'SKS', kategoria: 'SSUEW', rok: 2026, miesiac: 10, dzien: 8,
    godzina: '19:00', sala: null, osoby: ['Jula'],
  }

  it('zarząd bez sesji nie dodaje wprost', async () => {
    ktoPyta.mockResolvedValue({ uid: 'kod:482913', email: 'Jula', rola: 'board' })
    const { POST } = await import('@/app/api/planer/route')
    const res = await POST(zada({ semestr: '2026Z', akcja: 'dodaj', wydarzenie: NOWE }))
    expect(res.status).toBe(403)
    expect(dodajWydarzenie).not.toHaveBeenCalled()
  })

  it('zarząd w sesji dodaje — zapisane są tylko znane pola', async () => {
    ktoPyta.mockResolvedValue({ uid: 'kod:482913', email: 'Jula', rola: 'board' })
    trybWspolny.mockReturnValue(true)
    const { POST } = await import('@/app/api/planer/route')
    const res = await POST(zada({ semestr: '2026Z', akcja: 'dodaj', wydarzenie: { ...NOWE, admin: true } }))
    expect(res.status).toBe(201)
    const zapisane = dodajWydarzenie.mock.calls[0][0]
    expect(zapisane).toMatchObject({ tytul: 'SKS', dni: 1, budynek: null })
    expect(zapisane).not.toHaveProperty('admin')
  })

  it('zarząd w sesji zmienia istniejące wydarzenie', async () => {
    ktoPyta.mockResolvedValue({ uid: 'kod:482913', email: 'Jula', rola: 'board' })
    trybWspolny.mockReturnValue(true)
    const { POST } = await import('@/app/api/planer/route')
    const res = await POST(zada({ semestr: '2026Z', akcja: 'zmien', wydarzenieId: 'w1', wydarzenie: NOWE }))
    expect(res.status).toBe(200)
    expect(zmienDzien).toHaveBeenCalledWith('w1', expect.objectContaining({ tytul: 'SKS' }))
  })

  it('błędne dane to 400 z opisem', async () => {
    ktoPyta.mockResolvedValue({ uid: 'u1', email: 'ja@example.com', rola: 'owner' })
    const { POST } = await import('@/app/api/planer/route')
    const res = await POST(zada({ semestr: '2026Z', akcja: 'dodaj', wydarzenie: { ...NOWE, godzina: '99:99' } }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/GG:MM/)
  })

  it('propozycja nowego wydarzenia też przechodzi walidację', async () => {
    ktoPyta.mockResolvedValue({ uid: 'kod:482913', email: 'Jula', rola: 'board' })
    const { POST } = await import('@/app/api/planer/route')
    const res = await POST(zada({ semestr: '2026Z', akcja: 'propozycja-nowego', wydarzenie: { ...NOWE, tytul: '' } }))
    expect(res.status).toBe(400)
    expect(dodajPropozycje).not.toHaveBeenCalled()
  })

  it('serwer nie ma akcji usuwania — usuwa wyłącznie właściciel, wprost', async () => {
    ktoPyta.mockResolvedValue({ uid: 'kod:482913', email: 'Jula', rola: 'board' })
    trybWspolny.mockReturnValue(true)
    const { POST } = await import('@/app/api/planer/route')
    expect((await POST(zada({ semestr: '2026Z', akcja: 'usun', wydarzenieId: 'w1' }))).status).toBe(400)
  })
```

- [ ] **Krok 2: Uruchom — ma paść**

Run: `npx vitest run app/api/planer/route.test.ts`
Oczekiwane: FAIL w nowych przypadkach („Nieznana akcja” zamiast 403/201/200).

- [ ] **Krok 3: `app/api/planer/route.ts` — import, uprawnienie, akcje**

Dopisz importy:

```ts
import { sprawdzWydarzenie } from '@/lib/planer/walidacja'
import type { Pytajacy } from '@/lib/auth/guard'
```

Zastąp funkcję `trybWspolnyWlaczony`:

```ts
/** Właściciel pisze zawsze; zarząd wyłącznie przy włączonej Sesji Operacyjnej. Rozstrzyga serwer. */
async function wolnoPisacWprost(kto: Pytajacy, semestrId: string): Promise<boolean> {
  return kto.rola === 'owner' || (await stanSesji(semestrId)).wlaczony
}
```

Zastąp blok `if (akcja === 'propozycja-nowego') { … }`:

```ts
    if (akcja === 'propozycja-nowego') {
      const s = sprawdzWydarzenie(body.wydarzenie)
      if (!s.ok) return NextResponse.json({ error: s.blad }, { status: 400 })
      await propozycjeRef(semestr).add({
        rodzaj: 'nowe',
        autor: kto.email,
        utworzone: Date.now(),
        wydarzenie: s.wydarzenie,
      })
      return NextResponse.json({ ok: true }, { status: 201 })
    }

    if (akcja === 'dodaj' || akcja === 'zmien') {
      if (!(await wolnoPisacWprost(kto, semestr))) {
        return NextResponse.json({ error: 'Sesja Operacyjna nie jest włączona' }, { status: 403 })
      }
      const s = sprawdzWydarzenie(body.wydarzenie)
      if (!s.ok) return NextResponse.json({ error: s.blad }, { status: 400 })

      if (akcja === 'dodaj') {
        await wydarzeniaRef(semestr).add({ ...s.wydarzenie, zmienione: Date.now() })
        return NextResponse.json({ ok: true }, { status: 201 })
      }
      if (typeof body.wydarzenieId !== 'string' || !body.wydarzenieId) {
        return NextResponse.json({ error: 'Brak wydarzenia do zmiany' }, { status: 400 })
      }
      await wydarzeniaRef(semestr).doc(body.wydarzenieId).update({ ...s.wydarzenie, zmienione: Date.now() })
      return NextResponse.json({ ok: true })
    }
```

W bloku `przenies` zamień linię `const wolno = kto.rola === 'owner' || (await trybWspolnyWlaczony(semestr))` na:

```ts
      const wolno = await wolnoPisacWprost(kto, semestr)
```

- [ ] **Krok 4: Dopisz do `lib/planer/serwer.ts`**

```ts
/** Zapis wprost przez serwer. Zarządowi serwer pozwoli wyłącznie w trakcie Sesji Operacyjnej. */
export function dodajPrzezSerwer(semestr: string, wydarzenie: NoweWydarzenie): Promise<void> {
  return wyslij({ semestr, akcja: 'dodaj', wydarzenie })
}

export function zmienPrzezSerwer(semestr: string, wydarzenieId: string, wydarzenie: NoweWydarzenie): Promise<void> {
  return wyslij({ semestr, akcja: 'zmien', wydarzenieId, wydarzenie })
}
```

- [ ] **Krok 5: Testy i typy**

Run: `npx vitest run app/api/planer/route.test.ts && npx tsc --noEmit`
Oczekiwane: PASS; brak błędów typów.

- [ ] **Krok 6: Commit**

```bash
git add app/api/planer/route.ts app/api/planer/route.test.ts lib/planer/serwer.ts
git commit -m "feat(planer): zarzad w sesji dodaje i zmienia przez serwer z walidacja"
```

---

## Zadanie 11: Zarząd w sesji zapisuje przez serwer (naprawa błędu)

W sesji `PlanerClient` wołał `zmienWydarzenie`/`dodajWydarzenie` — bezpośredni zapis do Firestore, na który reguły pozwalają wyłącznie właścicielowi. Przesunięcie strzałkami szło tą samą złą drogą także poza sesją.

**Pliki:**
- Modyfikacja: `components/planer/PlanerClient.tsx` (`zapisz`, `przenies`, `przesun`, `PanelWydarzenia`)
- Modyfikacja: `components/planer/PanelWydarzenia.tsx` (prop `mozeUsunac`)
- Test: `components/planer/PanelWydarzenia.test.tsx`

- [ ] **Krok 1: Test — kosz tylko z prawem usuwania. Dopisz w `PanelWydarzenia.test.tsx`**

```ts
  it('bez prawa usuwania nie ma kosza — usuwa wyłącznie właściciel', () => {
    render(<PanelWydarzenia {...wspolne} wydarzenie={w} mozeEdytowac mozeUsunac={false} />)
    expect(screen.queryByRole('button', { name: /usuń/i })).toBeNull()
  })

  it('z prawem usuwania kosz jest', () => {
    render(<PanelWydarzenia {...wspolne} wydarzenie={w} mozeEdytowac mozeUsunac />)
    expect(screen.getByRole('button', { name: /usuń/i })).toBeInTheDocument()
  })
```

- [ ] **Krok 2: Uruchom — ma paść**

Run: `npx vitest run components/planer/PanelWydarzenia.test.tsx`
Oczekiwane: FAIL — kosz jest zawsze przy `mozeEdytowac`.

- [ ] **Krok 3: `PanelWydarzenia.tsx` — prop `mozeUsunac`**

W `type Props` dopisz:

```ts
  /** Usuwanie jest nieodwracalne — ma je wyłącznie właściciel, także w trakcie sesji. */
  mozeUsunac?: boolean
```

Dopisz `mozeUsunac = false` do destrukturyzacji propsów i zamień warunek kosza `{wydarzenie && (` na `{wydarzenie && mozeUsunac && (`.

- [ ] **Krok 4: `PlanerClient.tsx` — importy**

Do importu z `@/lib/planer/serwer` dopisz `dodajPrzezSerwer, zmienPrzezSerwer`.

- [ ] **Krok 5: `PlanerClient.tsx` — zastąp funkcję `zapisz`**

```ts
  async function zapisz(dane: NoweWydarzenie, powtorzenia = 1) {
    try {
      if (!piszeWprost) {
        // Zarząd poza sesją tylko proponuje NOWE wydarzenia; edycja istniejącego
        // jest dla niego zablokowana w panelu, więc tu tylko domykamy furtkę.
        if (wybrane) return
        // Powtarzanie pomijamy celowo: każda kopia byłaby osobną decyzją
        // do rozpatrzenia, a to zasypałoby skrzynkę.
        await zglosNowe(semestr.id, dane)
      } else if (wybrane) {
        if (wlascicielem) await zmienWydarzenie(semestr.id, wybrane.id, dane)
        else await zmienPrzezSerwer(semestr.id, wybrane.id, dane)
      } else {
        // Powtarzanie tworzy osobne wpisy, a nie powiązaną serię — dzięki temu
        // nie ma pytania „edytujesz to jedno czy wszystkie”.
        const terminy = terminyCoTydzien(
          { rok: dane.rok, miesiac: dane.miesiac, dzien: dane.dzien },
          semestr.miesiace,
          powtorzenia,
        )
        for (const t of terminy) {
          // Bezpośredni zapis do Firestore ma wyłącznie właściciel — zarząd
          // w sesji pisze przez serwer, który sam sprawdza, czy sesja trwa.
          if (wlascicielem) await dodajWydarzenie(semestr.id, { ...dane, ...t })
          else await dodajPrzezSerwer(semestr.id, { ...dane, ...t })
        }
      }
      // Osoba na kodzie nie ma subskrypcji — bez tego swoją zmianę zobaczy
      // dopiero przy następnym odpytaniu.
      if (!naZywo && piszeWprost) await odswiez()
      setBlad(null)
      zamknijPanel()
    } catch (e) {
      setBlad(`Nie udało się zapisać: ${(e as Error).message}`)
    }
  }
```

- [ ] **Krok 6: `PlanerClient.tsx` — `przenies` odświeża osobę na kodzie, `przesun` idzie tą samą drogą**

W `przenies`, w gałęzi `else if (sesja.wlaczony)`, po `await przeniesPrzezSerwer(semestr.id, id, naDzien)` dopisz:

```ts
        if (!naZywo) await odswiez()
```

Zastąp funkcję `przesun`:

```ts
  /** Przesunięcie strzałkami. Poza miesiąc nie wychodzimy — to zmieniłoby widok pod palcami. */
  async function przesun(id: string, oDni: number) {
    const w = wydarzenia.find((x) => x.id === id)
    if (!w) return
    const nowy = w.dzien + oDni
    if (nowy < 1 || nowy > dniWMiesiacu(w.rok, w.miesiac)) return
    // Ta sama droga co przeciągnięcie: zarząd poza sesją zgłasza propozycję,
    // w sesji pisze przez serwer. Wprost do Firestore — tylko właściciel.
    await przenies(id, nowy)
  }
```

- [ ] **Krok 7: `PlanerClient.tsx` — panel dostaje prawo usuwania**

W `<PanelWydarzenia …>` dopisz prop `mozeUsunac={wlascicielem}`.

- [ ] **Krok 8: Testy, typy, lint**

Run: `npx vitest run components/planer && npx tsc --noEmit && npx eslint components/planer`
Oczekiwane: czysto.

- [ ] **Krok 9: Commit**

```bash
git add components/planer/PlanerClient.tsx components/planer/PanelWydarzenia.tsx components/planer/PanelWydarzenia.test.tsx
git commit -m "fix(planer): zarzad w sesji zapisuje przez serwer zamiast wprost do Firestore"
```

---

## Zadanie 12: Skład zarządu

**Pliki:**
- Nowy: `lib/planer/sklad.ts`
- Nowy: `components/planer/Sklad.tsx`, test `components/planer/Sklad.test.tsx`
- Modyfikacja: `firestore.rules`
- Modyfikacja: `components/planer/PlanerClient.tsx` (stan, subskrypcja, przycisk, lista osób do filtra)

- [ ] **Krok 1: Utwórz `components/planer/Sklad.test.tsx`**

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Sklad } from '@/components/planer/Sklad'

const wspolne = { onZamknij: vi.fn() }

describe('Sklad', () => {
  it('dodaje osobę bez spacji na brzegach', () => {
    const onZmien = vi.fn()
    render(<Sklad {...wspolne} osoby={['Jula']} onZmien={onZmien} />)
    fireEvent.change(screen.getByLabelText('Nowa osoba'), { target: { value: '  Kuba ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj' }))
    expect(onZmien).toHaveBeenCalledWith(['Jula', 'Kuba'])
  })

  it('nie dubluje osoby i mówi dlaczego', () => {
    const onZmien = vi.fn()
    render(<Sklad {...wspolne} osoby={['Jula']} onZmien={onZmien} />)
    fireEvent.change(screen.getByLabelText('Nowa osoba'), { target: { value: 'jula' } })
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj' }))
    expect(onZmien).not.toHaveBeenCalled()
    expect(screen.getByText(/już jest/i)).toBeInTheDocument()
  })

  it('usuwa osobę', () => {
    const onZmien = vi.fn()
    render(<Sklad {...wspolne} osoby={['Jula', 'Kuba']} onZmien={onZmien} />)
    fireEvent.click(screen.getByRole('button', { name: 'Usuń Jula' }))
    expect(onZmien).toHaveBeenCalledWith(['Kuba'])
  })

  it('pusty skład zaprasza do dodania pierwszej osoby', () => {
    render(<Sklad {...wspolne} osoby={[]} onZmien={vi.fn()} />)
    expect(screen.getByText(/pierwszą osobę/i)).toBeInTheDocument()
  })
})
```

- [ ] **Krok 2: Uruchom — ma paść**

Run: `npx vitest run components/planer/Sklad.test.tsx`
Oczekiwane: FAIL — brak modułu.

- [ ] **Krok 3: Utwórz `components/planer/Sklad.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { Users, X } from 'lucide-react'
import { dodajDoSkladu, usunZeSkladu } from '@/lib/planer/stan'

type Props = {
  osoby: string[]
  onZmien: (osoby: string[]) => void
  onZamknij: () => void
}

/**
 * Lista osób do wyboru przy wydarzeniach. Zmiany nazwy celowo nie ma: osoby
 * są zapisane w wydarzeniach po etykiecie, więc zmiana musiałaby przepisać
 * każde z nich — prościej usunąć i dodać.
 */
export function Sklad({ osoby, onZmien, onZamknij }: Props) {
  const [nowa, setNowa] = useState('')
  const [uwaga, setUwaga] = useState<string | null>(null)

  function dodaj() {
    const po = dodajDoSkladu(osoby, nowa)
    if (po === osoby) {
      setUwaga(nowa.trim() ? `„${nowa.trim()}” już jest w składzie.` : null)
      return
    }
    onZmien(po)
    setNowa('')
    setUwaga(null)
  }

  return (
    <section aria-label="Skład zarządu" className="deck-card rounded-lg p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-deck-text">
          <Users size={14} /> Skład zarządu
        </h2>
        <button type="button" onClick={onZamknij} aria-label="Zamknij" className="text-deck-muted hover:text-deck-text">
          <X size={15} />
        </button>
      </div>
      <p className="mb-3 text-[11px] leading-relaxed text-deck-muted">
        Osoby do wyboru przy wydarzeniach. Usunięcie nie zmienia wydarzeń, w których ktoś już jest.
      </p>

      {osoby.length === 0 ? (
        <p className="mb-3 text-[11.5px] text-deck-muted">Skład jest pusty — dodaj pierwszą osobę.</p>
      ) : (
        <ul className="mb-3 flex flex-wrap gap-1.5">
          {osoby.map((o) => (
            <li key={o} className="deck-chip flex items-center gap-1.5 rounded-md py-1 pl-2.5 pr-1 text-[11.5px] text-deck-text">
              {o}
              <button
                type="button"
                aria-label={`Usuń ${o}`}
                onClick={() => onZmien(usunZeSkladu(osoby, o))}
                className="grid h-4 w-4 place-items-center rounded text-deck-muted hover:text-deck-danger"
              >
                <X size={11} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          dodaj()
        }}
        className="flex gap-2"
      >
        <input
          aria-label="Nowa osoba"
          value={nowa}
          onChange={(e) => {
            setNowa(e.target.value)
            setUwaga(null)
          }}
          placeholder="imię"
          className="deck-input min-w-0 flex-1 rounded-lg px-3 py-2 text-sm"
        />
        <button type="submit" disabled={!nowa.trim()} className="deck-button rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">
          Dodaj
        </button>
      </form>
      {uwaga && <p role="status" className="mt-2 text-[11px] text-deck-warn">{uwaga}</p>}
    </section>
  )
}
```

- [ ] **Krok 4: Utwórz `lib/planer/sklad.ts`**

```ts
'use client'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { baza } from '@/lib/firebase/firestore'
import { naSklad } from './stan'

function skladDoc() {
  return doc(baza(), 'ustawienia', 'sklad')
}

/** Czytają wszyscy z dostępem, pisze właściciel — tak mówią reguły `ustawienia`. */
export function subskrybujSklad(
  gdyZmiana: (osoby: string[]) => void,
  gdyBlad: (b: Error) => void,
): () => void {
  return onSnapshot(skladDoc(), (zrzut) => gdyZmiana(naSklad(zrzut.data())), gdyBlad)
}

export async function zapiszSklad(osoby: string[]): Promise<void> {
  await setDoc(skladDoc(), { osoby, zmienione: Date.now() })
}
```

- [ ] **Krok 5: `firestore.rules` — przed blokiem `match /users/{uid}/{dokument=**}` dopisz**

```
    // Ustawienia wspólne (Skład zarządu): czytają wszyscy z dostępem, pisze
    // właściciel. Zarząd na kodzie dostaje je przez /api/planer.
    match /ustawienia/{dokument} {
      allow read: if maDostep();
      allow write: if jestWlascicielem();
    }
```

- [ ] **Krok 6: `PlanerClient.tsx` — stan i źródła Składu**

Importy: dopisz `Users` do importu z `lucide-react`, a także:

```ts
import { subskrybujSklad, zapiszSklad } from '@/lib/planer/sklad'
import { Sklad } from './Sklad'
```

Stan (obok pozostałych `useState`):

```ts
  const [sklad, setSklad] = useState<string[]>(poczatkowy?.sklad ?? [])
  const [skladOtwarty, setSkladOtwarty] = useState(false)
```

Subskrypcja (obok pozostałych efektów `naZywo`):

```ts
  useEffect(() => {
    if (!naZywo) return
    return subskrybujSklad(setSklad, (e) => setBlad(`Nie udało się pobrać składu: ${e.message}`))
  }, [naZywo])
```

W funkcji `odswiez` po linii z `setWydarzenia` dopisz:

```ts
    if (Array.isArray(d.sklad)) setSklad(d.sklad)
```

Zastąp `useMemo` listy `osoby` (filtr osób):

```ts
  const osoby = useMemo(() => {
    const zWydarzen = new Set<string>()
    for (const w of wydarzenia) for (const o of w.osoby) if (o !== 'wszyscy') zWydarzen.add(o)
    // Najpierw Skład w jego kolejności, potem osoby spoza Składu ze starszych
    // wpisów — inaczej starych wydarzeń nie dałoby się dalej filtrować.
    const spoza = [...zWydarzen].filter((o) => !sklad.includes(o)).sort((a, b) => a.localeCompare(b, 'pl'))
    return [...sklad, ...spoza]
  }, [wydarzenia, sklad])
```

- [ ] **Krok 7: `PlanerClient.tsx` — przycisk i panel Składu**

W pasku właściciela (obok przycisku „Skrzynka”) dopisz:

```tsx
          <button
            type="button"
            onClick={() => setSkladOtwarty((o) => !o)}
            className="deck-chip flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11.5px] text-deck-muted transition hover:text-deck-text"
          >
            <Users size={13} /> Skład
          </button>
```

Pod blokiem `{wlascicielem && skrzynkaOtwarta && (…)}` dopisz:

```tsx
      {wlascicielem && skladOtwarty && (
        <Sklad
          osoby={sklad}
          onZmien={(o) => {
            zapiszSklad(o).catch((e) => setBlad(`Nie udało się zapisać składu: ${(e as Error).message}`))
          }}
          onZamknij={() => setSkladOtwarty(false)}
        />
      )}
```

- [ ] **Krok 8: Testy, typy, lint**

Run: `npx vitest run components/planer && npx tsc --noEmit && npx eslint components/planer lib/planer`
Oczekiwane: czysto.

- [ ] **Krok 9: Commit**

```bash
git add lib/planer/sklad.ts components/planer/Sklad.tsx components/planer/Sklad.test.tsx firestore.rules components/planer/PlanerClient.tsx
git commit -m "feat(planer): Sklad zarzadu edytowany w aplikacji"
```

---

## Zadanie 13: Wybór osób przyciskami

**Pliki:**
- Nowy: `components/planer/WyborOsob.tsx`, test `components/planer/WyborOsob.test.tsx`

- [ ] **Krok 1: Utwórz `components/planer/WyborOsob.test.tsx`**

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WyborOsob } from '@/components/planer/WyborOsob'

const SKLAD = ['Jula', 'Kuba', 'Daria']

describe('WyborOsob', () => {
  it('zaznacza wybrane osoby', () => {
    render(<WyborOsob sklad={SKLAD} wybrane={['Kuba']} onZmien={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Kuba' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Jula' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('dokłada osobę do wybranych', () => {
    const onZmien = vi.fn()
    render(<WyborOsob sklad={SKLAD} wybrane={['Kuba']} onZmien={onZmien} />)
    fireEvent.click(screen.getByRole('button', { name: 'Jula' }))
    expect(onZmien).toHaveBeenCalledWith(['Kuba', 'Jula'])
  })

  it('odznacza wybraną osobę', () => {
    const onZmien = vi.fn()
    render(<WyborOsob sklad={SKLAD} wybrane={['Kuba', 'Jula']} onZmien={onZmien} />)
    fireEvent.click(screen.getByRole('button', { name: 'Kuba' }))
    expect(onZmien).toHaveBeenCalledWith(['Jula'])
  })

  it('„Wszyscy” zastępuje pojedyncze osoby', () => {
    const onZmien = vi.fn()
    render(<WyborOsob sklad={SKLAD} wybrane={['Kuba']} onZmien={onZmien} />)
    fireEvent.click(screen.getByRole('button', { name: 'Wszyscy' }))
    expect(onZmien).toHaveBeenCalledWith(['wszyscy'])
  })

  it('wybór osoby zdejmuje „Wszyscy”', () => {
    const onZmien = vi.fn()
    render(<WyborOsob sklad={SKLAD} wybrane={['wszyscy']} onZmien={onZmien} />)
    fireEvent.click(screen.getByRole('button', { name: 'Daria' }))
    expect(onZmien).toHaveBeenCalledWith(['Daria'])
  })

  it('osoba spoza Składu zostaje widoczna i da się ją odpiąć', () => {
    const onZmien = vi.fn()
    render(<WyborOsob sklad={SKLAD} wybrane={['Ola', 'Kuba']} onZmien={onZmien} />)
    fireEvent.click(screen.getByRole('button', { name: /Ola/ }))
    expect(onZmien).toHaveBeenCalledWith(['Kuba'])
  })

  it('zablokowany nie pozwala klikać', () => {
    render(<WyborOsob sklad={SKLAD} wybrane={[]} onZmien={vi.fn()} zablokowane />)
    expect(screen.getByRole('button', { name: 'Jula' })).toBeDisabled()
  })
})
```

- [ ] **Krok 2: Uruchom — ma paść**

Run: `npx vitest run components/planer/WyborOsob.test.tsx`
Oczekiwane: FAIL — brak modułu.

- [ ] **Krok 3: Utwórz `components/planer/WyborOsob.tsx`**

```tsx
'use client'

type Props = {
  sklad: string[]
  wybrane: string[]
  onZmien: (osoby: string[]) => void
  zablokowane?: boolean
}

const WSZYSCY = 'wszyscy'

function klasa(aktywny: boolean): string {
  return `rounded-md border px-2.5 py-1 text-[11.5px] transition disabled:cursor-not-allowed disabled:opacity-60 ${
    aktywny
      ? 'border-deck-accent/50 bg-deck-accent/15 text-deck-accent'
      : 'border-white/10 text-deck-muted hover:text-deck-text'
  }`
}

/**
 * Osoby z listy zamiast wpisywania z palca — literówka nie tworzy nowej osoby.
 * „Wszyscy” wyklucza pojedyncze osoby i odwrotnie. Osoby zapisane w starszych
 * wydarzeniach, których nie ma w Składzie, zostają jako przyciski do odpięcia,
 * żeby nic nie znikało bez decyzji.
 */
export function WyborOsob({ sklad, wybrane, onZmien, zablokowane = false }: Props) {
  const wszyscy = wybrane.includes(WSZYSCY)
  const spozaSkladu = wybrane.filter((o) => o !== WSZYSCY && !sklad.includes(o))

  function przelacz(osoba: string) {
    const bez = wybrane.filter((o) => o !== WSZYSCY)
    onZmien(bez.includes(osoba) ? bez.filter((o) => o !== osoba) : [...bez, osoba])
  }

  return (
    <div role="group" aria-label="Osoby" className="flex flex-wrap gap-1.5">
      <button
        type="button"
        aria-pressed={wszyscy}
        disabled={zablokowane}
        onClick={() => onZmien(wszyscy ? [] : [WSZYSCY])}
        className={klasa(wszyscy)}
      >
        Wszyscy
      </button>
      {sklad.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={wybrane.includes(o)}
          disabled={zablokowane}
          onClick={() => przelacz(o)}
          className={klasa(wybrane.includes(o))}
        >
          {o}
        </button>
      ))}
      {spozaSkladu.map((o) => (
        <button
          key={o}
          type="button"
          disabled={zablokowane}
          onClick={() => onZmien(wybrane.filter((x) => x !== o))}
          title="Spoza Składu — kliknij, żeby odpiąć"
          className="rounded-md border border-dashed border-white/15 px-2.5 py-1 text-[11.5px] text-deck-muted/70 transition hover:text-deck-danger disabled:opacity-60"
        >
          {o} ×
        </button>
      ))}
      {sklad.length === 0 && (
        <span className="self-center text-[11px] text-deck-muted/70">Skład zarządu jest pusty.</span>
      )}
    </div>
  )
}
```

- [ ] **Krok 4: Uruchom — ma przejść**

Run: `npx vitest run components/planer/WyborOsob.test.tsx`
Oczekiwane: PASS.

- [ ] **Krok 5: Commit**

```bash
git add components/planer/WyborOsob.tsx components/planer/WyborOsob.test.tsx
git commit -m "feat(planer): wybor osob przyciskami zamiast wpisywania"
```

---

## Zadanie 14: Formularz wydarzenia z nowymi polami

**Pliki:**
- Modyfikacja: `components/planer/PanelWydarzenia.tsx` (cały plik)
- Test: `components/planer/PanelWydarzenia.test.tsx` (cały plik)
- Modyfikacja: `components/planer/PlanerClient.tsx` (prop `sklad` dla panelu)

- [ ] **Krok 1: Zastąp `components/planer/PanelWydarzenia.test.tsx`**

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PanelWydarzenia } from '@/components/planer/PanelWydarzenia'
import { POLA_DOMYSLNE, type Wydarzenie } from '@/lib/planer/typy'

const w: Wydarzenie = {
  id: '1', tytul: 'ZEBRANIE ZARZĄDU', kategoria: 'ZEBRANIA',
  rok: 2026, miesiac: 10, dzien: 7, godzina: '18:00', sala: '9J', osoby: ['Jula', 'Kuba'],
  ...POLA_DOMYSLNE,
}

const wspolne = {
  onZapisz: vi.fn(), onUsun: vi.fn(), onZamknij: vi.fn(),
  miesiac: { m: 10, y: 2026 }, sklad: ['Jula', 'Kuba', 'Daria'], mozeUsunac: true,
}

function zapisz() {
  fireEvent.click(screen.getByRole('button', { name: /zapisz/i }))
}

describe('PanelWydarzenia', () => {
  it('pokazuje dane wydarzenia', () => {
    render(<PanelWydarzenia {...wspolne} wydarzenie={w} mozeEdytowac={false} />)
    expect(screen.getByDisplayValue('ZEBRANIE ZARZĄDU')).toBeInTheDocument()
    expect(screen.getByDisplayValue('9J')).toBeInTheDocument()
  })

  it('bez uprawnień pola są zablokowane, a usuwania nie ma', () => {
    render(<PanelWydarzenia {...wspolne} wydarzenie={w} mozeEdytowac={false} />)
    expect(screen.getByDisplayValue('ZEBRANIE ZARZĄDU')).toBeDisabled()
    expect(screen.queryByRole('button', { name: /usuń/i })).toBeNull()
  })

  it('zapisuje zmieniony tytuł bez identyfikatora w danych', () => {
    const onZapisz = vi.fn()
    render(<PanelWydarzenia {...wspolne} onZapisz={onZapisz} wydarzenie={w} mozeEdytowac />)
    fireEvent.change(screen.getByDisplayValue('ZEBRANIE ZARZĄDU'), { target: { value: 'ZEBRANIE SKS' } })
    zapisz()
    expect(onZapisz).toHaveBeenCalledWith(expect.objectContaining({ tytul: 'ZEBRANIE SKS' }), 1)
    expect(onZapisz.mock.calls[0][0]).not.toHaveProperty('id')
  })

  it('nowe wydarzenie startuje z pustym tytułem i nie da się go zapisać bez tytułu', () => {
    render(<PanelWydarzenia {...wspolne} wydarzenie={null} mozeEdytowac />)
    expect(screen.getByLabelText(/tytuł/i)).toHaveValue('')
    expect(screen.getByRole('button', { name: /zapisz/i })).toBeDisabled()
  })

  it('kategorię wybiera się przyciskiem', () => {
    const onZapisz = vi.fn()
    render(<PanelWydarzenia {...wspolne} onZapisz={onZapisz} wydarzenie={w} mozeEdytowac />)
    fireEvent.click(screen.getByRole('button', { name: 'Projekty' }))
    zapisz()
    expect(onZapisz).toHaveBeenCalledWith(expect.objectContaining({ kategoria: 'PROJEKTY' }), 1)
  })

  it('osoby wybiera się przyciskami ze Składu', () => {
    const onZapisz = vi.fn()
    render(<PanelWydarzenia {...wspolne} onZapisz={onZapisz} wydarzenie={w} mozeEdytowac />)
    fireEvent.click(screen.getByRole('button', { name: 'Daria' }))
    zapisz()
    expect(onZapisz).toHaveBeenCalledWith(expect.objectContaining({ osoby: ['Jula', 'Kuba', 'Daria'] }), 1)
  })

  it('cały dzień chowa godziny i zapisuje je jako puste', () => {
    const onZapisz = vi.fn()
    render(<PanelWydarzenia {...wspolne} onZapisz={onZapisz} wydarzenie={w} mozeEdytowac />)
    fireEvent.click(screen.getByLabelText('Cały dzień'))
    expect(screen.queryByLabelText('Od')).toBeNull()
    zapisz()
    expect(onZapisz).toHaveBeenCalledWith(expect.objectContaining({ calyDzien: true, godzina: null }), 1)
  })

  it('godzina „do” przed „od” blokuje zapis z komunikatem', () => {
    render(<PanelWydarzenia {...wspolne} wydarzenie={w} mozeEdytowac />)
    fireEvent.change(screen.getByLabelText('Do'), { target: { value: '17:00' } })
    expect(screen.getByRole('alert')).toHaveTextContent(/po godzinie „od”/)
    expect(screen.getByRole('button', { name: /zapisz/i })).toBeDisabled()
  })

  it('data końca zamienia się na liczbę dni', () => {
    const onZapisz = vi.fn()
    render(<PanelWydarzenia {...wspolne} onZapisz={onZapisz} wydarzenie={w} mozeEdytowac />)
    fireEvent.change(screen.getByLabelText(/do dnia/i), { target: { value: '2026-10-09' } })
    zapisz()
    expect(onZapisz).toHaveBeenCalledWith(expect.objectContaining({ dni: 3 }), 1)
  })

  it('budynek z listy, a przy „Poza uczelnią” pole pyta o nazwę miejsca', () => {
    const onZapisz = vi.fn()
    render(<PanelWydarzenia {...wspolne} onZapisz={onZapisz} wydarzenie={w} mozeEdytowac />)
    fireEvent.change(screen.getByLabelText('Budynek'), { target: { value: 'POZA' } })
    expect(screen.getByPlaceholderText('nazwa miejsca')).toBeInTheDocument()
    zapisz()
    expect(onZapisz).toHaveBeenCalledWith(expect.objectContaining({ budynek: 'POZA' }), 1)
  })

  it('powtarzanie widać tylko przy nowym wydarzeniu', () => {
    const { rerender } = render(<PanelWydarzenia {...wspolne} wydarzenie={w} mozeEdytowac />)
    expect(screen.queryByLabelText(/powtórz co tydzień/i)).toBeNull()
    rerender(<PanelWydarzenia {...wspolne} wydarzenie={null} mozeEdytowac />)
    expect(screen.getByLabelText(/powtórz co tydzień/i)).toBeInTheDocument()
  })

  it('wybrana liczba powtórzeń jedzie do zapisu', () => {
    const onZapisz = vi.fn()
    render(<PanelWydarzenia {...wspolne} onZapisz={onZapisz} wydarzenie={null} mozeEdytowac />)
    fireEvent.change(screen.getByLabelText(/tytuł/i), { target: { value: 'SKS' } })
    fireEvent.change(screen.getByLabelText(/powtórz co tydzień/i), { target: { value: '4' } })
    zapisz()
    expect(onZapisz).toHaveBeenCalledWith(expect.anything(), 4)
  })

  it('bez prawa usuwania nie ma kosza — usuwa wyłącznie właściciel', () => {
    render(<PanelWydarzenia {...wspolne} wydarzenie={w} mozeEdytowac mozeUsunac={false} />)
    expect(screen.queryByRole('button', { name: /usuń/i })).toBeNull()
  })

  it('z prawem usuwania kosz jest', () => {
    render(<PanelWydarzenia {...wspolne} wydarzenie={w} mozeEdytowac />)
    expect(screen.getByRole('button', { name: /usuń/i })).toBeInTheDocument()
  })
})
```

- [ ] **Krok 2: Uruchom — ma paść**

Run: `npx vitest run components/planer/PanelWydarzenia.test.tsx`
Oczekiwane: FAIL w nowych przypadkach (brak przycisków kategorii, pól „Od”/„Do”/„Do dnia”/„Budynek”, wyboru osób).

- [ ] **Krok 3: Zastąp `components/planer/PanelWydarzenia.tsx`**

```tsx
'use client'
import { useState, type ReactNode } from 'react'
import { Trash2, X } from 'lucide-react'
import {
  KATEGORIE, KLUCZE_KATEGORII, POLA_DOMYSLNE,
  type Miesiac, type NoweWydarzenie, type Wydarzenie,
} from '@/lib/planer/typy'
import { dniWMiesiacu } from '@/lib/planer/daty'
import { BUDYNKI, POZA, etykietaBudynku } from '@/lib/planer/budynki'
import { dniMiedzy, koniec, naIso, poczatek, zIso } from '@/lib/planer/trwanie'
import { sprawdzWydarzenie } from '@/lib/planer/walidacja'
import { WyborOsob } from './WyborOsob'

type Props = {
  /** `null` znaczy: formularz nowego wydarzenia. */
  wydarzenie: Wydarzenie | null
  miesiac: Miesiac
  /** Dzień wskazany kliknięciem w kratce; `null` przy dodawaniu z paska. */
  dzienStartowy?: number | null
  mozeEdytowac: boolean
  /** Usuwanie jest nieodwracalne — ma je wyłącznie właściciel, także w trakcie sesji. */
  mozeUsunac?: boolean
  /** Osoby do wyboru — Skład zarządu. */
  sklad: string[]
  /** Wątek pokazujemy tylko przy istniejącym wydarzeniu — nowe nie ma jeszcze o czym rozmawiać. */
  watek?: ReactNode
  /** Dostaje dane już sprawdzone i znormalizowane. `powtorzenia` ma znaczenie tylko przy nowym. */
  onZapisz: (dane: NoweWydarzenie, powtorzenia?: number) => void
  onUsun: (id: string) => void
  onZamknij: () => void
}

function pusty(miesiac: Miesiac, dzien: number | null | undefined): NoweWydarzenie {
  return {
    tytul: '', kategoria: 'ZEBRANIA', rok: miesiac.y, miesiac: miesiac.m,
    dzien: dzien ?? 1, godzina: null, sala: null, osoby: [], ...POLA_DOMYSLNE,
  }
}

function bezId({ id: _id, ...reszta }: Wydarzenie): NoweWydarzenie {
  return reszta
}

/**
 * Formularz nie synchronizuje się z `wydarzenie` przez efekt — rodzic
 * przemontowuje go przez `key`, gdy zmienia się wybrane wydarzenie.
 */
export function PanelWydarzenia({
  wydarzenie, miesiac, dzienStartowy, mozeEdytowac, mozeUsunac = false, sklad, watek,
  onZapisz, onUsun, onZamknij,
}: Props) {
  const [dane, setDane] = useState<NoweWydarzenie>(() =>
    wydarzenie ? bezId(wydarzenie) : pusty(miesiac, dzienStartowy),
  )
  const [powtorzenia, setPowtorzenia] = useState(1)

  function zmien<K extends keyof NoweWydarzenie>(pole: K, wartosc: NoweWydarzenie[K]) {
    setDane((d) => ({ ...d, [pole]: wartosc }))
  }

  /** Wpisuje się datę końca, bo tak myśli człowiek; zapisuje liczbę dni. */
  function zmienKoniec(iso: string) {
    const d = zIso(iso)
    zmien('dni', d ? Math.max(1, dniMiedzy(poczatek(dane), d)) : 1)
  }

  function zmienCalyDzien(wlaczony: boolean) {
    setDane((d) => ({ ...d, calyDzien: wlaczony, ...(wlaczony ? { godzina: null, godzinaDo: null } : {}) }))
  }

  const wynik = sprawdzWydarzenie(dane)
  const poza = dane.budynek === POZA

  const etykieta = 'mb-1 block text-[11px] text-deck-muted'
  const pole = 'deck-input w-full rounded-lg px-3 py-2 text-sm disabled:opacity-60'

  return (
    <aside className="deck-card h-fit w-full rounded-lg p-4">
      <div className="mb-4 flex items-start justify-between">
        <h2 className="text-sm font-semibold text-deck-text">
          {wydarzenie ? 'Wydarzenie' : 'Nowe wydarzenie'}
        </h2>
        <button type="button" onClick={onZamknij} aria-label="Zamknij" className="text-deck-muted hover:text-deck-text">
          <X size={15} />
        </button>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className={etykieta}>Tytuł</span>
          <input
            value={dane.tytul}
            disabled={!mozeEdytowac}
            onChange={(e) => zmien('tytul', e.target.value)}
            className={pole}
          />
        </label>

        <div>
          <span className={etykieta}>Kategoria</span>
          <div role="group" aria-label="Kategoria" className="flex flex-wrap gap-1.5">
            {KLUCZE_KATEGORII.map((k) => {
              const s = KATEGORIE[k]
              const wybrana = dane.kategoria === k
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={wybrana}
                  disabled={!mozeEdytowac}
                  onClick={() => zmien('kategoria', k)}
                  style={wybrana ? { background: s.tlo, borderColor: s.obrys } : undefined}
                  className={`rounded-md border px-2 py-1 text-[11px] transition disabled:opacity-60 ${
                    wybrana ? 'text-deck-text' : 'border-white/10 text-deck-muted hover:text-deck-text'
                  }`}
                >
                  {s.etykieta}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={etykieta}>Dzień</span>
            <select
              value={dane.dzien}
              disabled={!mozeEdytowac}
              onChange={(e) => zmien('dzien', Number(e.target.value))}
              className={pole}
            >
              {Array.from({ length: dniWMiesiacu(dane.rok, dane.miesiac) }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={etykieta}>Do dnia (opcjonalnie)</span>
            <input
              type="date"
              value={dane.dni > 1 ? naIso(koniec(dane)) : ''}
              min={naIso(poczatek(dane))}
              disabled={!mozeEdytowac}
              onChange={(e) => zmienKoniec(e.target.value)}
              className={pole}
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-[12px] text-deck-text">
          <input
            type="checkbox"
            checked={dane.calyDzien}
            disabled={!mozeEdytowac}
            onChange={(e) => zmienCalyDzien(e.target.checked)}
          />
          Cały dzień
        </label>

        {!dane.calyDzien && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={etykieta}>Od</span>
              <input
                type="time"
                value={dane.godzina ?? ''}
                disabled={!mozeEdytowac}
                onChange={(e) => zmien('godzina', e.target.value || null)}
                className={pole}
              />
            </label>
            <label className="block">
              <span className={etykieta}>Do</span>
              <input
                type="time"
                value={dane.godzinaDo ?? ''}
                disabled={!mozeEdytowac}
                onChange={(e) => zmien('godzinaDo', e.target.value || null)}
                className={pole}
              />
            </label>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={etykieta}>Budynek</span>
            <select
              value={dane.budynek ?? ''}
              disabled={!mozeEdytowac}
              onChange={(e) => zmien('budynek', e.target.value || null)}
              className={pole}
            >
              <option value="">—</option>
              {BUDYNKI.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
              <option value={POZA}>{etykietaBudynku(POZA)}</option>
            </select>
          </label>
          <label className="block">
            <span className={etykieta}>{poza ? 'Miejsce' : 'Sala'}</span>
            <input
              value={dane.sala ?? ''}
              disabled={!mozeEdytowac}
              onChange={(e) => zmien('sala', e.target.value || null)}
              placeholder={poza ? 'nazwa miejsca' : '110L'}
              className={pole}
            />
          </label>
        </div>

        <div>
          <span className={etykieta}>Osoby</span>
          <WyborOsob
            sklad={sklad}
            wybrane={dane.osoby}
            onZmien={(o) => zmien('osoby', o)}
            zablokowane={!mozeEdytowac}
          />
        </div>
      </div>

      {mozeEdytowac && !wydarzenie && (
        <label className="mt-3 block">
          <span className={etykieta}>Powtórz co tydzień</span>
          <select
            value={powtorzenia}
            onChange={(e) => setPowtorzenia(Number(e.target.value))}
            className={pole}
          >
            <option value={1}>tylko raz</option>
            {[2, 3, 4, 6, 8, 10, 12, 15, 20].map((n) => (
              <option key={n} value={n}>{n} razy, co tydzień</option>
            ))}
          </select>
          {powtorzenia > 1 && (
            <span className="mt-1 block text-[10.5px] leading-relaxed text-deck-muted/70">
              Powstanie {powtorzenia} osobnych wpisów. Ciąg urwie się na końcu semestru.
            </span>
          )}
        </label>
      )}

      {mozeEdytowac && (
        <>
          {/* Pusty tytuł blokuje przycisk bez komunikatu — krzyczenie „wpisz
              tytuł” zanim ktokolwiek zaczął pisać byłoby szumem. */}
          {!wynik.ok && dane.tytul.trim() !== '' && (
            <p role="alert" className="mt-3 text-[11px] text-deck-danger">{wynik.blad}</p>
          )}
          <div className="mt-5 flex items-center gap-2">
            <button
              type="button"
              disabled={!wynik.ok}
              onClick={() => {
                if (wynik.ok) onZapisz(wynik.wydarzenie, powtorzenia)
              }}
              className="deck-button flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              Zapisz
            </button>
            {wydarzenie && mozeUsunac && (
              <button
                type="button"
                onClick={() => onUsun(wydarzenie.id)}
                aria-label="Usuń"
                className="grid h-10 w-10 place-items-center rounded-lg border border-deck-danger-border text-deck-danger transition hover:bg-deck-danger-bg/60"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </>
      )}
      {wydarzenie && watek}
    </aside>
  )
}
```

- [ ] **Krok 4: `PlanerClient.tsx` — panel dostaje Skład**

W `<PanelWydarzenia …>` dopisz prop `sklad={sklad}`.

- [ ] **Krok 5: Testy, typy, lint**

Run: `npx vitest run components/planer && npx tsc --noEmit && npx eslint components/planer`
Oczekiwane: czysto.

- [ ] **Krok 6: Commit**

```bash
git add components/planer/PanelWydarzenia.tsx components/planer/PanelWydarzenia.test.tsx components/planer/PlanerClient.tsx
git commit -m "feat(planer): formularz z kategoria, wieloma dniami, godzina od-do, budynkiem i osobami"
```

---

# FAZA 3 — widok

## Zadanie 15: Opisy i karta z wyglądem rangi

**Pliki:**
- Nowy: `lib/planer/opis.ts`, test `lib/planer/opis.test.ts`
- Modyfikacja: `components/planer/KartaWydarzenia.tsx` (cały plik), test `components/planer/KartaWydarzenia.test.tsx`

- [ ] **Krok 1: Utwórz `lib/planer/opis.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { opisCzasu, opisMiejsca, opisOsob, porownajWydarzenia } from '@/lib/planer/opis'
import { POLA_DOMYSLNE, type Wydarzenie } from '@/lib/planer/typy'

function w(nadpisz: Partial<Wydarzenie> = {}): Wydarzenie {
  return {
    id: 'x', tytul: 'A', kategoria: 'INNE', rok: 2026, miesiac: 10, dzien: 7,
    godzina: null, sala: null, osoby: [], ...POLA_DOMYSLNE, ...nadpisz,
  }
}

describe('opisCzasu', () => {
  it('cały dzień, przedział, sam start, brak', () => {
    expect(opisCzasu(w({ calyDzien: true }))).toBe('cały dzień')
    expect(opisCzasu(w({ godzina: '18:00', godzinaDo: '20:00' }))).toBe('18:00–20:00')
    expect(opisCzasu(w({ godzina: '18:00' }))).toBe('18:00')
    expect(opisCzasu(w())).toBeNull()
  })
})

describe('opisMiejsca', () => {
  it('budynek z salą, sam budynek, stara sala, poza uczelnią', () => {
    expect(opisMiejsca(w({ budynek: 'B/L', sala: '110L' }))).toBe('B/L 110L')
    expect(opisMiejsca(w({ budynek: 'CKU' }))).toBe('CKU')
    expect(opisMiejsca(w({ sala: '9J' }))).toBe('9J')
    expect(opisMiejsca(w({ budynek: 'POZA', sala: 'Pralnia' }))).toBe('Poza: Pralnia')
    expect(opisMiejsca(w({ budynek: 'POZA' }))).toBe('Poza uczelnią')
    expect(opisMiejsca(w())).toBeNull()
  })
})

describe('opisOsob', () => {
  it('lista, cały zarząd, nikt', () => {
    expect(opisOsob(['Jula', 'Kuba'])).toBe('Jula, Kuba')
    expect(opisOsob(['wszyscy'])).toBe('wszyscy')
    expect(opisOsob([])).toBeNull()
  })
})

describe('porownajWydarzenia', () => {
  it('najpierw ranga, potem godzina, potem tytuł', () => {
    const lista = [
      w({ id: 'apl', kategoria: 'APLIKACJE', godzina: '08:00' }),
      w({ id: 'zeb-pozno', kategoria: 'ZEBRANIA', godzina: '20:00' }),
      w({ id: 'zeb-wczesnie', kategoria: 'ZEBRANIA', godzina: '09:00' }),
      w({ id: 'ssuew', kategoria: 'SSUEW' }),
    ].sort(porownajWydarzenia)
    expect(lista.map((x) => x.id)).toEqual(['zeb-wczesnie', 'zeb-pozno', 'ssuew', 'apl'])
  })
})
```

- [ ] **Krok 2: Dopisz w `components/planer/KartaWydarzenia.test.tsx`**

```tsx
  it('najważniejsze kategorie mają numer rangi, aplikacje — nie', () => {
    const { container, rerender } = render(<KartaWydarzenia wydarzenie={w} onOtworz={vi.fn()} przeciagalne={false} />)
    expect(container.querySelector('[data-numer-rangi]')?.textContent).toBe('1')
    rerender(<KartaWydarzenia wydarzenie={{ ...w, kategoria: 'APLIKACJE' }} onOtworz={vi.fn()} przeciagalne={false} />)
    expect(container.querySelector('[data-numer-rangi]')).toBeNull()
  })

  it('pokazuje przedział godzin i miejsce', () => {
    render(
      <KartaWydarzenia
        wydarzenie={{ ...w, godzinaDo: '20:00', budynek: 'B/L', sala: '110L' }}
        onOtworz={vi.fn()}
        przeciagalne={false}
      />,
    )
    expect(screen.getByText('18:00–20:00')).toBeInTheDocument()
    expect(screen.getByText('B/L 110L')).toBeInTheDocument()
  })

  it('cały dzień zamiast godziny', () => {
    render(<KartaWydarzenia wydarzenie={{ ...w, calyDzien: true, godzina: null }} onOtworz={vi.fn()} przeciagalne={false} />)
    expect(screen.getByText('cały dzień')).toBeInTheDocument()
  })

  it('miejsce poza uczelnią', () => {
    render(<KartaWydarzenia wydarzenie={{ ...w, budynek: 'POZA', sala: 'Pralnia' }} onOtworz={vi.fn()} przeciagalne={false} />)
    expect(screen.getByText('Poza: Pralnia')).toBeInTheDocument()
  })

  it('pokazuje dopisek dnia wydarzenia wielodniowego', () => {
    render(<KartaWydarzenia wydarzenie={w} onOtworz={vi.fn()} przeciagalne={false} dopisek="2/4" />)
    expect(screen.getByText('2/4')).toBeInTheDocument()
  })
```

- [ ] **Krok 3: Uruchom — mają paść**

Run: `npx vitest run lib/planer/opis.test.ts components/planer/KartaWydarzenia.test.tsx`
Oczekiwane: FAIL — brak modułu `opis`, brak numeru rangi i drugiej linijki.

- [ ] **Krok 4: Utwórz `lib/planer/opis.ts`**

```ts
import { POZA } from './budynki'
import { KATEGORIE, type Wydarzenie } from './typy'

/** „cały dzień”, „18:00–20:00”, „18:00” albo nic, gdy godzina nieustalona. */
export function opisCzasu(w: Pick<Wydarzenie, 'calyDzien' | 'godzina' | 'godzinaDo'>): string | null {
  if (w.calyDzien) return 'cały dzień'
  if (w.godzina && w.godzinaDo) return `${w.godzina}–${w.godzinaDo}`
  return w.godzina
}

/** „B/L 110L”, sam budynek, sama sala ze starszych wpisów albo miejsce poza uczelnią. */
export function opisMiejsca(w: Pick<Wydarzenie, 'budynek' | 'sala'>): string | null {
  if (w.budynek === POZA) return w.sala ? `Poza: ${w.sala}` : 'Poza uczelnią'
  if (w.budynek && w.sala) return `${w.budynek} ${w.sala}`
  return w.budynek ?? w.sala
}

export function opisOsob(osoby: string[]): string | null {
  if (!osoby.length) return null
  return osoby.includes('wszyscy') ? 'wszyscy' : osoby.join(', ')
}

/** Klucz czasu do sortowania: cały dzień przed godzinami, nieustalona na końcu. */
const kluczCzasu = (w: Wydarzenie) => (w.calyDzien ? '00:00' : w.godzina ?? '99:99')

/**
 * Kolejność w kratce i w eksporcie: najpierw ranga kategorii, w obrębie rangi
 * w kolejności zegara, na końcu tytuł.
 */
export function porownajWydarzenia(a: Wydarzenie, b: Wydarzenie): number {
  return (
    KATEGORIE[a.kategoria].ranga - KATEGORIE[b.kategoria].ranga
    || kluczCzasu(a).localeCompare(kluczCzasu(b))
    || a.tytul.localeCompare(b.tytul, 'pl')
  )
}
```

- [ ] **Krok 5: Zastąp `components/planer/KartaWydarzenia.tsx`**

```tsx
'use client'
import type { CSSProperties, KeyboardEvent } from 'react'
import { KATEGORIE, numerRangi, type Wydarzenie } from '@/lib/planer/typy'
import { opisCzasu, opisMiejsca } from '@/lib/planer/opis'

type Props = {
  wydarzenie: Wydarzenie
  onOtworz: (w: Wydarzenie) => void
  przeciagalne: boolean
  onPrzeciagnij?: (id: string) => void
  /** Przesunięcie o podaną liczbę dni — obsługa klawiatury. */
  onPrzesun?: (id: string, oDni: number) => void
  /** Czy przy wydarzeniu toczy się rozmowa. Kropka bez liczby — liczbę widać po otwarciu. */
  maRozmowe?: boolean
  /** Który to dzień wydarzenia wielodniowego, np. „2/4” — na liście dni na telefonie. */
  dopisek?: string
}

/**
 * Ważność widać po „ciężarze” karty: Zebrania to pełny blok, SSUEW karta
 * z obrysem, Projekty karta z paskiem, UE cienka linia, Aplikacje i Inne
 * sam tekst z kropką. Wariant wybrany na Sesji Operacyjnej.
 */
function wyglad(w: Wydarzenie): { klasa: string; styl: CSSProperties } {
  const s = KATEGORIE[w.kategoria]
  switch (s.ranga) {
    case 1:
      return { klasa: 'rounded px-1.5 py-1 font-semibold text-deck-bg-deep', styl: { background: s.obrys } }
    case 2:
      return { klasa: 'rounded border px-1.5 py-1 text-deck-text', styl: { background: s.tlo, borderColor: s.obrys } }
    case 3:
      return { klasa: 'rounded border-l-[3px] px-1.5 py-1 text-deck-text', styl: { background: s.tlo, borderColor: s.obrys } }
    case 4:
      return { klasa: 'border-l-2 px-1.5 py-0.5 text-deck-text/90', styl: { borderColor: s.obrys } }
    default:
      return { klasa: 'px-1 py-0.5 text-deck-muted', styl: {} }
  }
}

export function KartaWydarzenia({
  wydarzenie, onOtworz, przeciagalne, onPrzeciagnij, onPrzesun, maRozmowe, dopisek,
}: Props) {
  const s = KATEGORIE[wydarzenie.kategoria]
  const { klasa, styl } = wyglad(wydarzenie)
  const numer = numerRangi(wydarzenie.kategoria)
  const pelna = s.ranga === 1
  const czas = opisCzasu(wydarzenie)
  const miejsce = opisMiejsca(wydarzenie)

  /**
   * Przeciąganie działa tylko myszą, więc te same przesunięcia obsługują
   * strzałki: w bok o dzień, w pionie o tydzień.
   */
  function naKlawisz(e: KeyboardEvent<HTMLButtonElement>) {
    if (!przeciagalne || !onPrzesun) return
    const oDni = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]
    if (oDni === undefined) return
    e.preventDefault()
    onPrzesun(wydarzenie.id, oDni)
  }

  return (
    <button
      type="button"
      data-ranga={s.ranga}
      draggable={przeciagalne || undefined}
      onDragStart={przeciagalne ? () => onPrzeciagnij?.(wydarzenie.id) : undefined}
      onClick={() => onOtworz(wydarzenie)}
      onKeyDown={naKlawisz}
      style={styl}
      className={`block w-full text-left text-[10.5px] leading-tight transition hover:brightness-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-deck-accent ${klasa}`}
      title={
        przeciagalne
          ? `${wydarzenie.tytul}\nStrzałki przesuwają: w bok o dzień, w pionie o tydzień.`
          : wydarzenie.tytul
      }
    >
      <span className="flex items-start gap-1">
        {numer !== null ? (
          <span
            data-numer-rangi
            style={pelna ? undefined : { background: s.obrys }}
            className={`mt-px shrink-0 rounded px-1 font-mono text-[8.5px] font-bold text-deck-bg-deep ${pelna ? 'bg-deck-bg-deep/20' : ''}`}
          >
            {numer}
          </span>
        ) : (
          <span aria-hidden className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: s.obrys }} />
        )}
        {maRozmowe && (
          <span
            data-rozmowa
            aria-label="ma komentarze"
            className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-deck-accent"
          />
        )}
        <span className="min-w-0 truncate">
          {wydarzenie.tytul}
          {dopisek && <span className="ml-1 font-mono text-[9px] opacity-70">{dopisek}</span>}
        </span>
      </span>
      {(czas || miejsce) && (
        <span className={`mt-0.5 block truncate font-mono text-[9.5px] ${pelna ? 'text-deck-bg-deep/75' : 'text-deck-muted'}`}>
          {czas && <span>{czas}</span>}
          {czas && miejsce && ' · '}
          {miejsce && <span>{miejsce}</span>}
        </span>
      )}
    </button>
  )
}
```

- [ ] **Krok 6: Uruchom — mają przejść**

Run: `npx vitest run lib/planer/opis.test.ts components/planer`
Oczekiwane: PASS, łącznie z dotychczasowymi testami `KartaWydarzenia` i `WidokMiesiaca`.

- [ ] **Krok 7: Commit**

```bash
git add lib/planer/opis.ts lib/planer/opis.test.ts components/planer/KartaWydarzenia.tsx components/planer/KartaWydarzenia.test.tsx
git commit -m "feat(planer): karta z wygladem rangi, przedzialem godzin i miejscem"
```

---

## Zadanie 16: Tygodnie miesiąca i pasy wydarzeń wielodniowych

**Pliki:**
- Nowy: `lib/planer/pasy.ts`, test `lib/planer/pasy.test.ts`

Kontekst do testów: 1.10.2026 to czwartek, 1.11.2026 — niedziela.

- [ ] **Krok 1: Utwórz `lib/planer/pasy.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { odcinkiTygodnia, tygodnieMiesiaca } from '@/lib/planer/pasy'
import { POLA_DOMYSLNE, type Wydarzenie } from '@/lib/planer/typy'

const PAZ = { m: 10, y: 2026 }
const LIS = { m: 11, y: 2026 }

function w(dzien: number, dni: number, id = `${dzien}-${dni}`, miesiac = 10): Wydarzenie {
  return {
    id, tytul: id, kategoria: 'PROJEKTY', rok: 2026, miesiac, dzien,
    godzina: null, sala: null, osoby: [], ...POLA_DOMYSLNE, dni,
  }
}

describe('tygodnieMiesiaca', () => {
  it('układa październik 2026 od poniedziałku', () => {
    const t = tygodnieMiesiaca(PAZ)
    expect(t).toHaveLength(5)
    expect(t[0]).toEqual([null, null, null, 1, 2, 3, 4])
    expect(t[4]).toEqual([26, 27, 28, 29, 30, 31, null])
  })
})

describe('odcinkiTygodnia', () => {
  it('wydarzenie w środku tygodnia to jeden odcinek bez kontynuacji', () => {
    const [o] = odcinkiTygodnia(tygodnieMiesiaca(PAZ)[1], PAZ, [w(8, 3)])
    expect(o).toMatchObject({ kolOd: 3, kolDo: 5, ciagnieSieZLewej: false, ciagnieSieWPrawo: false, pas: 0 })
  })

  it('wydarzenie przez weekend łamie się na granicy tygodnia', () => {
    const t = tygodnieMiesiaca(PAZ)
    const [przed] = odcinkiTygodnia(t[1], PAZ, [w(10, 5)])
    const [po] = odcinkiTygodnia(t[2], PAZ, [w(10, 5)])
    expect(przed).toMatchObject({ kolOd: 5, kolDo: 6, ciagnieSieWPrawo: true })
    expect(po).toMatchObject({ kolOd: 0, kolDo: 1, ciagnieSieZLewej: true, ciagnieSieWPrawo: false })
  })

  it('wydarzenie przez przełom miesięcy ma strzałki na krawędziach miesiąca', () => {
    const wyjazd = w(30, 4)
    const [paz] = odcinkiTygodnia(tygodnieMiesiaca(PAZ)[4], PAZ, [wyjazd])
    const [lis] = odcinkiTygodnia(tygodnieMiesiaca(LIS)[0], LIS, [wyjazd])
    expect(paz).toMatchObject({ kolOd: 4, kolDo: 5, ciagnieSieWPrawo: true })
    expect(lis).toMatchObject({ kolOd: 6, kolDo: 6, ciagnieSieZLewej: true })
  })

  it('nachodzące na siebie trafiają do różnych pasów, rozłączne — do jednego', () => {
    const t = tygodnieMiesiaca(PAZ)[1]
    const nachodzace = odcinkiTygodnia(t, PAZ, [w(6, 3, 'a'), w(7, 3, 'b')])
    expect(new Set(nachodzace.map((o) => o.pas))).toEqual(new Set([0, 1]))
    const rozlaczne = odcinkiTygodnia(t, PAZ, [w(5, 2, 'a'), w(8, 2, 'b')])
    expect(rozlaczne.map((o) => o.pas)).toEqual([0, 0])
  })

  it('wydarzenie spoza tygodnia nie daje odcinka', () => {
    expect(odcinkiTygodnia(tygodnieMiesiaca(PAZ)[0], PAZ, [w(20, 2)])).toEqual([])
  })
})
```

- [ ] **Krok 2: Uruchom — ma paść**

Run: `npx vitest run lib/planer/pasy.test.ts`
Oczekiwane: FAIL — brak modułu.

- [ ] **Krok 3: Utwórz `lib/planer/pasy.ts`**

```ts
import { dniWMiesiacu, pierwszyDzienTygodnia } from './daty'
import { dniTrwaniaWMiesiacu, koniec, poczatek, porownajDaty } from './trwanie'
import type { Miesiac, Wydarzenie } from './typy'

/** Siedem kolumn Pn–Nd; `null` to dzień spoza miesiąca. */
export type Tydzien = (number | null)[]

export function tygodnieMiesiaca(m: Miesiac): Tydzien[] {
  const komorki: (number | null)[] = [
    ...Array<null>(pierwszyDzienTygodnia(m.y, m.m)).fill(null),
    ...Array.from({ length: dniWMiesiacu(m.y, m.m) }, (_, i) => i + 1),
  ]
  while (komorki.length % 7) komorki.push(null)
  const tygodnie: Tydzien[] = []
  for (let i = 0; i < komorki.length; i += 7) tygodnie.push(komorki.slice(i, i + 7))
  return tygodnie
}

/** Kawałek wydarzenia wielodniowego w jednym tygodniu. */
export interface Odcinek {
  wydarzenie: Wydarzenie
  kolOd: number
  kolDo: number
  /** Wydarzenie zaczęło się przed tym odcinkiem — w poprzednim tygodniu albo miesiącu. */
  ciagnieSieZLewej: boolean
  /** Wydarzenie trwa dalej za tym odcinkiem. */
  ciagnieSieWPrawo: boolean
  /** Numer poziomego pasa nad kratkami; nachodzące wydarzenia dostają różne. */
  pas: number
}

export function odcinkiTygodnia(tydzien: Tydzien, m: Miesiac, wielodniowe: Wydarzenie[]): Odcinek[] {
  const odcinki: Omit<Odcinek, 'pas'>[] = []

  for (const w of wielodniowe) {
    const dni = new Set(dniTrwaniaWMiesiacu(w, m))
    const kolumny = tydzien.flatMap((d, i) => (d !== null && dni.has(d) ? [i] : []))
    if (!kolumny.length) continue
    const kolOd = kolumny[0]
    const kolDo = kolumny[kolumny.length - 1]
    const dataOd = { rok: m.y, miesiac: m.m, dzien: tydzien[kolOd] as number }
    const dataDo = { rok: m.y, miesiac: m.m, dzien: tydzien[kolDo] as number }
    odcinki.push({
      wydarzenie: w,
      kolOd,
      kolDo,
      ciagnieSieZLewej: porownajDaty(poczatek(w), dataOd) < 0,
      ciagnieSieWPrawo: porownajDaty(koniec(w), dataDo) > 0,
    })
  }

  // Od lewej, a przy wspólnym starcie dłuższe najpierw — krótsze wypełniają
  // wtedy luki w niższych pasach zamiast otwierać nowe.
  odcinki.sort((a, b) => a.kolOd - b.kolOd || (b.kolDo - b.kolOd) - (a.kolDo - a.kolOd))

  const koncePasow: number[] = []
  return odcinki.map((o) => {
    let pas = koncePasow.findIndex((k) => k < o.kolOd)
    if (pas === -1) {
      pas = koncePasow.length
      koncePasow.push(o.kolDo)
    } else {
      koncePasow[pas] = o.kolDo
    }
    return { ...o, pas }
  })
}
```

- [ ] **Krok 4: Uruchom — ma przejść**

Run: `npx vitest run lib/planer/pasy.test.ts`
Oczekiwane: PASS.

- [ ] **Krok 5: Commit**

```bash
git add lib/planer/pasy.ts lib/planer/pasy.test.ts
git commit -m "feat(planer): tygodnie miesiaca i pasy wydarzen wielodniowych"
```

---

## Zadanie 17: Widok miesiąca w rzędach tygodni z paskami i legendą

**Pliki:**
- Nowy: `components/planer/PasekWielodniowy.tsx`
- Modyfikacja: `components/planer/WidokMiesiaca.tsx` (cały plik), test `components/planer/WidokMiesiaca.test.tsx`
- Modyfikacja: `components/planer/PlanerClient.tsx` (`wMiesiacu`)

- [ ] **Krok 1: Dopisz testy w `components/planer/WidokMiesiaca.test.tsx`**

Pod stałą `wydarzenia` dopisz:

```ts
const wyjazd: Wydarzenie = {
  id: '3', tytul: 'WYJAZD', kategoria: 'PROJEKTY', rok: 2026, miesiac: 10, dzien: 8,
  godzina: null, sala: null, osoby: [], ...POLA_DOMYSLNE, dni: 3,
}

function lista(container: HTMLElement) {
  return within(container.querySelector('[data-widok="lista"]') as HTMLElement)
}
```

Na końcu `describe('WidokMiesiaca', …)`:

```tsx
  it('wydarzenie wielodniowe to jeden pasek, nie kopie w kratkach', () => {
    const { container } = render(<WidokMiesiaca {...wspolne} wydarzenia={[wyjazd]} />)
    expect(container.querySelectorAll('[data-widok="siatka"] [data-pasek]')).toHaveLength(1)
    expect(siatka(container).getAllByText('WYJAZD')).toHaveLength(1)
  })

  it('na telefonie wielodniowe jest w każdym dniu z dopiskiem', () => {
    const { container } = render(<WidokMiesiaca {...wspolne} wydarzenia={[wyjazd]} />)
    expect(lista(container).getByText('1/3')).toBeInTheDocument()
    expect(lista(container).getByText('3/3')).toBeInTheDocument()
  })

  it('w kratce najważniejsze na górze, mimo późniejszej godziny', () => {
    const dzien: Wydarzenie[] = [
      { ...wydarzenia[0], id: 'a', kategoria: 'APLIKACJE', godzina: '08:00', osoby: [], dzien: 9 },
      { ...wydarzenia[0], id: 'z', kategoria: 'ZEBRANIA', godzina: '20:00', osoby: [], dzien: 9 },
    ]
    const { container } = render(<WidokMiesiaca {...wspolne} wydarzenia={dzien} />)
    const rangi = [...container.querySelectorAll('[data-widok="siatka"] [data-ranga]')].map(
      (e) => (e as HTMLElement).dataset.ranga,
    )
    expect(rangi).toEqual(['1', '5'])
  })

  it('pasek ze startem w poprzednim miesiącu nie jest przeciągalny', () => {
    const zPazdziernika: Wydarzenie = { ...wyjazd, dzien: 30, dni: 4 }
    const { container } = render(
      <WidokMiesiaca {...wspolne} miesiac={{ m: 11, y: 2026 }} mozeEdytowac wydarzenia={[zPazdziernika]} />,
    )
    const pasek = container.querySelector('[data-widok="siatka"] [data-pasek]')
    expect(pasek).not.toBeNull()
    expect(pasek?.getAttribute('draggable')).toBeNull()
  })

  it('pokazuje legendę rang', () => {
    const { container } = render(<WidokMiesiaca {...wspolne} wydarzenia={[]} />)
    expect(container.querySelector('[data-legenda]')?.textContent).toMatch(/1Zebrania/)
  })
```

`POLA_DOMYSLNE` jest już zaimportowany w tym pliku od zadania 6.

- [ ] **Krok 2: Uruchom — ma paść**

Run: `npx vitest run components/planer/WidokMiesiaca.test.tsx`
Oczekiwane: FAIL w nowych przypadkach.

- [ ] **Krok 3: Utwórz `components/planer/PasekWielodniowy.tsx`**

```tsx
'use client'
import type { KeyboardEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { KATEGORIE, numerRangi, type Wydarzenie } from '@/lib/planer/typy'
import { opisCzasu, opisMiejsca } from '@/lib/planer/opis'
import type { Odcinek } from '@/lib/planer/pasy'

type Props = {
  odcinek: Odcinek
  onOtworz: (w: Wydarzenie) => void
  przeciagalne: boolean
  onPrzeciagnij?: (id: string) => void
  onPrzesun?: (id: string, oDni: number) => void
}

/**
 * Wydarzenie wielodniowe jako jeden pasek przez dni, jak w kalendarzu Google.
 * Przeciągnięcie i strzałki przesuwają start; długość zostaje.
 */
export function PasekWielodniowy({ odcinek, onOtworz, przeciagalne, onPrzeciagnij, onPrzesun }: Props) {
  const w = odcinek.wydarzenie
  const s = KATEGORIE[w.kategoria]
  const numer = numerRangi(w.kategoria)
  const pelny = s.ranga === 1
  const opis = [opisCzasu(w), opisMiejsca(w)].filter(Boolean).join(' · ')

  function naKlawisz(e: KeyboardEvent<HTMLButtonElement>) {
    if (!przeciagalne || !onPrzesun) return
    const oDni = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]
    if (oDni === undefined) return
    e.preventDefault()
    onPrzesun(w.id, oDni)
  }

  return (
    <button
      type="button"
      data-pasek
      data-ranga={s.ranga}
      draggable={przeciagalne || undefined}
      onDragStart={przeciagalne ? () => onPrzeciagnij?.(w.id) : undefined}
      onClick={() => onOtworz(w)}
      onKeyDown={naKlawisz}
      title={`${w.tytul}${opis ? `\n${opis}` : ''}`}
      style={{
        // Jawny wiersz: bez niego siatka mogłaby zepchnąć pasek do nowego rzędu.
        gridRow: 1,
        gridColumn: `${odcinek.kolOd + 1} / ${odcinek.kolDo + 2}`,
        ...(pelny ? { background: s.obrys } : { background: s.tlo, borderColor: s.obrys }),
      }}
      className={`flex h-[22px] min-w-0 items-center gap-1 border px-1.5 text-left text-[10.5px] transition hover:brightness-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-deck-accent ${
        pelny ? 'border-transparent font-semibold text-deck-bg-deep' : 'text-deck-text'
      } ${odcinek.ciagnieSieZLewej ? '' : 'rounded-l'} ${odcinek.ciagnieSieWPrawo ? '' : 'rounded-r'}`}
    >
      {odcinek.ciagnieSieZLewej && <ChevronLeft size={11} aria-label="zaczęło się wcześniej" className="shrink-0" />}
      {numer !== null && <span className="shrink-0 font-mono text-[8.5px] font-bold">{numer}</span>}
      <span className="truncate">{w.tytul}</span>
      {opis && <span className="truncate font-mono text-[9.5px] opacity-75">· {opis}</span>}
      {odcinek.ciagnieSieWPrawo && <ChevronRight size={11} aria-label="trwa dalej" className="ml-auto shrink-0" />}
    </button>
  )
}
```

- [ ] **Krok 4: Zastąp `components/planer/WidokMiesiaca.tsx`**

```tsx
'use client'
import { useMemo, useState } from 'react'
import { AlertTriangle, Plus } from 'lucide-react'
import { dniWMiesiacu, dzienTygodnia } from '@/lib/planer/daty'
import { kolizjeWMiesiacu, type KolizjeDnia } from '@/lib/planer/kolizje'
import { porownajWydarzenia } from '@/lib/planer/opis'
import { odcinkiTygodnia, tygodnieMiesiaca } from '@/lib/planer/pasy'
import { dniMiedzy, dniTrwaniaWMiesiacu, poczatek } from '@/lib/planer/trwanie'
import { KATEGORIE, KLUCZE_KATEGORII, numerRangi, type Miesiac, type Wydarzenie } from '@/lib/planer/typy'
import { KartaWydarzenia } from './KartaWydarzenia'
import { PasekWielodniowy } from './PasekWielodniowy'

const NAGLOWKI = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nie']
const NAZWA_MIESIACA = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
]

type Props = {
  miesiac: Miesiac
  /** Wydarzenia, które nachodzą na miesiąc — także wielodniowe ze startem obok. */
  wydarzenia: Wydarzenie[]
  onOtworz: (w: Wydarzenie) => void
  onPrzenies: (id: string, naDzien: number) => void
  onPrzesun: (id: string, oDni: number) => void
  onDodajWDniu: (dzien: number) => void
  mozeEdytowac: boolean
  /** Identyfikatory wydarzeń, przy których toczy się rozmowa. */
  zRozmowa?: Set<string>
}

/** Opis kolizji do dymka — sam trójkąt mówi „coś jest nie tak", ale nie co. */
function opiszKolizje(k: KolizjeDnia): string {
  const czesci = [
    ...k.osoby.map((o) =>
      o.twarda
        ? `${o.osoba}: ${o.ile} wydarzenia nakładają się w czasie`
        : `${o.osoba}: ${o.ile} wydarzenia tego dnia`,
    ),
    ...k.sale.map((s) => `sala ${s.sala}: ${s.godziny.join(', ')}`),
  ]
  return czesci.join('\n')
}

function Legenda() {
  return (
    <div data-legenda className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-deck-muted">
      {KLUCZE_KATEGORII.map((k) => {
        const n = numerRangi(k)
        return (
          <span key={k} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: KATEGORIE[k].obrys }} />
            {n !== null && <span className="font-mono text-deck-muted/70">{n}</span>}
            {KATEGORIE[k].etykieta}
          </span>
        )
      })}
    </div>
  )
}

export function WidokMiesiaca({
  miesiac, wydarzenia, onOtworz, onPrzenies, onPrzesun, onDodajWDniu, mozeEdytowac,
  zRozmowa,
}: Props) {
  const [przeciagany, setPrzeciagany] = useState<string | null>(null)
  const [nadDniem, setNadDniem] = useState<number | null>(null)

  const ile = dniWMiesiacu(miesiac.y, miesiac.m)
  const kolizje = useMemo(() => kolizjeWMiesiacu(wydarzenia, miesiac), [wydarzenia, miesiac])
  const tygodnie = useMemo(() => tygodnieMiesiaca(miesiac), [miesiac])

  /** Wielodniowe są paskami nad kratkami; w kratkach zostają jednodniowe. */
  const wielodniowe = useMemo(
    () => wydarzenia
      .filter((w) => w.dni > 1 && dniTrwaniaWMiesiacu(w, miesiac).length > 0)
      .sort(porownajWydarzenia),
    [wydarzenia, miesiac],
  )

  const poDniach = useMemo(() => {
    const mapa = new Map<number, Wydarzenie[]>()
    for (const w of wydarzenia) {
      if (w.dni > 1 || w.miesiac !== miesiac.m || w.rok !== miesiac.y) continue
      const lista = mapa.get(w.dzien) ?? []
      lista.push(w)
      mapa.set(w.dzien, lista)
    }
    // Najważniejsze na górze, w obrębie rangi w kolejności zegara.
    for (const lista of mapa.values()) lista.sort(porownajWydarzenia)
    return mapa
  }, [wydarzenia, miesiac])

  /** Lista na telefon: każdy dzień z czymkolwiek, wielodniowe z dopiskiem „2/4”. */
  const naLiscie = useMemo(() => {
    const dni: { dzien: number; pozycje: { w: Wydarzenie; dopisek?: string }[] }[] = []
    for (let dzien = 1; dzien <= ile; dzien++) {
      const data = { rok: miesiac.y, miesiac: miesiac.m, dzien }
      const pozycje = [
        ...wielodniowe
          .filter((w) => dniTrwaniaWMiesiacu(w, miesiac).includes(dzien))
          .map((w) => ({ w, dopisek: `${dniMiedzy(poczatek(w), data)}/${w.dni}` })),
        ...(poDniach.get(dzien) ?? []).map((w) => ({ w })),
      ].sort((a, b) => porownajWydarzenia(a.w, b.w))
      if (pozycje.length) dni.push({ dzien, pozycje })
    }
    return dni
  }, [ile, miesiac, wielodniowe, poDniach])

  /**
   * Pasek ze startem w innym miesiącu nie jest przeciągalny: upuszczenie
   * ustawiłoby dzień startu w złym miesiącu. Taki zmienia się w panelu.
   */
  const startujeTutaj = (w: Wydarzenie) => w.miesiac === miesiac.m && w.rok === miesiac.y

  const dzis = new Date()
  const dzisiajWTymMiesiacu =
    dzis.getFullYear() === miesiac.y && dzis.getMonth() + 1 === miesiac.m ? dzis.getDate() : null

  function upusc(dzien: number) {
    const id = przeciagany
    setPrzeciagany(null)
    setNadDniem(null)
    if (id) onPrzenies(id, dzien)
  }

  function kratka(dzien: number, kolumna: number) {
    const kol = kolizje.get(dzien)
    const twarda = kol?.osoby.some((o) => o.twarda) || (kol?.sale.length ?? 0) > 0
    const weekend = kolumna >= 5
    const dzisiaj = dzien === dzisiajWTymMiesiacu
    const cel = nadDniem === dzien

    return (
      <div
        key={dzien}
        onDragOver={mozeEdytowac ? (e) => { e.preventDefault(); setNadDniem(dzien) } : undefined}
        onDragLeave={mozeEdytowac ? () => setNadDniem((d) => (d === dzien ? null : d)) : undefined}
        onDrop={mozeEdytowac ? () => upusc(dzien) : undefined}
        className={`group relative min-h-[92px] rounded-md border p-1.5 transition ${
          cel
            ? 'border-deck-accent bg-deck-accent/10'
            : dzisiaj
              ? 'border-deck-accent/45 bg-deck-accent/[0.06]'
              : weekend
                ? 'border-white/5 bg-white/[0.008]'
                : 'border-white/8 bg-white/[0.02]'
        }`}
      >
        <div className="mb-1 flex items-center justify-between">
          <span
            className={`font-mono text-[10px] ${
              dzisiaj ? 'font-bold text-deck-accent' : weekend ? 'text-deck-muted/45' : 'text-deck-muted'
            }`}
          >
            {dzien}
          </span>
          <div className="flex items-center gap-1">
            {kol && (
              // Dymek na opakowaniu, nie na ikonie — Lucide nie przyjmuje `title`.
              <span
                title={opiszKolizje(kol)}
                aria-label={twarda ? 'kolizja twarda' : 'kolizja miękka'}
                className={`flex ${twarda ? 'text-deck-danger' : 'text-deck-warn'}`}
              >
                <AlertTriangle size={11} />
              </span>
            )}
            {mozeEdytowac && (
              <button
                type="button"
                onClick={() => onDodajWDniu(dzien)}
                aria-label={`Dodaj wydarzenie ${dzien}`}
                title="Dodaj wydarzenie w tym dniu"
                className="grid h-4 w-4 place-items-center rounded text-deck-muted/0 transition group-hover:text-deck-muted hover:!text-deck-accent"
              >
                <Plus size={11} />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-1">
          {(poDniach.get(dzien) ?? []).map((w) => (
            <KartaWydarzenia
              key={w.id}
              wydarzenie={w}
              onOtworz={onOtworz}
              przeciagalne={mozeEdytowac}
              onPrzeciagnij={setPrzeciagany}
              onPrzesun={onPrzesun}
              maRozmowe={zRozmowa?.has(w.id)}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="deck-card rounded-lg p-3">
      <Legenda />

      {/* Siedem kolumn po ~92 px nie mieści się na telefonie. Zamiast ściskać
          siatkę, poniżej 640 px pokazujemy listę dni, które coś mają. */}
      <div data-widok="lista" className="space-y-2 sm:hidden">
        {naLiscie.length === 0 && (
          <p className="py-6 text-center text-[12px] text-deck-muted">
            W tym miesiącu nic nie zaplanowano.
          </p>
        )}
        {naLiscie.map(({ dzien, pozycje }) => {
          const kol = kolizje.get(dzien)
          return (
            <div key={dzien} className="rounded-md border border-white/8 bg-white/[0.02] p-2">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="font-mono text-[11px] text-deck-text">
                  {dzien} {NAZWA_MIESIACA[miesiac.m - 1]}
                </span>
                <span className="font-mono text-[10px] text-deck-muted/70">
                  {dzienTygodnia(miesiac.y, miesiac.m, dzien)}
                </span>
                {kol && (
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-deck-warn">
                    <AlertTriangle size={10} /> kolizja
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {pozycje.map(({ w, dopisek }) => (
                  <KartaWydarzenia
                    key={w.id}
                    wydarzenie={w}
                    onOtworz={onOtworz}
                    przeciagalne={false}
                    maRozmowe={zRozmowa?.has(w.id)}
                    dopisek={dopisek}
                  />
                ))}
              </div>
              {mozeEdytowac && (
                <button
                  type="button"
                  onClick={() => onDodajWDniu(dzien)}
                  className="mt-1.5 text-[10.5px] text-deck-accent"
                >
                  + dodaj w tym dniu
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div data-widok="siatka" className="hidden sm:block">
        <div className="mb-2 grid grid-cols-7 gap-1.5">
          {NAGLOWKI.map((n, i) => (
            <div
              key={n}
              className={`text-center font-mono text-[10px] uppercase tracking-[0.14em] ${
                i >= 5 ? 'text-deck-muted/40' : 'text-deck-muted/70'
              }`}
            >
              {n}
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          {tygodnie.map((tydzien, t) => {
            const odcinki = odcinkiTygodnia(tydzien, miesiac, wielodniowe)
            const pasow = odcinki.reduce((n, o) => Math.max(n, o.pas + 1), 0)
            return (
              <div key={t} className="space-y-1">
                {Array.from({ length: pasow }, (_, p) => (
                  <div key={p} className="grid grid-cols-7 gap-1.5">
                    {odcinki
                      .filter((o) => o.pas === p)
                      .map((o) => (
                        <PasekWielodniowy
                          key={o.wydarzenie.id}
                          odcinek={o}
                          onOtworz={onOtworz}
                          przeciagalne={mozeEdytowac && startujeTutaj(o.wydarzenie)}
                          onPrzeciagnij={setPrzeciagany}
                          onPrzesun={onPrzesun}
                        />
                      ))}
                  </div>
                ))}
                <div className="grid grid-cols-7 gap-1.5">
                  {tydzien.map((dzien, i) => (dzien === null ? <div key={`pusty-${t}-${i}`} /> : kratka(dzien, i)))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Krok 5: `PlanerClient.tsx` — do miesiąca trafia wszystko, co na niego nachodzi**

Dopisz import `import { nachodziNaMiesiac } from '@/lib/planer/trwanie'` i zastąp `useMemo` `wMiesiacu`:

```ts
  const wMiesiacu = useMemo(
    () => widoczne.filter((w) => nachodziNaMiesiac(w, miesiac)),
    [widoczne, miesiac],
  )
```

- [ ] **Krok 6: Testy, typy, lint**

Run: `npx vitest run components/planer lib/planer && npx tsc --noEmit && npx eslint components/planer lib/planer`
Oczekiwane: czysto, łącznie z dotychczasowymi testami `WidokMiesiaca` (31 dni, kolizja, plus w kratce, strzałki).

- [ ] **Krok 7: Sprawdzenie ręczne**

Run: `npm run dev`, wejdź do Planera jako właściciel, dodaj wydarzenie trzydniowe przez weekend i jedno przez przełom października i listopada.
Oczekiwane: jeden pasek łamany na niedzieli ze strzałką; w listopadzie pasek ze strzałką w lewo, nieprzeciągalny; Zebrania jako pełne bloki z „1”.

- [ ] **Krok 8: Commit**

```bash
git add components/planer/PasekWielodniowy.tsx components/planer/WidokMiesiaca.tsx components/planer/WidokMiesiaca.test.tsx components/planer/PlanerClient.tsx
git commit -m "feat(planer): miesiac w rzedach tygodni z paskami wielodniowymi i legenda rang"
```

---

# FAZA 4 — eksport i kokpit

## Zadanie 18: Struktura eksportu miesiąca

**Pliki:**
- Nowy: `lib/planer/eksport.ts`, test `lib/planer/eksport.test.ts`

- [ ] **Krok 1: Utwórz `lib/planer/eksport.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { budujEksport } from '@/lib/planer/eksport'
import { POLA_DOMYSLNE, type Wydarzenie } from '@/lib/planer/typy'

const PAZ = { m: 10, y: 2026 }

function w(nadpisz: Partial<Wydarzenie>): Wydarzenie {
  return {
    id: 'x', tytul: 'A', kategoria: 'INNE', rok: 2026, miesiac: 10, dzien: 7,
    godzina: null, sala: null, osoby: [], ...POLA_DOMYSLNE, ...nadpisz,
  }
}

const zebranie = w({
  id: 'z', tytul: 'Zebranie', kategoria: 'ZEBRANIA', godzina: '18:00', godzinaDo: '20:00',
  budynek: 'B/L', sala: '110L', osoby: ['Jula', 'Kuba'],
})
const nabor = w({ id: 'n', tytul: 'Nabór', kategoria: 'APLIKACJE', godzina: '08:00' })
const wyjazd = w({ id: 'y', tytul: 'Wyjazd', kategoria: 'PROJEKTY', dzien: 30, dni: 4, calyDzien: true })

describe('budujEksport', () => {
  const e = budujEksport([nabor, zebranie, wyjazd], PAZ)

  it('nazywa plik rokiem i miesiącem', () => {
    expect(e.nazwaPliku).toBe('planer-2026-10.xlsx')
    expect(e.tytul).toBe('Październik 2026')
  })

  it('kalendarz to tygodnie od poniedziałku', () => {
    expect(e.kalendarz).toHaveLength(5)
    expect(e.kalendarz[0].map((k) => k.dzien)).toEqual([null, null, null, 1, 2, 3, 4])
  })

  it('w komórce najważniejsze na górze, z numerem rangi, miejscem i osobami', () => {
    const siodmy = e.kalendarz.flat().find((k) => k.dzien === 7)!
    expect(siodmy.linie[0]).toEqual({
      tekst: '① 18:00–20:00 Zebranie · B/L 110L · Jula, Kuba',
      kolor: '#1d4ed8',
      pogrubiona: true,
    })
    expect(siodmy.linie[1].tekst).toBe('• 08:00 Nabór')
  })

  it('wielodniowe jest w każdym dniu z numerem dnia', () => {
    const ostatni = e.kalendarz.flat().find((k) => k.dzien === 31)!
    expect(ostatni.linie[0].tekst).toBe('③ cały dzień Wyjazd (2/4)')
  })

  it('lista ma jeden wiersz na wydarzenie, po dacie i randze', () => {
    expect(e.lista.map((r) => r[7])).toEqual(['Zebranie', 'Nabór', 'Wyjazd'])
    expect(e.lista[0]).toEqual([
      '07.10.2026', 'środa', '', '18:00', '20:00', 1, 'Zebrania', 'Zebranie', 'B/L', '110L', 'Jula, Kuba',
    ])
    expect(e.lista[2][2]).toBe('02.11.2026')
    expect(e.lista[2][3]).toBe('cały dzień')
  })

  it('pomija wydarzenia spoza miesiąca', () => {
    expect(budujEksport([w({ miesiac: 11, dzien: 15 })], PAZ).lista).toEqual([])
  })
})
```

- [ ] **Krok 2: Uruchom — ma paść**

Run: `npx vitest run lib/planer/eksport.test.ts`
Oczekiwane: FAIL — brak modułu.

- [ ] **Krok 3: Utwórz `lib/planer/eksport.ts`**

```ts
import { dzienTygodnia } from './daty'
import { etykietaBudynku } from './budynki'
import { opisCzasu, opisMiejsca, opisOsob, porownajWydarzenia } from './opis'
import { tygodnieMiesiaca } from './pasy'
import { dniMiedzy, dniTrwaniaWMiesiacu, koniec, poczatek, porownajDaty, type Data } from './trwanie'
import { KATEGORIE, numerRangi, type Miesiac, type Wydarzenie } from './typy'

export interface LiniaKomorki {
  tekst: string
  /** Kolor do druku z `KATEGORIE[…].druk`, „#rrggbb”. */
  kolor: string
  pogrubiona: boolean
}

export interface KomorkaKalendarza {
  dzien: number | null
  linie: LiniaKomorki[]
}

export interface Eksport {
  nazwaPliku: string
  tytul: string
  kalendarz: KomorkaKalendarza[][]
  naglowkiListy: string[]
  lista: (string | number)[][]
}

export const NAGLOWKI_KALENDARZA = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd']
export const NAGLOWKI_LISTY = [
  'Data', 'Dzień tygodnia', 'Do dnia', 'Od', 'Do', 'Ranga', 'Kategoria', 'Nazwa', 'Budynek', 'Sala', 'Osoby',
]

const KOLKA = ['①', '②', '③', '④']
const NAZWY_MIESIECY = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
]

const dwie = (n: number) => String(n).padStart(2, '0')
const naTekst = (d: Data) => `${dwie(d.dzien)}.${dwie(d.miesiac)}.${d.rok}`

function linia(w: Wydarzenie, dzien: Data): LiniaKomorki {
  const s = KATEGORIE[w.kategoria]
  const n = numerRangi(w.kategoria)
  const czesci = [
    [opisCzasu(w), w.tytul].filter(Boolean).join(' '),
    opisMiejsca(w),
    opisOsob(w.osoby),
  ].filter(Boolean)
  const ktoryDzien = w.dni > 1 ? ` (${dniMiedzy(poczatek(w), dzien)}/${w.dni})` : ''
  return {
    tekst: `${n !== null ? KOLKA[n - 1] : '•'} ${czesci.join(' · ')}${ktoryDzien}`,
    kolor: s.druk,
    pogrubiona: s.ranga === 1,
  }
}

/**
 * Zawartość pliku miesiąca bez zależności od biblioteki arkuszy — dzięki temu
 * da się ją przetestować na zwykłych danych. Zawsze CAŁY miesiąc, niezależnie
 * od filtrów: plik wysłany dalej nie może być po cichu niepełny.
 */
export function budujEksport(wydarzenia: Wydarzenie[], m: Miesiac): Eksport {
  const wMiesiacu = wydarzenia
    .filter((w) => dniTrwaniaWMiesiacu(w, m).length > 0)
    .sort(porownajWydarzenia)

  const kalendarz = tygodnieMiesiaca(m).map((tydzien) =>
    tydzien.map((dzien): KomorkaKalendarza => {
      if (dzien === null) return { dzien: null, linie: [] }
      const data = { rok: m.y, miesiac: m.m, dzien }
      const tegoDnia = wMiesiacu.filter((w) => dniTrwaniaWMiesiacu(w, m).includes(dzien))
      return { dzien, linie: tegoDnia.map((w) => linia(w, data)) }
    }),
  )

  const lista = [...wMiesiacu]
    .sort((a, b) => porownajDaty(poczatek(a), poczatek(b)) || porownajWydarzenia(a, b))
    .map((w) => {
      const s = KATEGORIE[w.kategoria]
      const od = poczatek(w)
      return [
        naTekst(od),
        dzienTygodnia(od.rok, od.miesiac, od.dzien),
        w.dni > 1 ? naTekst(koniec(w)) : '',
        w.calyDzien ? 'cały dzień' : w.godzina ?? '',
        w.calyDzien ? '' : w.godzinaDo ?? '',
        s.ranga,
        s.etykieta,
        w.tytul,
        w.budynek ? etykietaBudynku(w.budynek) : '',
        w.sala ?? '',
        opisOsob(w.osoby) ?? '',
      ]
    })

  return {
    nazwaPliku: `planer-${m.y}-${dwie(m.m)}.xlsx`,
    tytul: `${NAZWY_MIESIECY[m.m - 1]} ${m.y}`,
    kalendarz,
    naglowkiListy: NAGLOWKI_LISTY,
    lista,
  }
}
```

- [ ] **Krok 4: Uruchom — ma przejść**

Run: `npx vitest run lib/planer/eksport.test.ts`
Oczekiwane: PASS.

- [ ] **Krok 5: Commit**

```bash
git add lib/planer/eksport.ts lib/planer/eksport.test.ts
git commit -m "feat(planer): struktura eksportu miesiaca — kalendarz i lista"
```

---

## Zadanie 19: Pobieranie miesiąca jako .xlsx

**Pliki:**
- `package.json` (zależność `exceljs`)
- Nowy: `components/planer/PobierzMiesiac.tsx`, test `components/planer/PobierzMiesiac.test.tsx`
- Modyfikacja: `components/planer/PlanerClient.tsx` (przycisk w pasku miesiąca)

- [ ] **Krok 1: Zainstaluj ExcelJS**

Run: `npm install exceljs`
Oczekiwane: `exceljs` w `dependencies` w `package.json`.

- [ ] **Krok 2: Utwórz `components/planer/PobierzMiesiac.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PobierzMiesiac, zbudujSkoroszyt } from '@/components/planer/PobierzMiesiac'
import { budujEksport } from '@/lib/planer/eksport'
import { POLA_DOMYSLNE, type Wydarzenie } from '@/lib/planer/typy'

const zebranie: Wydarzenie = {
  id: 'z', tytul: 'Zebranie', kategoria: 'ZEBRANIA', rok: 2026, miesiac: 10, dzien: 7,
  godzina: '18:00', sala: '110L', osoby: ['Jula'], ...POLA_DOMYSLNE, budynek: 'B/L',
}

describe('PobierzMiesiac', () => {
  it('ma przycisk pobrania', () => {
    render(<PobierzMiesiac wydarzenia={[]} miesiac={{ m: 10, y: 2026 }} />)
    expect(screen.getByRole('button', { name: /pobierz miesiąc/i })).toBeInTheDocument()
  })

  it('buduje skoroszyt z kartami Kalendarz i Lista', async () => {
    const plik = await zbudujSkoroszyt(budujEksport([zebranie], { m: 10, y: 2026 }))
    expect(plik.worksheets.map((a) => a.name)).toEqual(['Kalendarz', 'Lista'])
    expect(plik.getWorksheet('Lista')?.getRow(2).getCell(8).value).toBe('Zebranie')
  })
})
```

- [ ] **Krok 3: Uruchom — ma paść**

Run: `npx vitest run components/planer/PobierzMiesiac.test.tsx`
Oczekiwane: FAIL — brak modułu.

- [ ] **Krok 4: Utwórz `components/planer/PobierzMiesiac.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { Download } from 'lucide-react'
import type { Workbook } from 'exceljs'
import { budujEksport, NAGLOWKI_KALENDARZA, type Eksport } from '@/lib/planer/eksport'
import type { Miesiac, Wydarzenie } from '@/lib/planer/typy'

const SZEROKOSCI_LISTY = [12, 15, 12, 10, 8, 7, 15, 36, 12, 18, 28]
const argb = (hex: string) => `FF${hex.slice(1).toUpperCase()}`

/** Eksport jako skoroszyt — osobno od pobierania, żeby dało się go sprawdzić w teście. */
export async function zbudujSkoroszyt(e: Eksport): Promise<Workbook> {
  // ExcelJS waży kilkaset kilobajtów — ładujemy go dopiero po kliknięciu,
  // nie przy wejściu do Planera.
  const ExcelJS = (await import('exceljs')).default
  const plik = new ExcelJS.Workbook()

  const kal = plik.addWorksheet('Kalendarz')
  kal.columns = NAGLOWKI_KALENDARZA.map(() => ({ width: 36 }))
  kal.addRow([e.tytul]).font = { bold: true, size: 14 }
  kal.addRow(NAGLOWKI_KALENDARZA).font = { bold: true }
  for (const tydzien of e.kalendarz) {
    const wiersz = kal.addRow(
      tydzien.map((k) =>
        k.dzien === null
          ? ''
          : {
              richText: [
                { text: String(k.dzien), font: { bold: true } },
                ...k.linie.map((l) => ({
                  text: `\n${l.tekst}`,
                  font: { color: { argb: argb(l.kolor) }, bold: l.pogrubiona },
                })),
              ],
            },
      ),
    )
    wiersz.alignment = { wrapText: true, vertical: 'top' }
    const najwiecej = Math.max(0, ...tydzien.map((k) => k.linie.length))
    wiersz.height = Math.max(48, 16 * (najwiecej + 1))
    tydzien.forEach((k, i) => {
      if (k.dzien === null) {
        wiersz.getCell(i + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
      }
    })
  }

  const lista = plik.addWorksheet('Lista')
  lista.columns = e.naglowkiListy.map((_, i) => ({ width: SZEROKOSCI_LISTY[i] ?? 14 }))
  lista.addRow(e.naglowkiListy).font = { bold: true }
  for (const w of e.lista) lista.addRow(w)
  lista.views = [{ state: 'frozen', ySplit: 1 }]
  lista.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: e.naglowkiListy.length } }

  return plik
}

type Props = {
  /** Wszystkie wydarzenia semestru — eksport sam wybiera miesiąc i pomija filtry. */
  wydarzenia: Wydarzenie[]
  miesiac: Miesiac
}

export function PobierzMiesiac({ wydarzenia, miesiac }: Props) {
  const [stan, setStan] = useState<'gotowy' | 'trwa' | 'blad'>('gotowy')

  async function pobierz() {
    setStan('trwa')
    try {
      const e = budujEksport(wydarzenia, miesiac)
      const plik = await zbudujSkoroszyt(e)
      const bufor = await plik.xlsx.writeBuffer()
      const url = URL.createObjectURL(
        new Blob([bufor], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      )
      const a = document.createElement('a')
      a.href = url
      a.download = e.nazwaPliku
      a.click()
      // Natychmiastowe zwolnienie potrafi przerwać pobieranie w części przeglądarek.
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setStan('gotowy')
    } catch {
      setStan('blad')
    }
  }

  return (
    <button
      type="button"
      onClick={pobierz}
      disabled={stan === 'trwa'}
      className="deck-chip flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-deck-muted transition hover:text-deck-text disabled:opacity-60"
    >
      <Download size={14} />
      {stan === 'trwa' ? 'Przygotowuję…' : stan === 'blad' ? 'Nie udało się — spróbuj ponownie' : 'Pobierz miesiąc'}
    </button>
  )
}
```

- [ ] **Krok 5: Uruchom — ma przejść**

Run: `npx vitest run components/planer/PobierzMiesiac.test.tsx`
Oczekiwane: PASS.

- [ ] **Krok 6: `PlanerClient.tsx` — przycisk w pasku miesiąca**

Dopisz import `import { PobierzMiesiac } from './PobierzMiesiac'`. W pasku nawigacji miesiąca, tuż **przed** przyciskiem „Dodaj wydarzenie / Zgłoś wydarzenie”, wstaw:

```tsx
          <div className="ml-auto">
            <PobierzMiesiac wydarzenia={wydarzenia} miesiac={miesiac} />
          </div>
```

i w klasie przycisku dodawania usuń `ml-auto` (teraz odpycha go przycisk eksportu).

- [ ] **Krok 7: Build — ExcelJS musi wejść do paczki przeglądarkowej**

Run: `npx tsc --noEmit && npx next build`
Oczekiwane: build przechodzi. Jeśli zgłosi brak modułów Node (`fs`, `stream`) z `exceljs`, zamień w `zbudujSkoroszyt` import na `await import('exceljs/dist/exceljs.min.js')` z tą samą obsługą `.default` i powtórz build.

- [ ] **Krok 8: Sprawdzenie ręczne**

Run: `npm run dev`, Planer → „Pobierz miesiąc”.
Oczekiwane: plik `planer-RRRR-MM.xlsx` otwiera się w Excelu i Arkuszach Google; karta „Kalendarz” ma kolorowe linijki z Zebraniami pogrubionymi; karta „Lista” ma zamrożony nagłówek i filtry.

- [ ] **Krok 9: Commit**

```bash
git add package.json package-lock.json components/planer/PobierzMiesiac.tsx components/planer/PobierzMiesiac.test.tsx components/planer/PlanerClient.tsx
git commit -m "feat(planer): pobieranie miesiaca jako xlsx z kalendarzem i lista"
```

---

## Zadanie 20: Baner Sesji Operacyjnej w kokpicie

**Pliki:**
- Modyfikacja: `app/page.tsx`
- Modyfikacja: `components/deck/DeckHub.tsx`, test `components/deck/DeckHub.test.tsx`

- [ ] **Krok 1: Dopisz testy w `components/deck/DeckHub.test.tsx`**

```tsx
  it('pokazuje baner trwającej Sesji Operacyjnej z odnośnikiem do Planera', () => {
    render(
      <DeckHub
        rola="board"
        email="Jula"
        dane={{ ...dane, sesja: { wlaczony: true, od: Date.now() - 5 * 60_000, przez: 'ja' } }}
      />,
    )
    expect(screen.getByRole('link', { name: /Sesja Operacyjna trwa/ })).toHaveAttribute('href', '/planer')
  })

  it('bez sesji baneru nie ma', () => {
    render(<DeckHub rola="owner" email="ja@example.com" dane={dane} />)
    expect(screen.queryByText(/Sesja Operacyjna trwa/)).toBeNull()
  })
```

- [ ] **Krok 2: Uruchom — ma paść**

Run: `npx vitest run components/deck/DeckHub.test.tsx`
Oczekiwane: FAIL — brak baneru.

- [ ] **Krok 3: `components/deck/DeckHub.tsx`**

Importy — dopisz:

```ts
import Link from 'next/link'
import { Radio } from 'lucide-react'
import { opiszTrwanie, type StanSesjiWspolnej } from '@/lib/planer/stan'
```

(`Radio` dołącz do istniejącego importu z `lucide-react`, jeśli wolisz jedną linię.)

W `interface DaneKokpitu` dopisz:

```ts
  /** Stan Sesji Operacyjnej bieżącego semestru. Brak = nie wiadomo, baneru nie ma. */
  sesja?: StanSesjiWspolnej
```

Bezpośrednio po zamykającym `</header>` wstaw:

```tsx
      {dane.sesja?.wlaczony && (
        // Sesję wyłącza się ręcznie, więc przypomnienie musi być widać także
        // spoza Planera — zapomniana sesja to bezterminowy zapis dla zarządu.
        <Link
          href="/planer"
          className="flex items-center gap-3 rounded-lg border border-deck-accent/45 bg-deck-accent/10 px-4 py-3 text-[12.5px] transition hover:bg-deck-accent/15"
        >
          <Radio size={15} className="text-deck-accent" />
          <span className="font-semibold text-deck-text">Sesja Operacyjna trwa</span>
          {dane.sesja.od !== null && (
            <span suppressHydrationWarning className="text-deck-muted">
              {opiszTrwanie(dane.sesja.od, Date.now())}
            </span>
          )}
          <span className="ml-auto text-deck-accent">Planer →</span>
        </Link>
      )}
```

- [ ] **Krok 4: `app/page.tsx` — stan sesji dla kokpitu**

Dopisz importy:

```ts
import { stanSesji } from '@/lib/planer/obraz'
import { SESJA_WYLACZONA } from '@/lib/planer/stan'
```

Pod obliczeniem `propozycje` dopisz:

```ts
  // Awaria Firestore nie może zabrać kokpitu — wtedy po prostu bez baneru.
  const sesja = await stanSesji(semestr.id).catch(() => SESJA_WYLACZONA)
```

i w obiekcie `dane` dopisz pole `sesja,`.

- [ ] **Krok 5: Testy, typy, lint**

Run: `npx vitest run components/deck && npx tsc --noEmit && npx eslint components/deck app`
Oczekiwane: czysto.

- [ ] **Krok 6: Commit**

```bash
git add app/page.tsx components/deck/DeckHub.tsx components/deck/DeckHub.test.tsx
git commit -m "feat(deck): baner trwajacej Sesji Operacyjnej w kokpicie"
```

---

## Zadanie 21: Wdrożenie i sprawdzenie na produkcji

**Pliki:** brak zmian w kodzie (chyba że sprawdzenie coś wykaże).

- [ ] **Krok 1: Pełne sprawdzenie**

Run: `npx tsc --noEmit && npx eslint . && npx vitest run && npx next build`
Oczekiwane: wszystko czysto. Testy uruchamiaj same — równoległe odpalenie z lintem potrafi przekroczyć limity czasu.

- [ ] **Krok 2: Reguły Firestore — krok ręczny właściciela**

Do konsoli Firebase nie ma narzędzia CLI w tym projekcie. Przekaż użytkownikowi:
1. <https://console.firebase.google.com> → projekt DECK → *Firestore Database* → *Reguły*.
2. Wklej całą treść `firestore.rules` z repozytorium (z nowym blokiem `ustawienia`).
3. *Opublikuj*.

Bez tego Skład dla kont z hasłem zgłosi „Missing or insufficient permissions” (osoby na kodzie dostaną go i tak, przez serwer).

- [ ] **Krok 3: Push**

```bash
git push origin main
```

- [ ] **Krok 4: Sprawdzenie na produkcji**

- incognito → kod z zakładki `kody` → ląduje kokpit, nie `/login`;
- Planer na kodzie pokazuje wydarzenia semestru;
- właściciel włącza Sesję Operacyjną → w ciągu minuty osoba na kodzie widzi baner, a kokpit pokazuje „Sesja Operacyjna trwa”;
- osoba na kodzie w sesji dodaje wydarzenie i przesuwa je strzałką — zapis przechodzi;
- poza sesją ta sama osoba po przeciągnięciu zgłasza propozycję (skrzynka właściciela rośnie);
- „Pobierz miesiąc” daje plik, który otwiera się w Excelu.

- [ ] **Krok 5: Zapisz w pamięci projektu, że reguły z blokiem `ustawienia` są (albo nie są) wdrożone**

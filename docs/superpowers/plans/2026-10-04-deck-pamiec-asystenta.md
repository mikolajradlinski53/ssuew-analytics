# D.E.C.K. - pamięć asystenta: plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Cel:** asystent pamięta rozmowy (wątki w Firestore) i notatki (zatwierdzone ustalenia), widzi ostatnią odprawę; wszystko w panelu „Zapytaj D.E.C.K.” w kokpicie.

**Architektura:** czyste funkcje w `lib/asystent/pamiec.ts` (limity, tytuł, dopisywanie, schemat i odczyt odpowiedzi czatu), dostęp do bazy w `lib/asystent/pamiecDane.ts` (Admin SDK, kolekcje `asystentRozmowy` i `asystentNotatki` zamknięte regułą końcową), trasy API tylko dla właściciela, klient przeglądarki w `lib/asystent/klient.ts`, panel rozbity na `CzatDeck` + `CzatRozmowa` / `CzatWatki` / `CzatNotatki`. Serwer jest źródłem prawdy o rozmowie - przeglądarka trzyma tylko identyfikator ostatniego wątku.

**Stack:** Next.js 16 (trasy z `params: Promise`), React 19, Firestore Admin SDK, Gemini (schemat JSON), Vitest + Testing Library.

**Spec:** [docs/superpowers/specs/2026-10-04-deck-pamiec-asystenta-design.md](../specs/2026-10-04-deck-pamiec-asystenta-design.md)

**Konwencje:** po polsku; w tekstach tylko „-”, nigdy długie myślniki; commit dopiero po `npx vitest run … > "$TMP/vt.log" 2>&1; echo $?` = 0; stopka `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Lokalnie nie ma `FIREBASE_SERVICE_ACCOUNT` - trasy z bazą sprawdzamy testami z zaślepkami i na produkcji.

---

## Mapa plików

| Plik | Odpowiedzialność | Zadanie |
|---|---|---|
| `lib/asystent/pamiec.ts` | typy, limity, `sprawdzTrescNotatki`, `tytulRozmowy`, `dopiszPytanie`, `SCHEMAT_CZATU`, `odczytajOdpowiedzCzatu` | 1 |
| `lib/asystent/kontekst.ts`, `lib/asystent/dane.ts` | notatki w obrazie projektu, `daneProjektu(..., notatki)`, odprawa w tle z notatkami | 2 |
| `lib/firebase/admin.ts`, `lib/asystent/pamiecDane.ts` | kolekcje i operacje na rozmowach i notatkach | 3 |
| `lib/asystent/tylkoWlasciciel.ts` | wspólna bramka 401/403 dla tras | 3 |
| `lib/asystent/czat.ts` | `sprawdzZapytanie`, rozmowa dla Gemini z odprawą, instrukcja propozycji | 4 |
| `app/api/asystent/czat/route.ts` | nowy kontrakt z wątkiem w bazie | 5 |
| `app/api/asystent/odprawa/route.ts`, `app/page.tsx` | notatki w odprawie | 5 |
| `app/api/asystent/rozmowy/route.ts`, `app/api/asystent/rozmowy/[id]/route.ts` | wątki | 6 |
| `app/api/asystent/notatki/route.ts`, `app/api/asystent/notatki/[id]/route.ts` | notatki | 7 |
| `lib/asystent/klient.ts` | wywołania API z przeglądarki | 8 |
| `components/deck/CzatDeck.tsx`, `CzatRozmowa.tsx`, `CzatWatki.tsx`, `CzatNotatki.tsx` | panel | 8 |

---

## Zadanie 1: Czyste funkcje pamięci

**Pliki:** nowy `lib/asystent/pamiec.ts`, test `lib/asystent/pamiec.test.ts`

- [ ] **Krok 1: Test**

```ts
import { describe, it, expect } from 'vitest'
import {
  sprawdzTrescNotatki, tytulRozmowy, dopiszPytanie, odczytajOdpowiedzCzatu,
  DLUGOSC_NOTATKI, LIMIT_WIADOMOSCI,
} from '@/lib/asystent/pamiec'

describe('sprawdzTrescNotatki', () => {
  it('przycina i odrzuca puste', () => {
    expect(sprawdzTrescNotatki('  Zebrania w środy  ')).toBe('Zebrania w środy')
    expect(sprawdzTrescNotatki('   ')).toBeNull()
    expect(sprawdzTrescNotatki(5)).toBeNull()
    expect(sprawdzTrescNotatki('x'.repeat(DLUGOSC_NOTATKI + 10))).toHaveLength(DLUGOSC_NOTATKI)
  })
})

describe('tytulRozmowy', () => {
  it('pierwsze pytanie w jednej linii, długie przycięte z wielokropkiem', () => {
    expect(tytulRozmowy('Co z\n retencją?')).toBe('Co z retencją?')
    const t = tytulRozmowy('a'.repeat(100))
    expect(t).toHaveLength(60)
    expect(t.endsWith('…')).toBe(true)
  })
})

describe('dopiszPytanie', () => {
  const w = (rola: 'ja' | 'deck', tresc: string) => ({ rola, tresc, kiedy: 1 })

  it('dopisuje pytanie na końcu', () => {
    expect(dopiszPytanie([w('ja', 'A'), w('deck', 'B')], 'C', 5, false)).toEqual([w('ja', 'A'), w('deck', 'B'), { rola: 'ja', tresc: 'C', kiedy: 5 }])
  })

  it('ponowienie nie dubluje pytania bez odpowiedzi', () => {
    const lista = [w('ja', 'A'), w('deck', 'B'), w('ja', 'C')]
    expect(dopiszPytanie(lista, 'C', 9, true)).toBe(lista)
  })

  it('pełna rozmowa - null', () => {
    const pelna = Array.from({ length: LIMIT_WIADOMOSCI - 1 }, (_, i) => w(i % 2 ? 'deck' : 'ja', 'x'))
    expect(dopiszPytanie(pelna, 'C', 1, false)).toBeNull()
  })
})

describe('odczytajOdpowiedzCzatu', () => {
  it('odpowiedź z propozycją i bez', () => {
    expect(odczytajOdpowiedzCzatu('{"odpowiedz":"Tak.","propozycjaNotatki":" Zebrania w środy "}'))
      .toEqual({ odpowiedz: 'Tak.', propozycja: 'Zebrania w środy' })
    expect(odczytajOdpowiedzCzatu('{"odpowiedz":"Tak.","propozycjaNotatki":null}')).toEqual({ odpowiedz: 'Tak.', propozycja: null })
    expect(odczytajOdpowiedzCzatu('{"odpowiedz":"Tak."}')).toEqual({ odpowiedz: 'Tak.', propozycja: null })
  })

  it('zły kształt - null', () => {
    expect(odczytajOdpowiedzCzatu('nie json')).toBeNull()
    expect(odczytajOdpowiedzCzatu('{"odpowiedz":""}')).toBeNull()
    expect(odczytajOdpowiedzCzatu('{"tekst":"x"}')).toBeNull()
  })
})
```

- [ ] **Krok 2: Uruchom - ma paść**

- [ ] **Krok 3: `lib/asystent/pamiec.ts`**

```ts
export const LIMIT_NOTATEK = 50
export const DLUGOSC_NOTATKI = 300
/** Dokument Firestore ma limit 1 MB - 200 wiadomości po 4000 znaków mieści się z zapasem. */
export const LIMIT_WIADOMOSCI = 200
export const DLUGOSC_TYTULU = 60

export interface WiadomoscRozmowy {
  rola: 'ja' | 'deck'
  tresc: string
  kiedy: number
}

export interface Rozmowa {
  id: string
  tytul: string
  utworzono: number
  zmieniono: number
  wiadomosci: WiadomoscRozmowy[]
}

export interface SkrotRozmowy {
  id: string
  tytul: string
  zmieniono: number
}

export type ZrodloNotatki = 'reczna' | 'rozmowa'

export interface Notatka {
  id: string
  tresc: string
  utworzono: number
  zrodlo: ZrodloNotatki
}

/** Treść notatki po przycięciu albo `null`, gdy pusta. */
export function sprawdzTrescNotatki(x: unknown): string | null {
  if (typeof x !== 'string') return null
  const t = x.trim().replace(/\s+/g, ' ')
  return t ? t.slice(0, DLUGOSC_NOTATKI) : null
}

/** Tytuł wątku z pierwszego pytania - w jednej linii, długi przycięty. */
export function tytulRozmowy(pytanie: string): string {
  const t = pytanie.trim().replace(/\s+/g, ' ')
  return t.length > DLUGOSC_TYTULU ? `${t.slice(0, DLUGOSC_TYTULU - 1)}…` : t
}

/**
 * Wiadomości po dopisaniu pytania. Ponowienie po błędzie nie dubluje pytania,
 * które już czeka bez odpowiedzi. `null` - rozmowa pełna (miejsce na pytanie
 * i odpowiedź musi się zmieścić w limicie).
 */
export function dopiszPytanie(
  wiadomosci: WiadomoscRozmowy[],
  pytanie: string,
  kiedy: number,
  ponow: boolean,
): WiadomoscRozmowy[] | null {
  const ostatnia = wiadomosci[wiadomosci.length - 1]
  if (ponow && ostatnia?.rola === 'ja' && ostatnia.tresc === pytanie) return wiadomosci
  if (wiadomosci.length + 2 > LIMIT_WIADOMOSCI) return null
  return [...wiadomosci, { rola: 'ja', tresc: pytanie, kiedy }]
}

export const SCHEMAT_CZATU = {
  type: 'OBJECT',
  properties: {
    odpowiedz: { type: 'STRING' },
    propozycjaNotatki: { type: 'STRING', nullable: true },
  },
  required: ['odpowiedz'],
}

/** Odczyt odpowiedzi czatu - schemat Gemini to prośba, nie gwarancja. */
export function odczytajOdpowiedzCzatu(tekst: string): { odpowiedz: string; propozycja: string | null } | null {
  let d: unknown
  try {
    d = JSON.parse(tekst)
  } catch {
    return null
  }
  if (typeof d !== 'object' || d === null) return null
  const { odpowiedz, propozycjaNotatki } = d as Record<string, unknown>
  if (typeof odpowiedz !== 'string' || !odpowiedz.trim()) return null
  return { odpowiedz: odpowiedz.trim(), propozycja: sprawdzTrescNotatki(propozycjaNotatki) }
}
```

- [ ] **Krok 4: Uruchom - ma przejść; commit** `feat(asystent): czyste funkcje pamieci - notatki, tytul, dopisywanie, odpowiedz czatu`

---

## Zadanie 2: Notatki w obrazie projektu

**Pliki:** `lib/asystent/kontekst.ts`, `lib/asystent/kontekst.test.ts`, `lib/asystent/dane.ts`

- [ ] **Krok 1: Test - w `kontekst.test.ts`** w funkcji `dane()` dopisz domyślne `notatki: [],` (obok `propozycje: 0,`) i dodaj test:

```ts
  it('notatki trafiają do obrazu jako pewne ustalenia', () => {
    const k = zbudujKontekst(dane({ notatki: ['Zebrania zarządu w środy'] }), DZIS)
    expect(k.notatki).toEqual(['Zebrania zarządu w środy'])
  })
```

- [ ] **Krok 2: Uruchom - ma paść**

- [ ] **Krok 3: `kontekst.ts`** - w `DaneProjektu` dopisz:

```ts
  /** Ustalenia zatwierdzone przez właściciela - asystent traktuje je jak fakty. */
  notatki: string[]
```

a w zwracanym obiekcie `zbudujKontekst`, po `czlonkowie,`:

```ts
    notatki: d.notatki,
```

- [ ] **Krok 4: `dane.ts`** - `daneProjektu` dostaje czwarty parametr i przekazuje go dalej:

```ts
export function daneProjektu(
  a: DaneArkusza,
  p: StanPlanera,
  semestr: { id: string; nazwa: string },
  notatki: string[],
): DaneProjektu {
  return {
    rekrutacje: a.rekrutacje, kohorty: a.kohorty, punkty: a.punkty, projekty: a.projekty, czlonkowie: a.czlonkowie,
    semestr, wydarzenia: p.wydarzenia, sesja: p.sesja, sklad: p.sklad, propozycje: p.propozycje, notatki,
  }
}
```

W `odswiezOdpraweWTle` dopisz parametr `notatki: Promise<string[]>`, czekaj na niego razem z resztą i podaj do `daneProjektu`:

```ts
    const [a, p, zapisana, notatki] = await Promise.all([w.arkusz, w.planer, w.zapisana, w.notatki])
    if (a.czasMs === null || !p.ok) return
    const k = zbudujKontekst(daneProjektu(a, p, w.semestr, notatki), dzisWarszawa(w.teraz))
```

- [ ] **Krok 5: Testy `lib/asystent` przechodzą; `tsc` pokaże wywołania do poprawy w zadaniu 5 - na razie w `app/api/asystent/odprawa/route.ts`, `app/api/asystent/czat/route.ts` i `app/page.tsx` podaj `[]` / `Promise.resolve([])`, żeby typy się zgadzały. Commit** `feat(asystent): notatki w obrazie projektu`

---

## Zadanie 3: Baza rozmów i notatek, bramka właściciela

**Pliki:** `lib/firebase/admin.ts`, nowe `lib/asystent/pamiecDane.ts`, `lib/asystent/tylkoWlasciciel.ts`, test `lib/asystent/tylkoWlasciciel.test.ts`

- [ ] **Krok 1: `lib/firebase/admin.ts`** - dopisz na końcu:

```ts
/** Rozmowy asystenta - tylko serwer; reguła końcowa zamyka je przed przeglądarką. */
export function rozmowyRef() {
  return bazaAdmin().collection('asystentRozmowy')
}

/** Notatki asystenta - tylko serwer; reguła końcowa zamyka je przed przeglądarką. */
export function notatkiRef() {
  return bazaAdmin().collection('asystentNotatki')
}
```

- [ ] **Krok 2: `lib/asystent/pamiecDane.ts`** (bez testu jednostkowego - to cienka warstwa nad Admin SDK; trasy testujemy z jej zaślepką)

```ts
import type { DocumentData } from 'firebase-admin/firestore'
import { notatkiRef, rozmowyRef } from '@/lib/firebase/admin'
import type { Notatka, Rozmowa, SkrotRozmowy, WiadomoscRozmowy, ZrodloNotatki } from './pamiec'

const naWiadomosci = (x: unknown): WiadomoscRozmowy[] =>
  Array.isArray(x)
    ? x
        .filter((w) => (w?.rola === 'ja' || w?.rola === 'deck') && typeof w?.tresc === 'string')
        .map((w) => ({ rola: w.rola, tresc: w.tresc, kiedy: Number(w.kiedy) || 0 }))
    : []

export async function listaRozmow(ile = 30): Promise<SkrotRozmowy[]> {
  const z = await rozmowyRef().orderBy('zmieniono', 'desc').limit(ile).select('tytul', 'zmieniono').get()
  return z.docs.map((d) => ({ id: d.id, tytul: String(d.get('tytul') ?? ''), zmieniono: Number(d.get('zmieniono')) || 0 }))
}

export async function czytajRozmowe(id: string): Promise<Rozmowa | null> {
  const d = await rozmowyRef().doc(id).get()
  const x = d.data()
  if (!x) return null
  return {
    id: d.id,
    tytul: String(x.tytul ?? ''),
    utworzono: Number(x.utworzono) || 0,
    zmieniono: Number(x.zmieniono) || 0,
    wiadomosci: naWiadomosci(x.wiadomosci),
  }
}

/** Zapisuje całą rozmowę; bez `id` zakłada nową. Zwraca identyfikator. */
export async function zapiszRozmowe(r: Omit<Rozmowa, 'id'>, id?: string): Promise<string> {
  if (id) {
    await rozmowyRef().doc(id).set(r)
    return id
  }
  return (await rozmowyRef().add(r)).id
}

export async function usunRozmowe(id: string): Promise<void> {
  await rozmowyRef().doc(id).delete()
}

/** Koniec kadencji: wszystkie rozmowy, partiami po 400 (limit partii Firestore to 500). */
export async function usunWszystkieRozmowy(): Promise<number> {
  let razem = 0
  for (;;) {
    const z = await rozmowyRef().limit(400).get()
    if (z.empty) return razem
    const partia = rozmowyRef().firestore.batch()
    z.docs.forEach((d) => partia.delete(d.ref))
    await partia.commit()
    razem += z.size
  }
}

const naNotatke = (id: string, x: DocumentData): Notatka => ({
  id,
  tresc: String(x.tresc ?? ''),
  utworzono: Number(x.utworzono) || 0,
  zrodlo: x.zrodlo === 'rozmowa' ? 'rozmowa' : 'reczna',
})

export async function listaNotatek(): Promise<Notatka[]> {
  const z = await notatkiRef().orderBy('utworzono', 'desc').get()
  return z.docs.map((d) => naNotatke(d.id, d.data()))
}

export async function liczbaNotatek(): Promise<number> {
  return (await notatkiRef().count().get()).data().count
}

export async function dodajNotatke(tresc: string, zrodlo: ZrodloNotatki): Promise<Notatka> {
  const dane = { tresc, zrodlo, utworzono: Date.now() }
  const ref = await notatkiRef().add(dane)
  return { id: ref.id, ...dane }
}

/** `false`, gdy notatki nie ma. */
export async function zmienNotatke(id: string, tresc: string): Promise<boolean> {
  const ref = notatkiRef().doc(id)
  if (!(await ref.get()).exists) return false
  await ref.update({ tresc })
  return true
}

export async function usunNotatke(id: string): Promise<void> {
  await notatkiRef().doc(id).delete()
}

/** Treści do obrazu projektu - od najstarszej, żeby ślad odprawy był stały. */
export async function tresciNotatek(): Promise<string[]> {
  return (await listaNotatek()).sort((a, b) => a.utworzono - b.utworzono).map((n) => n.tresc)
}
```

- [ ] **Krok 3: Test `lib/asystent/tylkoWlasciciel.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest'

const ktoPyta = vi.fn()
vi.mock('@/lib/auth/guard', () => ({ ktoPyta: (...a: unknown[]) => ktoPyta(...a) }))
import { tylkoWlasciciel } from '@/lib/asystent/tylkoWlasciciel'

describe('tylkoWlasciciel', () => {
  it('bez sesji 401, zarząd 403, właściciel przechodzi', async () => {
    ktoPyta.mockResolvedValueOnce(null)
    expect((await tylkoWlasciciel({} as never)).odmowa?.status).toBe(401)
    ktoPyta.mockResolvedValueOnce({ uid: 'kod:1', email: 'Jula', rola: 'board' })
    expect((await tylkoWlasciciel({} as never)).odmowa?.status).toBe(403)
    ktoPyta.mockResolvedValueOnce({ uid: 'u', email: 'ja', rola: 'owner' })
    const w = await tylkoWlasciciel({} as never)
    expect(w.odmowa).toBeNull()
    expect(w.kto?.rola).toBe('owner')
  })
})
```

- [ ] **Krok 4: Uruchom - ma paść; `lib/asystent/tylkoWlasciciel.ts`**

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { ktoPyta, type Pytajacy } from '@/lib/auth/guard'

/** Wspólna bramka tras asystenta: bez sesji 401, zarząd 403. */
export async function tylkoWlasciciel(
  req: NextRequest,
): Promise<{ kto: Pytajacy; odmowa: null } | { kto: null; odmowa: NextResponse }> {
  const kto = await ktoPyta(req)
  if (!kto) return { kto: null, odmowa: NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 }) }
  if (kto.rola !== 'owner') {
    return { kto: null, odmowa: NextResponse.json({ error: 'Asystent jest tylko dla właściciela' }, { status: 403 }) }
  }
  return { kto, odmowa: null }
}
```

- [ ] **Krok 5: Testy przechodzą; `tsc` czysty; commit** `feat(asystent): baza rozmow i notatek oraz bramka wlasciciela`

---

## Zadanie 4: Czat - zapytanie, odprawa w rozmowie, instrukcja propozycji

**Pliki:** `lib/asystent/czat.ts`, `lib/asystent/czat.test.ts` (całość)

- [ ] **Krok 1: Test - zastąp `lib/asystent/czat.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { sprawdzZapytanie, rozmowaDlaGemini, LIMIT_HISTORII, LIMIT_ZNAKOW, INSTRUKCJA_CZATU } from '@/lib/asystent/czat'

const K = { meta: { data: '02.10.2026', dzienTygodnia: 'piątek' }, notatki: ['Zebrania w środy'] } as never
const ODPRAWA = { podsumowanie: 'Retencja słabnie.', zagrozenia: [], dzis: [] }

describe('sprawdzZapytanie', () => {
  it('nowa rozmowa, kolejne pytanie i ponowienie', () => {
    expect(sprawdzZapytanie({ pytanie: ' Co z KPI? ' })).toEqual({ rozmowaId: null, pytanie: 'Co z KPI?', ponow: false })
    expect(sprawdzZapytanie({ rozmowaId: 'abc_1', pytanie: 'Dalej', ponow: true })).toEqual({ rozmowaId: 'abc_1', pytanie: 'Dalej', ponow: true })
  })

  it('odrzuca puste pytanie i dziwny identyfikator, przycina długie', () => {
    expect(sprawdzZapytanie({ pytanie: '   ' })).toBeNull()
    expect(sprawdzZapytanie({ rozmowaId: '../x', pytanie: 'a' })).toBeNull()
    expect(sprawdzZapytanie(null)).toBeNull()
    expect(sprawdzZapytanie({ pytanie: 'x'.repeat(LIMIT_ZNAKOW + 5) })!.pytanie).toHaveLength(LIMIT_ZNAKOW)
  })
})

describe('rozmowaDlaGemini', () => {
  it('najpierw obraz projektu z notatkami i ostatnią odprawą, potem rozmowa', () => {
    const r = rozmowaDlaGemini(K, [{ rola: 'ja', tresc: 'Pytanie' }, { rola: 'deck', tresc: 'Odpowiedź' }, { rola: 'ja', tresc: 'Dalej' }], ODPRAWA)
    expect(r[0].rola).toBe('user')
    expect(r[0].tekst).toContain('Zebrania w środy')
    expect(r[0].tekst).toContain('Retencja słabnie.')
    expect(r[1].rola).toBe('model')
    expect(r.slice(2)).toEqual([
      { rola: 'user', tekst: 'Pytanie' },
      { rola: 'model', tekst: 'Odpowiedź' },
      { rola: 'user', tekst: 'Dalej' },
    ])
  })

  it('bez odprawy też działa', () => {
    expect(rozmowaDlaGemini(K, [{ rola: 'ja', tresc: 'A' }], null)[0].tekst).not.toContain('Ostatnia odprawa')
  })

  it('bierze tylko ostatnie wiadomości i zaczyna od pytania', () => {
    const dluga = Array.from({ length: 31 }, (_, i) => ({ rola: (i % 2 ? 'deck' : 'ja') as 'ja' | 'deck', tresc: `w${i}` }))
    const r = rozmowaDlaGemini(K, dluga, null).slice(2)
    expect(r.length).toBeLessThanOrEqual(LIMIT_HISTORII)
    expect(r[0].rola).toBe('user')
    expect(r[r.length - 1].tekst).toBe('w30')
  })

  it('dwa pytania z rzędu skleja w jedno', () => {
    const r = rozmowaDlaGemini(K, [{ rola: 'ja', tresc: 'A' }, { rola: 'ja', tresc: 'B' }], null)
    expect(r.slice(2)).toEqual([{ rola: 'user', tekst: 'A\n\nB' }])
  })

  it('instrukcja: notatki jako fakty, propozycja tylko przy ustaleniu, bez długich myślników', () => {
    expect(INSTRUKCJA_CZATU).toMatch(/propozycjaNotatki/)
    expect(INSTRUKCJA_CZATU).toMatch(/notatki/)
    expect(INSTRUKCJA_CZATU).toMatch(/„-”/)
  })
})
```

- [ ] **Krok 2: Uruchom - ma paść**

- [ ] **Krok 3: `lib/asystent/czat.ts` - całość**

```ts
import type { KontekstProjektu } from './kontekst'
import type { WiadomoscGemini } from './gemini'
import type { Odprawa } from './odprawa'

export interface WiadomoscCzatu {
  rola: 'ja' | 'deck'
  tresc: string
}

/** Tyle ostatnich wiadomości idzie do modelu - starsze nie zmieniają odpowiedzi, a zjadają limit. */
export const LIMIT_HISTORII = 20
export const LIMIT_ZNAKOW = 4000

export const INSTRUKCJA_CZATU = `Jesteś D.E.C.K. (Diagnostic Evaluation of Change & KPIs) - asystentem analitycznym Wiceprzewodniczącego ds. Strategii i Działań Operacyjnych Samorządu Studentów Uniwersytetu Ekonomicznego we Wrocławiu.
Pierwsza wiadomość zawiera obraz projektu w JSON: KPI, rekrutacje, retencję kohort, alerty, kondycję projektów, Planer najbliższych 21 dni, członków, notatki i ostatnią odprawę.
Pole „notatki” to ustalenia zatwierdzone przez użytkownika - traktuj je jak pewne fakty.
Rozmawiasz z nim o tych danych: interpretujesz wskaźniki, porównujesz, wskazujesz ryzyka i proponujesz działania. Pomagasz też pisać teksty: ogłoszenia, maile, podsumowania.
Zasady: opieraj się na danych i podawaj liczby; gdy czegoś w danych nie ma, powiedz to wprost i nie zgaduj; odpowiadaj po polsku, zwięźle i konkretnie.
Formatowanie odpowiedzi: krótkie akapity, wypunktowania zaczynane od „- ”, pogrubienie **tak**; bez nagłówków, tabel i bloków kodu. Używaj zwykłego łącznika „-”, nigdy długich myślników.
Odpowiadasz w JSON: „odpowiedz” to Twoja odpowiedź. „propozycjaNotatki” wypełnij tylko wtedy, gdy w ostatniej wiadomości użytkownika padło trwałe ustalenie, cel, zasada albo fakt o organizacji, którego nie ma w danych ani w notatkach - jednym krótkim zdaniem, do 300 znaków. W każdym innym przypadku null.`

export interface ZapytanieCzatu {
  rozmowaId: string | null
  pytanie: string
  ponow: boolean
}

const ID = /^[A-Za-z0-9_-]{1,100}$/

/** Zapytanie z przeglądarki - wejście z zewnątrz, nie ufamy mu. */
export function sprawdzZapytanie(x: unknown): ZapytanieCzatu | null {
  if (typeof x !== 'object' || x === null) return null
  const d = x as Record<string, unknown>
  const pytanie = typeof d.pytanie === 'string' ? d.pytanie.trim().slice(0, LIMIT_ZNAKOW) : ''
  if (!pytanie) return null
  const rozmowaId = d.rozmowaId === undefined || d.rozmowaId === null ? null : d.rozmowaId
  if (rozmowaId !== null && (typeof rozmowaId !== 'string' || !ID.test(rozmowaId))) return null
  return { rozmowaId, pytanie, ponow: d.ponow === true }
}

/**
 * Obraz projektu (z notatkami) i ostatnia odprawa jako pierwsza wymiana, potem
 * ostatnie wiadomości rozmowy. Obraz jest świeży przy każdym pytaniu.
 */
export function rozmowaDlaGemini(
  k: KontekstProjektu,
  rozmowa: WiadomoscCzatu[],
  odprawa: Odprawa | null,
): WiadomoscGemini[] {
  const obraz = `Obraz projektu (JSON):\n${JSON.stringify(k)}`
  const wynik: WiadomoscGemini[] = [
    { rola: 'user', tekst: odprawa ? `${obraz}\n\nOstatnia odprawa (JSON):\n${JSON.stringify(odprawa)}` : obraz },
    { rola: 'model', tekst: 'Mam obraz projektu. Pytaj.' },
  ]
  const ostatnie = rozmowa.slice(-LIMIT_HISTORII)
  // Po przycięciu historia może zaczynać się od odpowiedzi - zaczynamy od pierwszego pytania.
  const start = ostatnie.findIndex((w) => w.rola === 'ja')
  for (const w of ostatnie.slice(Math.max(0, start))) {
    const rola = w.rola === 'ja' ? 'user' : 'model'
    const poprzednia = wynik[wynik.length - 1]
    if (poprzednia.rola === rola) poprzednia.tekst += `\n\n${w.tresc}`
    else wynik.push({ rola, tekst: w.tresc })
  }
  return wynik
}
```

- [ ] **Krok 4: Uruchom - ma przejść; commit** `feat(asystent): czat z notatkami, ostatnia odprawa i propozycja notatki`

---

## Zadanie 5: Trasa czatu z wątkiem w bazie; notatki w odprawie

**Pliki:** `app/api/asystent/czat/route.ts` (całość), `app/api/asystent/czat/route.test.ts` (całość), `app/api/asystent/odprawa/route.ts`, `app/api/asystent/odprawa/route.test.ts`, `app/page.tsx`

- [ ] **Krok 1: Test - zastąp `app/api/asystent/czat/route.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/asystent/czat/route'
import { BladAsystenta } from '@/lib/asystent/gemini'

const ktoPyta = vi.fn()
const zapytajGemini = vi.fn()
const czytajRozmowe = vi.fn()
const zapiszRozmowe = vi.fn()
vi.mock('@/lib/auth/guard', () => ({ ktoPyta: (...a: unknown[]) => ktoPyta(...a) }))
vi.mock('@/lib/asystent/gemini', async (oryginal) => ({
  ...(await oryginal<typeof import('@/lib/asystent/gemini')>()),
  zapytajGemini: (...a: unknown[]) => zapytajGemini(...a),
}))
vi.mock('@/lib/asystent/dane', () => ({
  pobierzArkusz: async () => ({ rekrutacje: [], kohorty: [], punkty: [], projekty: [], czlonkowie: [], czasMs: 1 }),
  pobierzPlaner: async () => ({ wydarzenia: [], sesja: { wlaczony: false, od: null, przez: null }, sklad: [], propozycje: 0, ok: true }),
  daneProjektu: (_a: object, _p: object, _s: object, notatki: string[]) => ({ notatki }),
  zbudujKontekst: (d: { notatki: string[] }) => ({ meta: { data: '02.10.2026', dzienTygodnia: 'piątek' }, notatki: d.notatki }),
  czytajOdprawe: async () => ({ odprawa: { podsumowanie: 'Retencja słabnie.', zagrozenia: [], dzis: [] } }),
}))
vi.mock('@/lib/asystent/pamiecDane', () => ({
  czytajRozmowe: (...a: unknown[]) => czytajRozmowe(...a),
  zapiszRozmowe: (...a: unknown[]) => zapiszRozmowe(...a),
  tresciNotatek: async () => ['Zebrania w środy'],
}))

const zadanie = (body: unknown) => ({ json: async () => body }) as never
const WLASCICIEL = { uid: 'u', email: 'ja', rola: 'owner' }
const JSON_ODP = (o: object) => ({ tekst: JSON.stringify(o), model: 'gemini-3.8-flash' })

describe('POST /api/asystent/czat', () => {
  beforeEach(() => {
    ktoPyta.mockReset().mockResolvedValue(WLASCICIEL)
    zapytajGemini.mockReset()
    czytajRozmowe.mockReset()
    zapiszRozmowe.mockReset().mockResolvedValue('nowa-1')
  })

  it('bez sesji 401, zarząd 403', async () => {
    ktoPyta.mockResolvedValueOnce(null)
    expect((await POST(zadanie({ pytanie: 'x' }))).status).toBe(401)
    ktoPyta.mockResolvedValueOnce({ uid: 'kod:1', email: 'Jula', rola: 'board' })
    expect((await POST(zadanie({ pytanie: 'x' }))).status).toBe(403)
    expect(zapytajGemini).not.toHaveBeenCalled()
  })

  it('złe zapytanie 400, nieznana rozmowa 404', async () => {
    expect((await POST(zadanie({ pytanie: '' }))).status).toBe(400)
    czytajRozmowe.mockResolvedValue(null)
    expect((await POST(zadanie({ rozmowaId: 'brak', pytanie: 'x' }))).status).toBe(404)
  })

  it('nowa rozmowa: zapisuje pytanie, potem odpowiedź; zwraca id i propozycję', async () => {
    zapytajGemini.mockResolvedValue(JSON_ODP({ odpowiedz: 'Retencja spada.', propozycjaNotatki: 'Cel retencji 3,5 sem.' }))
    const res = await POST(zadanie({ pytanie: 'Cel retencji to 3,5 sem.' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ rozmowaId: 'nowa-1', odpowiedz: 'Retencja spada.', propozycja: 'Cel retencji 3,5 sem.' })
    const [pierwszy, bezId] = zapiszRozmowe.mock.calls[0]
    expect(bezId).toBeUndefined()
    expect(pierwszy.tytul).toBe('Cel retencji to 3,5 sem.')
    expect(pierwszy.wiadomosci.map((w: { rola: string }) => w.rola)).toEqual(['ja'])
    const [drugi, id] = zapiszRozmowe.mock.calls[1]
    expect(id).toBe('nowa-1')
    expect(drugi.wiadomosci.map((w: { rola: string }) => w.rola)).toEqual(['ja', 'deck'])
    const { wiadomosci, schemat } = zapytajGemini.mock.calls[0][0]
    expect(schemat).toBeDefined()
    expect(wiadomosci[0].tekst).toContain('Zebrania w środy')
    expect(wiadomosci[0].tekst).toContain('Retencja słabnie.')
  })

  it('kolejne pytanie dopisuje się do istniejącego wątku', async () => {
    czytajRozmowe.mockResolvedValue({
      id: 'w1', tytul: 'Stare', utworzono: 1, zmieniono: 2,
      wiadomosci: [{ rola: 'ja', tresc: 'A', kiedy: 1 }, { rola: 'deck', tresc: 'B', kiedy: 2 }],
    })
    zapiszRozmowe.mockResolvedValue('w1')
    zapytajGemini.mockResolvedValue(JSON_ODP({ odpowiedz: 'C2', propozycjaNotatki: null }))
    await POST(zadanie({ rozmowaId: 'w1', pytanie: 'C' }))
    const [ostatni, id] = zapiszRozmowe.mock.calls[1]
    expect(id).toBe('w1')
    expect(ostatni.tytul).toBe('Stare')
    expect(ostatni.wiadomosci.map((w: { tresc: string }) => w.tresc)).toEqual(['A', 'B', 'C', 'C2'])
  })

  it('ponowienie nie dubluje pytania', async () => {
    czytajRozmowe.mockResolvedValue({
      id: 'w1', tytul: 'T', utworzono: 1, zmieniono: 2, wiadomosci: [{ rola: 'ja', tresc: 'A', kiedy: 1 }],
    })
    zapiszRozmowe.mockResolvedValue('w1')
    zapytajGemini.mockResolvedValue(JSON_ODP({ odpowiedz: 'B' }))
    await POST(zadanie({ rozmowaId: 'w1', pytanie: 'A', ponow: true }))
    expect(zapiszRozmowe.mock.calls[1][0].wiadomosci.map((w: { tresc: string }) => w.tresc)).toEqual(['A', 'B'])
  })

  it('pełna rozmowa 409', async () => {
    czytajRozmowe.mockResolvedValue({
      id: 'w1', tytul: 'T', utworzono: 1, zmieniono: 2,
      wiadomosci: Array.from({ length: 199 }, () => ({ rola: 'ja', tresc: 'x', kiedy: 1 })),
    })
    expect((await POST(zadanie({ rozmowaId: 'w1', pytanie: 'y' }))).status).toBe(409)
  })

  it('błąd Gemini: pytanie zostaje zapisane, odpowiedź niesie komunikat i id rozmowy', async () => {
    zapytajGemini.mockRejectedValue(new BladAsystenta('limit', 'x'))
    const res = await POST(zadanie({ pytanie: 'Co z KPI?' }))
    expect(res.status).toBe(429)
    expect(await res.json()).toMatchObject({ rozmowaId: 'nowa-1', error: expect.stringMatching(/limit Gemini/) })
    expect(zapiszRozmowe).toHaveBeenCalledTimes(1)
  })

  it('odpowiedź niezgodna ze schematem to błąd formatu', async () => {
    zapytajGemini.mockResolvedValue({ tekst: 'zwykły tekst', model: 'm' })
    expect((await POST(zadanie({ pytanie: 'x' }))).status).toBe(502)
  })
})
```

- [ ] **Krok 2: Uruchom - ma paść**

- [ ] **Krok 3: `app/api/asystent/czat/route.ts` - całość**

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { biezacySemestr } from '@/lib/planer/semestry'
import { dzisWarszawa } from '@/lib/czas'
import { BladAsystenta, komunikatBledu, zapytajGemini } from '@/lib/asystent/gemini'
import { INSTRUKCJA_CZATU, rozmowaDlaGemini, sprawdzZapytanie } from '@/lib/asystent/czat'
import { czytajOdprawe, daneProjektu, pobierzArkusz, pobierzPlaner, zbudujKontekst } from '@/lib/asystent/dane'
import { czytajRozmowe, tresciNotatek, zapiszRozmowe } from '@/lib/asystent/pamiecDane'
import { dopiszPytanie, odczytajOdpowiedzCzatu, SCHEMAT_CZATU, tytulRozmowy } from '@/lib/asystent/pamiec'
import { tylkoWlasciciel } from '@/lib/asystent/tylkoWlasciciel'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Czat „Zapytaj D.E.C.K.”. Rozmowa żyje w bazie: pytanie zapisujemy przed
 * wołaniem Gemini, żeby nie zginęło, gdy model zawiedzie - wtedy przeglądarka
 * ponawia z `ponow: true` i pytanie się nie dubluje.
 */
export async function POST(req: NextRequest) {
  const { kto, odmowa } = await tylkoWlasciciel(req)
  if (odmowa) return odmowa

  const z = sprawdzZapytanie(await req.json().catch(() => null))
  if (!z) return NextResponse.json({ error: 'Puste albo niepoprawne pytanie' }, { status: 400 })

  const teraz = Date.now()
  const rozmowa = z.rozmowaId ? await czytajRozmowe(z.rozmowaId) : null
  if (z.rozmowaId && !rozmowa) return NextResponse.json({ error: 'Nie ma takiej rozmowy' }, { status: 404 })

  const wiadomosci = dopiszPytanie(rozmowa?.wiadomosci ?? [], z.pytanie, teraz, z.ponow)
  if (!wiadomosci) {
    return NextResponse.json({ error: 'Ta rozmowa jest pełna - zacznij nową.', rozmowaId: z.rozmowaId }, { status: 409 })
  }
  const naglowek = { tytul: rozmowa?.tytul ?? tytulRozmowy(z.pytanie), utworzono: rozmowa?.utworzono ?? teraz }
  const rozmowaId = await zapiszRozmowe({ ...naglowek, zmieniono: teraz, wiadomosci }, z.rozmowaId ?? undefined)

  const semestr = biezacySemestr(new Date(teraz))
  try {
    const [a, p, notatki, zapisana] = await Promise.all([
      pobierzArkusz(),
      pobierzPlaner(semestr.id, kto.rola),
      tresciNotatek().catch(() => []),
      czytajOdprawe().catch(() => null),
    ])
    const k = zbudujKontekst(daneProjektu(a, p, { id: semestr.id, nazwa: semestr.nazwa }, notatki), dzisWarszawa(new Date(teraz)))
    const { tekst } = await zapytajGemini({
      instrukcja: INSTRUKCJA_CZATU,
      wiadomosci: rozmowaDlaGemini(k, wiadomosci, zapisana?.odprawa ?? null),
      schemat: SCHEMAT_CZATU,
    })
    const wynik = odczytajOdpowiedzCzatu(tekst)
    if (!wynik) throw new BladAsystenta('format', 'Odpowiedź czatu niezgodna ze schematem')

    const kiedy = Date.now()
    await zapiszRozmowe(
      { ...naglowek, zmieniono: kiedy, wiadomosci: [...wiadomosci, { rola: 'deck', tresc: wynik.odpowiedz, kiedy }] },
      rozmowaId,
    )
    return NextResponse.json({ rozmowaId, odpowiedz: wynik.odpowiedz, propozycja: wynik.propozycja })
  } catch (e) {
    const { status, error } = komunikatBledu(e)
    return NextResponse.json({ error, rozmowaId }, { status })
  }
}
```

- [ ] **Krok 4: Odprawa z notatkami.** W `app/api/asystent/odprawa/route.ts` dodaj import `import { tresciNotatek } from '@/lib/asystent/pamiecDane'` i:

```ts
    const [a, p, notatki] = await Promise.all([
      pobierzArkusz(), pobierzPlaner(semestr.id, kto.rola), tresciNotatek().catch(() => []),
    ])
    const k = zbudujKontekst(daneProjektu(a, p, { id: semestr.id, nazwa: semestr.nazwa }, notatki), dzisWarszawa(teraz))
```

W `app/api/asystent/odprawa/route.test.ts` dopisz zaślepkę:

```ts
vi.mock('@/lib/asystent/pamiecDane', () => ({ tresciNotatek: async () => [] }))
```

W `app/page.tsx` dodaj import `import { tresciNotatek } from '@/lib/asystent/pamiecDane'`, a w wywołaniu `odswiezOdpraweWTle({ ... })` pole `notatki: tresciNotatek().catch(() => [])`.

- [ ] **Krok 5: Testy `app/api/asystent` i `lib/asystent` przechodzą; `tsc` czysty; commit** `feat(asystent): rozmowa w bazie i notatki w odprawie`

---

## Zadanie 6: Trasy wątków

**Pliki:** nowe `app/api/asystent/rozmowy/route.ts`, `app/api/asystent/rozmowy/[id]/route.ts`, test `app/api/asystent/rozmowy/route.test.ts`

- [ ] **Krok 1: Test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET as lista, DELETE as wszystkie } from '@/app/api/asystent/rozmowy/route'
import { GET as jedna, DELETE as usunJedna } from '@/app/api/asystent/rozmowy/[id]/route'

const ktoPyta = vi.fn()
const pamiec = {
  listaRozmow: vi.fn(), czytajRozmowe: vi.fn(), usunRozmowe: vi.fn(), usunWszystkieRozmowy: vi.fn(),
}
vi.mock('@/lib/auth/guard', () => ({ ktoPyta: (...a: unknown[]) => ktoPyta(...a) }))
vi.mock('@/lib/asystent/pamiecDane', () => ({
  listaRozmow: (...a: unknown[]) => pamiec.listaRozmow(...a),
  czytajRozmowe: (...a: unknown[]) => pamiec.czytajRozmowe(...a),
  usunRozmowe: (...a: unknown[]) => pamiec.usunRozmowe(...a),
  usunWszystkieRozmowy: (...a: unknown[]) => pamiec.usunWszystkieRozmowy(...a),
}))

const zada = {} as never
const z = (id: string) => ({ params: Promise.resolve({ id }) })

describe('/api/asystent/rozmowy', () => {
  beforeEach(() => {
    ktoPyta.mockReset().mockResolvedValue({ uid: 'u', email: 'ja', rola: 'owner' })
    Object.values(pamiec).forEach((f) => f.mockReset())
  })

  it('zarząd nie widzi rozmów', async () => {
    ktoPyta.mockResolvedValue({ uid: 'kod:1', email: 'Jula', rola: 'board' })
    expect((await lista(zada)).status).toBe(403)
    expect((await jedna(zada, z('w1'))).status).toBe(403)
    expect(pamiec.listaRozmow).not.toHaveBeenCalled()
  })

  it('lista i jedna rozmowa', async () => {
    pamiec.listaRozmow.mockResolvedValue([{ id: 'w1', tytul: 'T', zmieniono: 2 }])
    expect(await (await lista(zada)).json()).toEqual([{ id: 'w1', tytul: 'T', zmieniono: 2 }])
    pamiec.czytajRozmowe.mockResolvedValue({ id: 'w1', tytul: 'T', utworzono: 1, zmieniono: 2, wiadomosci: [] })
    expect((await (await jedna(zada, z('w1'))).json()).id).toBe('w1')
    pamiec.czytajRozmowe.mockResolvedValue(null)
    expect((await jedna(zada, z('brak'))).status).toBe(404)
  })

  it('usuwa jedną i wszystkie', async () => {
    expect((await usunJedna(zada, z('w1'))).status).toBe(200)
    expect(pamiec.usunRozmowe).toHaveBeenCalledWith('w1')
    pamiec.usunWszystkieRozmowy.mockResolvedValue(7)
    expect(await (await wszystkie(zada)).json()).toEqual({ usuniete: 7 })
  })
})
```

- [ ] **Krok 2: Uruchom - ma paść**

- [ ] **Krok 3: `app/api/asystent/rozmowy/route.ts`**

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { listaRozmow, usunWszystkieRozmowy } from '@/lib/asystent/pamiecDane'
import { tylkoWlasciciel } from '@/lib/asystent/tylkoWlasciciel'

export const runtime = 'nodejs'

/** 30 ostatnich rozmów - tytuł i czas ostatniej wiadomości. */
export async function GET(req: NextRequest) {
  const { odmowa } = await tylkoWlasciciel(req)
  if (odmowa) return odmowa
  return NextResponse.json(await listaRozmow())
}

/** Koniec kadencji: usuwa wszystkie rozmowy. Notatki zostają. */
export async function DELETE(req: NextRequest) {
  const { odmowa } = await tylkoWlasciciel(req)
  if (odmowa) return odmowa
  return NextResponse.json({ usuniete: await usunWszystkieRozmowy() })
}
```

- [ ] **Krok 4: `app/api/asystent/rozmowy/[id]/route.ts`**

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { czytajRozmowe, usunRozmowe } from '@/lib/asystent/pamiecDane'
import { tylkoWlasciciel } from '@/lib/asystent/tylkoWlasciciel'

export const runtime = 'nodejs'

type Kontekst = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Kontekst) {
  const { odmowa } = await tylkoWlasciciel(req)
  if (odmowa) return odmowa
  const rozmowa = await czytajRozmowe((await params).id)
  if (!rozmowa) return NextResponse.json({ error: 'Nie ma takiej rozmowy' }, { status: 404 })
  return NextResponse.json(rozmowa)
}

export async function DELETE(req: NextRequest, { params }: Kontekst) {
  const { odmowa } = await tylkoWlasciciel(req)
  if (odmowa) return odmowa
  await usunRozmowe((await params).id)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Krok 5: Uruchom - ma przejść; commit** `feat(asystent): trasy watkow rozmow`

---

## Zadanie 7: Trasy notatek

**Pliki:** nowe `app/api/asystent/notatki/route.ts`, `app/api/asystent/notatki/[id]/route.ts`, test `app/api/asystent/notatki/route.test.ts`

- [ ] **Krok 1: Test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET as lista, POST as dodaj } from '@/app/api/asystent/notatki/route'
import { PATCH as zmien, DELETE as usun } from '@/app/api/asystent/notatki/[id]/route'

const ktoPyta = vi.fn()
const pamiec = {
  listaNotatek: vi.fn(), liczbaNotatek: vi.fn(), dodajNotatke: vi.fn(), zmienNotatke: vi.fn(), usunNotatke: vi.fn(),
}
vi.mock('@/lib/auth/guard', () => ({ ktoPyta: (...a: unknown[]) => ktoPyta(...a) }))
vi.mock('@/lib/asystent/pamiecDane', () => ({
  listaNotatek: (...a: unknown[]) => pamiec.listaNotatek(...a),
  liczbaNotatek: (...a: unknown[]) => pamiec.liczbaNotatek(...a),
  dodajNotatke: (...a: unknown[]) => pamiec.dodajNotatke(...a),
  zmienNotatke: (...a: unknown[]) => pamiec.zmienNotatke(...a),
  usunNotatke: (...a: unknown[]) => pamiec.usunNotatke(...a),
}))

const zadanie = (body?: unknown) => ({ json: async () => body }) as never
const z = (id: string) => ({ params: Promise.resolve({ id }) })

describe('/api/asystent/notatki', () => {
  beforeEach(() => {
    ktoPyta.mockReset().mockResolvedValue({ uid: 'u', email: 'ja', rola: 'owner' })
    Object.values(pamiec).forEach((f) => f.mockReset())
  })

  it('zarząd 403', async () => {
    ktoPyta.mockResolvedValue({ uid: 'kod:1', email: 'Jula', rola: 'board' })
    expect((await lista(zadanie())).status).toBe(403)
    expect((await dodaj(zadanie({ tresc: 'x' }))).status).toBe(403)
  })

  it('dodaje przyciętą notatkę ze źródłem', async () => {
    pamiec.liczbaNotatek.mockResolvedValue(3)
    pamiec.dodajNotatke.mockResolvedValue({ id: 'n1', tresc: 'Zebrania w środy', utworzono: 1, zrodlo: 'rozmowa' })
    const res = await dodaj(zadanie({ tresc: '  Zebrania w środy ', zrodlo: 'rozmowa' }))
    expect(res.status).toBe(201)
    expect(pamiec.dodajNotatke).toHaveBeenCalledWith('Zebrania w środy', 'rozmowa')
  })

  it('pusta 400, przy 50 notatkach 409', async () => {
    expect((await dodaj(zadanie({ tresc: '  ' }))).status).toBe(400)
    pamiec.liczbaNotatek.mockResolvedValue(50)
    const res = await dodaj(zadanie({ tresc: 'Nowa' }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/50/)
  })

  it('poprawia i usuwa; nieznana 404', async () => {
    pamiec.zmienNotatke.mockResolvedValue(true)
    expect((await zmien(zadanie({ tresc: 'Nowa treść' }), z('n1'))).status).toBe(200)
    expect(pamiec.zmienNotatke).toHaveBeenCalledWith('n1', 'Nowa treść')
    pamiec.zmienNotatke.mockResolvedValue(false)
    expect((await zmien(zadanie({ tresc: 'x' }), z('brak'))).status).toBe(404)
    expect((await usun(zadanie(), z('n1'))).status).toBe(200)
    expect(pamiec.usunNotatke).toHaveBeenCalledWith('n1')
  })
})
```

- [ ] **Krok 2: Uruchom - ma paść**

- [ ] **Krok 3: `app/api/asystent/notatki/route.ts`**

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { dodajNotatke, liczbaNotatek, listaNotatek } from '@/lib/asystent/pamiecDane'
import { LIMIT_NOTATEK, sprawdzTrescNotatki } from '@/lib/asystent/pamiec'
import { tylkoWlasciciel } from '@/lib/asystent/tylkoWlasciciel'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { odmowa } = await tylkoWlasciciel(req)
  if (odmowa) return odmowa
  return NextResponse.json(await listaNotatek())
}

export async function POST(req: NextRequest) {
  const { odmowa } = await tylkoWlasciciel(req)
  if (odmowa) return odmowa
  const body = await req.json().catch(() => null)
  const tresc = sprawdzTrescNotatki(body?.tresc)
  if (!tresc) return NextResponse.json({ error: 'Notatka jest pusta' }, { status: 400 })
  if ((await liczbaNotatek()) >= LIMIT_NOTATEK) {
    return NextResponse.json(
      { error: `Masz już ${LIMIT_NOTATEK} notatek - usuń starą, żeby dodać nową.` },
      { status: 409 },
    )
  }
  const notatka = await dodajNotatke(tresc, body?.zrodlo === 'rozmowa' ? 'rozmowa' : 'reczna')
  return NextResponse.json(notatka, { status: 201 })
}
```

- [ ] **Krok 4: `app/api/asystent/notatki/[id]/route.ts`**

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { usunNotatke, zmienNotatke } from '@/lib/asystent/pamiecDane'
import { sprawdzTrescNotatki } from '@/lib/asystent/pamiec'
import { tylkoWlasciciel } from '@/lib/asystent/tylkoWlasciciel'

export const runtime = 'nodejs'

type Kontekst = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Kontekst) {
  const { odmowa } = await tylkoWlasciciel(req)
  if (odmowa) return odmowa
  const tresc = sprawdzTrescNotatki((await req.json().catch(() => null))?.tresc)
  if (!tresc) return NextResponse.json({ error: 'Notatka jest pusta' }, { status: 400 })
  if (!(await zmienNotatke((await params).id, tresc))) {
    return NextResponse.json({ error: 'Nie ma takiej notatki' }, { status: 404 })
  }
  return NextResponse.json({ ok: true, tresc })
}

export async function DELETE(req: NextRequest, { params }: Kontekst) {
  const { odmowa } = await tylkoWlasciciel(req)
  if (odmowa) return odmowa
  await usunNotatke((await params).id)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Krok 5: Uruchom - ma przejść; commit** `feat(asystent): trasy notatek`

---

## Zadanie 8: Panel w kokpicie

**Pliki:** nowe `lib/asystent/klient.ts`, `components/deck/CzatRozmowa.tsx`, `components/deck/CzatWatki.tsx`, `components/deck/CzatNotatki.tsx`; `components/deck/CzatDeck.tsx` (całość), `components/deck/CzatDeck.test.tsx` (całość)

- [ ] **Krok 1: Test - zastąp `components/deck/CzatDeck.test.tsx`**

```tsx
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { CzatDeck } from '@/components/deck/CzatDeck'

type Trasa = (body: unknown) => { status?: number; json: unknown }
let trasy: Record<string, Trasa>
const wywolania: { klucz: string; body: unknown }[] = []

beforeEach(() => {
  localStorage.clear()
  wywolania.length = 0
  trasy = {}
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const klucz = `${init?.method ?? 'GET'} ${url}`
    const body = init?.body ? JSON.parse(init.body as string) : undefined
    wywolania.push({ klucz, body })
    const t = trasy[klucz]
    if (!t) return new Response(JSON.stringify({ error: `brak trasy ${klucz}` }), { status: 500 })
    const { status = 200, json } = t(body)
    return new Response(JSON.stringify(json), { status })
  }))
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function otworz() {
  await act(async () => {
    render(<CzatDeck />)
  })
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Zapytaj D\.E\.C\.K\./ }))
  })
}

async function zapytaj(tekst: string) {
  fireEvent.change(screen.getByRole('textbox', { name: /Pytanie/ }), { target: { value: tekst } })
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Wyślij/ }))
  })
}

describe('CzatDeck - rozmowa', () => {
  it('nowa rozmowa: pytanie idzie bez id, odpowiedź się pokazuje, id zostaje zapamiętane', async () => {
    trasy['POST /api/asystent/czat'] = () => ({ json: { rozmowaId: 'w1', odpowiedz: 'Retencja **spada**.', propozycja: null } })
    await otworz()
    await zapytaj('Co z retencją?')
    expect(await screen.findByText('spada')).toBeInTheDocument()
    expect(wywolania.at(-1)?.body).toEqual({ rozmowaId: null, pytanie: 'Co z retencją?', ponow: false })
    expect(localStorage.getItem('deck-rozmowa')).toBe('w1')
  })

  it('wznawia ostatni wątek po wejściu', async () => {
    localStorage.setItem('deck-rozmowa', 'w1')
    trasy['GET /api/asystent/rozmowy/w1'] = () => ({
      json: { id: 'w1', tytul: 'T', utworzono: 1, zmieniono: 2, wiadomosci: [
        { rola: 'ja', tresc: 'Wcześniejsze pytanie', kiedy: 1 },
        { rola: 'deck', tresc: 'Wcześniejsza odpowiedź', kiedy: 2 },
      ] },
    })
    await otworz()
    expect(await screen.findByText('Wcześniejsza odpowiedź')).toBeInTheDocument()
  })

  it('propozycja notatki: poprawka i zapis', async () => {
    trasy['POST /api/asystent/czat'] = () => ({ json: { rozmowaId: 'w1', odpowiedz: 'Jasne.', propozycja: 'Zebrania w środy' } })
    trasy['POST /api/asystent/notatki'] = (b) => ({ status: 201, json: { id: 'n1', ...(b as object), utworzono: 1 } })
    await otworz()
    await zapytaj('Zebrania mamy w środy')
    const pole = await screen.findByRole('textbox', { name: /Treść notatki/ })
    fireEvent.change(pole, { target: { value: 'Zebrania zarządu w środy o 18:00' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Zapisz notatkę/ }))
    })
    expect(wywolania.at(-1)?.body).toEqual({ tresc: 'Zebrania zarządu w środy o 18:00', zrodlo: 'rozmowa' })
    expect(await screen.findByText(/Zapisano w notatkach/)).toBeInTheDocument()
  })

  it('propozycję można pominąć', async () => {
    trasy['POST /api/asystent/czat'] = () => ({ json: { rozmowaId: 'w1', odpowiedz: 'Jasne.', propozycja: 'X' } })
    await otworz()
    await zapytaj('Coś')
    fireEvent.click(await screen.findByRole('button', { name: /Pomiń/ }))
    expect(screen.queryByRole('textbox', { name: /Treść notatki/ })).toBeNull()
  })

  it('błąd: pytanie zostaje bez odpowiedzi, „Ponów” wysyła je z ponow', async () => {
    trasy['POST /api/asystent/czat'] = () => ({ status: 429, json: { error: 'Darmowy limit Gemini na tę chwilę wyczerpany - spróbuj za minutę.', rozmowaId: 'w1' } })
    await otworz()
    await zapytaj('Co z KPI?')
    expect(await screen.findByRole('alert')).toHaveTextContent(/limit Gemini/)
    expect(screen.getByText('Co z KPI?')).toBeInTheDocument()
    trasy['POST /api/asystent/czat'] = () => ({ json: { rozmowaId: 'w1', odpowiedz: 'Już jest.', propozycja: null } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Ponów/ }))
    })
    expect(wywolania.at(-1)?.body).toEqual({ rozmowaId: 'w1', pytanie: 'Co z KPI?', ponow: true })
    expect(await screen.findByText('Już jest.')).toBeInTheDocument()
  })

  it('„Nowa rozmowa” czyści widok i zapomina wątek', async () => {
    trasy['POST /api/asystent/czat'] = () => ({ json: { rozmowaId: 'w1', odpowiedz: 'Odp.', propozycja: null } })
    await otworz()
    await zapytaj('Pierwsze')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Nowa rozmowa/ }))
    })
    expect(screen.queryByText('Odp.')).toBeNull()
    expect(localStorage.getItem('deck-rozmowa')).toBeNull()
  })
})

describe('CzatDeck - wątki i notatki', () => {
  it('lista wątków: otwarcie i usunięcie', async () => {
    trasy['GET /api/asystent/rozmowy'] = () => ({ json: [{ id: 'w1', tytul: 'O retencji', zmieniono: Date.UTC(2026, 9, 2, 12) }] })
    trasy['GET /api/asystent/rozmowy/w1'] = () => ({ json: { id: 'w1', tytul: 'O retencji', utworzono: 1, zmieniono: 2, wiadomosci: [{ rola: 'deck', tresc: 'Stara odpowiedź', kiedy: 2 }] } })
    trasy['DELETE /api/asystent/rozmowy/w1'] = () => ({ json: { ok: true } })
    await otworz()
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: 'Wątki' }))
    })
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /O retencji/ }))
    })
    expect(await screen.findByText('Stara odpowiedź')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: 'Wątki' }))
    })
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /Usuń rozmowę „O retencji”/ }))
    })
    expect(wywolania.some((w) => w.klucz === 'DELETE /api/asystent/rozmowy/w1')).toBe(true)
    expect(screen.queryByRole('button', { name: /O retencji/ })).toBeNull()
  })

  it('„Wyczyść wszystkie rozmowy” z potwierdzeniem', async () => {
    trasy['GET /api/asystent/rozmowy'] = () => ({ json: [{ id: 'w1', tytul: 'A', zmieniono: 1 }] })
    trasy['DELETE /api/asystent/rozmowy'] = () => ({ json: { usuniete: 1 } })
    await otworz()
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: 'Wątki' }))
    })
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /Wyczyść wszystkie rozmowy/ }))
    })
    expect(window.confirm).toHaveBeenCalled()
    expect(await screen.findByText(/Brak zapisanych rozmów/)).toBeInTheDocument()
  })

  it('notatki: licznik, dodanie, poprawka i usunięcie', async () => {
    trasy['GET /api/asystent/notatki'] = () => ({ json: [{ id: 'n1', tresc: 'Zebrania w środy', utworzono: 1, zrodlo: 'rozmowa' }] })
    trasy['POST /api/asystent/notatki'] = (b) => ({ status: 201, json: { id: 'n2', utworzono: 2, ...(b as object) } })
    trasy['PATCH /api/asystent/notatki/n1'] = (b) => ({ json: { ok: true, ...(b as object) } })
    trasy['DELETE /api/asystent/notatki/n2'] = () => ({ json: { ok: true } })
    await otworz()
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: 'Notatki' }))
    })
    expect(await screen.findByText('1/50')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: /Nowa notatka/ }), { target: { value: 'Cel retencji 3,5 sem.' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Dodaj notatkę/ }))
    })
    expect(wywolania.at(-1)?.body).toEqual({ tresc: 'Cel retencji 3,5 sem.', zrodlo: 'reczna' })
    expect(await screen.findByText('2/50')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Popraw notatkę „Zebrania w środy”/ }))
    const edycja = screen.getByRole('textbox', { name: /Popraw treść/ })
    fireEvent.change(edycja, { target: { value: 'Zebrania w środy o 18:00' } })
    await act(async () => {
      fireEvent.click(within(edycja.closest('li')!).getByRole('button', { name: /Zapisz/ }))
    })
    expect(await screen.findByText('Zebrania w środy o 18:00')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Usuń notatkę „Cel retencji 3,5 sem\.”/ }))
    })
    expect(screen.queryByText('Cel retencji 3,5 sem.')).toBeNull()
  })
})
```

- [ ] **Krok 2: Uruchom - ma paść**

- [ ] **Krok 3: `lib/asystent/klient.ts`**

```ts
'use client'
import type { Notatka, Rozmowa, SkrotRozmowy, ZrodloNotatki } from './pamiec'

/** Błąd z ludzkim komunikatem; przy czacie niesie id rozmowy, w której zostało pytanie. */
export class BladKlienta extends Error {
  readonly rozmowaId: string | null
  constructor(wiadomosc: string, rozmowaId: string | null = null) {
    super(wiadomosc)
    this.name = 'BladKlienta'
    this.rozmowaId = rozmowaId
  }
}

async function wywolaj<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, init)
  } catch {
    throw new BladKlienta('Brak połączenia - spróbuj ponownie.')
  }
  const dane = await res.json().catch(() => ({}))
  if (!res.ok) throw new BladKlienta(dane.error ?? 'Coś poszło nie tak - spróbuj ponownie.', dane.rozmowaId ?? null)
  return dane as T
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const klient = {
  zapytaj: (b: { rozmowaId: string | null; pytanie: string; ponow: boolean }) =>
    wywolaj<{ rozmowaId: string; odpowiedz: string; propozycja: string | null }>('/api/asystent/czat', json('POST', b)),
  rozmowy: () => wywolaj<SkrotRozmowy[]>('/api/asystent/rozmowy'),
  rozmowa: (id: string) => wywolaj<Rozmowa>(`/api/asystent/rozmowy/${id}`),
  usunRozmowe: (id: string) => wywolaj<{ ok: true }>(`/api/asystent/rozmowy/${id}`, { method: 'DELETE' }),
  usunRozmowy: () => wywolaj<{ usuniete: number }>('/api/asystent/rozmowy', { method: 'DELETE' }),
  notatki: () => wywolaj<Notatka[]>('/api/asystent/notatki'),
  dodajNotatke: (tresc: string, zrodlo: ZrodloNotatki) => wywolaj<Notatka>('/api/asystent/notatki', json('POST', { tresc, zrodlo })),
  zmienNotatke: (id: string, tresc: string) =>
    wywolaj<{ ok: true; tresc: string }>(`/api/asystent/notatki/${id}`, json('PATCH', { tresc })),
  usunNotatke: (id: string) => wywolaj<{ ok: true }>(`/api/asystent/notatki/${id}`, { method: 'DELETE' }),
}
```

- [ ] **Krok 4: `components/deck/CzatDeck.tsx` - całość**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { MessageSquare, Plus } from 'lucide-react'
import { CzatRozmowa } from './CzatRozmowa'
import { CzatWatki } from './CzatWatki'
import { CzatNotatki } from './CzatNotatki'

const KLUCZ = 'deck-rozmowa'
type Widok = 'rozmowa' | 'watki' | 'notatki'
const ZAKLADKI: { widok: Widok; etykieta: string }[] = [
  { widok: 'rozmowa', etykieta: 'Rozmowa' },
  { widok: 'watki', etykieta: 'Wątki' },
  { widok: 'notatki', etykieta: 'Notatki' },
]

/** Ostatni wątek tej przeglądarki - sama treść rozmowy jest w bazie. */
function wczytajId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(KLUCZ)
  } catch {
    return null
  }
}

/**
 * „Zapytaj D.E.C.K.” - rozmowy zapisane w bazie, notatki z ustaleniami.
 * `wersja` przemontowuje rozmowę przy zmianie wątku z zewnątrz (nowa,
 * otwarta z listy); id nadane przez serwer w trakcie rozmowy jej nie
 * przemontowuje, żeby nie zgubić propozycji notatki.
 */
export function CzatDeck() {
  const [otwarty, setOtwarty] = useState(false)
  const [widok, setWidok] = useState<Widok>('rozmowa')
  const [rozmowaId, setRozmowaId] = useState<string | null>(wczytajId)
  const [wersja, setWersja] = useState(0)

  useEffect(() => {
    try {
      if (rozmowaId) localStorage.setItem(KLUCZ, rozmowaId)
      else localStorage.removeItem(KLUCZ)
    } catch {
      // Tryb prywatny bez miejsca - po odświeżeniu zacznie się nowa rozmowa.
    }
  }, [rozmowaId])

  function przelacz(id: string | null) {
    setRozmowaId(id)
    setWersja((w) => w + 1)
    setWidok('rozmowa')
  }

  /** Usunięty bieżący wątek (albo wszystkie): zapominamy go, ale zostajemy na liście. */
  function zapomnij(id: string | null) {
    if (id !== null && id !== rozmowaId) return
    setRozmowaId(null)
    setWersja((w) => w + 1)
  }

  return (
    <section className="deck-card rounded-lg">
      <button
        type="button"
        onClick={() => setOtwarty((o) => !o)}
        aria-expanded={otwarty}
        className="flex w-full items-center gap-2.5 px-[18px] py-3 text-left text-[13px] font-semibold text-deck-text"
      >
        <MessageSquare size={15} className="text-deck-accent" aria-hidden="true" />
        Zapytaj D.E.C.K.
        <span className="ml-auto font-mono text-[10px] font-normal text-deck-muted">{otwarty ? 'zwiń' : 'rozwiń'}</span>
      </button>

      {otwarty && (
        <div className="border-t border-white/8 px-[18px] pb-[18px]">
          <div className="flex flex-wrap items-center gap-2 py-3">
            <div role="tablist" aria-label="Asystent" className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
              {ZAKLADKI.map((z) => (
                <button
                  key={z.widok}
                  type="button"
                  role="tab"
                  aria-selected={widok === z.widok}
                  onClick={() => setWidok(z.widok)}
                  className={`rounded-md px-2.5 py-1 font-mono text-[10.5px] transition ${
                    widok === z.widok ? 'bg-deck-accent/15 text-deck-accent' : 'text-deck-muted hover:text-deck-text'
                  }`}
                >
                  {z.etykieta}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => przelacz(null)}
              className="ml-auto flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1 font-mono text-[10.5px] text-deck-muted transition hover:border-deck-accent/40 hover:text-deck-accent"
            >
              <Plus size={11} aria-hidden="true" />
              Nowa rozmowa
            </button>
          </div>

          {widok === 'rozmowa' && <CzatRozmowa key={wersja} poczatkowaId={rozmowaId} onRozmowa={setRozmowaId} />}
          {widok === 'watki' && (
            <CzatWatki aktywna={rozmowaId} onOtworz={przelacz} onUsunieto={zapomnij} />
          )}
          {widok === 'notatki' && <CzatNotatki />}
        </div>
      )}
    </section>
  )
}
```

- [ ] **Krok 5: `components/deck/CzatRozmowa.tsx`**

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { RotateCcw, Send } from 'lucide-react'
import { BladKlienta, klient } from '@/lib/asystent/klient'
import { DLUGOSC_NOTATKI } from '@/lib/asystent/pamiec'
import { TekstAsystenta } from './TekstAsystenta'

type Wpis = { rola: 'ja' | 'deck'; tresc: string }

export function CzatRozmowa({ poczatkowaId, onRozmowa }: {
  poczatkowaId: string | null
  onRozmowa: (id: string | null) => void
}) {
  const [id, setId] = useState(poczatkowaId)
  const [wiadomosci, setWiadomosci] = useState<Wpis[]>([])
  const [laduje, setLaduje] = useState(poczatkowaId !== null)
  const [pytanie, setPytanie] = useState('')
  const [czeka, setCzeka] = useState(false)
  const [blad, setBlad] = useState<string | null>(null)
  const [bezOdpowiedzi, setBezOdpowiedzi] = useState(false)
  const [propozycja, setPropozycja] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const dol = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!poczatkowaId) return
    let aktualny = true
    klient
      .rozmowa(poczatkowaId)
      .then((r) => {
        if (!aktualny) return
        setWiadomosci(r.wiadomosci.map(({ rola, tresc }) => ({ rola, tresc })))
        setBezOdpowiedzi(r.wiadomosci.at(-1)?.rola === 'ja')
      })
      .catch(() => {
        // Wątek usunięty albo niedostępny - zaczynamy od czystej rozmowy.
        if (aktualny) onRozmowa(null)
      })
      .finally(() => {
        if (aktualny) setLaduje(false)
      })
    return () => {
      aktualny = false
    }
  }, [poczatkowaId, onRozmowa])

  useEffect(() => {
    dol.current?.scrollIntoView?.({ block: 'nearest' })
  }, [wiadomosci, czeka])

  function ustawId(nowe: string | null) {
    if (nowe && nowe !== id) {
      setId(nowe)
      onRozmowa(nowe)
    }
  }

  async function wyslij(ponow = false) {
    const tresc = ponow ? [...wiadomosci].reverse().find((w) => w.rola === 'ja')?.tresc ?? '' : pytanie.trim()
    if (!tresc || czeka) return
    if (!ponow) {
      setWiadomosci((w) => [...w, { rola: 'ja', tresc }])
      setPytanie('')
    }
    setBlad(null)
    setInfo(null)
    setBezOdpowiedzi(false)
    setPropozycja(null)
    setCzeka(true)
    try {
      const r = await klient.zapytaj({ rozmowaId: id, pytanie: tresc, ponow })
      ustawId(r.rozmowaId)
      setWiadomosci((w) => [...w, { rola: 'deck', tresc: r.odpowiedz }])
      setPropozycja(r.propozycja)
    } catch (e) {
      const b = e instanceof BladKlienta ? e : new BladKlienta('Coś poszło nie tak - spróbuj ponownie.')
      ustawId(b.rozmowaId)
      setBlad(b.message)
      setBezOdpowiedzi(true)
    } finally {
      setCzeka(false)
    }
  }

  async function zapiszPropozycje() {
    if (!propozycja?.trim()) return
    try {
      await klient.dodajNotatke(propozycja.trim().slice(0, DLUGOSC_NOTATKI), 'rozmowa')
      setPropozycja(null)
      setInfo('Zapisano w notatkach.')
    } catch (e) {
      setBlad(e instanceof Error ? e.message : 'Nie udało się zapisać notatki.')
    }
  }

  return (
    <div>
      <div className="max-h-[420px] space-y-3 overflow-y-auto pb-3 text-[12.5px] leading-relaxed">
        {laduje && <p className="font-mono text-[11px] text-deck-muted">Wczytuję rozmowę…</p>}
        {!laduje && wiadomosci.length === 0 && (
          <p className="text-deck-muted">
            Pytaj o wskaźniki, ryzyka, kalendarz albo poproś o tekst. D.E.C.K. widzi te same dane co kokpit, Twoje notatki i ostatnią odprawę.
          </p>
        )}
        {wiadomosci.map((w, i) =>
          w.rola === 'ja' ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-lg bg-deck-accent/10 px-3 py-2 text-deck-text">
              {w.tresc}
              {bezOdpowiedzi && i === wiadomosci.length - 1 && (
                <span className="mt-1 block font-mono text-[10px] text-deck-warn">bez odpowiedzi</span>
              )}
            </div>
          ) : (
            <div key={i} className="max-w-[92%] rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-deck-text">
              <TekstAsystenta tekst={w.tresc} />
            </div>
          ),
        )}
        {czeka && <p className="deck-caret font-mono text-[11px] text-deck-accent">D.E.C.K. analizuje dane…</p>}

        {propozycja !== null && (
          <div className="rounded-lg border border-deck-accent/30 bg-deck-accent/[0.06] p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-deck-accent">Zapamiętać?</div>
            <input
              value={propozycja}
              onChange={(e) => setPropozycja(e.target.value)}
              maxLength={DLUGOSC_NOTATKI}
              aria-label="Treść notatki"
              className="deck-input mt-2 w-full rounded-md px-2.5 py-1.5 text-[12.5px]"
            />
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={zapiszPropozycje} className="deck-button rounded-md px-3 py-1 text-[11.5px]">
                Zapisz notatkę
              </button>
              <button
                type="button"
                onClick={() => setPropozycja(null)}
                className="rounded-md border border-white/10 px-3 py-1 text-[11.5px] text-deck-muted hover:text-deck-text"
              >
                Pomiń
              </button>
            </div>
          </div>
        )}
        {info && <p className="font-mono text-[11px] text-deck-accent">{info}</p>}
        <div ref={dol} />
      </div>

      {blad && (
        <div role="alert" className="mb-2 flex items-center gap-3 rounded-md border border-deck-danger-border bg-deck-danger-bg/70 px-3 py-2 text-[11.5px] text-deck-danger">
          <span className="flex-1">{blad}</span>
          {bezOdpowiedzi && (
            <button type="button" onClick={() => wyslij(true)} className="flex items-center gap-1 font-semibold hover:underline">
              <RotateCcw size={11} aria-hidden="true" />
              Ponów
            </button>
          )}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void wyslij()
        }}
        className="flex items-end gap-2"
      >
        <textarea
          value={pytanie}
          onChange={(e) => setPytanie(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void wyslij()
            }
          }}
          rows={2}
          aria-label="Pytanie do D.E.C.K."
          placeholder="Np. które KPI spadają najmocniej i co z tym zrobić?"
          className="deck-input min-h-[44px] flex-1 resize-y rounded-lg px-3 py-2 text-[12.5px]"
        />
        <button
          type="submit"
          disabled={czeka || !pytanie.trim()}
          className="deck-button grid h-[44px] w-[44px] place-items-center rounded-lg disabled:opacity-50"
        >
          <Send size={15} aria-hidden="true" />
          <span className="sr-only">Wyślij</span>
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Krok 6: `components/deck/CzatWatki.tsx`**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { klient } from '@/lib/asystent/klient'
import type { SkrotRozmowy } from '@/lib/asystent/pamiec'

const kiedy = (ms: number) =>
  new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(ms)

export function CzatWatki({ aktywna, onOtworz, onUsunieto }: {
  aktywna: string | null
  onOtworz: (id: string) => void
  /** `null` - usunięto wszystkie. */
  onUsunieto: (id: string | null) => void
}) {
  const [lista, setLista] = useState<SkrotRozmowy[] | null>(null)
  const [blad, setBlad] = useState<string | null>(null)

  useEffect(() => {
    let aktualny = true
    klient
      .rozmowy()
      .then((r) => aktualny && setLista(r))
      .catch((e: Error) => aktualny && setBlad(e.message))
    return () => {
      aktualny = false
    }
  }, [])

  async function usun(id: string) {
    try {
      await klient.usunRozmowe(id)
      setLista((l) => l?.filter((r) => r.id !== id) ?? null)
      onUsunieto(id)
    } catch (e) {
      setBlad((e as Error).message)
    }
  }

  async function usunWszystkie() {
    if (!window.confirm('Usunąć wszystkie rozmowy? Notatki zostaną. Tego nie da się cofnąć.')) return
    try {
      await klient.usunRozmowy()
      setLista([])
      onUsunieto(null)
    } catch (e) {
      setBlad((e as Error).message)
    }
  }

  return (
    <div className="space-y-2 text-[12.5px]">
      {blad && <p role="alert" className="text-[11.5px] text-deck-danger">{blad}</p>}
      {lista === null && !blad && <p className="font-mono text-[11px] text-deck-muted">Wczytuję rozmowy…</p>}
      {lista?.length === 0 && <p className="text-deck-muted">Brak zapisanych rozmów.</p>}
      <ul className="space-y-1.5">
        {lista?.map((r) => (
          <li key={r.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOtworz(r.id)}
              className={`flex-1 rounded-md border px-3 py-2 text-left transition hover:border-deck-accent/40 ${
                r.id === aktywna ? 'border-deck-accent/40 bg-deck-accent/[0.06]' : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              <span className="block text-deck-text">{r.tytul}</span>
              <span className="font-mono text-[10px] text-deck-muted">{kiedy(r.zmieniono)}</span>
            </button>
            <button
              type="button"
              onClick={() => usun(r.id)}
              aria-label={`Usuń rozmowę „${r.tytul}”`}
              className="grid h-8 w-8 place-items-center rounded-md border border-white/10 text-deck-muted hover:text-deck-danger"
            >
              <Trash2 size={13} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      {!!lista?.length && (
        <button type="button" onClick={usunWszystkie} className="font-mono text-[10.5px] text-deck-muted hover:text-deck-danger">
          Wyczyść wszystkie rozmowy
        </button>
      )}
    </div>
  )
}
```

- [ ] **Krok 7: `components/deck/CzatNotatki.tsx`**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { klient } from '@/lib/asystent/klient'
import { DLUGOSC_NOTATKI, LIMIT_NOTATEK, type Notatka } from '@/lib/asystent/pamiec'

export function CzatNotatki() {
  const [lista, setLista] = useState<Notatka[] | null>(null)
  const [nowa, setNowa] = useState('')
  const [edytowana, setEdytowana] = useState<{ id: string; tresc: string } | null>(null)
  const [blad, setBlad] = useState<string | null>(null)

  useEffect(() => {
    let aktualny = true
    klient
      .notatki()
      .then((n) => aktualny && setLista(n))
      .catch((e: Error) => aktualny && setBlad(e.message))
    return () => {
      aktualny = false
    }
  }, [])

  const pelna = (lista?.length ?? 0) >= LIMIT_NOTATEK

  async function dodaj(e: React.FormEvent) {
    e.preventDefault()
    if (!nowa.trim() || pelna) return
    setBlad(null)
    try {
      const n = await klient.dodajNotatke(nowa.trim(), 'reczna')
      setLista((l) => [n, ...(l ?? [])])
      setNowa('')
    } catch (er) {
      setBlad((er as Error).message)
    }
  }

  async function zapiszEdycje() {
    if (!edytowana?.tresc.trim()) return
    setBlad(null)
    try {
      const { tresc } = await klient.zmienNotatke(edytowana.id, edytowana.tresc.trim())
      setLista((l) => l?.map((n) => (n.id === edytowana.id ? { ...n, tresc } : n)) ?? null)
      setEdytowana(null)
    } catch (er) {
      setBlad((er as Error).message)
    }
  }

  async function usun(n: Notatka) {
    setBlad(null)
    try {
      await klient.usunNotatke(n.id)
      setLista((l) => l?.filter((x) => x.id !== n.id) ?? null)
    } catch (er) {
      setBlad((er as Error).message)
    }
  }

  return (
    <div className="space-y-3 text-[12.5px]">
      <div className="flex items-center justify-between">
        <p className="text-deck-muted">Ustalenia, które D.E.C.K. zna przy każdym pytaniu i odprawie.</p>
        <span className="font-mono text-[10.5px] text-deck-muted">{lista ? `${lista.length}/${LIMIT_NOTATEK}` : ''}</span>
      </div>
      {blad && <p role="alert" className="text-[11.5px] text-deck-danger">{blad}</p>}

      <form onSubmit={dodaj} className="flex gap-2">
        <input
          value={nowa}
          onChange={(e) => setNowa(e.target.value)}
          maxLength={DLUGOSC_NOTATKI}
          disabled={pelna}
          aria-label="Nowa notatka"
          placeholder={pelna ? 'Limit 50 notatek - usuń starą' : 'Np. cel retencji kadencji: 3,5 semestru'}
          className="deck-input flex-1 rounded-md px-2.5 py-1.5 disabled:opacity-60"
        />
        <button type="submit" disabled={pelna || !nowa.trim()} className="deck-button rounded-md px-3 py-1 text-[11.5px] disabled:opacity-50">
          Dodaj notatkę
        </button>
      </form>

      {lista === null && !blad && <p className="font-mono text-[11px] text-deck-muted">Wczytuję notatki…</p>}
      <ul className="space-y-1.5">
        {lista?.map((n) => (
          <li key={n.id} className="flex items-start gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
            {edytowana?.id === n.id ? (
              <>
                <input
                  value={edytowana.tresc}
                  onChange={(e) => setEdytowana({ id: n.id, tresc: e.target.value })}
                  maxLength={DLUGOSC_NOTATKI}
                  aria-label="Popraw treść"
                  className="deck-input flex-1 rounded-md px-2 py-1"
                />
                <button type="button" onClick={zapiszEdycje} className="text-[11.5px] text-deck-accent hover:underline">
                  Zapisz
                </button>
                <button type="button" onClick={() => setEdytowana(null)} className="text-[11.5px] text-deck-muted hover:underline">
                  Anuluj
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-deck-text">{n.tresc}</span>
                <button
                  type="button"
                  onClick={() => setEdytowana({ id: n.id, tresc: n.tresc })}
                  aria-label={`Popraw notatkę „${n.tresc}”`}
                  className="text-deck-muted hover:text-deck-text"
                >
                  <Pencil size={12} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => usun(n)}
                  aria-label={`Usuń notatkę „${n.tresc}”`}
                  className="text-deck-muted hover:text-deck-danger"
                >
                  <Trash2 size={12} aria-hidden="true" />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Krok 8: Testy komponentu, cały zestaw, typy, lint; commit**

Run: `npx vitest run > "$TMP/vt.log" 2>&1; echo $?` (oczekiwane `0`), `npx tsc --noEmit`, `npx eslint components/deck lib/asystent app/api/asystent`
Commit: `feat(kokpit): rozmowy i notatki asystenta w panelu Zapytaj D.E.C.K.`

---

## Zadanie 9: Wdrożenie i sprawdzenie

- [ ] **Krok 1:** `npx next build` (zielony), skan długich myślników w zmienionych plikach (`node -e` z `/[—–]/`).
- [ ] **Krok 2:** `git push origin main`; poczekaj na READY (`vercel inspect` albo MCP `list_deployments`).
- [ ] **Krok 3 (użytkownik):** w kokpicie jako właściciel - pytanie z ustaleniem („Cel retencji tej kadencji to 3,5 semestru”), zapis proponowanej notatki, zakładka Notatki, zakładka Wątki, odświeżenie strony (rozmowa wraca), drugie urządzenie (ta sama lista wątków).
- [ ] **Krok 4:** przy problemach - MCP `get_runtime_logs` dla projektu `ssuew-analytics`.
- [ ] **Krok 5:** aktualizacja pamięci projektu (`asystent-deck-wdrozenie.md`).

# DECK Etap 3b — Planer: propozycje i tryb wspólnej sesji

> **Dla wykonawcy:** WYMAGANY PODSKILL: użyj `superpowers:subagent-driven-development`
> (zalecane) albo `superpowers:executing-plans`. Kroki mają składnię `- [ ]` do odhaczania.

**Cel:** Zarząd zyskuje prawo głosu w Planerze — przeciągnięcie wydarzenia tworzy propozycję
czekającą w skrzynce na akceptację właściciela, a na czas Sesji Operacyjnej można przełączyć
wszystkich w zapis na żywo.

**Architektura:** Osoby wchodzące kodem nie mają konta Firebase, więc reguły Firestore ich nie
wpuszczą. Wszystkie zapisy zarządu — także z konta `board` z hasłem — idą przez `POST /api/planer`,
gdzie serwer sprawdza bilet i zapisuje przez Admin SDK. Jedna ścieżka zapisu to jedno miejsce,
w którym weryfikuje się uprawnienia. Właściciel pisze wprost do Firestore, bo reguły mu na to
pozwalają.

**Stack:** Next.js 16, React 19, TypeScript 5, Firestore + firebase-admin, vitest + Testing Library.

**Projekt:** `docs/superpowers/specs/2026-08-11-deck-etap3b-planer-wspolpraca-design.md`

---

## Struktura plików

| Plik | Odpowiedzialność |
|---|---|
| `lib/planer/propozycje.ts` | Typy propozycji i czysta logika: stan wobec kalendarza, opis do skrzynki |
| `lib/firebase/admin.ts` | Wspólna inicjalizacja Admin SDK — używa jej trasa i kokpit |
| `app/api/planer/route.ts` | Dochodzi `POST` z czterema akcjami |
| `lib/planer/serwer.ts` | Klient tej trasy po stronie przeglądarki |
| `lib/planer/zapis.ts` | Dochodzi subskrypcja propozycji, tryb wspólny i akceptacja wsadowa |
| `components/planer/BanerSesji.tsx` | Baner trybu wspólnego z czasem trwania i przełącznikiem |
| `components/planer/Skrzynka.tsx` | Lista propozycji, przyjęcie, odrzucenie |
| `components/planer/PlanerClient.tsx` | Rozgałęzienie: zapis wprost albo propozycja |
| `app/page.tsx`, `components/deck/DeckHub.tsx` | Odznaka z liczbą oczekujących propozycji |

---

## Faza A — logika i serwer

### Zadanie 1: Typy i stan propozycji

**Pliki:**
- Utwórz: `lib/planer/propozycje.ts`
- Modyfikuj: `lib/planer/typy.ts`, `lib/planer/zapis.ts`
- Test: `lib/planer/propozycje.test.ts`

**Najpierw przenieś `NoweWydarzenie` do `typy.ts`.** Dziś mieszka w `zapis.ts`, a `propozycje.ts`
będzie go potrzebował — przy czym `zapis.ts` potrzebuje `Propozycja` z `propozycje.ts`. Zostawione
tak, dałoby to import cykliczny: dwa moduły czekające na siebie nawzajem.

W `lib/planer/typy.ts` dopisz na końcu:

```ts
/** Wydarzenie bez identyfikatora — tyle, ile trzeba, żeby je utworzyć. */
export type NoweWydarzenie = Omit<Wydarzenie, 'id'>
```

W `lib/planer/zapis.ts` usuń linijkę `export type NoweWydarzenie = Omit<Wydarzenie, 'id'>`,
a w jej miejsce dopisz do importu typów:

```ts
import type { NoweWydarzenie, Wydarzenie } from './typy'
export type { NoweWydarzenie }
```

Reeksport zostaje, żeby nie ruszać ośmiu miejsc, które importują ten typ z `zapis.ts`.

- [ ] **Krok 1: Napisz test, który nie przechodzi**

```ts
// lib/planer/propozycje.test.ts
import { describe, it, expect } from 'vitest'
import { stanPropozycji, opiszPropozycje } from '@/lib/planer/propozycje'
import type { Propozycja } from '@/lib/planer/propozycje'
import type { Wydarzenie } from '@/lib/planer/typy'

const wydarzenie: Wydarzenie = {
  id: 'w1', tytul: 'ZEBRANIE ZARZĄDU', kategoria: 'ZEBRANIA',
  rok: 2026, miesiac: 10, dzien: 7, godzina: '18:00', sala: '9J', osoby: ['Jula'],
}

const przeniesienie: Propozycja = {
  id: 'p1', rodzaj: 'przeniesienie', autor: 'Jula', utworzone: 0,
  wydarzenieId: 'w1', zDnia: 7, naDzien: 9, tytulWydarzenia: 'ZEBRANIE ZARZĄDU',
}

const nowe: Propozycja = {
  id: 'p2', rodzaj: 'nowe', autor: 'Kuba', utworzone: 0,
  wydarzenie: { tytul: 'SZKOLENIE', kategoria: 'INNE', rok: 2026, miesiac: 11, dzien: 12, godzina: null, sala: null, osoby: [] },
}

describe('stanPropozycji', () => {
  it('propozycja przeniesienia jest wykonalna, gdy wydarzenie stoi tam, gdzie było', () => {
    expect(stanPropozycji(przeniesienie, [wydarzenie])).toEqual({ mozna: true, ostrzezenie: null })
  })

  it('ostrzega, gdy ktoś zdążył przesunąć wydarzenie gdzie indziej', () => {
    // Propozycja mowi, GDZIE cos ma byc, a nie skad wychodzi — wiec nadal wykonalna.
    const s = stanPropozycji(przeniesienie, [{ ...wydarzenie, dzien: 11 }])
    expect(s.mozna).toBe(true)
    expect(s.ostrzezenie).toMatch(/11/)
  })

  it('propozycja do nieistniejącego wydarzenia jest niewykonalna', () => {
    expect(stanPropozycji(przeniesienie, [])).toEqual({
      mozna: false,
      ostrzezenie: 'Tego wydarzenia już nie ma — propozycję można tylko odrzucić.',
    })
  })

  it('propozycja nowego wydarzenia jest zawsze wykonalna', () => {
    expect(stanPropozycji(nowe, [])).toEqual({ mozna: true, ostrzezenie: null })
  })
})

describe('opiszPropozycje', () => {
  it('opisuje przeniesienie', () => {
    expect(opiszPropozycje(przeniesienie)).toBe('Przenieś „ZEBRANIE ZARZĄDU" z 7. na 9.')
  })

  it('opisuje nowe wydarzenie', () => {
    expect(opiszPropozycje(nowe)).toBe('Dodaj „SZKOLENIE" 12.11')
  })
})
```

- [ ] **Krok 2: Uruchom test i sprawdź, że nie przechodzi**

Uruchom: `npm test -- lib/planer/propozycje`
Oczekiwane: FAIL — `Cannot find module '@/lib/planer/propozycje'`

- [ ] **Krok 3: Napisz implementację**

```ts
// lib/planer/propozycje.ts
import type { NoweWydarzenie, Wydarzenie } from './typy'

interface Wspolne {
  id: string
  autor: string
  /** Milisekundy — Firestore zapisuje `Date.now()`, tak jak przy wydarzeniach. */
  utworzone: number
}

export interface Przeniesienie extends Wspolne {
  rodzaj: 'przeniesienie'
  wydarzenieId: string
  zDnia: number
  naDzien: number
  /** Kopia, nie odnośnik: skrzynka ma coś pokazać także wtedy, gdy wydarzenie zniknęło. */
  tytulWydarzenia: string
}

export interface Nowe extends Wspolne {
  rodzaj: 'nowe'
  wydarzenie: NoweWydarzenie
}

export type Propozycja = Przeniesienie | Nowe

export interface StanPropozycji {
  mozna: boolean
  ostrzezenie: string | null
}

/**
 * Czy propozycję da się jeszcze przyjąć i czy coś się w międzyczasie zmieniło.
 *
 * Przesunięcie wydarzenia przez kogoś innego NIE blokuje przyjęcia: propozycja
 * mówi, gdzie coś ma trafić, a nie skąd wychodzi. Blokuje dopiero zniknięcie
 * wydarzenia, bo nie ma czego przenosić.
 */
export function stanPropozycji(p: Propozycja, wydarzenia: Wydarzenie[]): StanPropozycji {
  if (p.rodzaj === 'nowe') return { mozna: true, ostrzezenie: null }

  const w = wydarzenia.find((x) => x.id === p.wydarzenieId)
  if (!w) {
    return { mozna: false, ostrzezenie: 'Tego wydarzenia już nie ma — propozycję można tylko odrzucić.' }
  }
  if (w.dzien !== p.zDnia) {
    return { mozna: true, ostrzezenie: `Ktoś już przesunął to wydarzenie na ${w.dzien}.` }
  }
  return { mozna: true, ostrzezenie: null }
}

export function opiszPropozycje(p: Propozycja): string {
  if (p.rodzaj === 'nowe') {
    return `Dodaj „${p.wydarzenie.tytul}" ${p.wydarzenie.dzien}.${p.wydarzenie.miesiac}`
  }
  return `Przenieś „${p.tytulWydarzenia}" z ${p.zDnia}. na ${p.naDzien}.`
}
```

- [ ] **Krok 4: Uruchom test i sprawdź, że przechodzi**

Uruchom: `npm test -- lib/planer/propozycje`
Oczekiwane: PASS, 6 testów

- [ ] **Krok 5: Zatwierdź**

```bash
git add lib/planer/propozycje.ts lib/planer/propozycje.test.ts lib/planer/typy.ts lib/planer/zapis.ts
git commit -m "feat(planer): typy propozycji i ocena, czy da sie ja jeszcze przyjac"
```

---

### Zadanie 2: Wspólna inicjalizacja Admin SDK

**Pliki:**
- Utwórz: `lib/firebase/admin.ts`
- Modyfikuj: `app/api/planer/route.ts`

Dziś inicjalizacja siedzi w trasie. Kokpit będzie jej potrzebował do policzenia propozycji,
a dwie kopie `initializeApp` w tym samym procesie rzucają błędem o powtórzonej aplikacji.

- [ ] **Krok 1: Wyciągnij inicjalizację**

```ts
// lib/firebase/admin.ts
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

/**
 * Admin SDK omija reguły Firestore. Każde miejsce, które z niego korzysta, MUSI
 * samo sprawdzić, kto pyta — inaczej byłoby otwartym oknem do bazy.
 *
 * Inicjalizacja jest idempotentna, bo Next trzyma jeden proces dla wielu tras.
 */
function aplikacja(): App {
  if (getApps().length) return getApps()[0]
  const klucz = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!klucz) throw new Error('Brak FIREBASE_SERVICE_ACCOUNT')
  return initializeApp({ credential: cert(JSON.parse(klucz)) })
}

export function bazaAdmin(): Firestore {
  return getFirestore(aplikacja())
}

export function wydarzeniaRef(semestrId: string) {
  return bazaAdmin().collection('semestry').doc(semestrId).collection('wydarzenia')
}

export function propozycjeRef(semestrId: string) {
  return bazaAdmin().collection('semestry').doc(semestrId).collection('propozycje')
}

export function semestrRef(semestrId: string) {
  return bazaAdmin().collection('semestry').doc(semestrId)
}
```

- [ ] **Krok 2: Przepnij trasę na wspólny moduł**

W `app/api/planer/route.ts` usuń lokalną funkcję `aplikacja()` oraz importy
`firebase-admin/app` i `firebase-admin/firestore`, a `GET` przepisz na:

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { ktoPyta } from '@/lib/auth/guard'
import { naWydarzenie } from '@/lib/planer/mapowanie'
import { wydarzeniaRef } from '@/lib/firebase/admin'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const kto = await ktoPyta(req)
  if (!kto) return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })

  const semestrId = req.nextUrl.searchParams.get('semestr')
  if (!semestrId) return NextResponse.json({ error: 'Brak semestru' }, { status: 400 })

  try {
    const zrzut = await wydarzeniaRef(semestrId).get()
    return NextResponse.json(zrzut.docs.map((d) => naWydarzenie(d.id, d.data())))
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
```

- [ ] **Krok 3: Sprawdź typy i build**

Uruchom: `npx tsc --noEmit && npm run build`
Oczekiwane: brak błędów, build kończy się sukcesem

- [ ] **Krok 4: Zatwierdź**

```bash
git add lib/firebase/admin.ts app/api/planer/route.ts
git commit -m "refactor(planer): wspolna inicjalizacja Admin SDK

Kokpit bedzie liczyl propozycje tym samym SDK, a dwie kopie
initializeApp w jednym procesie rzucaja bledem o powtorzonej aplikacji."
```

---

### Zadanie 3: Zapis przez serwer

**Pliki:**
- Modyfikuj: `app/api/planer/route.ts`
- Test: `app/api/planer/route.test.ts`

- [ ] **Krok 1: Napisz test, który nie przechodzi**

```ts
// app/api/planer/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const ktoPyta = vi.fn()
const dodajPropozycje = vi.fn()
const zmienDzien = vi.fn()
const trybWspolny = vi.fn()

vi.mock('@/lib/auth/guard', () => ({ ktoPyta: (...a: unknown[]) => ktoPyta(...a) }))
vi.mock('@/lib/firebase/admin', () => ({
  propozycjeRef: () => ({ add: (d: unknown) => dodajPropozycje(d) }),
  wydarzeniaRef: () => ({ doc: (id: string) => ({ update: (d: unknown) => zmienDzien(id, d) }) }),
  semestrRef: () => ({ get: async () => ({ data: () => ({ trybWspolny: trybWspolny() }) }) }),
}))

function zada(body: unknown) {
  return { json: () => Promise.resolve(body) } as never
}

const PRZENIESIENIE = {
  semestr: '2026Z', akcja: 'propozycja-przeniesienia',
  wydarzenieId: 'w1', zDnia: 7, naDzien: 9, tytulWydarzenia: 'ZEBRANIE',
}

describe('POST /api/planer', () => {
  beforeEach(() => {
    vi.resetModules()
    ktoPyta.mockReset()
    dodajPropozycje.mockReset()
    zmienDzien.mockReset()
    trybWspolny.mockReset().mockReturnValue(false)
  })

  it('bez sesji odmawia', async () => {
    ktoPyta.mockResolvedValue(null)
    const { POST } = await import('@/app/api/planer/route')
    expect((await POST(zada(PRZENIESIENIE))).status).toBe(401)
  })

  it('zarząd zgłasza propozycję przeniesienia', async () => {
    ktoPyta.mockResolvedValue({ uid: 'kod:482913', email: 'Jula', rola: 'board' })
    const { POST } = await import('@/app/api/planer/route')
    const res = await POST(zada(PRZENIESIENIE))
    expect(res.status).toBe(201)
    expect(dodajPropozycje).toHaveBeenCalledWith(
      expect.objectContaining({ rodzaj: 'przeniesienie', autor: 'Jula', naDzien: 9 }),
    )
  })

  it('zarząd NIE przesuwa wprost, gdy tryb wspólny jest wyłączony', async () => {
    ktoPyta.mockResolvedValue({ uid: 'kod:482913', email: 'Jula', rola: 'board' })
    const { POST } = await import('@/app/api/planer/route')
    const res = await POST(zada({ semestr: '2026Z', akcja: 'przenies', wydarzenieId: 'w1', naDzien: 9 }))
    expect(res.status).toBe(403)
    expect(zmienDzien).not.toHaveBeenCalled()
  })

  it('zarząd przesuwa wprost, gdy tryb wspólny jest włączony', async () => {
    // O tym decyduje SERWER, nie klient — klient wie tylko po to, zeby pokazac
    // wlasciwy interfejs.
    trybWspolny.mockReturnValue(true)
    ktoPyta.mockResolvedValue({ uid: 'kod:482913', email: 'Jula', rola: 'board' })
    const { POST } = await import('@/app/api/planer/route')
    const res = await POST(zada({ semestr: '2026Z', akcja: 'przenies', wydarzenieId: 'w1', naDzien: 9 }))
    expect(res.status).toBe(200)
    expect(zmienDzien).toHaveBeenCalledWith('w1', expect.objectContaining({ dzien: 9 }))
  })

  it('właściciel przesuwa wprost niezależnie od trybu', async () => {
    ktoPyta.mockResolvedValue({ uid: 'u1', email: 'kontakt@x.pl', rola: 'owner' })
    const { POST } = await import('@/app/api/planer/route')
    expect((await POST(zada({ semestr: '2026Z', akcja: 'przenies', wydarzenieId: 'w1', naDzien: 9 }))).status).toBe(200)
  })

  it('nieznana akcja to 400', async () => {
    ktoPyta.mockResolvedValue({ uid: 'u1', email: 'a@b.c', rola: 'owner' })
    const { POST } = await import('@/app/api/planer/route')
    expect((await POST(zada({ semestr: '2026Z', akcja: 'wysadz-baze' }))).status).toBe(400)
  })
})
```

- [ ] **Krok 2: Uruchom test i sprawdź, że nie przechodzi**

Uruchom: `npm test -- app/api/planer`
Oczekiwane: FAIL — `POST is not a function`

- [ ] **Krok 3: Dopisz `POST` do `app/api/planer/route.ts`**

```ts
import { propozycjeRef, semestrRef, wydarzeniaRef } from '@/lib/firebase/admin'

/** Czy zarząd może w tej chwili zapisywać wprost. Sprawdzane po stronie serwera. */
async function trybWspolnyWlaczony(semestrId: string): Promise<boolean> {
  const zrzut = await semestrRef(semestrId).get()
  return zrzut.data()?.trybWspolny === true
}

export async function POST(req: NextRequest) {
  const kto = await ktoPyta(req)
  if (!kto) return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { semestr, akcja } = body
  if (!semestr || typeof akcja !== 'string') {
    return NextResponse.json({ error: 'Brak semestru albo akcji' }, { status: 400 })
  }

  try {
    if (akcja === 'propozycja-przeniesienia') {
      await propozycjeRef(semestr).add({
        rodzaj: 'przeniesienie',
        autor: kto.email,
        utworzone: Date.now(),
        wydarzenieId: body.wydarzenieId,
        zDnia: body.zDnia,
        naDzien: body.naDzien,
        tytulWydarzenia: body.tytulWydarzenia ?? '',
      })
      return NextResponse.json({ ok: true }, { status: 201 })
    }

    if (akcja === 'propozycja-nowego') {
      await propozycjeRef(semestr).add({
        rodzaj: 'nowe',
        autor: kto.email,
        utworzone: Date.now(),
        wydarzenie: body.wydarzenie,
      })
      return NextResponse.json({ ok: true }, { status: 201 })
    }

    if (akcja === 'przenies') {
      // Właściciel pisze zawsze; zarząd tylko przy włączonej Sesji Operacyjnej.
      const wolno = kto.rola === 'owner' || (await trybWspolnyWlaczony(semestr))
      if (!wolno) {
        return NextResponse.json({ error: 'Sesja Operacyjna nie jest włączona' }, { status: 403 })
      }
      await wydarzeniaRef(semestr).doc(body.wydarzenieId).update({
        dzien: body.naDzien,
        zmienione: Date.now(),
      })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Nieznana akcja' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
```

- [ ] **Krok 4: Uruchom test i sprawdź, że przechodzi**

Uruchom: `npm test -- app/api/planer`
Oczekiwane: PASS, 6 testów

- [ ] **Krok 5: Zatwierdź**

```bash
git add app/api/planer/route.ts app/api/planer/route.test.ts
git commit -m "feat(planer): zapis zarzadu przez serwer, z kontrola trybu wspolnego"
```

---

### Zadanie 4: Klient trasy po stronie przeglądarki

**Pliki:**
- Utwórz: `lib/planer/serwer.ts`

- [ ] **Krok 1: Napisz implementację**

```ts
// lib/planer/serwer.ts
'use client'
import type { NoweWydarzenie } from './typy'

async function wyslij(dane: Record<string, unknown>): Promise<void> {
  const res = await fetch('/api/planer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dane),
  })
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: null }))
    throw new Error(error ?? 'Nie udało się zapisać')
  }
}

export function zglosPrzeniesienie(
  semestr: string,
  wydarzenieId: string,
  zDnia: number,
  naDzien: number,
  tytulWydarzenia: string,
): Promise<void> {
  return wyslij({ semestr, akcja: 'propozycja-przeniesienia', wydarzenieId, zDnia, naDzien, tytulWydarzenia })
}

export function zglosNowe(semestr: string, wydarzenie: NoweWydarzenie): Promise<void> {
  return wyslij({ semestr, akcja: 'propozycja-nowego', wydarzenie })
}

/** Działa tylko przy włączonej Sesji Operacyjnej — o tym rozstrzyga serwer. */
export function przeniesPrzezSerwer(semestr: string, wydarzenieId: string, naDzien: number): Promise<void> {
  return wyslij({ semestr, akcja: 'przenies', wydarzenieId, naDzien })
}
```

- [ ] **Krok 2: Sprawdź typy**

Uruchom: `npx tsc --noEmit`
Oczekiwane: brak błędów

- [ ] **Krok 3: Zatwierdź**

```bash
git add lib/planer/serwer.ts
git commit -m "feat(planer): klient trasy zapisu po stronie przegladarki"
```

---

## Faza B — Firestore po stronie właściciela

### Zadanie 5: Subskrypcja propozycji, tryb wspólny i akceptacja

**Pliki:**
- Modyfikuj: `lib/planer/zapis.ts`

Akceptacja nanosi zmianę i kasuje propozycję. Musi to być **jeden zapis wsadowy** — inaczej awaria
między jednym a drugim zostawiłaby propozycję zaakceptowaną i wciąż wiszącą w skrzynce.

- [ ] **Krok 1: Dopisz na końcu `lib/planer/zapis.ts`**

Do istniejącego importu z `firebase/firestore` na górze pliku dołóż `setDoc` i `writeBatch`
(reszta — `addDoc`, `collection`, `deleteDoc`, `doc`, `onSnapshot`, `updateDoc` — jest tam już
z Etapu 3a). Dopisz też import typu:

```ts
import type { Propozycja } from './propozycje'
```

Następnie dopisz na końcu pliku:

```ts
function propozycje(semestrId: string) {
  return collection(baza(), 'semestry', semestrId, 'propozycje')
}

function semestrDoc(semestrId: string) {
  return doc(baza(), 'semestry', semestrId)
}

export function subskrybujPropozycje(
  semestrId: string,
  gdyZmiana: (p: Propozycja[]) => void,
  gdyBlad: (b: Error) => void,
): () => void {
  return onSnapshot(
    propozycje(semestrId),
    (zrzut) => gdyZmiana(zrzut.docs.map((d) => ({ id: d.id, ...d.data() }) as Propozycja)),
    gdyBlad,
  )
}

export interface StanSesjiWspolnej {
  wlaczony: boolean
  od: number | null
  przez: string | null
}

export function subskrybujTrybWspolny(
  semestrId: string,
  gdyZmiana: (s: StanSesjiWspolnej) => void,
): () => void {
  return onSnapshot(semestrDoc(semestrId), (zrzut) => {
    const d = zrzut.data()
    gdyZmiana({
      wlaczony: d?.trybWspolny === true,
      od: typeof d?.trybWspolnyOd === 'number' ? d.trybWspolnyOd : null,
      przez: typeof d?.trybWspolnyPrzez === 'string' ? d.trybWspolnyPrzez : null,
    })
  })
}

/** `setDoc` z `merge`, bo dokument semestru mógł jeszcze nie powstać — w 3a go nie tworzyliśmy. */
export async function ustawTrybWspolny(semestrId: string, wlaczony: boolean, przez: string): Promise<void> {
  await setDoc(
    semestrDoc(semestrId),
    { trybWspolny: wlaczony, trybWspolnyOd: wlaczony ? Date.now() : null, trybWspolnyPrzez: przez },
    { merge: true },
  )
}

/**
 * Przyjęcie propozycji: nanosi zmianę i kasuje propozycję jednym zapisem.
 * Rozdzielenie tych dwóch kroków groziłoby propozycją zaakceptowaną i wciąż
 * wiszącą w skrzynce.
 */
export async function przyjmijPropozycje(semestrId: string, p: Propozycja): Promise<void> {
  const partia = writeBatch(baza())

  if (p.rodzaj === 'przeniesienie') {
    partia.update(doc(sciezka(semestrId), p.wydarzenieId), { dzien: p.naDzien, zmienione: Date.now() })
  } else {
    partia.set(doc(sciezka(semestrId)), { ...p.wydarzenie, zmienione: Date.now() })
  }

  partia.delete(doc(propozycje(semestrId), p.id))
  await partia.commit()
}

export async function odrzucPropozycje(semestrId: string, id: string): Promise<void> {
  await deleteDoc(doc(propozycje(semestrId), id))
}
```

- [ ] **Krok 2: Sprawdź typy**

Uruchom: `npx tsc --noEmit`
Oczekiwane: brak błędów

- [ ] **Krok 3: Zatwierdź**

```bash
git add lib/planer/zapis.ts
git commit -m "feat(planer): propozycje, tryb wspolny i akceptacja jednym zapisem wsadowym"
```

---

## Faza C — widoki

### Zadanie 6: Baner Sesji Operacyjnej

**Pliki:**
- Utwórz: `components/planer/BanerSesji.tsx`
- Test: `components/planer/BanerSesji.test.tsx`

- [ ] **Krok 1: Napisz test, który nie przechodzi**

```tsx
// components/planer/BanerSesji.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BanerSesji } from '@/components/planer/BanerSesji'

const GODZINE_TEMU = Date.now() - 65 * 60 * 1000

describe('BanerSesji', () => {
  it('nie pokazuje się przy wyłączonej sesji', () => {
    const { container } = render(
      <BanerSesji stan={{ wlaczony: false, od: null, przez: null }} mozeWylaczyc onWylacz={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('pokazuje, jak długo sesja trwa', () => {
    // Wylaczanie jest reczne, wiec czas trwania to jedyne, co czyni zapomnienie widocznym.
    render(<BanerSesji stan={{ wlaczony: true, od: GODZINE_TEMU, przez: 'kontakt@x.pl' }} mozeWylaczyc onWylacz={vi.fn()} />)
    expect(screen.getByText(/1 h 5 min/)).toBeInTheDocument()
  })

  it('zarząd widzi baner, ale bez przycisku wyłączenia', () => {
    render(<BanerSesji stan={{ wlaczony: true, od: GODZINE_TEMU, przez: 'x' }} mozeWylaczyc={false} onWylacz={vi.fn()} />)
    expect(screen.getByText(/Sesja Operacyjna/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /wyłącz/i })).toBeNull()
  })

  it('właściciel wyłącza sesję', () => {
    const onWylacz = vi.fn()
    render(<BanerSesji stan={{ wlaczony: true, od: GODZINE_TEMU, przez: 'x' }} mozeWylaczyc onWylacz={onWylacz} />)
    fireEvent.click(screen.getByRole('button', { name: /wyłącz/i }))
    expect(onWylacz).toHaveBeenCalled()
  })
})
```

- [ ] **Krok 2: Uruchom test i sprawdź, że nie przechodzi**

Uruchom: `npm test -- components/planer/BanerSesji`
Oczekiwane: FAIL — `Cannot find module '@/components/planer/BanerSesji'`

- [ ] **Krok 3: Napisz implementację**

```tsx
// components/planer/BanerSesji.tsx
'use client'
import { Radio } from 'lucide-react'
import type { StanSesjiWspolnej } from '@/lib/planer/zapis'

type Props = {
  stan: StanSesjiWspolnej
  mozeWylaczyc: boolean
  onWylacz: () => void
}

function trwanie(od: number): string {
  const minuty = Math.max(0, Math.floor((Date.now() - od) / 60000))
  const h = Math.floor(minuty / 60)
  const m = minuty % 60
  return h > 0 ? `${h} h ${m} min` : `${m} min`
}

/**
 * Sesję wyłącza się ręcznie, więc czas trwania jest jedynym, co czyni
 * zapomnienie widocznym. Zapomniana włączona sesja to bezterminowe prawo
 * zapisu dla całego zarządu.
 */
export function BanerSesji({ stan, mozeWylaczyc, onWylacz }: Props) {
  if (!stan.wlaczony) return null

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-deck-accent/45 bg-deck-accent/10 px-3 py-2.5">
      <Radio size={15} className="text-deck-accent" />
      <span className="text-[12px] font-semibold text-deck-text">Sesja Operacyjna trwa</span>
      <span className="text-[11.5px] text-deck-muted">
        wszyscy zapisują na żywo
        {stan.od !== null && ` · ${trwanie(stan.od)}`}
      </span>
      {mozeWylaczyc && (
        <button
          type="button"
          onClick={onWylacz}
          className="ml-auto rounded-md border border-deck-accent/40 px-2.5 py-1 text-[11px] text-deck-accent transition hover:bg-deck-accent/15"
        >
          Wyłącz
        </button>
      )}
    </div>
  )
}
```

- [ ] **Krok 4: Uruchom test i sprawdź, że przechodzi**

Uruchom: `npm test -- components/planer/BanerSesji`
Oczekiwane: PASS, 4 testy

- [ ] **Krok 5: Zatwierdź**

```bash
git add components/planer/BanerSesji.tsx components/planer/BanerSesji.test.tsx
git commit -m "feat(planer): baner Sesji Operacyjnej z czasem trwania"
```

---

### Zadanie 7: Skrzynka propozycji

**Pliki:**
- Utwórz: `components/planer/Skrzynka.tsx`
- Test: `components/planer/Skrzynka.test.tsx`

- [ ] **Krok 1: Napisz test, który nie przechodzi**

```tsx
// components/planer/Skrzynka.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Skrzynka } from '@/components/planer/Skrzynka'
import type { Propozycja } from '@/lib/planer/propozycje'
import type { Wydarzenie } from '@/lib/planer/typy'

const wydarzenie: Wydarzenie = {
  id: 'w1', tytul: 'ZEBRANIE', kategoria: 'ZEBRANIA',
  rok: 2026, miesiac: 10, dzien: 7, godzina: null, sala: null, osoby: [],
}

const p: Propozycja = {
  id: 'p1', rodzaj: 'przeniesienie', autor: 'Jula', utworzone: 0,
  wydarzenieId: 'w1', zDnia: 7, naDzien: 9, tytulWydarzenia: 'ZEBRANIE',
}

const wspolne = { onPrzyjmij: vi.fn(), onOdrzuc: vi.fn() }

describe('Skrzynka', () => {
  it('pusta skrzynka mówi, że nic nie czeka', () => {
    render(<Skrzynka {...wspolne} propozycje={[]} wydarzenia={[]} />)
    expect(screen.getByText(/nic nie czeka/i)).toBeInTheDocument()
  })

  it('pokazuje opis propozycji i jej autora', () => {
    render(<Skrzynka {...wspolne} propozycje={[p]} wydarzenia={[wydarzenie]} />)
    expect(screen.getByText(/Przenieś „ZEBRANIE" z 7\. na 9\./)).toBeInTheDocument()
    expect(screen.getByText(/Jula/)).toBeInTheDocument()
  })

  it('nieaktualnej propozycji nie da się przyjąć', () => {
    render(<Skrzynka {...wspolne} propozycje={[p]} wydarzenia={[]} />)
    expect(screen.queryByRole('button', { name: /przyjmij/i })).toBeNull()
    expect(screen.getByText(/już nie ma/i)).toBeInTheDocument()
  })

  it('ostrzega, gdy ktoś zdążył przesunąć wydarzenie', () => {
    render(<Skrzynka {...wspolne} propozycje={[p]} wydarzenia={[{ ...wydarzenie, dzien: 11 }]} />)
    expect(screen.getByText(/przesunął to wydarzenie na 11/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /przyjmij/i })).toBeInTheDocument()
  })

  it('przyjęcie oddaje całą propozycję', () => {
    const onPrzyjmij = vi.fn()
    render(<Skrzynka {...wspolne} onPrzyjmij={onPrzyjmij} propozycje={[p]} wydarzenia={[wydarzenie]} />)
    fireEvent.click(screen.getByRole('button', { name: /przyjmij/i }))
    expect(onPrzyjmij).toHaveBeenCalledWith(p)
  })

  it('odrzucenie oddaje identyfikator', () => {
    const onOdrzuc = vi.fn()
    render(<Skrzynka {...wspolne} onOdrzuc={onOdrzuc} propozycje={[p]} wydarzenia={[wydarzenie]} />)
    fireEvent.click(screen.getByRole('button', { name: /odrzuć/i }))
    expect(onOdrzuc).toHaveBeenCalledWith('p1')
  })
})
```

- [ ] **Krok 2: Uruchom test i sprawdź, że nie przechodzi**

Uruchom: `npm test -- components/planer/Skrzynka`
Oczekiwane: FAIL — `Cannot find module '@/components/planer/Skrzynka'`

- [ ] **Krok 3: Napisz implementację**

```tsx
// components/planer/Skrzynka.tsx
'use client'
import { AlertTriangle, Check, Inbox, X } from 'lucide-react'
import { opiszPropozycje, stanPropozycji, type Propozycja } from '@/lib/planer/propozycje'
import type { Wydarzenie } from '@/lib/planer/typy'

type Props = {
  propozycje: Propozycja[]
  wydarzenia: Wydarzenie[]
  onPrzyjmij: (p: Propozycja) => void
  onOdrzuc: (id: string) => void
}

export function Skrzynka({ propozycje, wydarzenia, onPrzyjmij, onOdrzuc }: Props) {
  if (propozycje.length === 0) {
    return (
      <div className="deck-card rounded-lg p-6 text-center">
        <Inbox size={20} className="mx-auto text-deck-muted/60" />
        <p className="mt-2 text-[12px] text-deck-muted">Nic nie czeka na decyzję.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {propozycje.map((p) => {
        const stan = stanPropozycji(p, wydarzenia)
        return (
          <div key={p.id} className="deck-card rounded-lg p-3">
            <div className="text-[12px] text-deck-text">{opiszPropozycje(p)}</div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-deck-muted/70">
              zgłosił: {p.autor}
            </div>

            {stan.ostrzezenie && (
              <div
                className={`mt-2 flex items-start gap-1.5 text-[11px] ${
                  stan.mozna ? 'text-deck-warn' : 'text-deck-danger'
                }`}
              >
                <AlertTriangle size={11} className="mt-0.5 flex-none" />
                {stan.ostrzezenie}
              </div>
            )}

            <div className="mt-3 flex gap-2">
              {stan.mozna && (
                <button
                  type="button"
                  onClick={() => onPrzyjmij(p)}
                  className="deck-button flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[11.5px] font-semibold"
                >
                  <Check size={13} /> Przyjmij
                </button>
              )}
              <button
                type="button"
                onClick={() => onOdrzuc(p.id)}
                className="flex items-center justify-center gap-1.5 rounded-md border border-white/12 px-3 py-1.5 text-[11.5px] text-deck-muted transition hover:border-deck-danger/40 hover:text-deck-danger"
              >
                <X size={13} /> Odrzuć
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Krok 4: Uruchom test i sprawdź, że przechodzi**

Uruchom: `npm test -- components/planer/Skrzynka`
Oczekiwane: PASS, 6 testów

- [ ] **Krok 5: Zatwierdź**

```bash
git add components/planer/Skrzynka.tsx components/planer/Skrzynka.test.tsx
git commit -m "feat(planer): skrzynka propozycji z ostrzezeniem o dezaktualizacji"
```

---

### Zadanie 8: Wpięcie w powłokę Planera

**Pliki:**
- Modyfikuj: `components/planer/PlanerClient.tsx`, `app/planer/page.tsx`

- [ ] **Krok 1: Rozszerz właściwości powłoki**

W `components/planer/PlanerClient.tsx` zmień typ `Props` i sygnaturę:

```tsx
type Props = {
  semestr: Semestr
  /** `owner` pisze wprost do Firestore; `board` przez serwer. */
  rola: 'owner' | 'board'
  kto: string
  poczatkowe: Wydarzenie[]
  naZywo: boolean
}

export function PlanerClient({ semestr, rola, kto, poczatkowe, naZywo }: Props) {
  const wlascicielem = rola === 'owner'
```

Wszystkie dotychczasowe użycia `mozeEdytowac` zastąp wyliczeniem poniżej — zarząd edytuje
tylko przy włączonej sesji, ale **propozycje może zgłaszać zawsze**, więc przeciąganie zostaje
włączone dla obu ról.

- [ ] **Krok 2: Dodaj stan sesji, propozycji i rozgałęzienie zapisu**

```tsx
  const [sesja, setSesja] = useState<StanSesjiWspolnej>({ wlaczony: false, od: null, przez: null })
  const [propozycje, setPropozycje] = useState<Propozycja[]>([])
  const [skrzynkaOtwarta, setSkrzynkaOtwarta] = useState(false)

  useEffect(() => {
    if (!naZywo) return
    return subskrybujTrybWspolny(semestr.id, setSesja)
  }, [semestr.id, naZywo])

  useEffect(() => {
    if (!naZywo || !wlascicielem) return
    return subskrybujPropozycje(semestr.id, setPropozycje, (e) => setBlad(e.message))
  }, [semestr.id, naZywo, wlascicielem])

  /** Zapis wprost albo propozycja — o tym rozstrzyga rola i stan sesji. */
  const piszeWprost = wlascicielem || sesja.wlaczony

  async function przenies(id: string, naDzien: number) {
    const w = wydarzenia.find((x) => x.id === id)
    if (!w) return
    if (wlascicielem) {
      await zmienWydarzenie(semestr.id, id, { dzien: naDzien })
    } else if (sesja.wlaczony) {
      await przeniesPrzezSerwer(semestr.id, id, naDzien)
    } else {
      await zglosPrzeniesienie(semestr.id, id, w.dzien, naDzien, w.tytul)
      setBlad(null)
    }
  }
```

Użyj `piszeWprost` wszędzie tam, gdzie dotąd było `mozeEdytowac` — przy przycisku „Dodaj
wydarzenie" i przy `PanelWydarzenia`. Jeden wyjątek: `WidokMiesiaca` dostaje
`mozeEdytowac={true}` dla obu ról, bo przeciąganie u zarządu tworzy propozycję zamiast zapisu,
więc musi pozostać włączone także przy wyłączonej sesji.

- [ ] **Krok 3: Wstaw baner i skrzynkę**

Nad `<PasekFiltrow …>` dodaj:

```tsx
      <BanerSesji
        stan={sesja}
        mozeWylaczyc={wlascicielem}
        onWylacz={() => ustawTrybWspolny(semestr.id, false, kto)}
      />

      {wlascicielem && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSkrzynkaOtwarta((o) => !o)}
            className="deck-chip flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11.5px] text-deck-muted transition hover:text-deck-text"
          >
            <Inbox size={13} />
            Skrzynka
            {propozycje.length > 0 && (
              <span className="rounded-full bg-deck-accent px-1.5 text-[10px] font-bold text-deck-bg-deep">
                {propozycje.length}
              </span>
            )}
          </button>
          {!sesja.wlaczony && (
            <button
              type="button"
              onClick={() => ustawTrybWspolny(semestr.id, true, kto)}
              className="deck-chip flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11.5px] text-deck-muted transition hover:text-deck-accent"
            >
              <Radio size={13} /> Włącz Sesję Operacyjną
            </button>
          )}
        </div>
      )}

      {wlascicielem && skrzynkaOtwarta && (
        <Skrzynka
          propozycje={propozycje}
          wydarzenia={wydarzenia}
          onPrzyjmij={(p) => przyjmijPropozycje(semestr.id, p)}
          onOdrzuc={(id) => odrzucPropozycje(semestr.id, id)}
        />
      )}
```

Dopisz brakujące importy: `Inbox` i `Radio` z `lucide-react`, `BanerSesji`, `Skrzynka`,
`type Propozycja` z `@/lib/planer/propozycje`, a z `@/lib/planer/zapis` — `subskrybujPropozycje`,
`subskrybujTrybWspolny`, `ustawTrybWspolny`, `przyjmijPropozycje`, `odrzucPropozycje`
i `type StanSesjiWspolnej`. Z `@/lib/planer/serwer` — `zglosPrzeniesienie` i `przeniesPrzezSerwer`.

- [ ] **Krok 4: Przekaż rolę ze strony**

W `app/planer/page.tsx` zastąp przekazanie `mozeEdytowac`:

```tsx
      <PlanerClient
        semestr={BIEZACY}
        rola={rola}
        kto={tozsamosc?.email ?? sesjaKodu?.kod ?? ''}
        poczatkowe={[]}
        naZywo={rolaKonta !== null}
      />
```

- [ ] **Krok 5: Sprawdź typy i testy**

Uruchom: `npx tsc --noEmit && npm test`
Oczekiwane: brak błędów, wszystkie testy przechodzą

- [ ] **Krok 6: Zatwierdź**

```bash
git add components/planer/PlanerClient.tsx app/planer/page.tsx
git commit -m "feat(planer): zarzad zglasza propozycje, wlasciciel je rozpatruje"
```

---

### Zadanie 9: Odznaka w kokpicie

**Pliki:**
- Modyfikuj: `app/page.tsx`, `components/deck/DeckHub.tsx`

- [ ] **Krok 1: Policz propozycje w kokpicie**

W `app/page.tsx` dodaj import i odczyt:

```tsx
import { propozycjeRef } from '@/lib/firebase/admin'
```

a przed `return`:

```tsx
  // Odznakę widzi wyłącznie właściciel — dla zarządu liczba nierozpatrzonych
  // propozycji nic nie znaczy, bo i tak ich nie rozpatrzy.
  // Awaria Firestore nie może zabrać kokpitu, stąd zero zamiast wyjątku.
  const propozycje =
    rola === 'owner'
      ? await propozycjeRef('2026Z')
          .count()
          .get()
          .then((s) => s.data().count)
          .catch(() => 0)
      : 0
```

- [ ] **Krok 2: Przekaż liczbę do kokpitu**

W tym samym pliku dopisz do właściwości `DeckHub`:

```tsx
      dane={{
        konwersja,
        retencja: m.histRetention ?? 0,
        kpiWzrosty: kpi.filter((x) => x.wartosc_biezaca > x.wartosc_poprzednia).length,
        kpiRazem: kpi.length,
        alerty: buildAlerts(rekrutacje, kohorty, kpi).length,
        propozycje,
      }}
```

- [ ] **Krok 3: Pokaż odznakę na kafelku**

W `components/deck/DeckHub.tsx` dopisz `propozycje: number` do `DaneKokpitu`, a kafelek Planera
zmień na:

```tsx
        <DeckTile
          stan="zywy"
          href="/planer"
          etykieta="moduł 02 · kalendarz"
          tytul="Planer semestru"
          odznaka={dane.propozycje > 0 ? `${dane.propozycje} do decyzji` : undefined}
        >
          <p className="text-[12px] leading-relaxed text-deck-muted">
            Kalendarz semestru z wykrywaniem kolizji osób i sal.
          </p>
        </DeckTile>
```

- [ ] **Krok 4: Popraw testy kokpitu**

W `components/deck/DeckHub.test.tsx` dopisz `propozycje: 0` do stałej `dane` i dodaj test:

```tsx
  it('pokazuje odznakę z liczbą propozycji do decyzji', () => {
    render(<DeckHub rola="owner" email="ja@e.com" dane={{ ...dane, propozycje: 3 }} />)
    expect(screen.getByText('3 do decyzji')).toBeInTheDocument()
  })
```

- [ ] **Krok 5: Sprawdź wszystko**

Uruchom: `npm test && npx tsc --noEmit && npm run build`
Oczekiwane: testy przechodzą, brak błędów typów, build kończy się sukcesem

- [ ] **Krok 6: Zatwierdź**

```bash
git add app/page.tsx components/deck/DeckHub.tsx components/deck/DeckHub.test.tsx
git commit -m "feat(planer): odznaka z liczba propozycji na kafelku kokpitu"
```

---

## Faza D — domknięcie

### Zadanie 10: Odpytywanie dla osób na kodzie i dokumentacja

**Pliki:**
- Modyfikuj: `components/planer/PlanerClient.tsx`, `README.md`

- [ ] **Krok 1: Dodaj odpytywanie w trybie wspólnym**

Osoby na kodzie nie mają subskrypcji Firestore. Poza sesją odświeżenie strony wystarcza, ale gdy
wszyscy siedzą razem i przesuwają terminy, brak aktualizacji jest nie do zniesienia.

W `components/planer/PlanerClient.tsx` dopisz:

```tsx
  // Osoby na kodzie nie mają subskrypcji Firestore (Etap 3a). W trakcie Sesji
  // Operacyjnej odpytujemy co 15 sekund i tylko przy widocznej karcie — poza
  // sesją odświeżenie strony w zupełności wystarcza.
  useEffect(() => {
    if (naZywo || !sesja.wlaczony) return
    const id = setInterval(() => {
      if (document.hidden) return
      void fetch(`/api/planer?semestr=${semestr.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (Array.isArray(d)) setWydarzenia(d) })
        .catch(() => {})
    }, 15000)
    return () => clearInterval(id)
  }, [naZywo, sesja.wlaczony, semestr.id])
```

- [ ] **Krok 2: Zaktualizuj README**

W tabeli modułów zmień opis Planera na: „Kalendarz semestru z wykrywaniem kolizji osób i sal,
propozycjami zmian od zarządu i trybem wspólnej sesji". W sekcji konfiguracji dopisz zdanie, że
`FIREBASE_SERVICE_ACCOUNT` jest teraz **wymagany**, bo bez niego zarząd nie zgłosi propozycji ani
nie zobaczy kalendarza — konta z hasłem właściciela nadal działają bez niego.

- [ ] **Krok 3: Pełna weryfikacja**

```bash
npm test && npx tsc --noEmit && npm run lint && npm run build
```

Oczekiwane: testy przechodzą, brak błędów typów, lint bez nowych błędów wobec stanu zastanego
(9 problemów), build kończy się sukcesem.

- [ ] **Krok 4: Zatwierdź**

```bash
git add -A
git commit -m "feat(planer): odpytywanie dla osob na kodzie w trakcie sesji + README"
```

---

## Po wykonaniu

Ręcznie sprawdź to, czego testy nie złapią. Potrzebujesz dwóch przeglądarek — w jednej konto
właściciela, w drugiej wejście kodem.

1. Zarząd przeciąga wydarzenie przy wyłączonej sesji → u właściciela rośnie licznik w skrzynce,
   a kalendarz się nie zmienia.
2. Właściciel przyjmuje propozycję → wydarzenie przeskakuje, a propozycja znika ze skrzynki.
3. Właściciel włącza Sesję Operacyjną → u zarządu pojawia się baner, przeciąganie zmienia
   kalendarz od razu, a u właściciela zmiana widoczna bez odświeżania.
4. Baner pokazuje rosnący czas trwania.
5. Właściciel usuwa wydarzenie, do którego istnieje propozycja → skrzynka mówi „już nie ma"
   i pozwala wyłącznie odrzucić.

Wtedy: `superpowers:finishing-a-development-branch`.

Etap 3c (komentarze przy wydarzeniach i obecność online) dostaje własny dokument i własny plan.

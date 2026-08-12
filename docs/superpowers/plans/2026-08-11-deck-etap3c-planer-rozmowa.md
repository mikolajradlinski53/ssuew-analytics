# DECK Etap 3c — Planer: komentarze i obecność

> **Dla wykonawcy:** WYMAGANY PODSKILL: użyj `superpowers:subagent-driven-development`
> (zalecane) albo `superpowers:executing-plans`. Kroki mają składnię `- [ ]` do odhaczania.

**Cel:** Przy wydarzeniu da się porozmawiać, a na Sesji Operacyjnej widać, kto jest pod ręką
i co ogląda.

**Architektura:** Cała warstwa serwerowa powstała w 3b, więc dochodzą dwie płaskie kolekcje
(`komentarze`, `obecnosc`) i trzy akcje w `POST /api/planer`. Logika, która decyduje o tym, co
widać — odsiew nieaktualnych znaków życia i grupowanie komentarzy po wydarzeniu — to czyste
funkcje testowalne bez sieci.

**Stack:** Next.js 16, React 19, TypeScript 5, Firestore + firebase-admin, vitest + Testing Library.

**Projekt:** `docs/superpowers/specs/2026-08-11-deck-etap3c-planer-rozmowa-design.md`

---

## Struktura plików

| Plik | Odpowiedzialność |
|---|---|
| `lib/planer/obecnosc.ts` | Odsiew nieaktualnych znaków, inicjały, kolor z imienia — czyste funkcje |
| `lib/planer/komentarze.ts` | Typ komentarza i grupowanie po wydarzeniu — czyste funkcje |
| `lib/planer/zapis.ts` | Subskrypcje i zapisy właściciela |
| `lib/planer/serwer.ts` | Trzy nowe akcje dla zarządu |
| `app/api/planer/route.ts` | Obsługa tych akcji |
| `components/planer/Obecnosc.tsx` | Pasek awatarów |
| `components/planer/Watek.tsx` | Lista komentarzy i pole na nowy |
| `components/planer/KartaWydarzenia.tsx` | Kropka przy wydarzeniu z komentarzami |
| `components/planer/PlanerClient.tsx` | Spięcie: subskrypcje, znak życia, `patrzyNa` |

---

## Faza A — czysta logika

### Zadanie 1: Obecność

**Pliki:**
- Utwórz: `lib/planer/obecnosc.ts`
- Test: `lib/planer/obecnosc.test.ts`

- [ ] **Krok 1: Napisz test, który nie przechodzi**

```ts
// lib/planer/obecnosc.test.ts
import { describe, it, expect } from 'vitest'
import { aktualni, inicjaly, kolorOsoby, type Znak } from '@/lib/planer/obecnosc'

const teraz = Date.now()

function znak(nadpisz: Partial<Znak> = {}): Znak {
  return { uid: 'u1', kto: 'Jula', ostatniZnak: teraz, patrzyNa: null, ...nadpisz }
}

describe('aktualni', () => {
  it('zostawia znak sprzed 30 sekund', () => {
    expect(aktualni([znak({ ostatniZnak: teraz - 30_000 })], teraz)).toHaveLength(1)
  })

  it('odsiewa znak sprzed trzech minut', () => {
    // Gwaltownie zamknieta przegladarka nie zdazy sie wymeldowac — bez wygasania
    // pasek pokazywalby duchy.
    expect(aktualni([znak({ ostatniZnak: teraz - 180_000 })], teraz)).toHaveLength(0)
  })

  it('nie gubi nikogo, gdy wszyscy są świeżi', () => {
    const lista = [znak({ uid: 'a' }), znak({ uid: 'b' })]
    expect(aktualni(lista, teraz)).toHaveLength(2)
  })
})

describe('inicjaly', () => {
  it('bierze dwie pierwsze litery', () => {
    expect(inicjaly('Jula')).toBe('JU')
  })
  it('dla „wszyscy" daje gwiazdkę', () => {
    expect(inicjaly('wszyscy')).toBe('★')
  })
  it('radzi sobie z jedną literą', () => {
    expect(inicjaly('J')).toBe('J')
  })
})

describe('kolorOsoby', () => {
  it('daje ten sam kolor przy każdym wywołaniu', () => {
    expect(kolorOsoby('Jula')).toBe(kolorOsoby('Jula'))
  })
  it('rozróżnia różne imiona', () => {
    expect(kolorOsoby('Jula')).not.toBe(kolorOsoby('Kuba'))
  })
  it('zawsze zwraca kolor w zapisie szesnastkowym', () => {
    expect(kolorOsoby('Ćwikła')).toMatch(/^#[0-9a-f]{6}$/i)
  })
})
```

- [ ] **Krok 2: Uruchom test i sprawdź, że nie przechodzi**

Uruchom: `npm test -- lib/planer/obecnosc`
Oczekiwane: FAIL — `Cannot find module '@/lib/planer/obecnosc'`

- [ ] **Krok 3: Napisz implementację**

```ts
// lib/planer/obecnosc.ts

/** Po tylu milisekundach ciszy uznajemy, że ktoś już nie patrzy. */
const WYGASA_PO_MS = 120_000

export interface Znak {
  uid: string
  kto: string
  ostatniZnak: number
  /** Identyfikator otwartego wydarzenia albo `null`. */
  patrzyNa: string | null
}

/**
 * Odsiew nieaktualnych znaków życia.
 *
 * Wygasanie liczymy po stronie odbiorcy, bo gwałtownie zamknięta przeglądarka
 * nie zdąży się wymeldować — bez tego pasek pokazywałby duchy.
 */
export function aktualni(znaki: Znak[], teraz: number = Date.now()): Znak[] {
  return znaki.filter((z) => teraz - z.ostatniZnak < WYGASA_PO_MS)
}

export function inicjaly(kto: string): string {
  if (kto === 'wszyscy') return '★'
  return kto.slice(0, 2).toUpperCase()
}

const KOLORY = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
]

/** Ten sam kolor dla tego samego imienia — bez zapamiętywania czegokolwiek. */
export function kolorOsoby(kto: string): string {
  let h = 0
  for (let i = 0; i < kto.length; i++) h = (h * 31 + kto.charCodeAt(i)) >>> 0
  return KOLORY[h % KOLORY.length]
}
```

- [ ] **Krok 4: Uruchom test i sprawdź, że przechodzi**

Uruchom: `npm test -- lib/planer/obecnosc`
Oczekiwane: PASS, 9 testów

- [ ] **Krok 5: Zatwierdź**

```bash
git add lib/planer/obecnosc.ts lib/planer/obecnosc.test.ts
git commit -m "feat(planer): obecnosc — odsiew nieaktualnych znakow, inicjaly, kolor"
```

---

### Zadanie 2: Komentarze

**Pliki:**
- Utwórz: `lib/planer/komentarze.ts`
- Test: `lib/planer/komentarze.test.ts`

- [ ] **Krok 1: Napisz test, który nie przechodzi**

```ts
// lib/planer/komentarze.test.ts
import { describe, it, expect } from 'vitest'
import { poWydarzeniach, type Komentarz } from '@/lib/planer/komentarze'

function k(id: string, wydarzenieId: string, utworzone: number): Komentarz {
  return { id, wydarzenieId, tresc: 'x', autor: 'Jula', utworzone }
}

describe('poWydarzeniach', () => {
  it('grupuje komentarze po wydarzeniu', () => {
    const mapa = poWydarzeniach([k('1', 'w1', 1), k('2', 'w2', 2), k('3', 'w1', 3)])
    expect(mapa.get('w1')).toHaveLength(2)
    expect(mapa.get('w2')).toHaveLength(1)
  })

  it('wydarzenie bez komentarzy nie ma wpisu', () => {
    expect(poWydarzeniach([k('1', 'w1', 1)]).get('w2')).toBeUndefined()
  })

  it('układa od najstarszego, bo wątek czyta się od początku', () => {
    const mapa = poWydarzeniach([k('nowy', 'w1', 200), k('stary', 'w1', 100)])
    expect(mapa.get('w1')!.map((x) => x.id)).toEqual(['stary', 'nowy'])
  })

  it('pusta lista daje pustą mapę', () => {
    expect(poWydarzeniach([]).size).toBe(0)
  })
})
```

- [ ] **Krok 2: Uruchom test i sprawdź, że nie przechodzi**

Uruchom: `npm test -- lib/planer/komentarze`
Oczekiwane: FAIL — `Cannot find module '@/lib/planer/komentarze'`

- [ ] **Krok 3: Napisz implementację**

```ts
// lib/planer/komentarze.ts

export interface Komentarz {
  id: string
  wydarzenieId: string
  tresc: string
  /** Etykieta kodu albo adres e-mail — zapisywana przez serwer z biletu. */
  autor: string
  utworzone: number
}

/**
 * Komentarze leżą płasko w semestrze, więc widok grupuje je sam. Dzięki temu
 * kropka „to wydarzenie ma rozmowę" wynika z jednej subskrypcji, zamiast
 * wymagać odpytania podkolekcji każdego wydarzenia osobno.
 */
export function poWydarzeniach(komentarze: Komentarz[]): Map<string, Komentarz[]> {
  const mapa = new Map<string, Komentarz[]>()
  for (const k of komentarze) {
    const lista = mapa.get(k.wydarzenieId) ?? []
    lista.push(k)
    mapa.set(k.wydarzenieId, lista)
  }
  for (const lista of mapa.values()) lista.sort((a, b) => a.utworzone - b.utworzone)
  return mapa
}
```

- [ ] **Krok 4: Uruchom test i sprawdź, że przechodzi**

Uruchom: `npm test -- lib/planer/komentarze`
Oczekiwane: PASS, 4 testy

- [ ] **Krok 5: Zatwierdź**

```bash
git add lib/planer/komentarze.ts lib/planer/komentarze.test.ts
git commit -m "feat(planer): typ komentarza i grupowanie po wydarzeniu"
```

---

## Faza B — zapis i odczyt

### Zadanie 3: Trzy akcje serwerowe

**Pliki:**
- Modyfikuj: `app/api/planer/route.ts`, `lib/firebase/admin.ts`
- Test: `app/api/planer/route.test.ts`

- [ ] **Krok 1: Dopisz odwołania do kolekcji**

W `lib/firebase/admin.ts` dopisz na końcu:

```ts
export function komentarzeRef(semestrId: string) {
  return bazaAdmin().collection('semestry').doc(semestrId).collection('komentarze')
}

export function obecnoscRef(semestrId: string) {
  return bazaAdmin().collection('semestry').doc(semestrId).collection('obecnosc')
}
```

- [ ] **Krok 2: Dopisz testy do `app/api/planer/route.test.ts`**

W bloku `vi.mock('@/lib/firebase/admin', …)` dodaj dwa nowe odwołania, a poniżej — trzy testy.
Pełna, zaktualizowana atrapa:

```ts
const dodajKomentarz = vi.fn()
const zapiszObecnosc = vi.fn()

vi.mock('@/lib/firebase/admin', () => ({
  propozycjeRef: () => ({ add: (d: unknown) => dodajPropozycje(d) }),
  wydarzeniaRef: () => ({ doc: (id: string) => ({ update: (d: unknown) => zmienDzien(id, d) }) }),
  semestrRef: () => ({ get: async () => ({ data: () => ({ trybWspolny: trybWspolny() }) }) }),
  komentarzeRef: () => ({ add: (d: unknown) => dodajKomentarz(d) }),
  obecnoscRef: () => ({ doc: (uid: string) => ({ set: (d: unknown) => zapiszObecnosc(uid, d) }) }),
}))
```

Do `beforeEach` dopisz `dodajKomentarz.mockReset()` i `zapiszObecnosc.mockReset()`.
Nowe testy przed zamykającym `})`:

```ts
  it('komentarz bez sesji odmawia', async () => {
    ktoPyta.mockResolvedValue(null)
    const { POST } = await import('@/app/api/planer/route')
    const res = await POST(zada({ semestr: '2026Z', akcja: 'komentarz', wydarzenieId: 'w1', tresc: 'hej' }))
    expect(res.status).toBe(401)
  })

  it('zarząd dopisuje komentarz', async () => {
    ktoPyta.mockResolvedValue({ uid: 'kod:482913', email: 'Jula', rola: 'board' })
    const { POST } = await import('@/app/api/planer/route')
    const res = await POST(zada({ semestr: '2026Z', akcja: 'komentarz', wydarzenieId: 'w1', tresc: 'przenieść?' }))
    expect(res.status).toBe(201)
    expect(dodajKomentarz).toHaveBeenCalledWith(
      expect.objectContaining({ wydarzenieId: 'w1', tresc: 'przenieść?', autor: 'Jula' }),
    )
  })

  it('pusty komentarz to 400', async () => {
    ktoPyta.mockResolvedValue({ uid: 'u1', email: 'a@b.c', rola: 'owner' })
    const { POST } = await import('@/app/api/planer/route')
    const res = await POST(zada({ semestr: '2026Z', akcja: 'komentarz', wydarzenieId: 'w1', tresc: '   ' }))
    expect(res.status).toBe(400)
  })

  it('znak obecności zapisuje uid z biletu, nie z treści żądania', async () => {
    // Inaczej dalo by sie podszyc pod dowolna osobe w pasku obecnosci.
    ktoPyta.mockResolvedValue({ uid: 'kod:482913', email: 'Jula', rola: 'board' })
    const { POST } = await import('@/app/api/planer/route')
    await POST(zada({ semestr: '2026Z', akcja: 'obecnosc', uid: 'kod:PODSZYCIE', kto: 'Prezes', patrzyNa: 'w1' }))
    expect(zapiszObecnosc).toHaveBeenCalledWith(
      'kod:482913',
      expect.objectContaining({ kto: 'Jula', patrzyNa: 'w1' }),
    )
  })
```

- [ ] **Krok 3: Uruchom testy i sprawdź, że nie przechodzą**

Uruchom: `npm test -- app/api/planer`
Oczekiwane: FAIL — nowe akcje zwracają 400 „Nieznana akcja"

- [ ] **Krok 4: Dopisz obsługę akcji w `app/api/planer/route.ts`**

Rozszerz import o `komentarzeRef` i `obecnoscRef`, a przed `return NextResponse.json({ error: 'Nieznana akcja' }…)` wstaw:

```ts
    if (akcja === 'komentarz') {
      const tresc = typeof body.tresc === 'string' ? body.tresc.trim() : ''
      if (!tresc || !body.wydarzenieId) {
        return NextResponse.json({ error: 'Pusty komentarz' }, { status: 400 })
      }
      await komentarzeRef(semestr).add({
        wydarzenieId: body.wydarzenieId,
        tresc,
        autor: kto.email,
        utworzone: Date.now(),
      })
      return NextResponse.json({ ok: true }, { status: 201 })
    }

    if (akcja === 'obecnosc') {
      // `uid` i `kto` biorą się WYŁĄCZNIE z biletu. Wzięte z treści żądania
      // pozwoliłyby podszyć się pod dowolną osobę w pasku obecności.
      await obecnoscRef(semestr).doc(kto.uid).set({
        kto: kto.email,
        ostatniZnak: Date.now(),
        patrzyNa: typeof body.patrzyNa === 'string' ? body.patrzyNa : null,
      })
      return NextResponse.json({ ok: true })
    }
```

- [ ] **Krok 5: Uruchom testy i sprawdź, że przechodzą**

Uruchom: `npm test -- app/api/planer`
Oczekiwane: PASS, 10 testów

- [ ] **Krok 6: Zatwierdź**

```bash
git add app/api/planer lib/firebase/admin.ts
git commit -m "feat(planer): akcje komentarza i znaku obecnosci po stronie serwera"
```

---

### Zadanie 4: Subskrypcje i zapisy właściciela

**Pliki:**
- Modyfikuj: `lib/planer/zapis.ts`, `lib/planer/serwer.ts`

- [ ] **Krok 1: Dopisz do `lib/planer/zapis.ts`**

Do importu typów dołóż `import type { Komentarz } from './komentarze'` oraz
`import type { Znak } from './obecnosc'`, a na końcu pliku:

```ts
/* ─── Komentarze i obecność ─────────────────────────────────── */

function komentarze(semestrId: string) {
  return collection(baza(), 'semestry', semestrId, 'komentarze')
}

function obecnosc(semestrId: string) {
  return collection(baza(), 'semestry', semestrId, 'obecnosc')
}

export function subskrybujKomentarze(
  semestrId: string,
  gdyZmiana: (k: Komentarz[]) => void,
): () => void {
  return onSnapshot(komentarze(semestrId), (zrzut) =>
    gdyZmiana(zrzut.docs.map((d) => ({ id: d.id, ...d.data() }) as Komentarz)),
  )
}

export function subskrybujObecnosc(
  semestrId: string,
  gdyZmiana: (z: Znak[]) => void,
): () => void {
  return onSnapshot(obecnosc(semestrId), (zrzut) =>
    gdyZmiana(zrzut.docs.map((d) => ({ uid: d.id, ...d.data() }) as Znak)),
  )
}

export async function dodajKomentarz(
  semestrId: string,
  wydarzenieId: string,
  tresc: string,
  autor: string,
): Promise<void> {
  await addDoc(komentarze(semestrId), { wydarzenieId, tresc, autor, utworzone: Date.now() })
}

export async function zapiszObecnosc(
  semestrId: string,
  uid: string,
  kto: string,
  patrzyNa: string | null,
): Promise<void> {
  await setDoc(doc(obecnosc(semestrId), uid), { kto, ostatniZnak: Date.now(), patrzyNa })
}
```

- [ ] **Krok 2: Dopisz do `lib/planer/serwer.ts`**

```ts
export function zglosKomentarz(semestr: string, wydarzenieId: string, tresc: string): Promise<void> {
  return wyslij({ semestr, akcja: 'komentarz', wydarzenieId, tresc })
}

/** Znak życia. `uid` i etykietę serwer bierze z biletu — tu ich nie wysyłamy. */
export function zglosObecnosc(semestr: string, patrzyNa: string | null): Promise<void> {
  return wyslij({ semestr, akcja: 'obecnosc', patrzyNa })
}
```

- [ ] **Krok 3: Sprawdź typy**

Uruchom: `npx tsc --noEmit`
Oczekiwane: brak błędów

- [ ] **Krok 4: Zatwierdź**

```bash
git add lib/planer/zapis.ts lib/planer/serwer.ts
git commit -m "feat(planer): subskrypcje komentarzy i obecnosci oraz zapisy obu drog"
```

---

## Faza C — widoki

### Zadanie 5: Pasek obecności

**Pliki:**
- Utwórz: `components/planer/Obecnosc.tsx`
- Test: `components/planer/Obecnosc.test.tsx`

- [ ] **Krok 1: Napisz test, który nie przechodzi**

```tsx
// components/planer/Obecnosc.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Obecnosc } from '@/components/planer/Obecnosc'
import type { Znak } from '@/lib/planer/obecnosc'

const teraz = Date.now()

describe('Obecnosc', () => {
  it('nie pokazuje niczego, gdy nikogo nie ma', () => {
    const { container } = render(<Obecnosc znaki={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('pokazuje inicjały obecnych', () => {
    const znaki: Znak[] = [{ uid: 'a', kto: 'Jula', ostatniZnak: teraz, patrzyNa: null }]
    render(<Obecnosc znaki={znaki} />)
    expect(screen.getByText('JU')).toBeInTheDocument()
  })

  it('odsiewa nieaktualne znaki', () => {
    const znaki: Znak[] = [
      { uid: 'a', kto: 'Jula', ostatniZnak: teraz, patrzyNa: null },
      { uid: 'b', kto: 'Kuba', ostatniZnak: teraz - 300_000, patrzyNa: null },
    ]
    render(<Obecnosc znaki={znaki} />)
    expect(screen.getByText('JU')).toBeInTheDocument()
    expect(screen.queryByText('KU')).toBeNull()
  })
})
```

- [ ] **Krok 2: Uruchom test i sprawdź, że nie przechodzi**

Uruchom: `npm test -- components/planer/Obecnosc`
Oczekiwane: FAIL — `Cannot find module '@/components/planer/Obecnosc'`

- [ ] **Krok 3: Napisz implementację**

```tsx
// components/planer/Obecnosc.tsx
'use client'
import { aktualni, inicjaly, kolorOsoby, type Znak } from '@/lib/planer/obecnosc'

export function Obecnosc({ znaki }: { znaki: Znak[] }) {
  const obecni = aktualni(znaki)
  if (obecni.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-deck-muted/70">
        online
      </span>
      <div className="flex">
        {obecni.map((z, i) => (
          <span
            key={z.uid}
            title={z.kto}
            style={{ background: kolorOsoby(z.kto), marginLeft: i === 0 ? 0 : -6 }}
            className="grid h-6 w-6 place-items-center rounded-full text-[9.5px] font-bold text-white ring-2 ring-deck-bg-deep"
          >
            {inicjaly(z.kto)}
          </span>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Krok 4: Uruchom test i sprawdź, że przechodzi**

Uruchom: `npm test -- components/planer/Obecnosc`
Oczekiwane: PASS, 3 testy

- [ ] **Krok 5: Zatwierdź**

```bash
git add components/planer/Obecnosc.tsx components/planer/Obecnosc.test.tsx
git commit -m "feat(planer): pasek obecnosci z awatarami"
```

---

### Zadanie 6: Wątek komentarzy

**Pliki:**
- Utwórz: `components/planer/Watek.tsx`
- Test: `components/planer/Watek.test.tsx`

- [ ] **Krok 1: Napisz test, który nie przechodzi**

```tsx
// components/planer/Watek.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Watek } from '@/components/planer/Watek'
import type { Komentarz } from '@/lib/planer/komentarze'

const komentarze: Komentarz[] = [
  { id: '1', wydarzenieId: 'w1', tresc: 'przenieść?', autor: 'Jula', utworzone: 1 },
]

describe('Watek', () => {
  it('pusty wątek zachęca do napisania', () => {
    render(<Watek komentarze={[]} onDodaj={vi.fn()} />)
    expect(screen.getByText(/nikt jeszcze nic nie napisał/i)).toBeInTheDocument()
  })

  it('pokazuje treść i autora', () => {
    render(<Watek komentarze={komentarze} onDodaj={vi.fn()} />)
    expect(screen.getByText('przenieść?')).toBeInTheDocument()
    expect(screen.getByText(/Jula/)).toBeInTheDocument()
  })

  it('wysyła wpisaną treść i czyści pole', () => {
    const onDodaj = vi.fn()
    render(<Watek komentarze={[]} onDodaj={onDodaj} />)
    const pole = screen.getByPlaceholderText(/napisz/i)
    fireEvent.change(pole, { target: { value: 'zgadzam się' } })
    fireEvent.click(screen.getByRole('button', { name: /wyślij/i }))
    expect(onDodaj).toHaveBeenCalledWith('zgadzam się')
    expect(pole).toHaveValue('')
  })

  it('sama spacja nie wysyła', () => {
    const onDodaj = vi.fn()
    render(<Watek komentarze={[]} onDodaj={onDodaj} />)
    fireEvent.change(screen.getByPlaceholderText(/napisz/i), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: /wyślij/i }))
    expect(onDodaj).not.toHaveBeenCalled()
  })
})
```

- [ ] **Krok 2: Uruchom test i sprawdź, że nie przechodzi**

Uruchom: `npm test -- components/planer/Watek`
Oczekiwane: FAIL — `Cannot find module '@/components/planer/Watek'`

- [ ] **Krok 3: Napisz implementację**

```tsx
// components/planer/Watek.tsx
'use client'
import { useState } from 'react'
import { Send } from 'lucide-react'
import type { Komentarz } from '@/lib/planer/komentarze'

type Props = {
  komentarze: Komentarz[]
  onDodaj: (tresc: string) => void
}

function godzina(ms: number): string {
  return new Date(ms).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
}

export function Watek({ komentarze, onDodaj }: Props) {
  const [tresc, setTresc] = useState('')

  function wyslij() {
    const czysta = tresc.trim()
    if (!czysta) return
    onDodaj(czysta)
    setTresc('')
  }

  return (
    <div className="mt-4 border-t border-white/8 pt-3">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-deck-muted/70">
        rozmowa
      </div>

      {komentarze.length === 0 ? (
        <p className="text-[11.5px] text-deck-muted/70">Nikt jeszcze nic nie napisał.</p>
      ) : (
        <div className="space-y-2">
          {komentarze.map((k) => (
            <div key={k.id} className="rounded-md border border-white/8 bg-white/[0.02] px-2.5 py-2">
              <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-deck-muted/70">
                {k.autor} · {godzina(k.utworzone)}
              </div>
              <div className="mt-1 text-[11.5px] leading-relaxed text-deck-text">{k.tresc}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 flex gap-2">
        <input
          value={tresc}
          onChange={(e) => setTresc(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') wyslij() }}
          placeholder="Napisz coś…"
          className="deck-input flex-1 rounded-lg px-2.5 py-1.5 text-[11.5px]"
        />
        <button
          type="button"
          onClick={wyslij}
          aria-label="Wyślij"
          className="grid h-8 w-8 place-items-center rounded-lg border border-deck-accent/40 text-deck-accent transition hover:bg-deck-accent/15"
        >
          <Send size={13} />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Krok 4: Uruchom test i sprawdź, że przechodzi**

Uruchom: `npm test -- components/planer/Watek`
Oczekiwane: PASS, 4 testy

- [ ] **Krok 5: Zatwierdź**

```bash
git add components/planer/Watek.tsx components/planer/Watek.test.tsx
git commit -m "feat(planer): watek komentarzy przy wydarzeniu"
```

---

### Zadanie 7: Kropka przy wydarzeniu z rozmową

**Pliki:**
- Modyfikuj: `components/planer/KartaWydarzenia.tsx`, `components/planer/KartaWydarzenia.test.tsx`

- [ ] **Krok 1: Dopisz test**

W `components/planer/KartaWydarzenia.test.tsx` przed zamykającym `})`:

```tsx
  it('pokazuje kropkę, gdy wydarzenie ma rozmowę', () => {
    const { container, rerender } = render(
      <KartaWydarzenia wydarzenie={w} onOtworz={vi.fn()} przeciagalne={false} />,
    )
    expect(container.querySelector('[data-rozmowa]')).toBeNull()
    rerender(<KartaWydarzenia wydarzenie={w} onOtworz={vi.fn()} przeciagalne={false} maRozmowe />)
    expect(container.querySelector('[data-rozmowa]')).not.toBeNull()
  })
```

- [ ] **Krok 2: Uruchom test i sprawdź, że nie przechodzi**

Uruchom: `npm test -- components/planer/KartaWydarzenia`
Oczekiwane: FAIL — kropka nie istnieje, drugie oczekiwanie zawodzi

- [ ] **Krok 3: Dopisz kropkę**

W `components/planer/KartaWydarzenia.tsx` dodaj do typu `Props`:

```tsx
  /** Czy przy wydarzeniu toczy się rozmowa. Kropka bez liczby — liczbę widać po otwarciu. */
  maRozmowe?: boolean
```

Rozszerz sygnaturę o `maRozmowe` i wstaw kropkę tuż przed tytułem:

```tsx
      {maRozmowe && (
        <span
          data-rozmowa
          aria-label="ma komentarze"
          className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle bg-deck-accent"
        />
      )}
```

- [ ] **Krok 4: Uruchom test i sprawdź, że przechodzi**

Uruchom: `npm test -- components/planer/KartaWydarzenia`
Oczekiwane: PASS, 4 testy

- [ ] **Krok 5: Zatwierdź**

```bash
git add components/planer/KartaWydarzenia.tsx components/planer/KartaWydarzenia.test.tsx
git commit -m "feat(planer): kropka przy wydarzeniu z rozmowa"
```

---

### Zadanie 8: Spięcie w powłoce

**Pliki:**
- Modyfikuj: `components/planer/PlanerClient.tsx`, `components/planer/WidokMiesiaca.tsx`,
  `components/planer/PanelWydarzenia.tsx`

- [ ] **Krok 1: Przekaż kropkę do siatki**

W `components/planer/WidokMiesiaca.tsx` dodaj do `Props`:

```tsx
  /** Identyfikatory wydarzeń, przy których toczy się rozmowa. */
  zRozmowa: Set<string>
```

Rozszerz sygnaturę o `zRozmowa` i w obu miejscach, gdzie renderuje się `<KartaWydarzenia …>`
(w liście na telefon i w siatce), dopisz:

```tsx
                    maRozmowe={zRozmowa.has(w.id)}
```

- [ ] **Krok 2: Dodaj wątek do panelu**

W `components/planer/PanelWydarzenia.tsx` dodaj do `Props`:

```tsx
  /** Wątek pokazujemy tylko przy istniejącym wydarzeniu — nowe nie ma jeszcze o czym rozmawiać. */
  watek?: ReactNode
```

Plik nie importuje dziś niczego z `react` poza `useState`, więc dołóż typ do tego importu:

```tsx
import { useState, type ReactNode } from 'react'
```

Rozszerz sygnaturę o `watek` i wstaw tuż przed zamykającym `</aside>`:

```tsx
      {wydarzenie && watek}
```

- [ ] **Krok 3: Zepnij wszystko w `components/planer/PlanerClient.tsx`**

Dopisz importy:

```tsx
import { poWydarzeniach, type Komentarz } from '@/lib/planer/komentarze'
import type { Znak } from '@/lib/planer/obecnosc'
import {
  dodajKomentarz, subskrybujKomentarze, subskrybujObecnosc, zapiszObecnosc,
} from '@/lib/planer/zapis'
import { zglosKomentarz, zglosObecnosc } from '@/lib/planer/serwer'
import { Obecnosc } from './Obecnosc'
import { Watek } from './Watek'
```

Dodaj stan i subskrypcje obok pozostałych:

```tsx
  const [komentarze, setKomentarze] = useState<Komentarz[]>([])
  const [znaki, setZnaki] = useState<Znak[]>([])

  useEffect(() => {
    if (!naZywo) return
    return subskrybujKomentarze(semestr.id, setKomentarze)
  }, [semestr.id, naZywo])

  useEffect(() => {
    if (!naZywo) return
    return subskrybujObecnosc(semestr.id, setZnaki)
  }, [semestr.id, naZywo])

  const rozmowy = useMemo(() => poWydarzeniach(komentarze), [komentarze])
  const zRozmowa = useMemo(() => new Set(rozmowy.keys()), [rozmowy])
```

Znak życia — co 60 sekund i wyłącznie przy widocznej karcie:

```tsx
  // Karta w tle nie zapisuje nic: to najdroższy ruch w całym Planerze.
  // `patrzyNa` zmienia się tylko przy otwartym panelu, nie przy najechaniu myszą.
  useEffect(() => {
    const patrzyNa = wybrane?.id ?? null

    async function znak() {
      if (document.hidden) return
      try {
        // Właściciel zapisuje wprost, więc sam nadaje sobie identyfikator.
        // Prefiks odróżnia go od identyfikatorów, które nadaje serwer.
        if (wlascicielem) await zapiszObecnosc(semestr.id, `konto:${kto}`, kto, patrzyNa)
        else await zglosObecnosc(semestr.id, patrzyNa)
      } catch {
        // Nieudany znak życia nie ma znaczenia — następny pójdzie za minutę.
      }
    }

    void znak()
    const id = setInterval(znak, 60_000)
    return () => clearInterval(id)
  }, [semestr.id, kto, wlascicielem, wybrane?.id])
```

Dodawanie komentarza:

```tsx
  async function skomentuj(tresc: string) {
    if (!wybrane) return
    if (wlascicielem) await dodajKomentarz(semestr.id, wybrane.id, tresc, kto)
    else await zglosKomentarz(semestr.id, wybrane.id, tresc)
  }
```

Wstaw pasek obecności obok przycisków skrzynki — zaraz po `<BanerSesji …/>`:

```tsx
      <Obecnosc znaki={znaki} />
```

Przekaż kropki do siatki i wątek do panelu:

```tsx
              onDodajWDniu={dodajWDniu}
              zRozmowa={zRozmowa}
```

```tsx
            onZamknij={zamknijPanel}
            watek={
              wybrane ? (
                <Watek komentarze={rozmowy.get(wybrane.id) ?? []} onDodaj={skomentuj} />
              ) : null
            }
```

- [ ] **Krok 4: Sprawdź wszystko**

Uruchom: `npm test && npx tsc --noEmit && npm run lint && npm run build`
Oczekiwane: testy przechodzą, brak błędów typów, lint bez nowych błędów wobec stanu zastanego
(9 problemów), build kończy się sukcesem.

- [ ] **Krok 5: Zatwierdź**

```bash
git add components/planer
git commit -m "feat(planer): rozmowa przy wydarzeniu i pasek obecnosci"
```

---

### Zadanie 9: Dokumentacja

**Pliki:**
- Modyfikuj: `README.md`

- [ ] **Krok 1: Zaktualizuj opis modułu**

W tabeli modułów zmień wiersz Planera na: „Kalendarz semestru, kolizje osób i sal, propozycje
zmian od zarządu, tryb wspólnej sesji, rozmowa przy wydarzeniu i podgląd obecności".

- [ ] **Krok 2: Zatwierdź**

```bash
git add README.md
git commit -m "docs(planer): README po wdrozeniu Etapu 3c"
```

---

## Po wykonaniu

Sprawdź w dwóch przeglądarkach — właściciel i wejście kodem:

1. Obie karty pokazują nawzajem swoje awatary w pasku obecności.
2. Zamknięcie jednej karty sprawia, że po dwóch minutach awatar znika u drugiej.
3. Komentarz dopisany w jednej karcie pojawia się w drugiej bez odświeżania.
4. Wydarzenie z komentarzem dostaje kropkę w kratce.
5. Nowe wydarzenie (jeszcze niezapisane) nie pokazuje wątku.

Wtedy: `superpowers:finishing-a-development-branch`.

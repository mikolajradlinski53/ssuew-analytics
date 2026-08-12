# DECK Etap 3a — Planer semestru: fundament

> **Dla wykonawcy:** WYMAGANY PODSKILL: użyj `superpowers:subagent-driven-development`
> (zalecane) albo `superpowers:executing-plans`. Kroki mają składnię `- [ ]` do odhaczania.

**Cel:** `SemestrPlanner.jsx` staje się modułem DECK pod `/planer` — kalendarz semestru
z trwałym zapisem w Firestore, wykrywaniem kolizji osób i sal, widokiem miesiąca i całego
semestru, w ciemnej szacie reszty aplikacji.

**Architektura:** Cała logika obliczeniowa (daty, kolizje, semestry) to czyste funkcje w `lib/planer/`,
testowalne bez przeglądarki i bez sieci. Firestore dotykają wyłącznie `lib/firebase/firestore.ts`
i `lib/planer/zapis.ts`. Konta z hasłem czytają Firestore bezpośrednio przez `onSnapshot`, więc
mają zmiany na żywo; osoby na kodzie nie mają konta Firebase, więc czytają zrzut przez
`/api/planer`.

**Stack:** Next.js 16, React 19, TypeScript 5, Tailwind 4, Firestore (pakiet `firebase` już
zainstalowany), vitest + Testing Library.

**Projekt:** `docs/superpowers/specs/2026-08-11-deck-etap3a-planer-fundament-design.md`

---

## Zanim zaczniesz

Zadania 1–4 to czyste funkcje — nie potrzebują niczego z zewnątrz. Firestore staje się
konieczny dopiero w zadaniu 5.

**Wymaganie wstępne (do wykonania przez właściciela projektu):** w konsoli Firebase
→ *Firestore Database* → *Create database* → tryb **produkcyjny** → lokalizacja **eur3
(europe-west)**. Sprawdzone 11 sierpnia 2026: API zwraca wtedy `403 Cloud Firestore API has not
been used in project project-deck2627`. Lokalizacji nie da się później zmienić.

Weryfikacja, że gotowe:

```bash
P=$(grep '^NEXT_PUBLIC_FIREBASE_PROJECT_ID=' .env.local | cut -d= -f2- | tr -d '\r\n')
K=$(grep '^NEXT_PUBLIC_FIREBASE_API_KEY=' .env.local | cut -d= -f2- | tr -d '\r\n')
curl -s "https://firestore.googleapis.com/v1/projects/$P/databases/(default)/documents/_sonda?key=$K"
```

Rozstrzyga **treść** błędu, nie sam kod — oba stany zwracają `403`:

| Odpowiedź | Znaczenie |
|---|---|
| `Cloud Firestore API has not been used in project (...)` | Baza **nie istnieje**. Zatrzymaj się. |
| `Missing or insufficient permissions` / `PERMISSION_DENIED` | Baza **działa**, a reguły trybu produkcyjnego odrzucają anonimowy odczyt. Tak ma być. |

Sprawdzone 11 sierpnia 2026: baza odpowiada drugim komunikatem, czyli jest gotowa.

---

## Świadome odstępstwo od projektu

**Dokument `semestry/{semestrId}` nie powstaje w Firestore w tym etapie.** Projekt opisuje go
w modelu danych, ale w 3a semestr jest stałą w kodzie (`opisSemestru(2026, 'Z')` w `app/planer/page.tsx`),
a w Firestore istnieje wyłącznie podkolekcja `wydarzenia`.

Powód: dokument semestru przechowuje nazwę, listę miesięcy i znacznik archiwalności — wszystko
to da się wyliczyć z roku akademickiego i typu, więc zapisywanie tego byłoby powielaniem.
Osobny dokument staje się potrzebny dopiero, gdy dojdzie przełączanie i archiwizowanie semestrów,
czyli w Etapie 3b. Wtedy trzeba go założyć i przenieść tam listę semestrów.

Firestore tworzy brakujące ścieżki przy pierwszym zapisie, więc `semestry/2026Z/wydarzenia`
zadziała, mimo że dokument nadrzędny nie istnieje. W konsoli będzie widoczny jako wyszarzony —
to normalne i nie jest usterką.

## Struktura plików

| Plik | Odpowiedzialność |
|---|---|
| `lib/planer/typy.ts` | `Wydarzenie`, `Semestr`, `Kategoria`, `Miesiac` + paleta kategorii |
| `lib/planer/daty.ts` | Dni w miesiącu, dzień tygodnia, minuty z godziny |
| `lib/planer/kolizje.ts` | Wykrywanie nakładek osób i sal — czysta funkcja |
| `lib/planer/semestry.ts` | Identyfikator, nazwa i miesiące semestru z roku akademickiego |
| `lib/firebase/firestore.ts` | Inicjalizacja Firestore |
| `lib/planer/mapowanie.ts` | Dokument Firestore → typ domenowy. Bez `'use client'`, bo używa tego i przeglądarka, i serwer |
| `lib/planer/zapis.ts` | Subskrypcja `onSnapshot` i zapisy wydarzeń |
| `firestore.rules` | Reguły bezpieczeństwa, wersjonowane w repo |
| `app/api/planer/route.ts` | Odczyt dla osób wchodzących kodem |
| `app/planer/page.tsx` | Serwer: rola, wybór semestru, przekierowanie |
| `components/planer/PlanerClient.tsx` | Powłoka: widok, filtry, wybrane wydarzenie |
| `components/planer/PasekFiltrow.tsx` | Kategorie, osoba, semestr, przełącznik widoku |
| `components/planer/KartaWydarzenia.tsx` | Wydarzenie w kratce dnia |
| `components/planer/WidokMiesiaca.tsx` | Siatka dni, przeciąganie |
| `components/planer/WidokSemestru.tsx` | Pięć miesięcy naraz |
| `components/planer/PanelWydarzenia.tsx` | Szczegóły, edycja, dodawanie, usuwanie |

---

## Faza A — czysta logika

### Zadanie 1: Typy i paleta kategorii

**Pliki:**
- Utwórz: `lib/planer/typy.ts`
- Test: `lib/planer/typy.test.ts`

- [ ] **Krok 1: Napisz test, który nie przechodzi**

```ts
// lib/planer/typy.test.ts
import { describe, it, expect } from 'vitest'
import { KATEGORIE, KLUCZE_KATEGORII, jestKategoria } from '@/lib/planer/typy'

describe('kategorie', () => {
  it('zna siedem kategorii z dotychczasowego Planera', () => {
    expect(KLUCZE_KATEGORII).toHaveLength(7)
    expect(KLUCZE_KATEGORII).toContain('ZEBRANIA/INNE')
  })

  it('każda ma etykietę, kolor obrysu i tło', () => {
    for (const klucz of KLUCZE_KATEGORII) {
      const k = KATEGORIE[klucz]
      expect(k.etykieta.length).toBeGreaterThan(0)
      expect(k.obrys).toMatch(/^#[0-9a-f]{6}$/i)
      expect(k.tlo).toMatch(/^rgba\(/)
    }
  })

  it('rozpoznaje kategorię spoza listy', () => {
    expect(jestKategoria('ZEBRANIA')).toBe(true)
    expect(jestKategoria('WYCIECZKA')).toBe(false)
  })
})
```

- [ ] **Krok 2: Uruchom test i sprawdź, że nie przechodzi**

Uruchom: `npm test -- lib/planer/typy`
Oczekiwane: FAIL — `Cannot find module '@/lib/planer/typy'`

- [ ] **Krok 3: Napisz implementację**

```ts
// lib/planer/typy.ts

export type Kategoria =
  | 'UE' | 'SSUEW' | 'PROJEKTY' | 'ZEBRANIA' | 'ZEBRANIA/INNE' | 'INNE' | 'APLIKACJE'

export interface Miesiac {
  m: number
  y: number
}

export interface Wydarzenie {
  id: string
  tytul: string
  kategoria: Kategoria
  rok: number
  miesiac: number
  dzien: number
  /** "18:00" albo null, gdy godzina nieustalona. */
  godzina: string | null
  /** "9J" albo null. Osobne pole, nie wyciągane z tytułu. */
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
  /** Nasycony kolor na obrys i kropkę. */
  obrys: string
  /** Mocno przyciemnione tło karty — te same barwy co dotąd, ale czytelne na ciemnym. */
  tlo: string
}

/**
 * Barwy przeniesione z dotychczasowego Planera, ale dobrane na nowo: tamte
 * miały jasne tła (`#eef0fe` i podobne) pod białą stronę. Tutaj tło jest
 * przezroczystą wersją koloru obrysu, więc kładzie się na ciemnym bez utraty
 * kontrastu tekstu.
 */
export const KATEGORIE: Record<Kategoria, StylKategorii> = {
  'UE':            { etykieta: 'UE',        obrys: '#818cf8', tlo: 'rgba(129, 140, 248, 0.14)' },
  'SSUEW':         { etykieta: 'SSUEW',     obrys: '#2dd4bf', tlo: 'rgba(45, 212, 191, 0.14)' },
  'PROJEKTY':      { etykieta: 'Projekty',  obrys: '#fbbf24', tlo: 'rgba(251, 191, 36, 0.14)' },
  'ZEBRANIA':      { etykieta: 'Zebrania',  obrys: '#60a5fa', tlo: 'rgba(96, 165, 250, 0.14)' },
  'ZEBRANIA/INNE': { etykieta: 'Zeb./inne', obrys: '#38bdf8', tlo: 'rgba(56, 189, 248, 0.14)' },
  'INNE':          { etykieta: 'Inne',      obrys: '#a78bfa', tlo: 'rgba(167, 139, 250, 0.14)' },
  'APLIKACJE':     { etykieta: 'Aplikacje', obrys: '#fb7185', tlo: 'rgba(251, 113, 133, 0.14)' },
}

export const KLUCZE_KATEGORII = Object.keys(KATEGORIE) as Kategoria[]

export function jestKategoria(nazwa: string): nazwa is Kategoria {
  return (KLUCZE_KATEGORII as string[]).includes(nazwa)
}
```

- [ ] **Krok 4: Uruchom test i sprawdź, że przechodzi**

Uruchom: `npm test -- lib/planer/typy`
Oczekiwane: PASS, 3 testy

- [ ] **Krok 5: Zatwierdź**

```bash
git add lib/planer/typy.ts lib/planer/typy.test.ts
git commit -m "feat(planer): typy wydarzenia i semestru + paleta kategorii na ciemne tlo"
```

---

### Zadanie 2: Daty

**Pliki:**
- Utwórz: `lib/planer/daty.ts`
- Test: `lib/planer/daty.test.ts`

- [ ] **Krok 1: Napisz test, który nie przechodzi**

```ts
// lib/planer/daty.test.ts
import { describe, it, expect } from 'vitest'
import { dniWMiesiacu, pierwszyDzienTygodnia, dzienTygodnia, naMinuty } from '@/lib/planer/daty'

describe('dniWMiesiacu', () => {
  it('liczy dni zwykłych miesięcy', () => {
    expect(dniWMiesiacu(2026, 10)).toBe(31)
    expect(dniWMiesiacu(2026, 11)).toBe(30)
  })
  it('rozpoznaje luty w roku przestępnym', () => {
    expect(dniWMiesiacu(2027, 2)).toBe(28)
    expect(dniWMiesiacu(2028, 2)).toBe(29)
  })
})

describe('pierwszyDzienTygodnia', () => {
  it('liczy od poniedziałku jako zera', () => {
    // 1 października 2026 to czwartek → 3
    expect(pierwszyDzienTygodnia(2026, 10)).toBe(3)
    // 1 lutego 2027 to poniedziałek → 0
    expect(pierwszyDzienTygodnia(2027, 2)).toBe(0)
  })
})

describe('dzienTygodnia', () => {
  it('zwraca polską nazwę', () => {
    expect(dzienTygodnia(2026, 10, 1)).toBe('czwartek')
    expect(dzienTygodnia(2026, 10, 4)).toBe('niedziela')
  })
})

describe('naMinuty', () => {
  it('zamienia godzinę na minuty od północy', () => {
    expect(naMinuty('18:00')).toBe(1080)
    expect(naMinuty('09:30')).toBe(570)
  })
  it('zwraca null, gdy godziny nie ma', () => {
    expect(naMinuty(null)).toBeNull()
    expect(naMinuty('')).toBeNull()
  })
})
```

- [ ] **Krok 2: Uruchom test i sprawdź, że nie przechodzi**

Uruchom: `npm test -- lib/planer/daty`
Oczekiwane: FAIL — `Cannot find module '@/lib/planer/daty'`

- [ ] **Krok 3: Napisz implementację**

```ts
// lib/planer/daty.ts

const DNI_TYGODNIA = [
  'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota', 'niedziela',
] as const

/** `miesiac` liczony po ludzku: 1 to styczeń. */
export function dniWMiesiacu(rok: number, miesiac: number): number {
  // Dzień zerowy kolejnego miesiąca to ostatni dzień bieżącego.
  return new Date(rok, miesiac, 0).getDate()
}

/**
 * Numer kolumny, w której zaczyna się miesiąc. Zero to poniedziałek — kalendarz
 * układamy po polsku, a `getDay()` zwraca zero dla niedzieli.
 */
export function pierwszyDzienTygodnia(rok: number, miesiac: number): number {
  return (new Date(rok, miesiac - 1, 1).getDay() + 6) % 7
}

export function dzienTygodnia(rok: number, miesiac: number, dzien: number): string {
  return DNI_TYGODNIA[(new Date(rok, miesiac - 1, dzien).getDay() + 6) % 7]
}

/** Minuty od północy albo `null`, gdy godzina nieustalona. */
export function naMinuty(godzina: string | null): number | null {
  if (!godzina) return null
  const [g, m] = godzina.split(':').map(Number)
  if (Number.isNaN(g) || Number.isNaN(m)) return null
  return g * 60 + m
}
```

- [ ] **Krok 4: Uruchom test i sprawdź, że przechodzi**

Uruchom: `npm test -- lib/planer/daty`
Oczekiwane: PASS, 7 testów

- [ ] **Krok 5: Zatwierdź**

```bash
git add lib/planer/daty.ts lib/planer/daty.test.ts
git commit -m "feat(planer): funkcje dat z poniedzialkiem jako pierwszym dniem"
```

---

### Zadanie 3: Kolizje

**Pliki:**
- Utwórz: `lib/planer/kolizje.ts`
- Test: `lib/planer/kolizje.test.ts`

To najwartościowsza logika w całym module i jedyna, którą łatwo zepsuć niezauważenie.
Dziś siedzi w komponencie; tutaj staje się czystą funkcją.

- [ ] **Krok 1: Napisz test, który nie przechodzi**

```ts
// lib/planer/kolizje.test.ts
import { describe, it, expect } from 'vitest'
import { kolizjeWMiesiacu } from '@/lib/planer/kolizje'
import type { Wydarzenie } from '@/lib/planer/typy'

function w(nadpisz: Partial<Wydarzenie> = {}): Wydarzenie {
  return {
    id: Math.random().toString(36).slice(2),
    tytul: 'Zebranie',
    kategoria: 'ZEBRANIA',
    rok: 2026,
    miesiac: 10,
    dzien: 7,
    godzina: null,
    sala: null,
    osoby: [],
    ...nadpisz,
  }
}

describe('kolizje osób', () => {
  it('dwa wydarzenia tej samej osoby bez godzin to kolizja miękka', () => {
    const k = kolizjeWMiesiacu([w({ osoby: ['Jula'] }), w({ osoby: ['Jula'] })])
    expect(k.get(7)?.osoby[0]).toMatchObject({ osoba: 'Jula', ile: 2, twarda: false })
  })

  it('godziny w odstępie 60 minut to kolizja twarda', () => {
    const k = kolizjeWMiesiacu([
      w({ osoby: ['Jula'], godzina: '17:00' }),
      w({ osoby: ['Jula'], godzina: '18:00' }),
    ])
    expect(k.get(7)?.osoby[0].twarda).toBe(true)
  })

  it('godziny w odstępie 120 minut nie są twarde', () => {
    const k = kolizjeWMiesiacu([
      w({ osoby: ['Jula'], godzina: '16:00' }),
      w({ osoby: ['Jula'], godzina: '18:00' }),
    ])
    expect(k.get(7)?.osoby[0].twarda).toBe(false)
  })

  it('jedno wydarzenie osoby to nie kolizja', () => {
    expect(kolizjeWMiesiacu([w({ osoby: ['Jula'] })]).get(7)).toBeUndefined()
  })

  it('„wszyscy” nie tworzy kolizji', () => {
    // Inaczej kazde zebranie zarzadu kolidowaloby z kazdym wydarzeniem tego dnia
    // i ostrzezenia stracilyby sens.
    const k = kolizjeWMiesiacu([w({ osoby: ['wszyscy'] }), w({ osoby: ['wszyscy'] })])
    expect(k.get(7)).toBeUndefined()
  })

  it('nie miesza dni', () => {
    const k = kolizjeWMiesiacu([w({ osoby: ['Jula'], dzien: 7 }), w({ osoby: ['Jula'], dzien: 8 })])
    expect(k.size).toBe(0)
  })
})

describe('kolizje sal', () => {
  it('ta sama sala w odstępie 30 minut to kolizja', () => {
    const k = kolizjeWMiesiacu([
      w({ sala: '9J', godzina: '17:00' }),
      w({ sala: '9J', godzina: '17:30' }),
    ])
    expect(k.get(7)?.sale[0]).toMatchObject({ sala: '9J' })
  })

  it('ta sama sala w odstępie 3 godzin to nie kolizja', () => {
    const k = kolizjeWMiesiacu([
      w({ sala: '9J', godzina: '15:00' }),
      w({ sala: '9J', godzina: '18:00' }),
    ])
    expect(k.get(7)).toBeUndefined()
  })

  it('sala bez godziny nie tworzy kolizji', () => {
    // Bez godzin nie da sie orzec konfliktu sali.
    const k = kolizjeWMiesiacu([w({ sala: '9J' }), w({ sala: '9J' })])
    expect(k.get(7)).toBeUndefined()
  })
})
```

- [ ] **Krok 2: Uruchom test i sprawdź, że nie przechodzi**

Uruchom: `npm test -- lib/planer/kolizje`
Oczekiwane: FAIL — `Cannot find module '@/lib/planer/kolizje'`

- [ ] **Krok 3: Napisz implementację**

```ts
// lib/planer/kolizje.ts
import { naMinuty } from './daty'
import type { Wydarzenie } from './typy'

/** Poniżej tylu minut dwa wydarzenia uznajemy za nachodzące na siebie. */
const PROG_MINUT = 90

export interface KolizjaOsoby {
  osoba: string
  ile: number
  /** Twarda znaczy: obie mają godzinę i dzieli je mniej niż 90 minut. */
  twarda: boolean
}

export interface KolizjaSali {
  sala: string
  godziny: string[]
}

export interface KolizjeDnia {
  osoby: KolizjaOsoby[]
  sale: KolizjaSali[]
}

function ktorekolwiekBlisko(minuty: number[]): boolean {
  const posortowane = [...minuty].sort((a, b) => a - b)
  return posortowane.some((m, i) => i > 0 && m - posortowane[i - 1] < PROG_MINUT)
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
 * Zwraca kolizje w rozbiciu na dni miesiąca. Dzień bez kolizji nie ma wpisu,
 * więc `mapa.get(dzien)` zwraca `undefined` — widok sprawdza samą obecność.
 */
export function kolizjeWMiesiacu(wydarzenia: Wydarzenie[]): Map<number, KolizjeDnia> {
  const wynik = new Map<number, KolizjeDnia>()
  const poDniach = grupuj(wydarzenia, (e) => [String(e.dzien)])

  for (const [dzien, lista] of poDniach) {
    const osoby: KolizjaOsoby[] = []
    const sale: KolizjaSali[] = []

    // 'wszyscy' celowo pomijamy — patrz komentarz w teście.
    for (const [osoba, jej] of grupuj(lista, (e) => e.osoby.filter((o) => o !== 'wszyscy'))) {
      if (jej.length < 2) continue
      const minuty = jej.map((e) => naMinuty(e.godzina)).filter((m): m is number => m !== null)
      osoby.push({ osoba, ile: jej.length, twarda: ktorekolwiekBlisko(minuty) })
    }

    for (const [sala, wSali] of grupuj(lista, (e) => (e.sala ? [e.sala] : []))) {
      const zGodzina = wSali.filter((e) => e.godzina)
      if (zGodzina.length < 2) continue
      const minuty = zGodzina.map((e) => naMinuty(e.godzina) as number)
      if (!ktorekolwiekBlisko(minuty)) continue
      sale.push({ sala, godziny: zGodzina.map((e) => e.godzina as string) })
    }

    if (osoby.length || sale.length) wynik.set(Number(dzien), { osoby, sale })
  }

  return wynik
}
```

- [ ] **Krok 4: Uruchom test i sprawdź, że przechodzi**

Uruchom: `npm test -- lib/planer/kolizje`
Oczekiwane: PASS, 9 testów

- [ ] **Krok 5: Zatwierdź**

```bash
git add lib/planer/kolizje.ts lib/planer/kolizje.test.ts
git commit -m "feat(planer): wykrywanie kolizji osob i sal jako czysta funkcja"
```

---

### Zadanie 4: Semestry

**Pliki:**
- Utwórz: `lib/planer/semestry.ts`
- Test: `lib/planer/semestry.test.ts`

- [ ] **Krok 1: Napisz test, który nie przechodzi**

```ts
// lib/planer/semestry.test.ts
import { describe, it, expect } from 'vitest'
import { idSemestru, nazwaSemestru, miesiaceSemestru, opisSemestru } from '@/lib/planer/semestry'

describe('semestry', () => {
  it('składa identyfikator z roku akademickiego i typu', () => {
    expect(idSemestru(2026, 'Z')).toBe('2026Z')
    expect(idSemestru(2026, 'L')).toBe('2026L')
  })

  it('nazywa semestr po ludzku', () => {
    expect(nazwaSemestru(2026, 'Z')).toBe('Zimowy 2026/2027')
    expect(nazwaSemestru(2026, 'L')).toBe('Letni 2026/2027')
  })

  it('zimowy trwa od października do lutego następnego roku', () => {
    expect(miesiaceSemestru(2026, 'Z')).toEqual([
      { m: 10, y: 2026 }, { m: 11, y: 2026 }, { m: 12, y: 2026 },
      { m: 1, y: 2027 }, { m: 2, y: 2027 },
    ])
  })

  it('letni trwa od marca do czerwca', () => {
    expect(miesiaceSemestru(2026, 'L')).toEqual([
      { m: 3, y: 2027 }, { m: 4, y: 2027 }, { m: 5, y: 2027 }, { m: 6, y: 2027 },
    ])
  })

  it('składa gotowy opis semestru', () => {
    const s = opisSemestru(2026, 'Z')
    expect(s).toMatchObject({ id: '2026Z', nazwa: 'Zimowy 2026/2027', archiwalny: false })
    expect(s.miesiace).toHaveLength(5)
  })
})
```

- [ ] **Krok 2: Uruchom test i sprawdź, że nie przechodzi**

Uruchom: `npm test -- lib/planer/semestry`
Oczekiwane: FAIL — `Cannot find module '@/lib/planer/semestry'`

- [ ] **Krok 3: Napisz implementację**

```ts
// lib/planer/semestry.ts
import type { Miesiac, Semestr } from './typy'

export type TypSemestru = 'Z' | 'L'

/**
 * Identyfikator czytelny dla człowieka: `2026Z` to semestr zimowy roku
 * akademickiego 2026/2027. Dzięki temu adres `/planer?semestr=2026Z` da się
 * odczytać, a w konsoli Firebase widać, co jest czym.
 */
export function idSemestru(rokAkademicki: number, typ: TypSemestru): string {
  return `${rokAkademicki}${typ}`
}

export function nazwaSemestru(rokAkademicki: number, typ: TypSemestru): string {
  const etykieta = typ === 'Z' ? 'Zimowy' : 'Letni'
  return `${etykieta} ${rokAkademicki}/${rokAkademicki + 1}`
}

export function miesiaceSemestru(rokAkademicki: number, typ: TypSemestru): Miesiac[] {
  if (typ === 'Z') {
    return [
      { m: 10, y: rokAkademicki },
      { m: 11, y: rokAkademicki },
      { m: 12, y: rokAkademicki },
      { m: 1, y: rokAkademicki + 1 },
      { m: 2, y: rokAkademicki + 1 },
    ]
  }
  return [3, 4, 5, 6].map((m) => ({ m, y: rokAkademicki + 1 }))
}

export function opisSemestru(rokAkademicki: number, typ: TypSemestru): Semestr {
  return {
    id: idSemestru(rokAkademicki, typ),
    nazwa: nazwaSemestru(rokAkademicki, typ),
    miesiace: miesiaceSemestru(rokAkademicki, typ),
    archiwalny: false,
  }
}
```

- [ ] **Krok 4: Uruchom test i sprawdź, że przechodzi**

Uruchom: `npm test -- lib/planer/semestry`
Oczekiwane: PASS, 5 testów

- [ ] **Krok 5: Zatwierdź**

```bash
git add lib/planer/semestry.ts lib/planer/semestry.test.ts
git commit -m "feat(planer): semestr akademicki jako byt pierwszej klasy"
```

---

## Faza B — Firestore

### Zadanie 5: Inicjalizacja i reguły

**Pliki:**
- Utwórz: `lib/firebase/firestore.ts`, `firestore.rules`

Ten kod rozmawia z prawdziwym Firestore, więc nie ma testów jednostkowych — sprawdzasz go
w zadaniu 6 razem z zapisem.

- [ ] **Krok 1: Sprawdź, że baza jest włączona**

```bash
P=$(grep '^NEXT_PUBLIC_FIREBASE_PROJECT_ID=' .env.local | cut -d= -f2- | tr -d '\r\n')
K=$(grep '^NEXT_PUBLIC_FIREBASE_API_KEY=' .env.local | cut -d= -f2- | tr -d '\r\n')
curl -s "https://firestore.googleapis.com/v1/projects/$P/databases/(default)/documents/_sonda?key=$K"
```

Oczekiwane: `PERMISSION_DENIED` — baza działa, reguły odrzucają anonimowy odczyt.
Gdy w treści widzisz `Cloud Firestore API has not been used in project`, baza nie istnieje:
zatrzymaj się i zgłoś to jako BLOCKED.

- [ ] **Krok 2: Napisz inicjalizację**

```ts
// lib/firebase/firestore.ts
'use client'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { auth } from '@/lib/auth/firebase'

/**
 * Firestore korzysta z tej samej aplikacji Firebase co logowanie. Sięgamy po
 * nią przez `auth()`, bo tamta funkcja już pilnuje, żeby inicjalizacja była
 * idempotentna — Next odświeża moduły w trybie deweloperskim.
 */
export function baza(): Firestore {
  return getFirestore(auth().app)
}
```

- [ ] **Krok 3: Napisz reguły bezpieczeństwa**

```
// firestore.rules
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Rola siedzi we wlasnym oswiadczeniu tokenu (custom claim), bo Firestore
    // nie widzi zmiennych srodowiskowych Vercela. Nadaje sie ja recznie, raz
    // na kadencje, dla dwoch kont.
    function jestWlascicielem() {
      return request.auth != null && request.auth.token.rola == 'owner';
    }

    function zalogowany() {
      return request.auth != null;
    }

    match /semestry/{semestrId} {
      allow read: if zalogowany();
      allow write: if jestWlascicielem();

      match /wydarzenia/{wydarzenieId} {
        allow read: if zalogowany();
        allow write: if jestWlascicielem();
      }
    }

    // Wszystko, czego nie wymieniono wyzej, jest zamkniete. Regula musi byc
    // ostatnia, bo Firestore stosuje sume uprawnien, nie pierwsze dopasowanie.
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Krok 4: Wgraj reguły**

Konsola Firebase → *Firestore Database* → *Rules* → wklej treść `firestore.rules` → *Publish*.

Sprawdź w symulatorze reguł (przycisk *Rules playground*): odczyt `/semestry/2026Z` jako
uwierzytelniony ma przejść, zapis bez oświadczenia `rola` ma zostać odrzucony.

- [ ] **Krok 5: Nadaj oświadczenie roli obu kontom**

W *Firebase Console → Authentication* skopiuj UID obu kont, a potem w *Cloud Shell*
albo lokalnie z kluczem konta serwisowego:

```js
// jednorazowo, node
const admin = require('firebase-admin')
admin.initializeApp({ credential: admin.credential.applicationDefault() })
await admin.auth().setCustomUserClaims('UID_KONTA_INSTYTUCJI', { rola: 'owner' })
await admin.auth().setCustomUserClaims('UID_DRUGIEGO_KONTA', { rola: 'board' })
```

Oświadczenie wchodzi do tokenu przy następnym odświeżeniu — wyloguj się i zaloguj ponownie.

- [ ] **Krok 6: Zatwierdź**

```bash
git add lib/firebase/firestore.ts firestore.rules
git commit -m "feat(planer): inicjalizacja Firestore i reguly bezpieczenstwa"
```

---

### Zadanie 6: Odczyt i zapis wydarzeń

**Pliki:**
- Utwórz: `lib/planer/mapowanie.ts`, `lib/planer/zapis.ts`
- Test: `lib/planer/mapowanie.test.ts`

Zamiana dokumentu na typ domenowy mieszka w **osobnym pliku bez `'use client'`**, bo potrzebują
jej dwie strony: przeglądarka przez `zapis.ts` i serwer przez `/api/planer`. Gdyby siedziała
w module oznaczonym jako kliencki, trasa serwerowa nie mogłaby jej zaimportować, a wraz z nią
wciągnęłaby do funkcji serwerowej cały kliencki pakiet Firebase.

- [ ] **Krok 1: Napisz test, który nie przechodzi**

```ts
// lib/planer/mapowanie.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { naWydarzenie } from '@/lib/planer/mapowanie'

describe('naWydarzenie', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('składa wydarzenie z dokumentu Firestore', () => {
    const w = naWydarzenie('abc', {
      tytul: 'ZEBRANIE ZARZĄDU',
      kategoria: 'ZEBRANIA',
      rok: 2026, miesiac: 10, dzien: 7,
      godzina: '18:00', sala: '9J', osoby: ['Jula'],
    })
    expect(w).toEqual({
      id: 'abc',
      tytul: 'ZEBRANIE ZARZĄDU',
      kategoria: 'ZEBRANIA',
      rok: 2026, miesiac: 10, dzien: 7,
      godzina: '18:00', sala: '9J', osoby: ['Jula'],
    })
  })

  it('uzupełnia braki bezpiecznymi wartościami', () => {
    // Dokument moze przyjsc niekompletny — recznie dopisany w konsoli Firebase
    // albo zapisany starsza wersja aplikacji.
    const w = naWydarzenie('x', { tytul: 'Coś' })
    expect(w).toMatchObject({ osoby: [], godzina: null, sala: null, kategoria: 'INNE' })
  })

  it('odrzuca nieznaną kategorię na rzecz INNE', () => {
    expect(naWydarzenie('x', { kategoria: 'WYCIECZKA' }).kategoria).toBe('INNE')
  })
})
```

- [ ] **Krok 2: Uruchom test i sprawdź, że nie przechodzi**

Uruchom: `npm test -- lib/planer/mapowanie`
Oczekiwane: FAIL — `Cannot find module '@/lib/planer/mapowanie'`

- [ ] **Krok 3: Napisz mapowanie (bez `'use client'`)**

```ts
// lib/planer/mapowanie.ts
import { jestKategoria, type Wydarzenie } from './typy'

/**
 * Dokument Firestore na typ domenowy. Braki uzupełniamy zamiast rzucać
 * wyjątkiem: wiersz może być dopisany ręcznie w konsoli albo pochodzić ze
 * starszej wersji aplikacji, a jedno niekompletne wydarzenie nie może
 * wysadzić całego kalendarza.
 */
export function naWydarzenie(id: string, dane: Record<string, unknown>): Wydarzenie {
  const kategoria = typeof dane.kategoria === 'string' && jestKategoria(dane.kategoria)
    ? dane.kategoria
    : 'INNE'
  return {
    id,
    tytul: typeof dane.tytul === 'string' ? dane.tytul : '',
    kategoria,
    rok: Number(dane.rok) || 0,
    miesiac: Number(dane.miesiac) || 0,
    dzien: Number(dane.dzien) || 0,
    godzina: typeof dane.godzina === 'string' && dane.godzina ? dane.godzina : null,
    sala: typeof dane.sala === 'string' && dane.sala ? dane.sala : null,
    osoby: Array.isArray(dane.osoby) ? dane.osoby.map(String) : [],
  }
}
```

- [ ] **Krok 4: Napisz klienta Firestore**

```ts
// lib/planer/zapis.ts
'use client'
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc,
} from 'firebase/firestore'
import { baza } from '@/lib/firebase/firestore'
import { naWydarzenie } from './mapowanie'
import type { Wydarzenie } from './typy'

function sciezka(semestrId: string) {
  return collection(baza(), 'semestry', semestrId, 'wydarzenia')
}

/**
 * Subskrypcja na żywo. Obejmuje wyłącznie jeden semestr — bez tego każde
 * wejście czytałoby całą historię i koszt rósłby z każdą kadencją.
 * Zwraca funkcję odpinającą.
 */
export function subskrybujWydarzenia(
  semestrId: string,
  gdyZmiana: (wydarzenia: Wydarzenie[]) => void,
  gdyBlad: (blad: Error) => void,
): () => void {
  return onSnapshot(
    sciezka(semestrId),
    (zrzut) => gdyZmiana(zrzut.docs.map((d) => naWydarzenie(d.id, d.data()))),
    gdyBlad,
  )
}

export type NoweWydarzenie = Omit<Wydarzenie, 'id'>

export async function dodajWydarzenie(semestrId: string, dane: NoweWydarzenie): Promise<void> {
  await addDoc(sciezka(semestrId), { ...dane, zmienione: Date.now() })
}

export async function zmienWydarzenie(
  semestrId: string,
  id: string,
  zmiany: Partial<NoweWydarzenie>,
): Promise<void> {
  await updateDoc(doc(sciezka(semestrId), id), { ...zmiany, zmienione: Date.now() })
}

export async function usunWydarzenie(semestrId: string, id: string): Promise<void> {
  await deleteDoc(doc(sciezka(semestrId), id))
}
```

- [ ] **Krok 5: Uruchom test i sprawdź, że przechodzi**

Uruchom: `npm test -- lib/planer/mapowanie`
Oczekiwane: PASS, 3 testy

Sprawdź też typy, bo `zapis.ts` nie ma własnego testu:

Uruchom: `npx tsc --noEmit`
Oczekiwane: brak błędów

- [ ] **Krok 6: Zatwierdź**

```bash
git add lib/planer/mapowanie.ts lib/planer/mapowanie.test.ts lib/planer/zapis.ts
git commit -m "feat(planer): mapowanie dokumentu oraz subskrypcja i zapis w Firestore"
```

---

### Zadanie 7: Odczyt dla osób wchodzących kodem

**Pliki:**
- Utwórz: `app/api/planer/route.ts`

Osoby na kodzie nie mają konta Firebase, więc nie mogą czytać Firestore bezpośrednio.
Ta trasa czyta go uprawnieniami serwera, po sprawdzeniu biletu kodowego.

- [ ] **Krok 1: Zainstaluj Firebase Admin SDK**

```bash
npm install firebase-admin
```

- [ ] **Krok 2: Napisz trasę**

```ts
// app/api/planer/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { ktoPyta } from '@/lib/auth/guard'
import { naWydarzenie } from '@/lib/planer/mapowanie'

export const runtime = 'nodejs'

/**
 * Admin SDK omija reguły Firestore, więc ta trasa MUSI sama sprawdzić, kto
 * pyta. Bez tego byłaby otwartym oknem do bazy.
 */
function aplikacja(): App {
  if (getApps().length) return getApps()[0]
  const klucz = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!klucz) throw new Error('Brak FIREBASE_SERVICE_ACCOUNT')
  return initializeApp({ credential: cert(JSON.parse(klucz)) })
}

export async function GET(req: NextRequest) {
  const kto = await ktoPyta(req)
  if (!kto) return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })

  const semestrId = req.nextUrl.searchParams.get('semestr')
  if (!semestrId) return NextResponse.json({ error: 'Brak semestru' }, { status: 400 })

  try {
    const zrzut = await getFirestore(aplikacja())
      .collection('semestry').doc(semestrId).collection('wydarzenia').get()
    return NextResponse.json(zrzut.docs.map((d) => naWydarzenie(d.id, d.data())))
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
```

- [ ] **Krok 3: Dopisz klucz konta serwisowego do konfiguracji**

W konsoli Firebase → *Project settings → Service accounts → Generate new private key*.
Zawartość pliku JSON, **w jednej linii**, wpisz jako `FIREBASE_SERVICE_ACCOUNT`
w `.env.local` oraz w zmiennych Vercela.

Dopisz do `.env.example`:

```env
# Klucz konta serwisowego Firebase (cały JSON w jednej linii).
# Potrzebny wyłącznie po to, żeby osoby wchodzące kodem mogły czytać Planer —
# nie mają konta Firebase, więc reguły Firestore ich nie wpuszczą.
FIREBASE_SERVICE_ACCOUNT=
```

- [ ] **Krok 4: Sprawdź typy i zatwierdź**

Uruchom: `npx tsc --noEmit`
Oczekiwane: brak błędów

```bash
git add app/api/planer package.json package-lock.json .env.example
git commit -m "feat(planer): odczyt kalendarza dla osob wchodzacych kodem"
```

---

## Faza C — widoki

### Zadanie 8: Karta wydarzenia

**Pliki:**
- Utwórz: `components/planer/KartaWydarzenia.tsx`
- Test: `components/planer/KartaWydarzenia.test.tsx`

- [ ] **Krok 1: Napisz test, który nie przechodzi**

```tsx
// components/planer/KartaWydarzenia.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { KartaWydarzenia } from '@/components/planer/KartaWydarzenia'
import type { Wydarzenie } from '@/lib/planer/typy'

const w: Wydarzenie = {
  id: '1', tytul: 'ZEBRANIE ZARZĄDU', kategoria: 'ZEBRANIA',
  rok: 2026, miesiac: 10, dzien: 7, godzina: '18:00', sala: '9J', osoby: ['Jula'],
}

describe('KartaWydarzenia', () => {
  it('pokazuje godzinę i tytuł', () => {
    render(<KartaWydarzenia wydarzenie={w} onOtworz={vi.fn()} przeciagalne={false} />)
    expect(screen.getByText('18:00')).toBeInTheDocument()
    expect(screen.getByText(/ZEBRANIE ZARZĄDU/)).toBeInTheDocument()
  })

  it('bez godziny nie pokazuje pustego miejsca po niej', () => {
    render(<KartaWydarzenia wydarzenie={{ ...w, godzina: null }} onOtworz={vi.fn()} przeciagalne={false} />)
    expect(screen.queryByText('18:00')).toBeNull()
  })

  it('jest przeciągalna tylko wtedy, gdy wolno edytować', () => {
    const { rerender, container } = render(
      <KartaWydarzenia wydarzenie={w} onOtworz={vi.fn()} przeciagalne={false} />,
    )
    expect(container.querySelector('[draggable="true"]')).toBeNull()
    rerender(<KartaWydarzenia wydarzenie={w} onOtworz={vi.fn()} przeciagalne />)
    expect(container.querySelector('[draggable="true"]')).not.toBeNull()
  })
})
```

- [ ] **Krok 2: Uruchom test i sprawdź, że nie przechodzi**

Uruchom: `npm test -- components/planer/KartaWydarzenia`
Oczekiwane: FAIL — `Cannot find module '@/components/planer/KartaWydarzenia'`

- [ ] **Krok 3: Napisz implementację**

```tsx
// components/planer/KartaWydarzenia.tsx
'use client'
import { KATEGORIE, type Wydarzenie } from '@/lib/planer/typy'

type Props = {
  wydarzenie: Wydarzenie
  onOtworz: (w: Wydarzenie) => void
  przeciagalne: boolean
  onPrzeciagnij?: (id: string) => void
}

/**
 * W kratce dnia mieści się bardzo mało, więc karta pokazuje wyłącznie kolor
 * kategorii, godzinę i skrócony tytuł. Reszta jest w panelu bocznym.
 */
export function KartaWydarzenia({ wydarzenie, onOtworz, przeciagalne, onPrzeciagnij }: Props) {
  const styl = KATEGORIE[wydarzenie.kategoria]

  return (
    <button
      type="button"
      draggable={przeciagalne || undefined}
      onDragStart={przeciagalne ? () => onPrzeciagnij?.(wydarzenie.id) : undefined}
      onClick={() => onOtworz(wydarzenie)}
      style={{ background: styl.tlo, borderColor: styl.obrys }}
      className="w-full truncate rounded border-l-2 px-1.5 py-1 text-left text-[10.5px] leading-tight text-deck-text transition hover:brightness-125"
      title={wydarzenie.tytul}
    >
      {wydarzenie.godzina && (
        <span className="mr-1 font-mono text-[9.5px] text-deck-muted">{wydarzenie.godzina}</span>
      )}
      {wydarzenie.tytul}
    </button>
  )
}
```

- [ ] **Krok 4: Uruchom test i sprawdź, że przechodzi**

Uruchom: `npm test -- components/planer/KartaWydarzenia`
Oczekiwane: PASS, 3 testy

- [ ] **Krok 5: Zatwierdź**

```bash
git add components/planer/KartaWydarzenia.tsx components/planer/KartaWydarzenia.test.tsx
git commit -m "feat(planer): karta wydarzenia w kratce dnia"
```

---

### Zadanie 9: Widok miesiąca

**Pliki:**
- Utwórz: `components/planer/WidokMiesiaca.tsx`
- Test: `components/planer/WidokMiesiaca.test.tsx`

- [ ] **Krok 1: Napisz test, który nie przechodzi**

```tsx
// components/planer/WidokMiesiaca.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WidokMiesiaca } from '@/components/planer/WidokMiesiaca'
import type { Wydarzenie } from '@/lib/planer/typy'

const wydarzenia: Wydarzenie[] = [
  { id: '1', tytul: 'ZEBRANIE', kategoria: 'ZEBRANIA', rok: 2026, miesiac: 10, dzien: 7, godzina: '18:00', sala: null, osoby: ['Jula'] },
  { id: '2', tytul: 'REKRUTACJA', kategoria: 'SSUEW', rok: 2026, miesiac: 10, dzien: 7, godzina: '18:30', sala: null, osoby: ['Jula'] },
]

const wspolne = {
  miesiac: { m: 10, y: 2026 },
  onOtworz: vi.fn(),
  onPrzenies: vi.fn(),
  mozeEdytowac: false,
}

describe('WidokMiesiaca', () => {
  it('rysuje kratkę dla każdego dnia miesiąca', () => {
    render(<WidokMiesiaca {...wspolne} wydarzenia={[]} />)
    // Pazdziernik ma 31 dni.
    expect(screen.getByText('31')).toBeInTheDocument()
    expect(screen.queryByText('32')).toBeNull()
  })

  it('umieszcza wydarzenie w jego dniu', () => {
    render(<WidokMiesiaca {...wspolne} wydarzenia={wydarzenia} />)
    expect(screen.getByText(/ZEBRANIE/)).toBeInTheDocument()
  })

  it('oznacza dzień z twardą kolizją', () => {
    // Jula ma dwa wydarzenia w odstepie 30 minut siodmego pazdziernika.
    render(<WidokMiesiaca {...wspolne} wydarzenia={wydarzenia} />)
    expect(screen.getByLabelText(/kolizja/i)).toBeInTheDocument()
  })

  it('nie oznacza dnia bez kolizji', () => {
    render(<WidokMiesiaca {...wspolne} wydarzenia={[wydarzenia[0]]} />)
    expect(screen.queryByLabelText(/kolizja/i)).toBeNull()
  })
})
```

- [ ] **Krok 2: Uruchom test i sprawdź, że nie przechodzi**

Uruchom: `npm test -- components/planer/WidokMiesiaca`
Oczekiwane: FAIL — `Cannot find module '@/components/planer/WidokMiesiaca'`

- [ ] **Krok 3: Napisz implementację**

```tsx
// components/planer/WidokMiesiaca.tsx
'use client'
import { useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { dniWMiesiacu, pierwszyDzienTygodnia } from '@/lib/planer/daty'
import { kolizjeWMiesiacu } from '@/lib/planer/kolizje'
import type { Miesiac, Wydarzenie } from '@/lib/planer/typy'
import { KartaWydarzenia } from './KartaWydarzenia'

const NAGLOWKI = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nie']

type Props = {
  miesiac: Miesiac
  wydarzenia: Wydarzenie[]
  onOtworz: (w: Wydarzenie) => void
  onPrzenies: (id: string, naDzien: number) => void
  mozeEdytowac: boolean
}

export function WidokMiesiaca({ miesiac, wydarzenia, onOtworz, onPrzenies, mozeEdytowac }: Props) {
  const [przeciagany, setPrzeciagany] = useState<string | null>(null)

  const ile = dniWMiesiacu(miesiac.y, miesiac.m)
  const przesuniecie = pierwszyDzienTygodnia(miesiac.y, miesiac.m)
  const kolizje = useMemo(() => kolizjeWMiesiacu(wydarzenia), [wydarzenia])

  const poDniach = useMemo(() => {
    const mapa = new Map<number, Wydarzenie[]>()
    for (const w of wydarzenia) {
      const lista = mapa.get(w.dzien) ?? []
      lista.push(w)
      mapa.set(w.dzien, lista)
    }
    return mapa
  }, [wydarzenia])

  function upusc(dzien: number) {
    const id = przeciagany
    setPrzeciagany(null)
    if (id) onPrzenies(id, dzien)
  }

  return (
    <div className="deck-card rounded-lg p-3">
      <div className="mb-2 grid grid-cols-7 gap-1.5">
        {NAGLOWKI.map((n) => (
          <div key={n} className="text-center font-mono text-[10px] uppercase tracking-[0.14em] text-deck-muted/70">
            {n}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: przesuniecie }).map((_, i) => (
          <div key={`pusty-${i}`} />
        ))}

        {Array.from({ length: ile }, (_, i) => i + 1).map((dzien) => {
          const kol = kolizje.get(dzien)
          const twarda = kol?.osoby.some((o) => o.twarda) || (kol?.sale.length ?? 0) > 0
          return (
            <div
              key={dzien}
              onDragOver={mozeEdytowac ? (e) => e.preventDefault() : undefined}
              onDrop={mozeEdytowac ? () => upusc(dzien) : undefined}
              className="min-h-[92px] rounded-md border border-white/8 bg-white/[0.02] p-1.5"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="font-mono text-[10px] text-deck-muted">{dzien}</span>
                {kol && (
                  <AlertTriangle
                    size={11}
                    aria-label={twarda ? 'kolizja twarda' : 'kolizja miękka'}
                    className={twarda ? 'text-deck-danger' : 'text-deck-warn'}
                  />
                )}
              </div>
              <div className="space-y-1">
                {(poDniach.get(dzien) ?? []).map((w) => (
                  <KartaWydarzenia
                    key={w.id}
                    wydarzenie={w}
                    onOtworz={onOtworz}
                    przeciagalne={mozeEdytowac}
                    onPrzeciagnij={setPrzeciagany}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Krok 4: Uruchom test i sprawdź, że przechodzi**

Uruchom: `npm test -- components/planer/WidokMiesiaca`
Oczekiwane: PASS, 4 testy

- [ ] **Krok 5: Zatwierdź**

```bash
git add components/planer/WidokMiesiaca.tsx components/planer/WidokMiesiaca.test.tsx
git commit -m "feat(planer): widok miesiaca z przeciaganiem i znacznikiem kolizji"
```

---

### Zadanie 10: Widok semestru

**Pliki:**
- Utwórz: `components/planer/WidokSemestru.tsx`
- Test: `components/planer/WidokSemestru.test.tsx`

- [ ] **Krok 1: Napisz test, który nie przechodzi**

```tsx
// components/planer/WidokSemestru.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WidokSemestru } from '@/components/planer/WidokSemestru'
import { miesiaceSemestru } from '@/lib/planer/semestry'
import type { Wydarzenie } from '@/lib/planer/typy'

const wydarzenia: Wydarzenie[] = [
  { id: '1', tytul: 'A', kategoria: 'ZEBRANIA', rok: 2026, miesiac: 10, dzien: 7, godzina: '18:00', sala: null, osoby: ['Jula'] },
  { id: '2', tytul: 'B', kategoria: 'SSUEW', rok: 2026, miesiac: 10, dzien: 7, godzina: '18:30', sala: null, osoby: ['Jula'] },
  { id: '3', tytul: 'C', kategoria: 'INNE', rok: 2026, miesiac: 11, dzien: 3, godzina: null, sala: null, osoby: [] },
]

describe('WidokSemestru', () => {
  it('pokazuje wszystkie miesiące semestru', () => {
    render(<WidokSemestru miesiace={miesiaceSemestru(2026, 'Z')} wydarzenia={wydarzenia} onWejdz={vi.fn()} />)
    expect(screen.getByText(/Październik/i)).toBeInTheDocument()
    expect(screen.getByText(/Luty/i)).toBeInTheDocument()
  })

  it('liczy wydarzenia w każdym miesiącu', () => {
    render(<WidokSemestru miesiace={miesiaceSemestru(2026, 'Z')} wydarzenia={wydarzenia} onWejdz={vi.fn()} />)
    expect(screen.getByText('2 wydarzenia')).toBeInTheDocument()
    expect(screen.getByText('1 wydarzenie')).toBeInTheDocument()
  })

  it('wejście w miesiąc oddaje jego numer', () => {
    const onWejdz = vi.fn()
    render(<WidokSemestru miesiace={miesiaceSemestru(2026, 'Z')} wydarzenia={wydarzenia} onWejdz={onWejdz} />)
    fireEvent.click(screen.getByRole('button', { name: /Listopad/i }))
    expect(onWejdz).toHaveBeenCalledWith({ m: 11, y: 2026 })
  })
})
```

- [ ] **Krok 2: Uruchom test i sprawdź, że nie przechodzi**

Uruchom: `npm test -- components/planer/WidokSemestru`
Oczekiwane: FAIL — `Cannot find module '@/components/planer/WidokSemestru'`

- [ ] **Krok 3: Napisz implementację**

```tsx
// components/planer/WidokSemestru.tsx
'use client'
import { AlertTriangle } from 'lucide-react'
import { kolizjeWMiesiacu } from '@/lib/planer/kolizje'
import type { Miesiac, Wydarzenie } from '@/lib/planer/typy'

const NAZWY = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
]

type Props = {
  miesiace: Miesiac[]
  wydarzenia: Wydarzenie[]
  onWejdz: (m: Miesiac) => void
}

function odmiana(ile: number): string {
  if (ile === 1) return '1 wydarzenie'
  const reszta = ile % 10
  const setka = ile % 100
  const mnoga = reszta >= 2 && reszta <= 4 && (setka < 12 || setka > 14)
  return `${ile} ${mnoga ? 'wydarzenia' : 'wydarzeń'}`
}

/** Pięć miesięcy naraz — do patrzenia z lotu ptaka przy układaniu planu. */
export function WidokSemestru({ miesiace, wydarzenia, onWejdz }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {miesiace.map((m) => {
        const wMiesiacu = wydarzenia.filter((w) => w.miesiac === m.m && w.rok === m.y)
        const kolizje = kolizjeWMiesiacu(wMiesiacu)
        return (
          <button
            key={`${m.y}-${m.m}`}
            type="button"
            onClick={() => onWejdz(m)}
            className="deck-card rounded-lg p-3 text-left transition hover:border-deck-accent/40"
          >
            <div className="text-sm font-semibold text-deck-text">{NAZWY[m.m - 1]}</div>
            <div className="mt-0.5 font-mono text-[10px] text-deck-muted/70">{m.y}</div>
            <div className="mt-3 text-[11px] text-deck-muted">{odmiana(wMiesiacu.length)}</div>
            {kolizje.size > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-deck-warn">
                <AlertTriangle size={11} />
                {kolizje.size} {kolizje.size === 1 ? 'dzień z kolizją' : 'dni z kolizjami'}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Krok 4: Uruchom test i sprawdź, że przechodzi**

Uruchom: `npm test -- components/planer/WidokSemestru`
Oczekiwane: PASS, 3 testy

- [ ] **Krok 5: Zatwierdź**

```bash
git add components/planer/WidokSemestru.tsx components/planer/WidokSemestru.test.tsx
git commit -m "feat(planer): widok calego semestru z zageszczeniem i kolizjami"
```

---

### Zadanie 11: Panel wydarzenia

**Pliki:**
- Utwórz: `components/planer/PanelWydarzenia.tsx`
- Test: `components/planer/PanelWydarzenia.test.tsx`

- [ ] **Krok 1: Napisz test, który nie przechodzi**

```tsx
// components/planer/PanelWydarzenia.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PanelWydarzenia } from '@/components/planer/PanelWydarzenia'
import type { Wydarzenie } from '@/lib/planer/typy'

const w: Wydarzenie = {
  id: '1', tytul: 'ZEBRANIE ZARZĄDU', kategoria: 'ZEBRANIA',
  rok: 2026, miesiac: 10, dzien: 7, godzina: '18:00', sala: '9J', osoby: ['Jula', 'Kuba'],
}

const wspolne = { onZapisz: vi.fn(), onUsun: vi.fn(), onZamknij: vi.fn(), miesiac: { m: 10, y: 2026 } }

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

  it('z uprawnieniami zapisuje zmieniony tytuł', () => {
    const onZapisz = vi.fn()
    render(<PanelWydarzenia {...wspolne} onZapisz={onZapisz} wydarzenie={w} mozeEdytowac />)
    fireEvent.change(screen.getByDisplayValue('ZEBRANIE ZARZĄDU'), { target: { value: 'ZEBRANIE SKS' } })
    fireEvent.click(screen.getByRole('button', { name: /zapisz/i }))
    expect(onZapisz).toHaveBeenCalledWith(expect.objectContaining({ tytul: 'ZEBRANIE SKS' }))
  })

  it('w trybie nowego wydarzenia startuje z pustymi polami', () => {
    render(<PanelWydarzenia {...wspolne} wydarzenie={null} mozeEdytowac />)
    expect(screen.getByLabelText(/tytuł/i)).toHaveValue('')
  })
})
```

- [ ] **Krok 2: Uruchom test i sprawdź, że nie przechodzi**

Uruchom: `npm test -- components/planer/PanelWydarzenia`
Oczekiwane: FAIL — `Cannot find module '@/components/planer/PanelWydarzenia'`

- [ ] **Krok 3: Napisz implementację**

```tsx
// components/planer/PanelWydarzenia.tsx
'use client'
import { useEffect, useState } from 'react'
import { Trash2, X } from 'lucide-react'
import { KLUCZE_KATEGORII, KATEGORIE, type Kategoria, type Miesiac, type Wydarzenie } from '@/lib/planer/typy'
import { dniWMiesiacu } from '@/lib/planer/daty'
import type { NoweWydarzenie } from '@/lib/planer/zapis'

type Props = {
  /** `null` znaczy: formularz nowego wydarzenia. */
  wydarzenie: Wydarzenie | null
  miesiac: Miesiac
  mozeEdytowac: boolean
  onZapisz: (dane: NoweWydarzenie) => void
  onUsun: (id: string) => void
  onZamknij: () => void
}

function pusty(miesiac: Miesiac): NoweWydarzenie {
  return {
    tytul: '', kategoria: 'ZEBRANIA', rok: miesiac.y, miesiac: miesiac.m,
    dzien: 1, godzina: null, sala: null, osoby: [],
  }
}

export function PanelWydarzenia({ wydarzenie, miesiac, mozeEdytowac, onZapisz, onUsun, onZamknij }: Props) {
  const [dane, setDane] = useState<NoweWydarzenie>(() =>
    wydarzenie ? { ...wydarzenie } : pusty(miesiac),
  )

  useEffect(() => {
    setDane(wydarzenie ? { ...wydarzenie } : pusty(miesiac))
  }, [wydarzenie, miesiac])

  function zmien<K extends keyof NoweWydarzenie>(pole: K, wartosc: NoweWydarzenie[K]) {
    setDane((d) => ({ ...d, [pole]: wartosc }))
  }

  const etykieta = 'mb-1 block text-[11px] text-deck-muted'
  const pole = 'deck-input w-full rounded-lg px-3 py-2 text-sm disabled:opacity-60'

  return (
    <aside className="deck-card w-full rounded-lg p-4">
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

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={etykieta}>Kategoria</span>
            <select
              value={dane.kategoria}
              disabled={!mozeEdytowac}
              onChange={(e) => zmien('kategoria', e.target.value as Kategoria)}
              className={pole}
            >
              {KLUCZE_KATEGORII.map((k) => (
                <option key={k} value={k}>{KATEGORIE[k].etykieta}</option>
              ))}
            </select>
          </label>
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
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={etykieta}>Godzina</span>
            <input
              type="time"
              value={dane.godzina ?? ''}
              disabled={!mozeEdytowac}
              onChange={(e) => zmien('godzina', e.target.value || null)}
              className={pole}
            />
          </label>
          <label className="block">
            <span className={etykieta}>Sala</span>
            <input
              value={dane.sala ?? ''}
              disabled={!mozeEdytowac}
              onChange={(e) => zmien('sala', e.target.value || null)}
              placeholder="9J"
              className={pole}
            />
          </label>
        </div>

        <label className="block">
          <span className={etykieta}>Osoby (po przecinku, „wszyscy" = cały zarząd)</span>
          <input
            value={dane.osoby.join(', ')}
            disabled={!mozeEdytowac}
            onChange={(e) => zmien('osoby', e.target.value.split(',').map((o) => o.trim()).filter(Boolean))}
            className={pole}
          />
        </label>
      </div>

      {mozeEdytowac && (
        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onZapisz(dane)}
            className="deck-button flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold"
          >
            Zapisz
          </button>
          {wydarzenie && (
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
      )}
    </aside>
  )
}
```

- [ ] **Krok 4: Uruchom test i sprawdź, że przechodzi**

Uruchom: `npm test -- components/planer/PanelWydarzenia`
Oczekiwane: PASS, 4 testy

> Jeśli test „startuje z pustymi polami" nie znajdzie pola przez `getByLabelText(/tytuł/i)`,
> sprawdź, czy `<span>` z etykietą jest wewnątrz `<label>` — Testing Library wiąże etykietę
> z polem po zagnieżdżeniu, nie po `htmlFor`.

- [ ] **Krok 5: Zatwierdź**

```bash
git add components/planer/PanelWydarzenia.tsx components/planer/PanelWydarzenia.test.tsx
git commit -m "feat(planer): panel szczegolow z edycja i usuwaniem"
```

---

### Zadanie 12: Pasek filtrów

**Pliki:**
- Utwórz: `components/planer/PasekFiltrow.tsx`
- Test: `components/planer/PasekFiltrow.test.tsx`

- [ ] **Krok 1: Napisz test, który nie przechodzi**

```tsx
// components/planer/PasekFiltrow.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PasekFiltrow } from '@/components/planer/PasekFiltrow'
import { KLUCZE_KATEGORII } from '@/lib/planer/typy'

const wspolne = {
  aktywne: new Set(KLUCZE_KATEGORII),
  onPrzelacz: vi.fn(),
  osoby: ['Jula', 'Kuba'],
  osoba: '',
  onOsoba: vi.fn(),
  widok: 'miesiac' as const,
  onWidok: vi.fn(),
}

describe('PasekFiltrow', () => {
  it('pokazuje wszystkie kategorie', () => {
    render(<PasekFiltrow {...wspolne} />)
    expect(screen.getByRole('button', { name: 'Zebrania' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aplikacje' })).toBeInTheDocument()
  })

  it('kliknięcie kategorii ją przełącza', () => {
    const onPrzelacz = vi.fn()
    render(<PasekFiltrow {...wspolne} onPrzelacz={onPrzelacz} />)
    fireEvent.click(screen.getByRole('button', { name: 'Zebrania' }))
    expect(onPrzelacz).toHaveBeenCalledWith('ZEBRANIA')
  })

  it('lista osób pochodzi z wydarzeń', () => {
    render(<PasekFiltrow {...wspolne} />)
    expect(screen.getByRole('option', { name: 'Jula' })).toBeInTheDocument()
  })

  it('przełącza widok na semestr', () => {
    const onWidok = vi.fn()
    render(<PasekFiltrow {...wspolne} onWidok={onWidok} />)
    fireEvent.click(screen.getByRole('button', { name: /semestr/i }))
    expect(onWidok).toHaveBeenCalledWith('semestr')
  })
})
```

- [ ] **Krok 2: Uruchom test i sprawdź, że nie przechodzi**

Uruchom: `npm test -- components/planer/PasekFiltrow`
Oczekiwane: FAIL — `Cannot find module '@/components/planer/PasekFiltrow'`

- [ ] **Krok 3: Napisz implementację**

```tsx
// components/planer/PasekFiltrow.tsx
'use client'
import { CalendarDays, LayoutGrid } from 'lucide-react'
import { KATEGORIE, KLUCZE_KATEGORII, type Kategoria } from '@/lib/planer/typy'

export type Widok = 'miesiac' | 'semestr'

type Props = {
  aktywne: Set<Kategoria>
  onPrzelacz: (k: Kategoria) => void
  osoby: string[]
  osoba: string
  onOsoba: (o: string) => void
  widok: Widok
  onWidok: (w: Widok) => void
}

export function PasekFiltrow({ aktywne, onPrzelacz, osoby, osoba, onOsoba, widok, onWidok }: Props) {
  return (
    <div className="deck-card flex flex-wrap items-center gap-2 rounded-lg p-3">
      {KLUCZE_KATEGORII.map((k) => {
        const wlaczona = aktywne.has(k)
        const styl = KATEGORIE[k]
        return (
          <button
            key={k}
            type="button"
            onClick={() => onPrzelacz(k)}
            style={wlaczona ? { background: styl.tlo, borderColor: styl.obrys } : undefined}
            className={`rounded-md border px-2.5 py-1 text-[11px] transition ${
              wlaczona ? 'text-deck-text' : 'border-white/10 text-deck-muted/60 hover:text-deck-muted'
            }`}
          >
            {styl.etykieta}
          </button>
        )
      })}

      <select
        value={osoba}
        onChange={(e) => onOsoba(e.target.value)}
        className="deck-input ml-auto rounded-lg px-2.5 py-1.5 text-[11px]"
      >
        <option value="">Wszystkie osoby</option>
        {osoby.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>

      <div className="flex gap-1 rounded-lg border border-white/10 p-1">
        <button
          type="button"
          onClick={() => onWidok('miesiac')}
          className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] ${
            widok === 'miesiac' ? 'bg-deck-accent/15 text-deck-accent' : 'text-deck-muted'
          }`}
        >
          <CalendarDays size={13} /> Miesiąc
        </button>
        <button
          type="button"
          onClick={() => onWidok('semestr')}
          className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] ${
            widok === 'semestr' ? 'bg-deck-accent/15 text-deck-accent' : 'text-deck-muted'
          }`}
        >
          <LayoutGrid size={13} /> Semestr
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Krok 4: Uruchom test i sprawdź, że przechodzi**

Uruchom: `npm test -- components/planer/PasekFiltrow`
Oczekiwane: PASS, 4 testy

- [ ] **Krok 5: Zatwierdź**

```bash
git add components/planer/PasekFiltrow.tsx components/planer/PasekFiltrow.test.tsx
git commit -m "feat(planer): pasek filtrow kategorii, osoby i widoku"
```

---

### Zadanie 13: Powłoka Planera

**Pliki:**
- Utwórz: `components/planer/PlanerClient.tsx`

Ten komponent spina resztę i rozmawia z Firestore, więc testujesz go ręcznie w zadaniu 14.

- [ ] **Krok 1: Napisz implementację**

```tsx
// components/planer/PlanerClient.tsx
'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { KLUCZE_KATEGORII, type Kategoria, type Miesiac, type Semestr, type Wydarzenie } from '@/lib/planer/typy'
import {
  dodajWydarzenie, subskrybujWydarzenia, usunWydarzenie, zmienWydarzenie,
  type NoweWydarzenie,
} from '@/lib/planer/zapis'
import { PasekFiltrow, type Widok } from './PasekFiltrow'
import { WidokMiesiaca } from './WidokMiesiaca'
import { WidokSemestru } from './WidokSemestru'
import { PanelWydarzenia } from './PanelWydarzenia'

const NAZWY = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
]

type Props = {
  semestr: Semestr
  mozeEdytowac: boolean
  /** Dane wstępne dla osób na kodzie; konta z hasłem dostają je z subskrypcji. */
  poczatkowe: Wydarzenie[]
  /** Osoby na kodzie nie mają konta Firebase, więc nie subskrybują Firestore. */
  naZywo: boolean
}

export function PlanerClient({ semestr, mozeEdytowac, poczatkowe, naZywo }: Props) {
  const [wydarzenia, setWydarzenia] = useState<Wydarzenie[]>(poczatkowe)
  const [blad, setBlad] = useState<string | null>(null)
  const [widok, setWidok] = useState<Widok>('miesiac')
  const [indeksMiesiaca, setIndeksMiesiaca] = useState(0)
  const [aktywne, setAktywne] = useState<Set<Kategoria>>(new Set(KLUCZE_KATEGORII))
  const [osoba, setOsoba] = useState('')
  const [wybrane, setWybrane] = useState<Wydarzenie | null>(null)
  const [dodaje, setDodaje] = useState(false)

  useEffect(() => {
    if (!naZywo) return
    return subskrybujWydarzenia(semestr.id, setWydarzenia, (e) => setBlad(e.message))
  }, [semestr.id, naZywo])

  const miesiac = semestr.miesiace[indeksMiesiaca]

  const osoby = useMemo(() => {
    const zbior = new Set<string>()
    for (const w of wydarzenia) for (const o of w.osoby) if (o !== 'wszyscy') zbior.add(o)
    return [...zbior].sort((a, b) => a.localeCompare(b, 'pl'))
  }, [wydarzenia])

  const widoczne = useMemo(
    () =>
      wydarzenia.filter((w) => {
        if (!aktywne.has(w.kategoria)) return false
        // Filtr osoby pokazuje tez wydarzenia oznaczone 'wszyscy' — one jej dotycza.
        if (osoba && !w.osoby.includes(osoba) && !w.osoby.includes('wszyscy')) return false
        return true
      }),
    [wydarzenia, aktywne, osoba],
  )

  const wMiesiacu = useMemo(
    () => widoczne.filter((w) => w.miesiac === miesiac.m && w.rok === miesiac.y),
    [widoczne, miesiac],
  )

  const przelacz = useCallback((k: Kategoria) => {
    setAktywne((p) => {
      const n = new Set(p)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })
  }, [])

  async function zapisz(dane: NoweWydarzenie) {
    if (wybrane) await zmienWydarzenie(semestr.id, wybrane.id, dane)
    else await dodajWydarzenie(semestr.id, dane)
    setWybrane(null)
    setDodaje(false)
  }

  async function usun(id: string) {
    await usunWydarzenie(semestr.id, id)
    setWybrane(null)
  }

  async function przenies(id: string, naDzien: number) {
    await zmienWydarzenie(semestr.id, id, { dzien: naDzien })
  }

  const panelOtwarty = wybrane !== null || dodaje

  return (
    <div className="space-y-3">
      {blad && (
        <div className="rounded-lg border border-deck-danger-border bg-deck-danger-bg/70 px-3 py-2 text-[11px] text-deck-danger">
          Nie udało się pobrać kalendarza: {blad}
        </div>
      )}

      <PasekFiltrow
        aktywne={aktywne}
        onPrzelacz={przelacz}
        osoby={osoby}
        osoba={osoba}
        onOsoba={setOsoba}
        widok={widok}
        onWidok={setWidok}
      />

      {widok === 'miesiac' && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Poprzedni miesiąc"
            disabled={indeksMiesiaca === 0}
            onClick={() => setIndeksMiesiaca((i) => i - 1)}
            className="deck-chip grid h-8 w-8 place-items-center rounded-lg text-deck-muted disabled:opacity-40"
          >
            <ChevronLeft size={15} />
          </button>
          <div className="text-sm font-semibold text-deck-text">
            {NAZWY[miesiac.m - 1]} {miesiac.y}
          </div>
          <button
            type="button"
            aria-label="Następny miesiąc"
            disabled={indeksMiesiaca === semestr.miesiace.length - 1}
            onClick={() => setIndeksMiesiaca((i) => i + 1)}
            className="deck-chip grid h-8 w-8 place-items-center rounded-lg text-deck-muted disabled:opacity-40"
          >
            <ChevronRight size={15} />
          </button>
          {mozeEdytowac && (
            <button
              type="button"
              onClick={() => { setWybrane(null); setDodaje(true) }}
              className="deck-button ml-auto flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold"
            >
              <Plus size={14} /> Dodaj wydarzenie
            </button>
          )}
        </div>
      )}

      <div className={panelOtwarty ? 'grid gap-3 lg:grid-cols-[1fr_320px]' : ''}>
        <div>
          {widok === 'miesiac' ? (
            <WidokMiesiaca
              miesiac={miesiac}
              wydarzenia={wMiesiacu}
              onOtworz={(w) => { setDodaje(false); setWybrane(w) }}
              onPrzenies={przenies}
              mozeEdytowac={mozeEdytowac}
            />
          ) : (
            <WidokSemestru
              miesiace={semestr.miesiace}
              wydarzenia={widoczne}
              onWejdz={(m) => {
                setIndeksMiesiaca(semestr.miesiace.findIndex((x) => x.m === m.m && x.y === m.y))
                setWidok('miesiac')
              }}
            />
          )}
        </div>

        {panelOtwarty && (
          <PanelWydarzenia
            wydarzenie={wybrane}
            miesiac={miesiac}
            mozeEdytowac={mozeEdytowac}
            onZapisz={zapisz}
            onUsun={usun}
            onZamknij={() => { setWybrane(null); setDodaje(false) }}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Krok 2: Sprawdź typy**

Uruchom: `npx tsc --noEmit`
Oczekiwane: brak błędów

- [ ] **Krok 3: Zatwierdź**

```bash
git add components/planer/PlanerClient.tsx
git commit -m "feat(planer): powloka spinajaca widoki, filtry i zapis"
```

---

### Zadanie 14: Trasa `/planer`

**Pliki:**
- Utwórz: `app/planer/page.tsx`
- Modyfikuj: `components/deck/DeckHub.tsx`

- [ ] **Krok 1: Napisz stronę**

```tsx
// app/planer/page.tsx
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { zweryfikujToken } from '@/lib/auth/verify'
import { odczytajSesjeKodu } from '@/lib/auth/session'
import { rolaDla } from '@/lib/auth/role'
import { opisSemestru } from '@/lib/planer/semestry'
import { PlanerClient } from '@/components/planer/PlanerClient'

/** Semestr zimowy 2026/2027 — do czasu, aż przełączanie semestrów dojdzie w 3b. */
const BIEZACY = opisSemestru(2026, 'Z')

export default async function PlanerPage() {
  const ciasteczka = await cookies()

  const token = ciasteczka.get('deck_session')?.value ?? ''
  const tozsamosc = await zweryfikujToken(token)
  const rolaKonta = rolaDla(tozsamosc?.email)

  const bilet = ciasteczka.get('deck_kod')?.value ?? ''
  const sesjaKodu = rolaKonta ? null : await odczytajSesjeKodu(bilet)

  const rola = rolaKonta ?? sesjaKodu?.rola ?? null
  if (!rola) redirect('/login')

  return (
    <main className="mx-auto w-full max-w-[1360px] p-[clamp(16px,2.4vw,34px)]">
      <header className="mb-4">
        <h1 className="text-lg font-semibold text-deck-text">Planer semestru</h1>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-deck-muted/70">
          {BIEZACY.nazwa}
        </p>
      </header>

      <PlanerClient
        semestr={BIEZACY}
        mozeEdytowac={rola === 'owner'}
        poczatkowe={[]}
        naZywo={rolaKonta !== null}
      />
    </main>
  )
}
```

- [ ] **Krok 2: Odblokuj kafelek w kokpicie**

W `components/deck/DeckHub.tsx` zamień kafelek Planera na żywy:

```tsx
        <DeckTile
          stan="zywy"
          href="/planer"
          etykieta="moduł 02 · kalendarz"
          tytul="Planer semestru"
        >
          <p className="text-[12px] leading-relaxed">Kalendarz semestru z wykrywaniem kolizji osób i sal.</p>
        </DeckTile>
```

- [ ] **Krok 3: Sprawdź testy i typy**

Uruchom: `npm test && npx tsc --noEmit`
Oczekiwane: wszystko przechodzi

- [ ] **Krok 4: Sprawdź ręcznie w przeglądarce**

Uruchom `npm run dev` i zaloguj się kontem instytucji (`owner`). Wejdź na `/planer`.

Sprawdź sześć rzeczy:
1. Kalendarz pokazuje październik 2026, pusty.
2. „Dodaj wydarzenie" zapisuje — wpis pojawia się w kratce i zostaje po odświeżeniu.
3. Przeciągnięcie karty na inny dzień ją przenosi.
4. Dwa wydarzenia tej samej osoby w odstępie godziny dają czerwony znacznik kolizji.
5. Przełącznik „Semestr" pokazuje pięć miesięcy, a kliknięcie miesiąca wchodzi w niego.
6. Po zalogowaniu drugim kontem (`board`) nie ma przycisku dodawania ani przeciągania.

- [ ] **Krok 5: Zatwierdź**

```bash
git add app/planer components/deck/DeckHub.tsx
git commit -m "feat(planer): trasa /planer i odblokowany kafelek w kokpicie"
```

---

## Faza D — domknięcie

### Zadanie 15: Usunięcie starego pliku i dokumentacja

**Pliki:**
- Usuń: `SemestrPlanner.jsx`
- Modyfikuj: `README.md`

- [ ] **Krok 1: Usuń stary komponent**

Cała jego logika mieszka teraz w `lib/planer/` i `components/planer/`, przetestowana
i podpięta pod trasę. Zostawiony w korzeniu mylił, bo wyglądał na żywy kod, a nie był
podpięty pod nic i importował niezainstalowany pakiet.

```bash
git rm SemestrPlanner.jsx
```

- [ ] **Krok 2: Zaktualizuj README**

W tabeli modułów zmień wiersz Planera na stan „działa" i dopisz krótko, co potrafi:
kalendarz semestru, wykrywanie kolizji osób i sal, widok miesiąca i semestru, edycja
przez konto `owner`. W sekcji „Struktura" dopisz `lib/planer/` i `components/planer/`.
W sekcji konfiguracji dopisz `FIREBASE_SERVICE_ACCOUNT` oraz wzmiankę, że Firestore trzeba
założyć w trybie produkcyjnym w lokalizacji eur3.

- [ ] **Krok 3: Pełna weryfikacja**

```bash
npm test && npx tsc --noEmit && npm run lint && npm run build
```

Oczekiwane: testy przechodzą, brak błędów typów, lint bez nowych błędów wobec stanu
zastanego (9 problemów), build kończy się sukcesem.

- [ ] **Krok 4: Zatwierdź**

```bash
git add -A
git commit -m "docs(planer): README po wdrozeniu Etapu 3a, usuniety stary SemestrPlanner.jsx"
```

---

## Po wykonaniu

Ręcznie sprawdź to, czego testy nie złapią:

1. Zapis z jednej przeglądarki pojawia się w drugiej **bez odświeżania** (subskrypcja na żywo).
2. Wejście kodem pokazuje kalendarz, ale bez przycisków edycji i bez zmian na żywo.
3. Reguły Firestore odrzucają zapis z konta `board` — sprawdź w konsoli, czy próba zapisu
   kończy się `permission-denied`.

Wtedy: `superpowers:finishing-a-development-branch`.

Etap 3b (propozycje, skrzynka, tryb wspólnej sesji, komentarze, obecność) dostaje własny
dokument projektowy i własny plan.

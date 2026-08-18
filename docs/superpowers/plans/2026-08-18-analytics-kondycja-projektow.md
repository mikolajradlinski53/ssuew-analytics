# Kondycja projektów — plan wdrożenia

> **Dla wykonawcy:** WYMAGANY SUB-SKILL: `superpowers:subagent-driven-development` albo
> `superpowers:executing-plans`. Kroki mają pola wyboru (`- [ ]`) do odhaczania.

**Cel:** Moduł, który przy każdym projekcie zapala konkretne zastrzeżenia — budżet, nabór,
zasięg, partnerzy — i ustawia projekty w kolejności „ile się świeci".

**Architektura:** Nowa zakładka arkusza `projekty`, jeden wiersz to jeden projekt w jednej
edycji. Czyste funkcje w `lib/projekty/flagi.ts` liczą flagi i kolejność; komponenty tylko
rysują. Dane pobiera własny hak `useProjekty`, wzorowany na `useCzlonkowie`.

**Stos:** Next.js 16, React 19, TypeScript, Tailwind 4, vitest + Testing Library, Apps Script.

**Spec:** `docs/superpowers/specs/2026-08-12-analytics-kondycja-projektow-design.md`

---

## Struktura plików

| Plik | Odpowiedzialność | Zadanie |
|---|---|---|
| `types/index.ts` | `Projekt`, `Flaga`, `WagaFlagi`, `KondycjaProjektu` | 1 |
| `lib/projekty/flagi.ts` | **nowy** — progi, flagi, kolejność, edycje | 1 |
| `lib/projekty/flagi.test.ts` | **nowy** | 1 |
| `apps-script/Kod.gs` | Schemat `projekty` | 2 |
| `lib/gas/schema.ts` | Zakładka `projekty` | 2 |
| `app/api/projekty/route.ts` | **nowy** — odczyt i zapis | 2 |
| `lib/useProjekty.ts` | **nowy** — hak danych | 2 |
| `components/modules/KartaProjektu.tsx` | **nowy** — jeden projekt | 3 |
| `components/modules/ProjektyClient.tsx` | **nowy** — przełącznik edycji, kolejność | 3 |
| `app/analytics/projekty/page.tsx` | **nowy** — strona | 3 |
| `components/ui/Sidebar.tsx` | Pozycja w menu | 3 |
| `components/modules/WpisClient.tsx` | Zakładka „Projekt" | 4 |

---

## Zadanie 1: Typy i flagi

**Pliki:** `types/index.ts`, `lib/projekty/flagi.ts`, `lib/projekty/flagi.test.ts`

- [ ] **Krok 1: Dopisz typy na końcu `types/index.ts`**

```ts
// ─── Kondycja projektów ──────────────────────────────────────────────────────

/** Jeden projekt w jednej edycji — dokładnie jeden wiersz zakładki `projekty`. */
export interface Projekt {
  id: string
  projekt: string            // 'Gala', 'Adapciak'
  edycja: string             // '2025/2026' — ten sam format co w KPI
  obszar: string             // 'Kultura', 'Sport'
  budzet_plan: number        // złotówki przyznane
  budzet_wydany: number      // złotówki wydane
  przedluzenia: number       // ile razy przedłużano nabór
  aplikujacy: number
  uczestnicy: number
  partnerzy_fin: number
  partnerzy_barter: number
  problemy: string           // wolny opis
  created_at: string
}

export type WagaFlagi = 'alarm' | 'uwaga' | 'info'

/** Zastrzeżenie wobec projektu. `detal` zawsze niesie liczby, nie samą etykietę. */
export interface Flaga {
  id: string
  waga: WagaFlagi
  tytul: string
  detal: string
}

export interface KondycjaProjektu {
  projekt: Projekt
  /** Ten sam projekt w poprzedniej edycji; `null` przy pierwszej. */
  poprzednia: Projekt | null
  flagi: Flaga[]
}
```

- [ ] **Krok 2: Napisz test `lib/projekty/flagi.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { flagiProjektu, kondycjaEdycji, edycje, PROGI } from '@/lib/projekty/flagi'
import type { Projekt } from '@/types'

function p(nadpisz: Partial<Projekt> = {}): Projekt {
  return {
    id: 'x', projekt: 'Gala', edycja: '2025/2026', obszar: 'Kultura',
    budzet_plan: 5000, budzet_wydany: 4500, przedluzenia: 0,
    aplikujacy: 30, uczestnicy: 20, partnerzy_fin: 2, partnerzy_barter: 1,
    problemy: '', created_at: '', ...nadpisz,
  }
}
const ma = (f: ReturnType<typeof flagiProjektu>, id: string) => f.find((x) => x.id === id)

describe('flagiProjektu — budżet', () => {
  it('przekroczenie daje alarm z procentem i kwotami', () => {
    const f = ma(flagiProjektu(p({ budzet_plan: 5000, budzet_wydany: 7000 }), null), 'budzet-przekroczony')
    expect(f?.waga).toBe('alarm')
    expect(f?.detal).toContain('40%')
    expect(f?.detal).toContain('7000')
    expect(f?.detal).toContain('5000')
  })

  it('wydatek bez przyznanego budżetu też jest alarmem', () => {
    const f = flagiProjektu(p({ budzet_plan: 0, budzet_wydany: 800 }), null)
    expect(ma(f, 'budzet-bez-planu')?.waga).toBe('alarm')
  })

  it('ledwo ruszony budżet daje uwagę', () => {
    const f = ma(flagiProjektu(p({ budzet_plan: 5000, budzet_wydany: 2000 }), null), 'budzet-niewykorzystany')
    expect(f?.waga).toBe('uwaga')
    expect(f?.detal).toContain('40%')
  })

  it('tuż nad progiem milczy', () => {
    const f = flagiProjektu(p({ budzet_plan: 5000, budzet_wydany: 5000 * PROGI.budzetNiewykorzystany }), null)
    expect(ma(f, 'budzet-niewykorzystany')).toBeUndefined()
  })

  it('plan zero i wydane zero nie daje NaN ani Infinity', () => {
    const f = flagiProjektu(p({ budzet_plan: 0, budzet_wydany: 0 }), null)
    expect(JSON.stringify(f)).not.toMatch(/NaN|Infinity/)
  })
})

describe('flagiProjektu — nabór i partnerzy', () => {
  it('dwa przedłużenia dają uwagę, jedno nie', () => {
    expect(ma(flagiProjektu(p({ przedluzenia: 2 }), null), 'nabor-przedluzany')).toBeTruthy()
    expect(ma(flagiProjektu(p({ przedluzenia: 1 }), null), 'nabor-przedluzany')).toBeUndefined()
  })

  it('brak partnera finansowego daje uwagę i wymienia barterowych', () => {
    const f = ma(flagiProjektu(p({ partnerzy_fin: 0, partnerzy_barter: 3 }), null), 'bez-partnera-fin')
    expect(f?.detal).toContain('3')
  })

  it('nabór bez nadwyżki chętnych daje uwagę', () => {
    expect(ma(flagiProjektu(p({ aplikujacy: 20, uczestnicy: 20 }), null), 'nabor-ledwo-obsadzony')).toBeTruthy()
    expect(ma(flagiProjektu(p({ aplikujacy: 30, uczestnicy: 20 }), null), 'nabor-ledwo-obsadzony')).toBeUndefined()
  })

  it('opisane problemy dają flagę informacyjną z treścią', () => {
    const f = ma(flagiProjektu(p({ problemy: 'sala odwołana' }), null), 'problemy')
    expect(f?.waga).toBe('info')
    expect(f?.detal).toBe('sala odwołana')
  })
})

describe('flagiProjektu — porównanie z poprzednią edycją', () => {
  const stara = p({ edycja: '2024/2025', aplikujacy: 31, uczestnicy: 25 })

  it('spadek chętnych poniżej progu daje uwagę z obiema liczbami', () => {
    const f = ma(flagiProjektu(p({ aplikujacy: 12 }), stara), 'mniej-chetnych')
    expect(f?.detal).toContain('12')
    expect(f?.detal).toContain('31')
    expect(f?.detal).toContain('2024/2025')
  })

  it('drobny spadek nad progiem milczy', () => {
    expect(ma(flagiProjektu(p({ aplikujacy: 28 }), stara), 'mniej-chetnych')).toBeUndefined()
  })

  it('spadek uczestników daje osobną uwagę', () => {
    expect(ma(flagiProjektu(p({ uczestnicy: 10 }), stara), 'mniej-uczestnikow')).toBeTruthy()
  })

  it('pierwsza edycja nie daje żadnej flagi porównawczej', () => {
    const f = flagiProjektu(p({ aplikujacy: 1, uczestnicy: 1 }), null)
    expect(ma(f, 'mniej-chetnych')).toBeUndefined()
    expect(ma(f, 'mniej-uczestnikow')).toBeUndefined()
  })

  it('zerowa poprzednia wartość nie daje fałszywego spadku', () => {
    const f = flagiProjektu(p({ aplikujacy: 5 }), p({ edycja: '2024/2025', aplikujacy: 0 }))
    expect(ma(f, 'mniej-chetnych')).toBeUndefined()
  })
})

describe('kondycjaEdycji', () => {
  const dane = [
    p({ id: '1', projekt: 'Adapciak', edycja: '2025/2026' }),
    p({ id: '2', projekt: 'Gala', edycja: '2025/2026', budzet_wydany: 9000 }),
    p({ id: '3', projekt: 'TEDx', edycja: '2025/2026', partnerzy_fin: 0 }),
    p({ id: '4', projekt: 'Gala', edycja: '2024/2025', aplikujacy: 60 }),
  ]

  it('alarm idzie przed samymi uwagami, czysty projekt na koniec', () => {
    const k = kondycjaEdycji(dane, '2025/2026')
    expect(k.map((x) => x.projekt.projekt)).toEqual(['Gala', 'TEDx', 'Adapciak'])
  })

  it('podpina poprzednią edycję tam, gdzie istnieje', () => {
    const k = kondycjaEdycji(dane, '2025/2026')
    expect(k.find((x) => x.projekt.projekt === 'Gala')?.poprzednia?.edycja).toBe('2024/2025')
    expect(k.find((x) => x.projekt.projekt === 'TEDx')?.poprzednia).toBeNull()
  })

  it('nieznana edycja daje pustą listę, nie wyjątek', () => {
    expect(kondycjaEdycji(dane, '2030/2031')).toEqual([])
  })
})

describe('edycje', () => {
  it('zwraca unikalne, od najnowszej', () => {
    const dane = [p({ edycja: '2024/2025' }), p({ edycja: '2025/2026' }), p({ edycja: '2024/2025' })]
    expect(edycje(dane)).toEqual(['2025/2026', '2024/2025'])
  })
})
```

- [ ] **Krok 3: Uruchom test — ma paść**

Run: `npx vitest run lib/projekty/flagi.test.ts`
Oczekiwane: FAIL — `Failed to resolve import "@/lib/projekty/flagi"`

- [ ] **Krok 4: Napisz `lib/projekty/flagi.ts`**

```ts
import type { Flaga, KondycjaProjektu, Projekt } from '@/types'
import { porownajOkresy } from '@/lib/kpi/serie'

/**
 * Wszystkie progi w jednym miejscu. Zmiana surowości modułu to zmiana liczby
 * tutaj, a nie polowanie po warunkach.
 */
export const PROGI = {
  /** Poniżej tej części planu budżet uznajemy za nieruszony. */
  budzetNiewykorzystany: 0.6,
  /** Poniżej tej części zeszłorocznej wartości mówimy o spadku. */
  spadek: 0.8,
  /** Od tylu przedłużeń nabór uznajemy za problem. */
  przedluzenia: 2,
} as const

const zl = (v: number) => `${Math.round(v).toLocaleString('pl-PL')} zł`
const proc = (cz: number, calosc: number) => Math.round((cz / calosc) * 100)

/**
 * Zastrzeżenia wobec projektu. `poprzednia` to ten sam projekt rok wcześniej;
 * `null` znaczy pierwsza edycja — wtedy flagi porównawcze **milczą**, bo brak
 * porównania to „nie wiem", a nie „bez zastrzeżeń".
 */
export function flagiProjektu(b: Projekt, poprzednia: Projekt | null): Flaga[] {
  const f: Flaga[] = []

  // ─ Budżet
  if (b.budzet_plan > 0 && b.budzet_wydany > b.budzet_plan) {
    f.push({
      id: 'budzet-przekroczony', waga: 'alarm', tytul: 'Budżet przekroczony',
      detal: `o ${proc(b.budzet_wydany, b.budzet_plan) - 100}% (${zl(b.budzet_wydany)} z ${zl(b.budzet_plan)})`,
    })
  } else if (b.budzet_plan === 0 && b.budzet_wydany > 0) {
    // Procentu nie ma jak policzyć, ale wydatek bez przyznanych pieniędzy
    // jest poważniejszy niż przekroczenie, nie lżejszy.
    f.push({
      id: 'budzet-bez-planu', waga: 'alarm', tytul: 'Wydatek bez przyznanego budżetu',
      detal: `${zl(b.budzet_wydany)} przy planie 0 zł`,
    })
  } else if (b.budzet_plan > 0 && b.budzet_wydany < PROGI.budzetNiewykorzystany * b.budzet_plan) {
    f.push({
      id: 'budzet-niewykorzystany', waga: 'uwaga', tytul: 'Budżet ledwo ruszony',
      detal: `wykorzystane ${proc(b.budzet_wydany, b.budzet_plan)}% (${zl(b.budzet_wydany)} z ${zl(b.budzet_plan)})`,
    })
  }

  // ─ Nabór
  if (b.przedluzenia >= PROGI.przedluzenia) {
    f.push({
      id: 'nabor-przedluzany', waga: 'uwaga', tytul: 'Nabór przedłużany',
      detal: `${b.przedluzenia} razy`,
    })
  }
  if (b.uczestnicy > 0 && b.aplikujacy > 0 && b.aplikujacy <= b.uczestnicy) {
    f.push({
      id: 'nabor-ledwo-obsadzony', waga: 'uwaga', tytul: 'Nabór bez nadwyżki chętnych',
      detal: `${b.aplikujacy} chętnych na ${b.uczestnicy} uczestników`,
    })
  }

  // ─ Partnerzy
  if (b.partnerzy_fin === 0) {
    f.push({
      id: 'bez-partnera-fin', waga: 'uwaga', tytul: 'Bez partnera finansowego',
      detal: b.partnerzy_barter > 0 ? `${b.partnerzy_barter} barterowych` : 'żadnych partnerów',
    })
  }

  // ─ Porównanie z poprzednią edycją
  if (poprzednia) {
    if (poprzednia.aplikujacy > 0 && b.aplikujacy < PROGI.spadek * poprzednia.aplikujacy) {
      f.push({
        id: 'mniej-chetnych', waga: 'uwaga', tytul: 'Mniej chętnych niż rok temu',
        detal: `${b.aplikujacy} vs ${poprzednia.aplikujacy} w ${poprzednia.edycja}`,
      })
    }
    if (poprzednia.uczestnicy > 0 && b.uczestnicy < PROGI.spadek * poprzednia.uczestnicy) {
      f.push({
        id: 'mniej-uczestnikow', waga: 'uwaga', tytul: 'Mniej uczestników niż rok temu',
        detal: `${b.uczestnicy} vs ${poprzednia.uczestnicy} w ${poprzednia.edycja}`,
      })
    }
  }

  // ─ Opis własny
  const problemy = (b.problemy ?? '').trim()
  if (problemy) {
    f.push({ id: 'problemy', waga: 'info', tytul: 'Opisane problemy', detal: problemy })
  }

  return f
}

/** Unikalne edycje, od najnowszej. */
export function edycje(wszystkie: Projekt[]): string[] {
  return [...new Set(wszystkie.map((p) => p.edycja))].sort((a, b) => porownajOkresy(b, a))
}

function policz(flagi: Flaga[], waga: Flaga['waga']): number {
  return flagi.filter((f) => f.waga === waga).length
}

/**
 * Projekty danej edycji, ustawione od najgłośniejszego. To nie jest ranking
 * rentowności — tylko kolejność „ile się świeci", żeby przy kilkunastu
 * projektach nie trzeba było przewijać w poszukiwaniu kłopotów.
 */
export function kondycjaEdycji(wszystkie: Projekt[], edycja: string): KondycjaProjektu[] {
  const wTejEdycji = wszystkie.filter((p) => p.edycja === edycja)

  return wTejEdycji
    .map((projekt) => {
      const wczesniejsze = wszystkie
        .filter((x) => x.projekt === projekt.projekt && porownajOkresy(x.edycja, edycja) < 0)
        .sort((a, b) => porownajOkresy(a.edycja, b.edycja))
      const poprzednia = wczesniejsze.length ? wczesniejsze[wczesniejsze.length - 1] : null
      return { projekt, poprzednia, flagi: flagiProjektu(projekt, poprzednia) }
    })
    .sort((a, b) =>
      policz(b.flagi, 'alarm') - policz(a.flagi, 'alarm')
      || policz(b.flagi, 'uwaga') - policz(a.flagi, 'uwaga')
      || a.projekt.projekt.localeCompare(b.projekt.projekt, 'pl'),
    )
}
```

- [ ] **Krok 5: Uruchom test — ma przejść**

Run: `npx vitest run lib/projekty/flagi.test.ts`
Oczekiwane: PASS

- [ ] **Krok 6: Commit**

```bash
git add types/index.ts lib/projekty/
git commit -m "feat(projekty): flagi kondycji i kolejnosc projektow"
```

---

## Zadanie 2: Warstwa danych

**Pliki:** `apps-script/Kod.gs`, `lib/gas/schema.ts`, `app/api/projekty/route.ts`, `lib/useProjekty.ts`

- [ ] **Krok 1: Schemat w `apps-script/Kod.gs`**

W obiekcie `SCHEMAT`, po wpisie `kpi_punkty`, dopisz:

```js
  // Kondycja projektow: jeden wiersz to jeden projekt w jednej edycji.
  // Projekt jest rozpoznawany po parze (projekt, edycja) — zmiana nazwy
  // rozrywa jego historie, tak samo jak w kpi_punkty.
  projekty: {
    kolumny: {
      id: 'text',
      projekt: 'text',
      edycja: 'text',
      obszar: 'text',
      budzet_plan: 'number',
      budzet_wydany: 'number',
      przedluzenia: 'number',
      aplikujacy: 'number',
      uczestnicy: 'number',
      partnerzy_fin: 'number',
      partnerzy_barter: 'number',
      problemy: 'text',
      created_at: 'text'
    },
    sort: ['projekt', 'edycja'],
    kluczNaturalny: null
  },
```

W `SEED` dopisz `projekty: [],` — pusta zakładka, bo tych danych nie ma skąd wziąć.

- [ ] **Krok 2: Zakładka w `lib/gas/schema.ts`**

```ts
export const TABELE = ['rekrutacje', 'kohorty', 'kpi_punkty', 'projekty', 'czlonkowie', 'kody'] as const
```

```ts
  kpi_punkty: KpiMetric
  projekty: Projekt
```

Dopisz `Projekt` do importu typów na górze pliku.

- [ ] **Krok 3: Trasa `app/api/projekty/route.ts`**

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { gasList, gasWrite, GasError, odswiezAnalytics } from '@/lib/gas/client'
import { ktoPyta } from '@/lib/auth/guard'

/** `problemy` bywa puste i to jest w porządku — reszta musi być podana. */
const POLA = [
  'projekt', 'edycja', 'obszar',
  'budzet_plan', 'budzet_wydany', 'przedluzenia',
  'aplikujacy', 'uczestnicy', 'partnerzy_fin', 'partnerzy_barter',
  'problemy',
] as const

const WYMAGANE = ['projekt', 'edycja'] as const

function kompletny(w: Record<string, unknown>): boolean {
  return WYMAGANE.every((p) => w?.[p] !== undefined && w?.[p] !== null && w?.[p] !== '')
}

/**
 * Brakujące liczby stają się zerami, nie odrzuceniem wiersza. Trzynaście kolumn
 * to dużo do wypełnienia naraz; niewpisane pole po prostu nie zapala swojej flagi.
 */
function wybierz(w: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const p of POLA) {
    if (p === 'projekt' || p === 'edycja' || p === 'obszar' || p === 'problemy') {
      out[p] = w[p] ?? ''
    } else {
      const n = Number(w[p])
      out[p] = Number.isFinite(n) ? n : 0
    }
  }
  return out
}

async function odmowa(req: NextRequest) {
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
    return NextResponse.json(await gasList('projekty'))
  } catch (e) {
    return blad(e)
  }
}

export async function POST(req: NextRequest) {
  const nie = await odmowa(req)
  if (nie) return nie

  const body = await req.json()
  const wchodzace: Record<string, unknown>[] = Array.isArray(body) ? body : [body]
  const poprawne = wchodzace.filter(kompletny).map(wybierz)
  if (!poprawne.length) {
    return NextResponse.json({ error: 'Brak nazwy projektu albo edycji' }, { status: 400 })
  }

  try {
    const wiersze = await gasWrite('projekty', 'insert', poprawne)
    odswiezAnalytics()
    return NextResponse.json(Array.isArray(body) ? wiersze : wiersze[0], { status: 201 })
  } catch (e) {
    return blad(e)
  }
}

export async function PATCH(req: NextRequest) {
  const nie = await odmowa(req)
  if (nie) return nie

  const body = await req.json()
  if (!body?.id) return NextResponse.json({ error: 'Brak id' }, { status: 400 })

  const zmiany: Record<string, unknown> = { id: body.id }
  POLA.forEach((p) => {
    if (body[p] !== undefined) zmiany[p] = body[p]
  })

  try {
    const [wiersz] = await gasWrite('projekty', 'update', [zmiany])
    odswiezAnalytics()
    return NextResponse.json(wiersz)
  } catch (e) {
    return blad(e)
  }
}
```

- [ ] **Krok 4: Hak `lib/useProjekty.ts`**

```ts
'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Projekt } from '@/types'

export function useProjekty() {
  const [projekty, setProjekty] = useState<Projekt[]>([])
  const [loading, setLoading] = useState(true)
  const [blad, setBlad] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setBlad(null)
    try {
      const res = await fetch('/api/projekty')
      // Pusta zakładka to pusty moduł, a nie dane demo: kondycji projektów
      // nie da się pokazać na wymyślonych liczbach, bo cała jej wartość
      // polega na tym, że opisuje prawdziwe projekty.
      if (!res.ok) throw new Error(await res.text())
      const dane = await res.json()
      setProjekty(Array.isArray(dane) ? dane : [])
    } catch (e) {
      setBlad(e instanceof Error ? e.message : 'Nie udało się pobrać projektów')
      setProjekty([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const dodajProjekt = async (payload: Omit<Projekt, 'id' | 'created_at'>) => {
    const res = await fetch('/api/projekty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(await res.text())
    await fetchAll()
  }

  return { projekty, loading, blad, dodajProjekt, refresh: fetchAll }
}
```

- [ ] **Krok 5: Sprawdź typy i commit**

Run: `npx tsc --noEmit`
Oczekiwane: czysto

```bash
git add apps-script/Kod.gs lib/gas/schema.ts app/api/projekty/ lib/useProjekty.ts
git commit -m "feat(projekty): zakladka projekty, trasa i hak danych"
```

---

## Zadanie 3: Widok

**Pliki:** `components/modules/KartaProjektu.tsx`, `components/modules/ProjektyClient.tsx`,
`app/analytics/projekty/page.tsx`, `components/ui/Sidebar.tsx`

- [ ] **Krok 1: Test karty `components/modules/KartaProjektu.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { KartaProjektu } from '@/components/modules/KartaProjektu'
import type { KondycjaProjektu, Projekt } from '@/types'

function p(nadpisz: Partial<Projekt> = {}): Projekt {
  return {
    id: 'x', projekt: 'Gala', edycja: '2025/2026', obszar: 'Kultura',
    budzet_plan: 5000, budzet_wydany: 4500, przedluzenia: 0,
    aplikujacy: 30, uczestnicy: 20, partnerzy_fin: 2, partnerzy_barter: 1,
    problemy: '', created_at: '', ...nadpisz,
  }
}
const k = (nadpisz: Partial<KondycjaProjektu> = {}): KondycjaProjektu => ({
  projekt: p(), poprzednia: null, flagi: [], ...nadpisz,
})

describe('KartaProjektu', () => {
  it('projekt bez flag mówi o braku zastrzeżeń', () => {
    render(<KartaProjektu kondycja={k()} />)
    expect(screen.getByText(/bez zastrzeżeń/i)).toBeInTheDocument()
  })

  it('flaga alarmowa dostaje własny znacznik', () => {
    const { container } = render(
      <KartaProjektu kondycja={k({ flagi: [{ id: 'a', waga: 'alarm', tytul: 'Budżet przekroczony', detal: 'o 40%' }] })} />,
    )
    expect(container.querySelector('[data-waga="alarm"]')).not.toBeNull()
    expect(screen.getByText('o 40%')).toBeInTheDocument()
  })

  it('pierwsza edycja jest oznaczona, żeby cisza nie wyglądała na spokój', () => {
    render(<KartaProjektu kondycja={k({ poprzednia: null })} />)
    expect(screen.getByText(/brak danych z poprzedniej edycji/i)).toBeInTheDocument()
  })

  it('mając poprzednią edycję nie pokazuje tej adnotacji', () => {
    render(<KartaProjektu kondycja={k({ poprzednia: p({ edycja: '2024/2025' }) })} />)
    expect(screen.queryByText(/brak danych z poprzedniej edycji/i)).toBeNull()
  })

  it('pokazuje liczby, żeby nie trzeba było wchodzić w arkusz', () => {
    render(<KartaProjektu kondycja={k()} />)
    expect(screen.getByText(/20/)).toBeInTheDocument()
  })
})
```

- [ ] **Krok 2: Uruchom — ma paść**

Run: `npx vitest run components/modules/KartaProjektu.test.tsx`
Oczekiwane: FAIL — brak modułu

- [ ] **Krok 3: `components/modules/KartaProjektu.tsx`**

```tsx
'use client'
import { AlertTriangle, CircleAlert, Info } from 'lucide-react'
import type { Flaga, KondycjaProjektu } from '@/types'

const STYL: Record<Flaga['waga'], { klasa: string; Ikona: typeof Info; etykieta: string }> = {
  alarm: { klasa: 'text-deck-danger', Ikona: AlertTriangle, etykieta: 'ALARM' },
  uwaga: { klasa: 'text-deck-warn', Ikona: CircleAlert, etykieta: 'UWAGA' },
  info: { klasa: 'text-deck-muted', Ikona: Info, etykieta: 'INFO' },
}

const zl = (v: number) => `${Math.round(v).toLocaleString('pl-PL')} zł`

export function KartaProjektu({ kondycja }: { kondycja: KondycjaProjektu }) {
  const { projekt: p, poprzednia, flagi } = kondycja

  return (
    <div className="deck-row rounded-lg px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-deck-text">{p.projekt}</span>
          {p.obszar && <span className="text-[11px] text-deck-muted">{p.obszar}</span>}
        </div>
        <span className="text-[10px] uppercase tracking-[0.14em] text-deck-muted">{p.edycja}</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-deck-muted tabular-nums">
        <span>budżet <span className="text-deck-text">{zl(p.budzet_wydany)}</span> z {zl(p.budzet_plan)}</span>
        <span>uczestnicy <span className="text-deck-text">{p.uczestnicy}</span></span>
        <span>aplikacje <span className="text-deck-text">{p.aplikujacy}</span></span>
        <span>partnerzy <span className="text-deck-text">{p.partnerzy_fin}</span> fin. / {p.partnerzy_barter} barter</span>
      </div>

      {flagi.length ? (
        <ul className="mt-3 space-y-1.5">
          {flagi.map((f) => {
            const { klasa, Ikona, etykieta } = STYL[f.waga]
            return (
              <li key={f.id} data-waga={f.waga} className="flex items-start gap-2 text-[11px]">
                <Ikona size={13} className={`mt-px shrink-0 ${klasa}`} />
                <span className={`w-14 shrink-0 font-semibold tracking-wide ${klasa}`}>{etykieta}</span>
                <span className="text-deck-text">
                  {f.tytul}
                  <span className="text-deck-muted"> — {f.detal}</span>
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-3 text-[11px] text-deck-accent">Bez zastrzeżeń ✓</p>
      )}

      {!poprzednia && (
        <p className="mt-2 text-[10.5px] italic text-deck-muted/80">
          Brak danych z poprzedniej edycji — porównania milczą, bo nie ma z czym zestawiać.
        </p>
      )}
    </div>
  )
}
```

- [ ] **Krok 4: Uruchom — ma przejść**

Run: `npx vitest run components/modules/KartaProjektu.test.tsx`
Oczekiwane: PASS

- [ ] **Krok 5: `components/modules/ProjektyClient.tsx`**

```tsx
'use client'
import { useMemo, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { useProjekty } from '@/lib/useProjekty'
import { edycje as wszystkieEdycje, kondycjaEdycji } from '@/lib/projekty/flagi'
import { BentoCard } from '@/components/ui/BentoCard'
import { KpiTile } from '@/components/ui/KpiTile'
import { ModuleSkeleton } from '@/components/ui/ModuleSkeleton'
import { KartaProjektu } from '@/components/modules/KartaProjektu'

export default function ProjektyClient() {
  const { projekty, loading, blad } = useProjekty()
  const [wybrana, setWybrana] = useState<string | null>(null)

  const dostepne = useMemo(() => wszystkieEdycje(projekty), [projekty])
  const edycja = wybrana ?? dostepne[0] ?? ''
  const kondycje = useMemo(() => kondycjaEdycji(projekty, edycja), [projekty, edycja])

  if (loading) return <ModuleSkeleton />

  if (blad) {
    return (
      <BentoCard title="Kondycja projektów">
        <p className="text-[11px] text-deck-danger">{blad}</p>
      </BentoCard>
    )
  }

  if (!projekty.length) {
    return (
      <BentoCard title="Kondycja projektów">
        <p className="text-[11px] text-deck-muted">
          Brak danych o projektach. Dodaj pierwszy w module „Wpisz dane" → zakładka „Projekt".
        </p>
      </BentoCard>
    )
  }

  const zAlarmem = kondycje.filter((k) => k.flagi.some((f) => f.waga === 'alarm')).length
  const zUwaga = kondycje.filter((k) =>
    !k.flagi.some((f) => f.waga === 'alarm') && k.flagi.some((f) => f.waga === 'uwaga'),
  ).length
  const czyste = kondycje.length - zAlarmem - zUwaga

  return (
    <div className="space-y-4">
      <BentoCard span={4} className="deck-scan">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-deck-accent/30 bg-deck-accent/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-deck-accent">
              <ShieldAlert size={13} />
              Kondycja projektów
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-deck-text">Co się świeci i dlaczego.</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-deck-muted">
              Bez oceny liczbowej — każdy projekt dostaje konkretne zastrzeżenia z konkretnym powodem.
              Najgłośniejsze stoją na górze.
            </p>
          </div>
          <label className="text-[11px] text-deck-muted">
            <span className="mb-1 block">Edycja</span>
            <select
              value={edycja}
              onChange={(e) => setWybrana(e.target.value)}
              className="deck-input rounded-lg px-3 py-2 text-sm text-deck-text"
            >
              {dostepne.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </label>
        </div>
      </BentoCard>

      <div className="grid grid-cols-3 gap-3">
        <KpiTile label="Z alarmem" value={String(zAlarmem)} sub="wymagają decyzji" accent="violet" />
        <KpiTile label="Z uwagami" value={String(zUwaga)} sub="do obserwacji" />
        <KpiTile label="Bez zastrzeżeń" value={String(czyste)} sub="nic się nie świeci" accent="accent" />
      </div>

      <BentoCard title={`Projekty · ${edycja}`} sub={`${kondycje.length} pozycji, od najgłośniejszej`} span={4}>
        <div className="space-y-2">
          {kondycje.map((k) => (
            <KartaProjektu key={`${k.projekt.projekt}|${k.projekt.edycja}`} kondycja={k} />
          ))}
        </div>
      </BentoCard>
    </div>
  )
}
```

- [ ] **Krok 6: Strona `app/analytics/projekty/page.tsx`**

```tsx
import { Suspense } from 'react'
import ProjektyClient from '@/components/modules/ProjektyClient'
import { ModuleSkeleton } from '@/components/ui/ModuleSkeleton'

export default function Page() {
  return (
    <Suspense fallback={<ModuleSkeleton />}>
      <ProjektyClient />
    </Suspense>
  )
}
```

- [ ] **Krok 7: Pozycja w menu — `components/ui/Sidebar.tsx`**

Dopisz `FolderKanban` do importu z `lucide-react`, a do `NAV` po pozycji KPI:

```ts
  { href: '/analytics/projekty', label: 'Projekty', icon: FolderKanban },
```

- [ ] **Krok 8: Testy, typy, commit**

Run: `npx vitest run && npx tsc --noEmit`
Oczekiwane: czysto

```bash
git add components/modules/KartaProjektu.tsx components/modules/KartaProjektu.test.tsx components/modules/ProjektyClient.tsx app/analytics/projekty/ components/ui/Sidebar.tsx
git commit -m "feat(projekty): widok kondycji z flagami i przelacznikiem edycji"
```

---

## Zadanie 4: Wpisywanie danych

**Pliki:** `components/modules/WpisClient.tsx`

- [ ] **Krok 1: Dopisz zakładkę**

Rozszerz typ `Tab` o `'projekt'` i dopisz go do tablicy w przełączniku oraz do etykiet:

```tsx
type Tab = 'rekrutacja' | 'kohorta' | 'kpi' | 'rocznik' | 'projekt'
```

W tablicy przełącznika: `(['rekrutacja', 'kohorta', 'kpi', 'rocznik', 'projekt'] as Tab[])`
W etykietach dopisz gałąź: `: t === 'projekt' ? 'Projekt'`
W opisach: `{tab === 'projekt' && 'Kondycja projektu w jednej edycji. Wystarczy nazwa i edycja — resztę możesz uzupełnić później, a niewpisane pole po prostu nie zapali swojej flagi.'}`

- [ ] **Krok 2: Stan i zapis**

Dopisz import `useProjekty` i stan:

```tsx
  const { dodajProjekt } = useProjekty()
  const [proj, setProj] = useState({
    projekt: '', edycja: '', obszar: '',
    budzet_plan: '', budzet_wydany: '', przedluzenia: '',
    aplikujacy: '', uczestnicy: '', partnerzy_fin: '', partnerzy_barter: '',
    problemy: '',
  })

  const liczba = (v: string) => {
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : 0
  }

  const submitProjekt = () =>
    run(async () => {
      await dodajProjekt({
        projekt: proj.projekt.trim(),
        edycja: proj.edycja.trim() || latestOkres,
        obszar: proj.obszar.trim(),
        budzet_plan: liczba(proj.budzet_plan),
        budzet_wydany: liczba(proj.budzet_wydany),
        przedluzenia: liczba(proj.przedluzenia),
        aplikujacy: liczba(proj.aplikujacy),
        uczestnicy: liczba(proj.uczestnicy),
        partnerzy_fin: liczba(proj.partnerzy_fin),
        partnerzy_barter: liczba(proj.partnerzy_barter),
        problemy: proj.problemy.trim(),
      })
      // Edycja i obszar zostają — wpisując rocznik dodajesz projekty seriami.
      setProj({
        projekt: '', edycja: proj.edycja, obszar: proj.obszar,
        budzet_plan: '', budzet_wydany: '', przedluzenia: '',
        aplikujacy: '', uczestnicy: '', partnerzy_fin: '', partnerzy_barter: '',
        problemy: '',
      })
    }, `Projekt „${proj.projekt}" zapisany.`)
```

- [ ] **Krok 3: Formularz**

```tsx
      {tab === 'projekt' && (
        <BentoCard title="Kondycja projektu" sub="jeden projekt w jednej edycji">
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div><label className={labelCls}>Projekt</label><input className={inputCls} placeholder="np. Gala" value={proj.projekt} onChange={(e) => setProj((p) => ({ ...p, projekt: e.target.value }))} /></div>
              <div><label className={labelCls}>Edycja</label><input className={inputCls} placeholder={latestOkres} value={proj.edycja} onChange={(e) => setProj((p) => ({ ...p, edycja: e.target.value }))} /></div>
              <div><label className={labelCls}>Obszar</label><input className={inputCls} placeholder="np. Kultura" value={proj.obszar} onChange={(e) => setProj((p) => ({ ...p, obszar: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className={labelCls}>Budżet przyznany (zł)</label><input type="number" className={inputCls} value={proj.budzet_plan} onChange={(e) => setProj((p) => ({ ...p, budzet_plan: e.target.value }))} /></div>
              <div><label className={labelCls}>Budżet wydany (zł)</label><input type="number" className={inputCls} value={proj.budzet_wydany} onChange={(e) => setProj((p) => ({ ...p, budzet_wydany: e.target.value }))} /></div>
              <div><label className={labelCls}>Przedłużenia naboru</label><input type="number" className={inputCls} value={proj.przedluzenia} onChange={(e) => setProj((p) => ({ ...p, przedluzenia: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div><label className={labelCls}>Aplikujący</label><input type="number" className={inputCls} value={proj.aplikujacy} onChange={(e) => setProj((p) => ({ ...p, aplikujacy: e.target.value }))} /></div>
              <div><label className={labelCls}>Uczestnicy</label><input type="number" className={inputCls} value={proj.uczestnicy} onChange={(e) => setProj((p) => ({ ...p, uczestnicy: e.target.value }))} /></div>
              <div><label className={labelCls}>Partnerzy fin.</label><input type="number" className={inputCls} value={proj.partnerzy_fin} onChange={(e) => setProj((p) => ({ ...p, partnerzy_fin: e.target.value }))} /></div>
              <div><label className={labelCls}>Partnerzy barter.</label><input type="number" className={inputCls} value={proj.partnerzy_barter} onChange={(e) => setProj((p) => ({ ...p, partnerzy_barter: e.target.value }))} /></div>
            </div>
            <div>
              <label className={labelCls}>Problemy w tej edycji</label>
              <textarea rows={3} className={inputCls} placeholder="co poszło nie tak" value={proj.problemy} onChange={(e) => setProj((p) => ({ ...p, problemy: e.target.value }))} />
            </div>
            <button onClick={submitProjekt} disabled={busy || !proj.projekt.trim()} className={btnCls}>
              {busy ? 'Zapisywanie…' : 'Zapisz projekt'}
            </button>
          </div>
        </BentoCard>
      )}
```

- [ ] **Krok 4: Testy, typy, lint, build, commit**

Run: `npx tsc --noEmit && npx vitest run && npx next build`
Oczekiwane: trzy razy czysto

```bash
git add components/modules/WpisClient.tsx
git commit -m "feat(projekty): zakladka wpisywania kondycji projektu"
```

---

## Zadanie 5: Wdrożenie

- [ ] **Krok 1: README Apps Script**

Dopisz zakładkę `projekty` do tabeli zakładek i zdanie, że tworzy ją `setup()`
(pusta — te dane wpisuje się z aplikacji albo prosto w arkuszu).

- [ ] **Krok 2: Wypchnij**

```bash
git push origin main
```

- [ ] **Krok 3: Instrukcja dla użytkownika**

Zakładka `projekty` nie powstanie sama. Do wyboru:
- uruchomić `setup()` w Apps Script — utworzy **tylko brakujące** zakładki, istniejących nie rusza;
- albo założyć zakładkę ręcznie z nagłówkami dokładnie jak w `SCHEMAT.projekty`.

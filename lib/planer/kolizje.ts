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

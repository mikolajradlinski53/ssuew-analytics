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

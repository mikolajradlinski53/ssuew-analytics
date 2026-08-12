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

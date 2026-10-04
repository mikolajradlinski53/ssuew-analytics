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

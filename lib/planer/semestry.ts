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

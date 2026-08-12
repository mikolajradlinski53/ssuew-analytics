import type { Miesiac } from './typy'

export interface Termin {
  rok: number
  miesiac: number
  dzien: number
}

/**
 * Terminy co siedem dni, licząc od podanego.
 *
 * Liczymy prawdziwymi datami, nie dodawaniem siódemki do numeru dnia — inaczej
 * przejście przez koniec miesiąca albo roku dawałoby daty, których nie ma.
 * Ciąg urywa się, gdy kolejny termin wypada poza semestrem: powtarzanie ma
 * wypełnić semestr, a nie wyjść poza niego.
 */
export function terminyCoTydzien(start: Termin, miesiace: Miesiac[], ile: number): Termin[] {
  if (ile < 1) return []

  const wSemestrze = (t: Termin) => miesiace.some((m) => m.m === t.miesiac && m.y === t.rok)
  const terminy: Termin[] = []
  const data = new Date(start.rok, start.miesiac - 1, start.dzien)

  for (let i = 0; i < ile; i++) {
    const termin: Termin = {
      rok: data.getFullYear(),
      miesiac: data.getMonth() + 1,
      dzien: data.getDate(),
    }
    if (!wSemestrze(termin)) break
    terminy.push(termin)
    data.setDate(data.getDate() + 7)
  }

  return terminy
}

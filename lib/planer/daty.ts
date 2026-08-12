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

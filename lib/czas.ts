import type { Data } from '@/lib/planer/trwanie'

const STREFA = 'Europe/Warsaw'

/**
 * Dzisiejsza data w Warszawie. Serwer na Vercelu liczy w UTC - bez tego
 * między północą a 2:00 „dziś” w odprawie byłoby wczorajsze.
 */
export function dzisWarszawa(teraz: Date): Data {
  const [rok, miesiac, dzien] = new Intl.DateTimeFormat('en-CA', {
    timeZone: STREFA, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(teraz).split('-').map(Number)
  return { rok, miesiac, dzien }
}

export function godzinaWarszawa(teraz: Date): string {
  return new Intl.DateTimeFormat('pl-PL', { timeZone: STREFA, hour: '2-digit', minute: '2-digit' }).format(teraz)
}

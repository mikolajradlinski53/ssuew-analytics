import type { Rekrutacja, Kohorta, KpiMetric, Czlonek, KodDostepu } from '@/types'

/** Nazwy zakładek w arkuszu. Muszą się zgadzać z kluczami SCHEMAT w apps-script/Kod.gs. */
export const TABELE = ['rekrutacje', 'kohorty', 'kpi_punkty', 'czlonkowie', 'kody'] as const

export type Tabela = (typeof TABELE)[number]

/**
 * Przypisanie zakładki do typu domenowego — dzięki temu gasList('kpi_punkty')
 * zwraca KpiMetric[].
 *
 * Stara zakładka `kpi` (format szeroki, dwa okresy w jednym wierszu) celowo nie
 * jest tu wymieniona: została w arkuszu jako archiwum i nic jej już nie czyta.
 */
export interface TabelaTypy {
  rekrutacje: Rekrutacja
  kohorty: Kohorta
  kpi_punkty: KpiMetric
  czlonkowie: Czlonek
  kody: KodDostepu
}

export function jestTabela(nazwa: string): nazwa is Tabela {
  return (TABELE as readonly string[]).includes(nazwa)
}

import type { Rekrutacja, Kohorta, KpiMetric, Czlonek, KodDostepu } from '@/types'

/** Nazwy zakładek w arkuszu. Muszą się zgadzać z kluczami SCHEMAT w apps-script/Kod.gs. */
export const TABELE = ['rekrutacje', 'kohorty', 'kpi', 'czlonkowie', 'kody'] as const

export type Tabela = (typeof TABELE)[number]

/** Przypisanie zakładki do typu domenowego — dzięki temu gasList('kpi') zwraca KpiMetric[]. */
export interface TabelaTypy {
  rekrutacje: Rekrutacja
  kohorty: Kohorta
  kpi: KpiMetric
  czlonkowie: Czlonek
  kody: KodDostepu
}

export function jestTabela(nazwa: string): nazwa is Tabela {
  return (TABELE as readonly string[]).includes(nazwa)
}

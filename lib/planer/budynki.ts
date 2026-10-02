/**
 * Budynki UEW do wyboru przy wydarzeniu. Lista na stałe w kodzie — zmienia się
 * rzadziej niż raz na kadencję, a dodanie budynku to dopisanie jednego napisu.
 */
export const BUDYNKI = [
  'A', 'B', 'C', 'D', 'E', 'Z', 'P', 'CKU', 'SJO', 'B/L', 'B/J',
  'SWFiS', 'PRZEGUB', 'ŚLĘŻAK', 'SIMPLEX', 'W',
] as const

/** Miejsce spoza uczelni — wtedy pole sali przechowuje nazwę miejsca. */
export const POZA = 'POZA'

export function jestBudynkiem(kod: string): boolean {
  return kod === POZA || (BUDYNKI as readonly string[]).includes(kod)
}

export function etykietaBudynku(kod: string): string {
  return kod === POZA ? 'Poza uczelnią' : kod
}

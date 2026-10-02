/**
 * Budynki UEW do wyboru przy wydarzeniu. Lista na stałe w kodzie - zmienia się
 * rzadziej niż raz na kadencję, a dodanie budynku to dopisanie jednego napisu.
 */
export const BUDYNKI = [
  'A', 'B', 'C', 'D', 'E', 'Z', 'P', 'CKU', 'SJO', 'B/L', 'B/J',
  'SWFiS', 'PRZEGUB', 'ŚLĘŻAK', 'SIMPLEX', 'W',
] as const

/** Miejsce spoza uczelni - wtedy pole sali przechowuje nazwę miejsca. */
export const POZA = 'POZA'

interface MiejsceSpecjalne {
  kod: string
  etykieta: string
  /** Podpowiedź w polu, które przy budynku jest salą. */
  podpowiedz: string
  /** Jak opisać miejsce, gdy pole jest wypełnione. */
  zOpisem: (opis: string) => string
}

/**
 * Miejsca, które nie są salą w budynku. Pole „sala” przechowuje wtedy
 * doprecyzowanie: platformę, miasto, cel wyjazdu, miejsce na terenie UE.
 * Żadne z nich nie daje kolizji sali - to nie jest jedno pomieszczenie.
 */
export const MIEJSCA_SPECJALNE: MiejsceSpecjalne[] = [
  { kod: 'ONLINE', etykieta: 'Online', podpowiedz: 'np. Teams, Meet', zOpisem: (o) => `Online: ${o}` },
  { kod: 'UE', etykieta: 'UE - teren uczelni', podpowiedz: 'np. dziedziniec, hol', zOpisem: (o) => `UE: ${o}` },
  { kod: 'MIASTO', etykieta: 'Inne miasto', podpowiedz: 'nazwa miasta', zOpisem: (o) => o },
  { kod: 'WYJAZD', etykieta: 'Wyjazd', podpowiedz: 'dokąd', zOpisem: (o) => `Wyjazd: ${o}` },
  { kod: POZA, etykieta: 'Poza uczelnią', podpowiedz: 'nazwa miejsca', zOpisem: (o) => `Poza: ${o}` },
]

const SPECJALNE = new Map(MIEJSCA_SPECJALNE.map((m) => [m.kod, m]))

export function miejsceSpecjalne(kod: string | null): MiejsceSpecjalne | null {
  return kod ? SPECJALNE.get(kod) ?? null : null
}

export function jestMiejscemSpecjalnym(kod: string): boolean {
  return SPECJALNE.has(kod)
}

export function jestBudynkiem(kod: string): boolean {
  return SPECJALNE.has(kod) || (BUDYNKI as readonly string[]).includes(kod)
}

export function etykietaBudynku(kod: string): string {
  return SPECJALNE.get(kod)?.etykieta ?? kod
}

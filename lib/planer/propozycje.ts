import type { NoweWydarzenie, Wydarzenie } from './typy'

interface Wspolne {
  id: string
  autor: string
  /** Milisekundy — Firestore zapisuje `Date.now()`, tak jak przy wydarzeniach. */
  utworzone: number
}

export interface Przeniesienie extends Wspolne {
  rodzaj: 'przeniesienie'
  wydarzenieId: string
  zDnia: number
  naDzien: number
  /** Kopia, nie odnośnik: skrzynka ma coś pokazać także wtedy, gdy wydarzenie zniknęło. */
  tytulWydarzenia: string
}

export interface Nowe extends Wspolne {
  rodzaj: 'nowe'
  wydarzenie: NoweWydarzenie
}

export type Propozycja = Przeniesienie | Nowe

export interface StanPropozycji {
  mozna: boolean
  ostrzezenie: string | null
}

/**
 * Czy propozycję da się jeszcze przyjąć i czy coś się w międzyczasie zmieniło.
 *
 * Przesunięcie wydarzenia przez kogoś innego NIE blokuje przyjęcia: propozycja
 * mówi, gdzie coś ma trafić, a nie skąd wychodzi. Blokuje dopiero zniknięcie
 * wydarzenia, bo nie ma czego przenosić.
 */
export function stanPropozycji(p: Propozycja, wydarzenia: Wydarzenie[]): StanPropozycji {
  if (p.rodzaj === 'nowe') return { mozna: true, ostrzezenie: null }

  const w = wydarzenia.find((x) => x.id === p.wydarzenieId)
  if (!w) {
    return { mozna: false, ostrzezenie: 'Tego wydarzenia już nie ma — propozycję można tylko odrzucić.' }
  }
  if (w.dzien !== p.zDnia) {
    return { mozna: true, ostrzezenie: `Ktoś już przesunął to wydarzenie na ${w.dzien}.` }
  }
  return { mozna: true, ostrzezenie: null }
}

export function opiszPropozycje(p: Propozycja): string {
  if (p.rodzaj === 'nowe') {
    return `Dodaj „${p.wydarzenie.tytul}" ${p.wydarzenie.dzien}.${p.wydarzenie.miesiac}`
  }
  return `Przenieś „${p.tytulWydarzenia}" z ${p.zDnia}. na ${p.naDzien}.`
}

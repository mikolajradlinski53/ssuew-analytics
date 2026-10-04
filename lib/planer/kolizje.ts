import { naMinuty } from './daty'
import { jestMiejscemSpecjalnym } from './budynki'
import { dniTrwaniaWMiesiacu, dniWydarzenia, poczatek, przesunDate, type Data } from './trwanie'
import type { Kategoria, Miesiac, Wydarzenie } from './typy'

/** Sam start bez końca: tyle minut uznajemy za zajęte. */
const PROG_MINUT = 90
const DOBA = 24 * 60

/** Kategorie, które nie zajmują ani osób, ani sal. */
const BEZ_KOLIZJI = new Set<Kategoria>(['APLIKACJE'])

export interface KolizjaOsoby {
  osoba: string
  ile: number
  /**
   * Twarda: godziny naprawdę się nakładają. Miękka: któreś wydarzenie nie ma
   * godziny, więc nie da się orzec - warto sprawdzić.
   */
  twarda: boolean
}

export interface KolizjaSali {
  /** Miejsce czytelne dla człowieka: „B/L 110L” albo sama sala ze starszych wpisów. */
  sala: string
  godziny: string[]
}

export interface KolizjeDnia {
  osoby: KolizjaOsoby[]
  sale: KolizjaSali[]
}

/** Zajęty kawałek jednego dnia, w minutach od północy: [od, do). */
interface Przedzial {
  data: Data
  od: number
  do: number
}

/**
 * Kiedy wydarzenie naprawdę zajmuje ludzi i sale, dzień po dniu. `null` znaczy
 * „godzina nieustalona” - wiadomo, który to dzień, ale nie kiedy.
 *
 * Koniec leży w ostatnim dniu wydarzenia; przy jednodniowym z końcem przed
 * startem (18:00-04:00) - następnego dnia. Dlatego impreza do 4:00 zajmuje
 * kolejny dzień tylko do 4:00, a nie cały.
 */
function przedzialy(w: Wydarzenie): Przedzial[] | null {
  const caleDni = () => dniWydarzenia(w).map((data) => ({ data, od: 0, do: DOBA }))
  if (w.calyDzien) return caleDni()

  const dni = Math.max(1, w.dni)
  const od = naMinuty(w.godzina)
  if (od === null) return dni > 1 ? caleDni() : null

  const doMinut = naMinuty(w.godzinaDo)
  let dzienKonca = dni - 1
  let koniec = DOBA
  if (doMinut !== null) {
    koniec = doMinut
    if (dni === 1 && doMinut <= od) dzienKonca = 1
  } else if (dni === 1) {
    koniec = Math.min(DOBA, od + PROG_MINUT)
  }

  const wynik: Przedzial[] = []
  for (let i = 0; i <= dzienKonca; i++) {
    const p = { data: przesunDate(poczatek(w), i), od: i === 0 ? od : 0, do: i === dzienKonca ? koniec : DOBA }
    if (p.do > p.od) wynik.push(p)
  }
  return wynik
}

/** Wpis dnia: zajęty przedział albo wydarzenie bez ustalonej godziny. */
interface Zajecie {
  w: Wydarzenie
  od: number | null
  do: number | null
}

const calaDoba = (z: Zajecie) => z.od === 0 && z.do === DOBA

/**
 * Czy dwa zajęcia na pewno się zderzają. Wydarzenie bez godziny zderza się
 * tylko z czymś, co trwa całą dobę - wtedy pora nie ma znaczenia.
 */
function nakladajaSie(a: Zajecie, b: Zajecie): boolean {
  if (a.w.id === b.w.id) return false
  if (a.od === null || a.do === null || b.od === null || b.do === null) return calaDoba(a) || calaDoba(b)
  return a.od < b.do && b.od < a.do
}

function ktorakolwiekPara<T>(lista: T[], warunek: (a: T, b: T) => boolean): boolean {
  for (let i = 0; i < lista.length; i++) {
    for (let j = i + 1; j < lista.length; j++) {
      if (warunek(lista[i], lista[j])) return true
    }
  }
  return false
}

/**
 * Miejsce jako klucz kolizji. Ten sam numer w dwóch budynkach to dwie sale;
 * online, wyjazd, inne miasto czy „poza uczelnią” to nie jedno pomieszczenie,
 * a sam budynek bez sali to za mało.
 */
function miejsce(w: Wydarzenie): string | null {
  if (!w.sala || (w.budynek && jestMiejscemSpecjalnym(w.budynek))) return null
  return w.budynek ? `${w.budynek} ${w.sala}` : w.sala
}

function grupuj<T>(elementy: T[], klucz: (e: T) => string[]): Map<string, T[]> {
  const mapa = new Map<string, T[]>()
  for (const e of elementy) {
    for (const k of klucz(e)) {
      const lista = mapa.get(k) ?? []
      lista.push(e)
      mapa.set(k, lista)
    }
  }
  return mapa
}

/**
 * Kolizje w rozbiciu na dni miesiąca `miesiac`. Kolizja to realne nałożenie
 * godzin - dwa spotkania tej samej osoby o różnych porach to zwykły dzień,
 * nie ostrzeżenie. Część nocy po północy liczy się w kolejnym dniu, także
 * gdy ten wypada w następnym miesiącu. Dzień bez kolizji nie ma wpisu.
 */
export function kolizjeWMiesiacu(wydarzenia: Wydarzenie[], miesiac: Miesiac): Map<number, KolizjeDnia> {
  const poDniach = new Map<number, Zajecie[]>()
  const dodaj = (dzien: number, z: Zajecie) => {
    const lista = poDniach.get(dzien) ?? []
    lista.push(z)
    poDniach.set(dzien, lista)
  }

  for (const w of wydarzenia) {
    // Aplikacje to termin naboru, nie spotkanie - nikogo nie zajmują i nie
    // stoją w żadnej sali. Liczone, zapalałyby ostrzeżenia przy każdym naborze.
    if (BEZ_KOLIZJI.has(w.kategoria)) continue
    const p = przedzialy(w)
    if (p === null) {
      for (const d of dniTrwaniaWMiesiacu(w, miesiac)) dodaj(d, { w, od: null, do: null })
      continue
    }
    for (const x of p) {
      if (x.data.rok === miesiac.y && x.data.miesiac === miesiac.m) dodaj(x.data.dzien, { w, od: x.od, do: x.do })
    }
  }

  const wynik = new Map<number, KolizjeDnia>()
  for (const [dzien, lista] of poDniach) {
    const osoby: KolizjaOsoby[] = []
    const sale: KolizjaSali[] = []

    // 'wszyscy' celowo pomijamy - inaczej każde zebranie zarządu kolidowałoby
    // z każdym wydarzeniem tego dnia i ostrzeżenia straciłyby sens.
    for (const [osoba, jej] of grupuj(lista, (z) => z.w.osoby.filter((o) => o !== 'wszyscy'))) {
      const ile = new Set(jej.map((z) => z.w.id)).size
      if (ile < 2) continue
      if (ktorakolwiekPara(jej, nakladajaSie)) osoby.push({ osoba, ile, twarda: true })
      else if (jej.some((z) => z.od === null)) osoby.push({ osoba, ile, twarda: false })
    }

    for (const [sala, wSali] of grupuj(lista, (z) => {
      const m = miejsce(z.w)
      return m ? [m] : []
    })) {
      // Bez godzin nie da się orzec konfliktu sali.
      const zGodzina = wSali.filter((z) => z.od !== null)
      if (!ktorakolwiekPara(zGodzina, nakladajaSie)) continue
      sale.push({ sala, godziny: [...new Set(zGodzina.map((z) => z.w.godzina ?? ''))].filter(Boolean) })
    }

    if (osoby.length || sale.length) wynik.set(dzien, { osoby, sale })
  }

  return wynik
}

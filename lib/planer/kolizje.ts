import { naMinuty } from './daty'
import { POZA } from './budynki'
import { dniTrwaniaWMiesiacu } from './trwanie'
import type { Miesiac, Wydarzenie } from './typy'

/** Bez godziny końca: starty bliżej niż tyle minut uznajemy za nachodzące. */
const PROG_MINUT = 90

export interface KolizjaOsoby {
  osoba: string
  ile: number
  /** Twarda: wydarzenia naprawdę zderzają się w czasie albo któreś zajmuje cały dzień. */
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

/** Osoba jest zajęta przez cały dzień. */
function zajmujeCalyDzien(w: Wydarzenie): boolean {
  return w.calyDzien || w.dni > 1
}

/**
 * Koniec liczony od północy dnia startu: 04:00 po 18:00 to 28:00. Część po
 * północy w kolejnym dniu kolizji nie liczymy — to rzadkie, a dzień startu
 * to ten, w którym ludzie faktycznie planują.
 */
function koniecWMinutach(od: number, doMinut: number | null): number | null {
  if (doMinut === null) return null
  return doMinut < od ? doMinut + 24 * 60 : doMinut
}

/**
 * Czy dwa wydarzenia z godziną zderzają się w czasie. Gdy oba mają koniec —
 * nakładanie się przedziałów (stykające się końcem nie kolidują). Gdy któremuś
 * brakuje końca — dotychczasowa reguła: starty bliżej niż 90 minut.
 */
export function kolidujaWCzasie(a: Wydarzenie, b: Wydarzenie): boolean {
  const aOd = naMinuty(a.godzina)
  const bOd = naMinuty(b.godzina)
  if (aOd === null || bOd === null) return false
  const aDo = koniecWMinutach(aOd, naMinuty(a.godzinaDo))
  const bDo = koniecWMinutach(bOd, naMinuty(b.godzinaDo))
  if (aDo !== null && bDo !== null) return aOd < bDo && bOd < aDo
  return Math.abs(aOd - bOd) < PROG_MINUT
}

function ktorakolwiekPara(lista: Wydarzenie[], warunek: (a: Wydarzenie, b: Wydarzenie) => boolean): boolean {
  for (let i = 0; i < lista.length; i++) {
    for (let j = i + 1; j < lista.length; j++) {
      if (warunek(lista[i], lista[j])) return true
    }
  }
  return false
}

/**
 * Miejsce jako klucz kolizji. Ten sam numer w dwóch budynkach to dwie sale;
 * „Poza uczelnią” to nie jedno miejsce, a sam budynek bez sali to za mało.
 */
function miejsce(w: Wydarzenie): string | null {
  if (!w.sala || w.budynek === POZA) return null
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
 * Kolizje w rozbiciu na dni miesiąca `miesiac`. Wydarzenie wielodniowe liczy się
 * w każdym dniu, w którym trwa — także gdy wystartowało w poprzednim miesiącu.
 * Dzień bez kolizji nie ma wpisu.
 */
export function kolizjeWMiesiacu(wydarzenia: Wydarzenie[], miesiac: Miesiac): Map<number, KolizjeDnia> {
  const poDniach = new Map<number, Wydarzenie[]>()
  for (const w of wydarzenia) {
    for (const d of dniTrwaniaWMiesiacu(w, miesiac)) {
      const lista = poDniach.get(d) ?? []
      lista.push(w)
      poDniach.set(d, lista)
    }
  }

  const wynik = new Map<number, KolizjeDnia>()
  for (const [dzien, lista] of poDniach) {
    const osoby: KolizjaOsoby[] = []
    const sale: KolizjaSali[] = []

    // 'wszyscy' celowo pomijamy — inaczej każde zebranie zarządu kolidowałoby
    // z każdym wydarzeniem tego dnia i ostrzeżenia straciłyby sens.
    for (const [osoba, jej] of grupuj(lista, (e) => e.osoby.filter((o) => o !== 'wszyscy'))) {
      if (jej.length < 2) continue
      const twarda = jej.some(zajmujeCalyDzien) || ktorakolwiekPara(jej, kolidujaWCzasie)
      osoby.push({ osoba, ile: jej.length, twarda })
    }

    for (const [sala, wSali] of grupuj(lista, (e) => {
      const m = miejsce(e)
      return m ? [m] : []
    })) {
      // Bez godzin nie da się orzec konfliktu sali.
      const zGodzina = wSali.filter((e) => e.godzina)
      if (zGodzina.length < 2) continue
      if (!ktorakolwiekPara(zGodzina, kolidujaWCzasie)) continue
      sale.push({ sala, godziny: zGodzina.map((e) => e.godzina as string) })
    }

    if (osoby.length || sale.length) wynik.set(dzien, { osoby, sale })
  }

  return wynik
}

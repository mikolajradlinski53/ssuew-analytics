import { dzienTygodnia } from '@/lib/planer/daty'
import { opisCzasu, opisMiejsca, opisOsob, porownajWydarzenia } from '@/lib/planer/opis'
import { dniMiedzy, koniec, poczatek, porownajDaty, przesunDate, type Data } from '@/lib/planer/trwanie'
import type { Wydarzenie } from '@/lib/planer/typy'
import type { Rola } from '@/lib/auth/role'

export interface Fakt {
  etykieta: string
  tresc: string
  szczegol?: string
  link: string
}

/** 1 propozycja, 2-4 propozycje, 5+ propozycji (z wyjątkiem 12-14). */
function odmiana(n: number, [jeden, kilka, wiele]: [string, string, string]): string {
  if (n === 1) return `1 ${jeden}`
  const r = n % 10
  const s = n % 100
  return `${n} ${r >= 2 && r <= 4 && (s < 12 || s > 14) ? kilka : wiele}`
}

/**
 * Fakty bez AI: to, co zarząd widzi zawsze, a właściciel wtedy, gdy asystent
 * nie ma odprawy. Pusta lista znaczy „nic pilnego”. Trwającej sesji tu nie ma -
 * pilnuje jej osobny baner kokpitu, widoczny dla wszystkich.
 */
export function faktyKokpitu(w: {
  rola: Rola
  wydarzenia: Wydarzenie[]
  propozycje: number
  alerty: { tytul: string }[]
  dzis: Data
}): Fakt[] {
  const fakty: Fakt[] = []

  const jutro = przesunDate(w.dzis, 1)
  const najblizsze = w.wydarzenia
    .filter((x) => {
      const p = poczatek(x)
      return porownajDaty(p, w.dzis) === 0 || porownajDaty(p, jutro) === 0
    })
    .sort((a, b) => porownajDaty(poczatek(a), poczatek(b)) || porownajWydarzenia(a, b))[0]
  if (najblizsze) {
    const kiedy = porownajDaty(poczatek(najblizsze), w.dzis) === 0 ? 'Dziś' : 'Jutro'
    const czas = opisCzasu(najblizsze)
    fakty.push({
      etykieta: czas ? `${kiedy} ${czas}` : kiedy,
      tresc: najblizsze.tytul,
      szczegol: [opisMiejsca(najblizsze), opisOsob(najblizsze.osoby)].filter(Boolean).join(' · ') || undefined,
      link: '/planer',
    })
  }

  if (w.rola === 'owner' && w.propozycje > 0) {
    fakty.push({
      etykieta: 'Do decyzji',
      tresc: odmiana(w.propozycje, ['propozycja', 'propozycje', 'propozycji']),
      szczegol: 'od zarządu',
      link: '/planer',
    })
  }

  if (w.alerty.length) {
    fakty.push({
      etykieta: 'Analytics',
      tresc: odmiana(w.alerty.length, ['alert', 'alerty', 'alertów']),
      szczegol: w.alerty[0].tytul,
      link: '/analytics/alerty',
    })
  }

  return fakty
}

export interface NajblizszeWydarzenie {
  id: string
  /** „dziś 18:00”, „jutro”, „wt 17:00”, „12.10” albo „trwa”. */
  kiedy: string
  tytul: string
}

const SKROT_DNIA: Record<string, string> = {
  poniedziałek: 'pon', wtorek: 'wt', środa: 'śr', czwartek: 'czw', piątek: 'pt', sobota: 'sob', niedziela: 'nd',
}

/** Kilka najbliższych wydarzeń na kafelek Sesji Operacyjnej. Minione pomija. */
export function najblizszeWydarzenia(wydarzenia: Wydarzenie[], dzis: Data, ile: number): NajblizszeWydarzenie[] {
  return wydarzenia
    .filter((x) => porownajDaty(koniec(x), dzis) >= 0)
    .sort((a, b) => porownajDaty(poczatek(a), poczatek(b)) || porownajWydarzenia(a, b))
    .slice(0, ile)
    .map((x) => {
      const p = poczatek(x)
      const za = dniMiedzy(dzis, p) - 1
      let kiedy: string
      if (za < 0) kiedy = 'trwa'
      else if (za === 0) kiedy = 'dziś'
      else if (za === 1) kiedy = 'jutro'
      else if (za < 7) kiedy = SKROT_DNIA[dzienTygodnia(p.rok, p.miesiac, p.dzien)]
      else kiedy = `${String(p.dzien).padStart(2, '0')}.${String(p.miesiac).padStart(2, '0')}`
      if (za >= 0 && x.godzina && !x.calyDzien) kiedy += ` ${x.godzina}`
      return { id: x.id, kiedy, tytul: x.tytul }
    })
}

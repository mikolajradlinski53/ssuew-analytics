import { dzienTygodnia } from './daty'
import { etykietaBudynku } from './budynki'
import { opisCzasu, opisMiejsca, opisOsob, porownajWydarzenia } from './opis'
import { tygodnieMiesiaca } from './pasy'
import { dniMiedzy, dniTrwaniaWMiesiacu, koniec, poczatek, porownajDaty, type Data } from './trwanie'
import { KATEGORIE, numerRangi, type Miesiac, type Wydarzenie } from './typy'

export interface LiniaKomorki {
  tekst: string
  /** Kolor do druku z `KATEGORIE[…].druk`, „#rrggbb”. */
  kolor: string
  pogrubiona: boolean
}

export interface KomorkaKalendarza {
  dzien: number | null
  linie: LiniaKomorki[]
}

export interface Eksport {
  nazwaPliku: string
  tytul: string
  kalendarz: KomorkaKalendarza[][]
  naglowkiListy: string[]
  lista: (string | number)[][]
}

export const NAGLOWKI_KALENDARZA = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd']
export const NAGLOWKI_LISTY = [
  'Data', 'Dzień tygodnia', 'Do dnia', 'Od', 'Do', 'Ranga', 'Kategoria', 'Nazwa', 'Budynek', 'Sala', 'Osoby',
]

const KOLKA = ['①', '②', '③', '④']
const NAZWY_MIESIECY = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
]

const dwie = (n: number) => String(n).padStart(2, '0')
const naTekst = (d: Data) => `${dwie(d.dzien)}.${dwie(d.miesiac)}.${d.rok}`

function linia(w: Wydarzenie, dzien: Data): LiniaKomorki {
  const s = KATEGORIE[w.kategoria]
  const n = numerRangi(w.kategoria)
  const czesci = [
    [opisCzasu(w), w.tytul].filter(Boolean).join(' '),
    opisMiejsca(w),
    opisOsob(w.osoby),
  ].filter(Boolean)
  const ktoryDzien = w.dni > 1 ? ` (${dniMiedzy(poczatek(w), dzien)}/${w.dni})` : ''
  return {
    tekst: `${n !== null ? KOLKA[n - 1] : '•'} ${czesci.join(' · ')}${ktoryDzien}`,
    kolor: s.druk,
    pogrubiona: s.ranga === 1,
  }
}

/**
 * Zawartość pliku miesiąca bez zależności od biblioteki arkuszy - dzięki temu
 * da się ją przetestować na zwykłych danych. Zawsze CAŁY miesiąc, niezależnie
 * od filtrów: plik wysłany dalej nie może być po cichu niepełny.
 */
export function budujEksport(wydarzenia: Wydarzenie[], m: Miesiac): Eksport {
  const wMiesiacu = wydarzenia
    .filter((w) => dniTrwaniaWMiesiacu(w, m).length > 0)
    .sort(porownajWydarzenia)

  const kalendarz = tygodnieMiesiaca(m).map((tydzien) =>
    tydzien.map((dzien): KomorkaKalendarza => {
      if (dzien === null) return { dzien: null, linie: [] }
      const data = { rok: m.y, miesiac: m.m, dzien }
      const tegoDnia = wMiesiacu.filter((w) => dniTrwaniaWMiesiacu(w, m).includes(dzien))
      return { dzien, linie: tegoDnia.map((w) => linia(w, data)) }
    }),
  )

  const lista = [...wMiesiacu]
    .sort((a, b) => porownajDaty(poczatek(a), poczatek(b)) || porownajWydarzenia(a, b))
    .map((w) => {
      const s = KATEGORIE[w.kategoria]
      const od = poczatek(w)
      return [
        naTekst(od),
        dzienTygodnia(od.rok, od.miesiac, od.dzien),
        w.dni > 1 ? naTekst(koniec(w)) : '',
        w.calyDzien ? 'cały dzień' : w.godzina ?? '',
        w.calyDzien ? '' : w.godzinaDo ?? '',
        s.ranga,
        s.etykieta,
        w.tytul,
        w.budynek ? etykietaBudynku(w.budynek) : '',
        w.sala ?? '',
        opisOsob(w.osoby) ?? '',
      ]
    })

  return {
    nazwaPliku: `planer-${m.y}-${dwie(m.m)}.xlsx`,
    tytul: `${NAZWY_MIESIECY[m.m - 1]} ${m.y}`,
    kalendarz,
    naglowkiListy: NAGLOWKI_LISTY,
    lista,
  }
}

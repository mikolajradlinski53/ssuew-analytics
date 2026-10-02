import { opisMiejsca, porownajWydarzenia } from './opis'
import { dniWydarzenia, poczatek, porownajDaty } from './trwanie'
import type { Miesiac, Wydarzenie } from './typy'

/**
 * Surowy eksport zaznaczonych wydarzeń do systemu rezerwacji sal (CRA):
 * temat, data, godziny, sala — nic więcej. Arkusz „ładny” to osobny eksport
 * .xlsx; ten ma się dać wkleić albo zaimportować bez obróbki.
 */
export const NAGLOWKI_CRA = ['Temat', 'Data', 'Od', 'Do', 'Sala']

const dwie = (n: number) => String(n).padStart(2, '0')

/** Średnik, cudzysłów albo nowa linia w polu wymagają cytowania (RFC 4180). */
function pole(x: string): string {
  return /[;"\r\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x
}

/** Jeden wiersz na każdy dzień wydarzenia — sala rezerwuje się na konkretny dzień. */
export function wierszeCra(wydarzenia: Wydarzenie[]): string[][] {
  return [...wydarzenia]
    .sort((a, b) => porownajDaty(poczatek(a), poczatek(b)) || porownajWydarzenia(a, b))
    .flatMap((w) =>
      dniWydarzenia(w).map((d) => [
        w.tytul,
        `${dwie(d.dzien)}.${dwie(d.miesiac)}.${d.rok}`,
        w.calyDzien ? '' : w.godzina ?? '',
        w.calyDzien ? '' : w.godzinaDo ?? '',
        opisMiejsca(w) ?? '',
      ]),
    )
}

/**
 * Średnik zamiast przecinka i BOM na początku: polski Excel otwiera wtedy
 * plik od razu w kolumnach i z poprawnymi polskimi znakami.
 */
export function csvCra(wydarzenia: Wydarzenie[]): string {
  return '﻿' + [NAGLOWKI_CRA, ...wierszeCra(wydarzenia)].map((r) => r.map(pole).join(';')).join('\r\n') + '\r\n'
}

export function nazwaPlikuCra(m: Miesiac): string {
  return `cra-${m.y}-${dwie(m.m)}.csv`
}

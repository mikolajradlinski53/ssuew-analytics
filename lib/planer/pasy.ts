import { dniWMiesiacu, pierwszyDzienTygodnia } from './daty'
import { dniTrwaniaWMiesiacu, koniec, poczatek, porownajDaty } from './trwanie'
import type { Miesiac, Wydarzenie } from './typy'

/** Siedem kolumn Pn-Nd; `null` to dzień spoza miesiąca. */
export type Tydzien = (number | null)[]

export function tygodnieMiesiaca(m: Miesiac): Tydzien[] {
  const komorki: (number | null)[] = [
    ...Array<null>(pierwszyDzienTygodnia(m.y, m.m)).fill(null),
    ...Array.from({ length: dniWMiesiacu(m.y, m.m) }, (_, i) => i + 1),
  ]
  while (komorki.length % 7) komorki.push(null)
  const tygodnie: Tydzien[] = []
  for (let i = 0; i < komorki.length; i += 7) tygodnie.push(komorki.slice(i, i + 7))
  return tygodnie
}

/** Kawałek wydarzenia wielodniowego w jednym tygodniu. */
export interface Odcinek {
  wydarzenie: Wydarzenie
  kolOd: number
  kolDo: number
  /** Wydarzenie zaczęło się przed tym odcinkiem - w poprzednim tygodniu albo miesiącu. */
  ciagnieSieZLewej: boolean
  /** Wydarzenie trwa dalej za tym odcinkiem. */
  ciagnieSieWPrawo: boolean
  /** Numer poziomego pasa nad kratkami; nachodzące wydarzenia dostają różne. */
  pas: number
}

export function odcinkiTygodnia(tydzien: Tydzien, m: Miesiac, wielodniowe: Wydarzenie[]): Odcinek[] {
  const odcinki: Omit<Odcinek, 'pas'>[] = []

  for (const w of wielodniowe) {
    const dni = new Set(dniTrwaniaWMiesiacu(w, m))
    const kolumny = tydzien.flatMap((d, i) => (d !== null && dni.has(d) ? [i] : []))
    if (!kolumny.length) continue
    const kolOd = kolumny[0]
    const kolDo = kolumny[kolumny.length - 1]
    const dataOd = { rok: m.y, miesiac: m.m, dzien: tydzien[kolOd] as number }
    const dataDo = { rok: m.y, miesiac: m.m, dzien: tydzien[kolDo] as number }
    odcinki.push({
      wydarzenie: w,
      kolOd,
      kolDo,
      ciagnieSieZLewej: porownajDaty(poczatek(w), dataOd) < 0,
      ciagnieSieWPrawo: porownajDaty(koniec(w), dataDo) > 0,
    })
  }

  // Od lewej, a przy wspólnym starcie dłuższe najpierw - krótsze wypełniają
  // wtedy luki w niższych pasach zamiast otwierać nowe.
  odcinki.sort((a, b) => a.kolOd - b.kolOd || (b.kolDo - b.kolOd) - (a.kolDo - a.kolOd))

  const koncePasow: number[] = []
  return odcinki.map((o) => {
    let pas = koncePasow.findIndex((k) => k < o.kolOd)
    if (pas === -1) {
      pas = koncePasow.length
      koncePasow.push(o.kolDo)
    } else {
      koncePasow[pas] = o.kolDo
    }
    return { ...o, pas }
  })
}

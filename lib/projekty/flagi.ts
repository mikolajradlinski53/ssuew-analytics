import type { Flaga, KondycjaProjektu, Projekt } from '@/types'
import { porownajOkresy } from '@/lib/kpi/serie'

/**
 * Wszystkie progi w jednym miejscu. Zmiana surowości modułu to zmiana liczby
 * tutaj, a nie polowanie po warunkach.
 */
export const PROGI = {
  /** Poniżej tej części planu budżet uznajemy za nieruszony. */
  budzetNiewykorzystany: 0.6,
  /** Poniżej tej części zeszłorocznej wartości mówimy o spadku. */
  spadek: 0.8,
  /** Od tylu przedłużeń nabór uznajemy za problem. */
  przedluzenia: 2,
} as const

const zl = (v: number) => `${Math.round(v).toLocaleString('pl-PL')} zł`
const proc = (czesc: number, calosc: number) => Math.round((czesc / calosc) * 100)

/**
 * Zastrzeżenia wobec projektu. `poprzednia` to ten sam projekt rok wcześniej;
 * `null` znaczy pierwszą edycję — wtedy flagi porównawcze **milczą**, bo brak
 * porównania to „nie wiem", a nie „bez zastrzeżeń".
 *
 * Każda flaga niesie liczby w `detal`, nie samą etykietę. Bez tego i tak
 * trzeba by lecieć do arkusza sprawdzić, o ile właściwie chodzi.
 */
export function flagiProjektu(b: Projekt, poprzednia: Projekt | null): Flaga[] {
  const f: Flaga[] = []

  // ─ Budżet
  if (b.budzet_plan > 0 && b.budzet_wydany > b.budzet_plan) {
    f.push({
      id: 'budzet-przekroczony', waga: 'alarm', tytul: 'Budżet przekroczony',
      detal: `o ${proc(b.budzet_wydany, b.budzet_plan) - 100}% (${zl(b.budzet_wydany)} z ${zl(b.budzet_plan)})`,
    })
  } else if (b.budzet_plan === 0 && b.budzet_wydany > 0) {
    // Procentu nie ma jak policzyc, ale wydatek bez przyznanych pieniedzy
    // jest powazniejszy niz przekroczenie, nie lzejszy.
    f.push({
      id: 'budzet-bez-planu', waga: 'alarm', tytul: 'Wydatek bez przyznanego budżetu',
      detal: `${zl(b.budzet_wydany)} przy planie 0 zł`,
    })
  } else if (b.budzet_plan > 0 && b.budzet_wydany < PROGI.budzetNiewykorzystany * b.budzet_plan) {
    f.push({
      id: 'budzet-niewykorzystany', waga: 'uwaga', tytul: 'Budżet ledwo ruszony',
      detal: `wykorzystane ${proc(b.budzet_wydany, b.budzet_plan)}% (${zl(b.budzet_wydany)} z ${zl(b.budzet_plan)})`,
    })
  }

  // ─ Nabór
  if (b.przedluzenia >= PROGI.przedluzenia) {
    f.push({
      id: 'nabor-przedluzany', waga: 'uwaga', tytul: 'Nabór przedłużany',
      detal: `${b.przedluzenia} razy`,
    })
  }
  // Obie liczby muszą być wypełnione — przy pustych polach nie ma o czym mówić.
  if (b.uczestnicy > 0 && b.aplikujacy > 0 && b.aplikujacy <= b.uczestnicy) {
    f.push({
      id: 'nabor-ledwo-obsadzony', waga: 'uwaga', tytul: 'Nabór bez nadwyżki chętnych',
      detal: `${b.aplikujacy} chętnych na ${b.uczestnicy} uczestników`,
    })
  }

  // ─ Partnerzy
  if (b.partnerzy_fin === 0) {
    f.push({
      id: 'bez-partnera-fin', waga: 'uwaga', tytul: 'Bez partnera finansowego',
      detal: b.partnerzy_barter > 0 ? `${b.partnerzy_barter} barterowych` : 'żadnych partnerów',
    })
  }

  // ─ Porównanie z poprzednią edycją
  if (poprzednia) {
    if (poprzednia.aplikujacy > 0 && b.aplikujacy < PROGI.spadek * poprzednia.aplikujacy) {
      f.push({
        id: 'mniej-chetnych', waga: 'uwaga', tytul: 'Mniej chętnych niż rok temu',
        detal: `${b.aplikujacy} vs ${poprzednia.aplikujacy} w ${poprzednia.edycja}`,
      })
    }
    if (poprzednia.uczestnicy > 0 && b.uczestnicy < PROGI.spadek * poprzednia.uczestnicy) {
      f.push({
        id: 'mniej-uczestnikow', waga: 'uwaga', tytul: 'Mniej uczestników niż rok temu',
        detal: `${b.uczestnicy} vs ${poprzednia.uczestnicy} w ${poprzednia.edycja}`,
      })
    }
  }

  // ─ Opis własny
  const problemy = (b.problemy ?? '').trim()
  if (problemy) {
    f.push({ id: 'problemy', waga: 'info', tytul: 'Opisane problemy', detal: problemy })
  }

  return f
}

/** Unikalne edycje, od najnowszej. */
export function edycje(wszystkie: Projekt[]): string[] {
  return [...new Set(wszystkie.map((p) => p.edycja))].sort((a, b) => porownajOkresy(b, a))
}

function policz(flagi: Flaga[], waga: Flaga['waga']): number {
  return flagi.filter((f) => f.waga === waga).length
}

/**
 * Projekty danej edycji, ustawione od najgłośniejszego. To nie jest ranking
 * rentowności — tylko kolejność „ile się świeci", żeby przy kilkunastu
 * projektach nie trzeba było przewijać w poszukiwaniu kłopotów.
 */
export function kondycjaEdycji(wszystkie: Projekt[], edycja: string): KondycjaProjektu[] {
  return wszystkie
    .filter((p) => p.edycja === edycja)
    .map((projekt) => {
      // Najblizsza wczesniejsza edycja, nie najstarsza — projekt moze mieć
      // dziure w historii, a porownanie z rokiem 2022 nic by nie powiedzialo.
      const wczesniejsze = wszystkie
        .filter((x) => x.projekt === projekt.projekt && porownajOkresy(x.edycja, edycja) < 0)
        .sort((a, b) => porownajOkresy(a.edycja, b.edycja))
      const poprzednia = wczesniejsze.length ? wczesniejsze[wczesniejsze.length - 1] : null
      return { projekt, poprzednia, flagi: flagiProjektu(projekt, poprzednia) }
    })
    .sort((a, b) =>
      policz(b.flagi, 'alarm') - policz(a.flagi, 'alarm')
      || policz(b.flagi, 'uwaga') - policz(a.flagi, 'uwaga')
      || a.projekt.projekt.localeCompare(b.projekt.projekt, 'pl'),
    )
}

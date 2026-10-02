import { semestrRef, ustawieniaRef, wydarzeniaRef } from '@/lib/firebase/admin'
import { naWydarzenie } from './mapowanie'
import { naSklad, naStanSesji, type StanSesjiWspolnej } from './stan'
import type { Wydarzenie } from './typy'

/** Wszystko, czego Planer potrzebuje na start - dla osób bez konta Firebase. */
export interface ObrazPlanera {
  wydarzenia: Wydarzenie[]
  sesja: StanSesjiWspolnej
  sklad: string[]
}

/**
 * Odczyt przez Admin SDK omija reguły Firestore. Wołać wyłącznie po sprawdzeniu,
 * kto pyta (trasa API, strona serwerowa).
 */
export async function stanSesji(semestrId: string): Promise<StanSesjiWspolnej> {
  const zrzut = await semestrRef(semestrId).get()
  return naStanSesji(zrzut.data())
}

export async function obrazPlanera(semestrId: string): Promise<ObrazPlanera> {
  const [wydarzenia, sesja, sklad] = await Promise.all([
    wydarzeniaRef(semestrId).get().then((z) => z.docs.map((d) => naWydarzenie(d.id, d.data()))),
    stanSesji(semestrId),
    ustawieniaRef('sklad').get().then((z) => naSklad(z.data())),
  ])
  return { wydarzenia, sesja, sklad }
}

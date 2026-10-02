import { createHash } from 'node:crypto'
import type { KontekstProjektu } from './kontekst'
import type { ZapisanaOdprawa } from './odprawa'

export const GODZINA_MS = 60 * 60 * 1000

/** Ślad danych bez daty - sam upływ czasu w ciągu dnia nie unieważnia odprawy. */
export function sladKontekstu(k: KontekstProjektu): string {
  const { meta: _meta, ...reszta } = k
  return createHash('sha256').update(JSON.stringify(reszta)).digest('hex')
}

/**
 * Nowa odprawa najwyżej raz na godzinę, i tylko gdy zmieniły się dane albo
 * dzień. Darmowy poziom Gemini ma limity - nie pytamy o to samo dwa razy.
 */
export function czyOdswiezyc(zapisana: ZapisanaOdprawa | null, slad: string, dzien: string, teraz: number): boolean {
  if (!zapisana) return true
  if (teraz - zapisana.utworzono < GODZINA_MS) return false
  return zapisana.slad !== slad || zapisana.dzien !== dzien
}

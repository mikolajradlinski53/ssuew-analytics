import type { KodDostepu } from '@/types'
import { nowyIdentyfikatorUrzadzenia } from './session'

export type WynikKodu =
  | { ok: true; kod: KodDostepu; urzadzenie: string; pierwszeUzycie: boolean }
  | { ok: false; powod: 'nieznany' | 'nieaktywny' | 'inne-urzadzenie' }

/** Kod wpisuje człowiek, więc wielkość liter i spacje po bokach nie mogą mieć znaczenia. */
export function normalizujKod(wpisany: string): string {
  return wpisany.trim().toUpperCase()
}

/**
 * Decyduje, czy wpisany kod otwiera drzwi. Czysta funkcja — cała rozmowa
 * z arkuszem dzieje się w trasie, dzięki czemu tę logikę da się przetestować
 * bez sieci.
 *
 * Kod wiąże się z przeglądarką przy pierwszym użyciu i od tej pory tylko ona
 * nim wejdzie. Adresu IP celowo nie sprawdzamy: sieci komórkowe zmieniają go
 * przy każdym połączeniu, więc blokada po IP wyrzucałaby ludzi bez powodu.
 */
export function rozpatrzKod(
  kody: KodDostepu[],
  wpisany: string,
  urzadzenieZCiasteczka: string | null,
): WynikKodu {
  const szukany = normalizujKod(wpisany)
  if (!szukany) return { ok: false, powod: 'nieznany' }

  const kod = kody.find((k) => normalizujKod(k.kod) === szukany)
  if (!kod) return { ok: false, powod: 'nieznany' }
  if (!kod.aktywny) return { ok: false, powod: 'nieaktywny' }

  if (!kod.urzadzenie) {
    return { ok: true, kod, urzadzenie: nowyIdentyfikatorUrzadzenia(), pierwszeUzycie: true }
  }

  if (kod.urzadzenie !== urzadzenieZCiasteczka) {
    return { ok: false, powod: 'inne-urzadzenie' }
  }

  return { ok: true, kod, urzadzenie: kod.urzadzenie, pierwszeUzycie: false }
}

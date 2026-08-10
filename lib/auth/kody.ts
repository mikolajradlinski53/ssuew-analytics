import type { KodDostepu } from '@/types'
import { nowyIdentyfikatorUrzadzenia } from './session'

export type WynikKodu =
  | { ok: true; kod: KodDostepu; urzadzenie: string; pierwszeUzycie: boolean }
  | { ok: false; powod: 'nieznany' | 'nieaktywny' | 'inne-urzadzenie' }

export const DLUGOSC_KODU = 6

/**
 * Kod to sześć cyfr. Zostawiamy same cyfry, bo w arkuszu ktoś może wpisać
 * `123 456` albo `123-456`, a na ekranie i tak wchodzi cyfra po cyfrze.
 */
export function normalizujKod(wpisany: string): string {
  return wpisany.replace(/\D/g, '')
}

/**
 * Losuje kod z generatora kryptograficznego — `Math.random()` bywa przewidywalny.
 *
 * Pierwsza cyfra nigdy nie jest zerem, i to nie dla urody: Arkusze traktują
 * `048291` jako liczbę i zapisują `48291`, przez co kod przestałby pasować,
 * a przyczyna byłaby nie do odgadnięcia.
 */
export function losujKod(): string {
  const bajty = new Uint8Array(DLUGOSC_KODU)
  crypto.getRandomValues(bajty)
  const cyfry = Array.from(bajty, (b) => b % 10)
  cyfry[0] = (bajty[0] % 9) + 1
  return cyfry.join('')
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

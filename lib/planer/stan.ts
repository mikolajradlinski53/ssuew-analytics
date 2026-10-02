/**
 * Czyste mapowania stanu, które czytają OBIE strony — przeglądarka
 * (subskrypcje) i serwer (`/api/planer`, strony). Plik celowo bez
 * `'use client'`, z tego samego powodu co `mapowanie.ts`.
 */

export interface StanSesjiWspolnej {
  wlaczony: boolean
  od: number | null
  przez: string | null
}

export const SESJA_WYLACZONA: StanSesjiWspolnej = { wlaczony: false, od: null, przez: null }

/** Brak dokumentu semestru to normalny stan przed pierwszym włączeniem sesji. */
export function naStanSesji(d: Record<string, unknown> | undefined): StanSesjiWspolnej {
  return {
    wlaczony: d?.trybWspolny === true,
    od: typeof d?.trybWspolnyOd === 'number' ? d.trybWspolnyOd : null,
    przez: typeof d?.trybWspolnyPrzez === 'string' ? d.trybWspolnyPrzez : null,
  }
}

export function naSklad(d: Record<string, unknown> | undefined): string[] {
  const osoby = d?.osoby
  if (!Array.isArray(osoby)) return []
  return osoby.filter((o): o is string => typeof o === 'string' && o.trim() !== '')
}

/**
 * Zwraca TĘ SAMĄ tablicę, gdy nie ma czego dodać — wywołujący poznaje po
 * tożsamości, że osoba już była. „wszyscy” jest zarezerwowane: oznacza cały
 * zarząd i jest pomijane przy kolizjach.
 */
export function dodajDoSkladu(sklad: string[], osoba: string): string[] {
  const nowa = osoba.trim()
  if (!nowa || nowa.toLowerCase() === 'wszyscy') return sklad
  if (sklad.some((o) => o.toLowerCase() === nowa.toLowerCase())) return sklad
  return [...sklad, nowa]
}

export function usunZeSkladu(sklad: string[], osoba: string): string[] {
  return sklad.filter((o) => o !== osoba)
}

/** Czas trwania sesji. Sesję wyłącza się ręcznie, więc to jedyne, co czyni zapomnienie widocznym. */
export function opiszTrwanie(od: number, teraz: number): string {
  const minuty = Math.max(0, Math.floor((teraz - od) / 60_000))
  const h = Math.floor(minuty / 60)
  const m = minuty % 60
  return h > 0 ? `${h} h ${m} min` : `${m} min`
}

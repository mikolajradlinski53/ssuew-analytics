'use client'
import type { NoweWydarzenie } from './typy'

async function wyslij(dane: Record<string, unknown>): Promise<void> {
  const res = await fetch('/api/planer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dane),
  })
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: null }))
    throw new Error(error ?? 'Nie udało się zapisać')
  }
}

export function zglosPrzeniesienie(
  semestr: string,
  wydarzenieId: string,
  zDnia: number,
  naDzien: number,
  tytulWydarzenia: string,
): Promise<void> {
  return wyslij({ semestr, akcja: 'propozycja-przeniesienia', wydarzenieId, zDnia, naDzien, tytulWydarzenia })
}

export function zglosNowe(semestr: string, wydarzenie: NoweWydarzenie): Promise<void> {
  return wyslij({ semestr, akcja: 'propozycja-nowego', wydarzenie })
}

/** Działa tylko przy włączonej Sesji Operacyjnej — o tym rozstrzyga serwer. */
export function przeniesPrzezSerwer(semestr: string, wydarzenieId: string, naDzien: number): Promise<void> {
  return wyslij({ semestr, akcja: 'przenies', wydarzenieId, naDzien })
}

export function zglosKomentarz(semestr: string, wydarzenieId: string, tresc: string): Promise<void> {
  return wyslij({ semestr, akcja: 'komentarz', wydarzenieId, tresc })
}

/** Znak życia. `uid` i etykietę serwer bierze z biletu — tu ich nie wysyłamy. */
export function zglosObecnosc(semestr: string, patrzyNa: string | null): Promise<void> {
  return wyslij({ semestr, akcja: 'obecnosc', patrzyNa })
}

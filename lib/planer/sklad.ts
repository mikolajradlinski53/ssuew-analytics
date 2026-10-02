'use client'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { baza } from '@/lib/firebase/firestore'
import { naSklad } from './stan'

function skladDoc() {
  return doc(baza(), 'ustawienia', 'sklad')
}

/** Czytają wszyscy z dostępem, pisze właściciel - tak mówią reguły `ustawienia`. */
export function subskrybujSklad(
  gdyZmiana: (osoby: string[]) => void,
  gdyBlad: (b: Error) => void,
): () => void {
  return onSnapshot(skladDoc(), (zrzut) => gdyZmiana(naSklad(zrzut.data())), gdyBlad)
}

export async function zapiszSklad(osoby: string[]): Promise<void> {
  await setDoc(skladDoc(), { osoby, zmienione: Date.now() })
}

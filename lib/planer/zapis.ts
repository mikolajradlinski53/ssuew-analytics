'use client'
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc,
} from 'firebase/firestore'
import { baza } from '@/lib/firebase/firestore'
import { naWydarzenie } from './mapowanie'
import type { Wydarzenie } from './typy'

function sciezka(semestrId: string) {
  return collection(baza(), 'semestry', semestrId, 'wydarzenia')
}

/**
 * Subskrypcja na żywo. Obejmuje wyłącznie jeden semestr — bez tego każde wejście
 * czytałoby całą historię i koszt rósłby z każdą kadencją.
 * Zwraca funkcję odpinającą.
 */
export function subskrybujWydarzenia(
  semestrId: string,
  gdyZmiana: (wydarzenia: Wydarzenie[]) => void,
  gdyBlad: (blad: Error) => void,
): () => void {
  return onSnapshot(
    sciezka(semestrId),
    (zrzut) => gdyZmiana(zrzut.docs.map((d) => naWydarzenie(d.id, d.data()))),
    gdyBlad,
  )
}

export type NoweWydarzenie = Omit<Wydarzenie, 'id'>

export async function dodajWydarzenie(semestrId: string, dane: NoweWydarzenie): Promise<void> {
  await addDoc(sciezka(semestrId), { ...dane, zmienione: Date.now() })
}

export async function zmienWydarzenie(
  semestrId: string,
  id: string,
  zmiany: Partial<NoweWydarzenie>,
): Promise<void> {
  await updateDoc(doc(sciezka(semestrId), id), { ...zmiany, zmienione: Date.now() })
}

export async function usunWydarzenie(semestrId: string, id: string): Promise<void> {
  await deleteDoc(doc(sciezka(semestrId), id))
}

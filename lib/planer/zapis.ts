'use client'
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc, writeBatch,
} from 'firebase/firestore'
import { baza } from '@/lib/firebase/firestore'
import { naWydarzenie } from './mapowanie'
import type { NoweWydarzenie, Wydarzenie } from './typy'
import type { Propozycja } from './propozycje'

// Reeksport, zeby nie ruszac miejsc, ktore importuja ten typ stad.
export type { NoweWydarzenie }

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

/* ─── Propozycje i Sesja Operacyjna ─────────────────────────── */

function propozycje(semestrId: string) {
  return collection(baza(), 'semestry', semestrId, 'propozycje')
}

function semestrDoc(semestrId: string) {
  return doc(baza(), 'semestry', semestrId)
}

export function subskrybujPropozycje(
  semestrId: string,
  gdyZmiana: (p: Propozycja[]) => void,
  gdyBlad: (b: Error) => void,
): () => void {
  return onSnapshot(
    propozycje(semestrId),
    (zrzut) => gdyZmiana(zrzut.docs.map((d) => ({ id: d.id, ...d.data() }) as Propozycja)),
    gdyBlad,
  )
}

export interface StanSesjiWspolnej {
  wlaczony: boolean
  od: number | null
  przez: string | null
}

export function subskrybujTrybWspolny(
  semestrId: string,
  gdyZmiana: (s: StanSesjiWspolnej) => void,
): () => void {
  return onSnapshot(semestrDoc(semestrId), (zrzut) => {
    const d = zrzut.data()
    gdyZmiana({
      wlaczony: d?.trybWspolny === true,
      od: typeof d?.trybWspolnyOd === 'number' ? d.trybWspolnyOd : null,
      przez: typeof d?.trybWspolnyPrzez === 'string' ? d.trybWspolnyPrzez : null,
    })
  })
}

/** `setDoc` z `merge`, bo dokument semestru mógł jeszcze nie powstać — w 3a go nie tworzyliśmy. */
export async function ustawTrybWspolny(semestrId: string, wlaczony: boolean, przez: string): Promise<void> {
  await setDoc(
    semestrDoc(semestrId),
    { trybWspolny: wlaczony, trybWspolnyOd: wlaczony ? Date.now() : null, trybWspolnyPrzez: przez },
    { merge: true },
  )
}

/**
 * Przyjęcie propozycji: nanosi zmianę i kasuje propozycję JEDNYM zapisem.
 * Rozdzielenie tych dwóch kroków groziłoby propozycją zaakceptowaną i wciąż
 * wiszącą w skrzynce — przyjąłbyś ją wtedy drugi raz.
 */
export async function przyjmijPropozycje(semestrId: string, p: Propozycja): Promise<void> {
  const partia = writeBatch(baza())

  if (p.rodzaj === 'przeniesienie') {
    partia.update(doc(sciezka(semestrId), p.wydarzenieId), { dzien: p.naDzien, zmienione: Date.now() })
  } else {
    partia.set(doc(sciezka(semestrId)), { ...p.wydarzenie, zmienione: Date.now() })
  }

  partia.delete(doc(propozycje(semestrId), p.id))
  await partia.commit()
}

export async function odrzucPropozycje(semestrId: string, id: string): Promise<void> {
  await deleteDoc(doc(propozycje(semestrId), id))
}

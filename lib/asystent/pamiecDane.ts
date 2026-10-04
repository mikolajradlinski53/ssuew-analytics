import type { DocumentData } from 'firebase-admin/firestore'
import { notatkiRef, rozmowyRef } from '@/lib/firebase/admin'
import type { Notatka, Rozmowa, SkrotRozmowy, WiadomoscRozmowy, ZrodloNotatki } from './pamiec'

const naWiadomosci = (x: unknown): WiadomoscRozmowy[] =>
  Array.isArray(x)
    ? x
        .filter((w) => (w?.rola === 'ja' || w?.rola === 'deck') && typeof w?.tresc === 'string')
        .map((w) => ({ rola: w.rola, tresc: w.tresc, kiedy: Number(w.kiedy) || 0 }))
    : []

export async function listaRozmow(ile = 30): Promise<SkrotRozmowy[]> {
  const z = await rozmowyRef().orderBy('zmieniono', 'desc').limit(ile).select('tytul', 'zmieniono').get()
  return z.docs.map((d) => ({ id: d.id, tytul: String(d.get('tytul') ?? ''), zmieniono: Number(d.get('zmieniono')) || 0 }))
}

export async function czytajRozmowe(id: string): Promise<Rozmowa | null> {
  const d = await rozmowyRef().doc(id).get()
  const x = d.data()
  if (!x) return null
  return {
    id: d.id,
    tytul: String(x.tytul ?? ''),
    utworzono: Number(x.utworzono) || 0,
    zmieniono: Number(x.zmieniono) || 0,
    wiadomosci: naWiadomosci(x.wiadomosci),
  }
}

/** Zapisuje całą rozmowę; bez `id` zakłada nową. Zwraca identyfikator. */
export async function zapiszRozmowe(r: Omit<Rozmowa, 'id'>, id?: string): Promise<string> {
  if (id) {
    await rozmowyRef().doc(id).set(r)
    return id
  }
  return (await rozmowyRef().add(r)).id
}

export async function usunRozmowe(id: string): Promise<void> {
  await rozmowyRef().doc(id).delete()
}

/** Koniec kadencji: wszystkie rozmowy, partiami po 400 (limit partii Firestore to 500). */
export async function usunWszystkieRozmowy(): Promise<number> {
  let razem = 0
  for (;;) {
    const z = await rozmowyRef().limit(400).get()
    if (z.empty) return razem
    const partia = rozmowyRef().firestore.batch()
    z.docs.forEach((d) => partia.delete(d.ref))
    await partia.commit()
    razem += z.size
  }
}

const naNotatke = (id: string, x: DocumentData): Notatka => ({
  id,
  tresc: String(x.tresc ?? ''),
  utworzono: Number(x.utworzono) || 0,
  zrodlo: x.zrodlo === 'rozmowa' ? 'rozmowa' : 'reczna',
})

export async function listaNotatek(): Promise<Notatka[]> {
  const z = await notatkiRef().orderBy('utworzono', 'desc').get()
  return z.docs.map((d) => naNotatke(d.id, d.data()))
}

export async function liczbaNotatek(): Promise<number> {
  return (await notatkiRef().count().get()).data().count
}

export async function dodajNotatke(tresc: string, zrodlo: ZrodloNotatki): Promise<Notatka> {
  const dane = { tresc, zrodlo, utworzono: Date.now() }
  const ref = await notatkiRef().add(dane)
  return { id: ref.id, ...dane }
}

/** `false`, gdy notatki nie ma. */
export async function zmienNotatke(id: string, tresc: string): Promise<boolean> {
  const ref = notatkiRef().doc(id)
  if (!(await ref.get()).exists) return false
  await ref.update({ tresc })
  return true
}

export async function usunNotatke(id: string): Promise<void> {
  await notatkiRef().doc(id).delete()
}

/** Treści do obrazu projektu - od najstarszej, żeby ślad odprawy był stały. */
export async function tresciNotatek(): Promise<string[]> {
  return (await listaNotatek()).sort((a, b) => a.utworzono - b.utworzono).map((n) => n.tresc)
}

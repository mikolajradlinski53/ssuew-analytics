import { jestKategoria, type Wydarzenie } from './typy'

/**
 * Dokument Firestore na typ domenowy.
 *
 * Plik celowo NIE ma dyrektywy `'use client'`: mapowania potrzebują dwie strony
 * — przeglądarka przez `zapis.ts` i serwer przez `/api/planer`. Oznaczone jako
 * klienckie, nie dałoby się go zaimportować w funkcji serwerowej, a wraz z nim
 * wciągnęłoby tam cały kliencki pakiet Firebase.
 *
 * Braki uzupełniamy zamiast rzucać wyjątkiem: wiersz może być dopisany ręcznie
 * w konsoli albo pochodzić ze starszej wersji aplikacji, a jedno niekompletne
 * wydarzenie nie może wysadzić całego kalendarza.
 */
export function naWydarzenie(id: string, dane: Record<string, unknown>): Wydarzenie {
  const kategoria = typeof dane.kategoria === 'string' && jestKategoria(dane.kategoria)
    ? dane.kategoria
    : 'INNE'
  return {
    id,
    tytul: typeof dane.tytul === 'string' ? dane.tytul : '',
    kategoria,
    rok: Number(dane.rok) || 0,
    miesiac: Number(dane.miesiac) || 0,
    dzien: Number(dane.dzien) || 0,
    godzina: typeof dane.godzina === 'string' && dane.godzina ? dane.godzina : null,
    sala: typeof dane.sala === 'string' && dane.sala ? dane.sala : null,
    osoby: Array.isArray(dane.osoby) ? dane.osoby.map(String) : [],
  }
}

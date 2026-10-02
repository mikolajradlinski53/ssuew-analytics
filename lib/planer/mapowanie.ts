import { jestBudynkiem } from './budynki'
import { POLA_DOMYSLNE, jestKategoria, type Kategoria, type Wydarzenie } from './typy'

/** Kategorie z wcześniejszych wersji Planera i ich obecne odpowiedniki. */
const DAWNE_KATEGORIE = new Map<string, Kategoria>([['ZEBRANIA/INNE', 'ZEBRANIA']])

function kategoria(x: unknown): Kategoria {
  if (typeof x !== 'string') return 'INNE'
  // Najpierw jawne tłumaczenie: ogólne „nieznana → INNE” wrzuciłoby dawne
  // zebrania do najmniej ważnej kategorii.
  return DAWNE_KATEGORIE.get(x) ?? (jestKategoria(x) ? x : 'INNE')
}

const tekstLubNull = (x: unknown): string | null => (typeof x === 'string' && x ? x : null)

/**
 * Dokument Firestore na typ domenowy.
 *
 * Plik celowo NIE ma dyrektywy `'use client'`: mapowania potrzebują dwie strony
 * — przeglądarka przez `zapis.ts` i serwer przez `/api/planer`.
 *
 * Braki uzupełniamy zamiast rzucać wyjątkiem: wiersz może być dopisany ręcznie
 * w konsoli albo pochodzić ze starszej wersji aplikacji (sprzed wielodniowych,
 * godziny końca i budynków), a jedno niekompletne wydarzenie nie może wysadzić
 * całego kalendarza.
 */
export function naWydarzenie(id: string, dane: Record<string, unknown>): Wydarzenie {
  const dni = Number(dane.dni)
  return {
    id,
    tytul: typeof dane.tytul === 'string' ? dane.tytul : '',
    kategoria: kategoria(dane.kategoria),
    rok: Number(dane.rok) || 0,
    miesiac: Number(dane.miesiac) || 0,
    dzien: Number(dane.dzien) || 0,
    dni: Number.isInteger(dni) && dni >= 1 ? dni : POLA_DOMYSLNE.dni,
    calyDzien: dane.calyDzien === true,
    godzina: tekstLubNull(dane.godzina),
    godzinaDo: tekstLubNull(dane.godzinaDo),
    budynek: typeof dane.budynek === 'string' && jestBudynkiem(dane.budynek) ? dane.budynek : null,
    sala: tekstLubNull(dane.sala),
    osoby: Array.isArray(dane.osoby) ? dane.osoby.map(String) : [],
  }
}

import { dniWMiesiacu } from './daty'
import { jestBudynkiem } from './budynki'
import { jestKategoria, type NoweWydarzenie } from './typy'

export type WynikSprawdzenia =
  | { ok: true; wydarzenie: NoweWydarzenie }
  | { ok: false; blad: string }

const GODZINA = /^([01]\d|2[0-3]):[0-5]\d$/
const MAX_DNI = 60
const MAX_OSOB = 30

const blad = (tekst: string): WynikSprawdzenia => ({ ok: false, blad: tekst })

/** `undefined` znaczy: wartość jest, ale błędna. `null` - brak godziny. */
function godzina(x: unknown): string | null | undefined {
  if (x === null || x === undefined || x === '') return null
  return typeof x === 'string' && GODZINA.test(x) ? x : undefined
}

function calkowita(x: unknown, od: number, doWartosci: number): number | null {
  return typeof x === 'number' && Number.isInteger(x) && x >= od && x <= doWartosci ? x : null
}

/**
 * Jedno sprawdzenie dla formularza i serwera. Zwraca znormalizowaną kopię:
 * serwer zapisuje wyłącznie te pola, nigdy treść żądania wprost.
 */
export function sprawdzWydarzenie(x: unknown): WynikSprawdzenia {
  if (typeof x !== 'object' || x === null) return blad('Brak danych wydarzenia')
  const d = x as Record<string, unknown>

  const tytul = typeof d.tytul === 'string' ? d.tytul.trim() : ''
  if (!tytul) return blad('Wpisz tytuł')
  if (tytul.length > 200) return blad('Tytuł jest za długi (do 200 znaków)')

  const kategoria = d.kategoria
  if (typeof kategoria !== 'string' || !jestKategoria(kategoria)) return blad('Nieznana kategoria')

  const rok = calkowita(d.rok, 2000, 2100)
  const miesiac = calkowita(d.miesiac, 1, 12)
  if (rok === null || miesiac === null) return blad('Niepoprawna data')
  const dzien = calkowita(d.dzien, 1, dniWMiesiacu(rok, miesiac))
  if (dzien === null) return blad('Niepoprawny dzień miesiąca')

  const dni = d.dni === undefined ? 1 : calkowita(d.dni, 1, MAX_DNI)
  if (dni === null) return blad(`Wydarzenie może trwać od 1 do ${MAX_DNI} dni`)

  const calyDzien = d.calyDzien === true
  const od = godzina(d.godzina)
  const doGodziny = godzina(d.godzinaDo)
  if (od === undefined || doGodziny === undefined) return blad('Godzina w formacie GG:MM')
  if (!calyDzien && doGodziny !== null && od === null) return blad('Podaj godzinę „od”, zanim podasz „do”')
  // „do” wcześniejsze niż „od” to koniec następnego dnia (impreza 18:00-04:00).
  // Błędem jest tylko ta sama godzina - nie wiadomo, czy to zero, czy doba.
  if (!calyDzien && od !== null && od === doGodziny) {
    return blad('Godzina „do” nie może być taka sama jak „od”')
  }

  const budynekWejscie = d.budynek
  const budynek =
    budynekWejscie === null || budynekWejscie === undefined || budynekWejscie === ''
      ? null
      : typeof budynekWejscie === 'string' && jestBudynkiem(budynekWejscie)
        ? budynekWejscie
        : undefined
  if (budynek === undefined) return blad('Nieznany budynek')

  const sala = typeof d.sala === 'string' && d.sala.trim() ? d.sala.trim().slice(0, 80) : null

  if (d.osoby !== undefined && !Array.isArray(d.osoby)) return blad('Osoby muszą być listą')
  const osoby = ((d.osoby as unknown[] | undefined) ?? [])
    .filter((o): o is string => typeof o === 'string')
    .map((o) => o.trim().slice(0, 50))
    .filter(Boolean)
    .slice(0, MAX_OSOB)

  return {
    ok: true,
    wydarzenie: {
      tytul, kategoria, rok, miesiac, dzien, dni, calyDzien,
      godzina: calyDzien ? null : od,
      godzinaDo: calyDzien ? null : doGodziny,
      budynek, sala, osoby,
    },
  }
}

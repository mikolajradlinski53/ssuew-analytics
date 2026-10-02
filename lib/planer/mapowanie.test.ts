import { describe, it, expect } from 'vitest'
import { naWydarzenie } from '@/lib/planer/mapowanie'

describe('naWydarzenie', () => {
  it('składa wydarzenie z dokumentu Firestore', () => {
    const w = naWydarzenie('abc', {
      tytul: 'ZEBRANIE ZARZĄDU', kategoria: 'ZEBRANIA',
      rok: 2026, miesiac: 10, dzien: 7, dni: 2, calyDzien: false,
      godzina: '18:00', godzinaDo: '20:00', budynek: 'B/L', sala: '110L', osoby: ['Jula'],
    })
    expect(w).toEqual({
      id: 'abc', tytul: 'ZEBRANIE ZARZĄDU', kategoria: 'ZEBRANIA',
      rok: 2026, miesiac: 10, dzien: 7, dni: 2, calyDzien: false,
      godzina: '18:00', godzinaDo: '20:00', budynek: 'B/L', sala: '110L', osoby: ['Jula'],
    })
  })

  it('stary dokument bez nowych pól dostaje wartości domyślne', () => {
    // Dokumenty zapisane przed Sesjami Operacyjnymi nie mają dni, godziny
    // końca ani budynku. Bez migracji - tłumaczymy przy odczycie.
    const w = naWydarzenie('x', { tytul: 'Coś', kategoria: 'SSUEW', rok: 2026, miesiac: 10, dzien: 1, sala: '9J' })
    expect(w).toMatchObject({ dni: 1, calyDzien: false, godzinaDo: null, budynek: null, sala: '9J' })
  })

  it('dawne „Zeb./inne” trafia do Zebrań, nie do Innych', () => {
    expect(naWydarzenie('x', { kategoria: 'ZEBRANIA/INNE' }).kategoria).toBe('ZEBRANIA')
  })

  it('nieznana kategoria to INNE', () => {
    expect(naWydarzenie('x', { kategoria: 'WYCIECZKA' }).kategoria).toBe('INNE')
    expect(naWydarzenie('x', { kategoria: 'toString' }).kategoria).toBe('INNE')
  })

  it('nieznany budynek i błędna liczba dni wracają do wartości bezpiecznych', () => {
    const w = naWydarzenie('x', { budynek: 'X', dni: 0 })
    expect(w.budynek).toBeNull()
    expect(w.dni).toBe(1)
  })

  it('puste napisy zamienia na null', () => {
    const w = naWydarzenie('x', { godzina: '', godzinaDo: '', sala: '' })
    expect(w.godzina).toBeNull()
    expect(w.godzinaDo).toBeNull()
    expect(w.sala).toBeNull()
  })
})

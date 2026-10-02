import { describe, it, expect } from 'vitest'
import { sprawdzWydarzenie } from '@/lib/planer/walidacja'

const dobre = {
  tytul: 'Zebranie Zarządu', kategoria: 'ZEBRANIA', rok: 2026, miesiac: 10, dzien: 7,
  dni: 1, calyDzien: false, godzina: '18:00', godzinaDo: '20:00',
  budynek: 'B/L', sala: '110L', osoby: ['Jula'],
}

function blad(x: unknown): string {
  const w = sprawdzWydarzenie(x)
  if (w.ok) throw new Error('miało być odrzucone')
  return w.blad
}

describe('sprawdzWydarzenie', () => {
  it('przyjmuje poprawne wydarzenie', () => {
    const w = sprawdzWydarzenie(dobre)
    expect(w.ok).toBe(true)
  })

  it('zwraca wyłącznie znane pola — reszta treści żądania nie trafia do bazy', () => {
    const w = sprawdzWydarzenie({ ...dobre, id: 'podrobione', zmienione: 1, admin: true })
    expect(w.ok && Object.keys(w.wydarzenie).sort()).toEqual([
      'budynek', 'calyDzien', 'dni', 'dzien', 'godzina', 'godzinaDo',
      'kategoria', 'miesiac', 'osoby', 'rok', 'sala', 'tytul',
    ])
  })

  it('braki nowych pól uzupełnia jak przy starym dokumencie', () => {
    const { dni: _d, calyDzien: _c, godzinaDo: _g, budynek: _b, ...stare } = dobre
    const w = sprawdzWydarzenie(stare)
    expect(w.ok && w.wydarzenie).toMatchObject({ dni: 1, calyDzien: false, godzinaDo: null, budynek: null })
  })

  it('przycina tytuł, salę i osoby', () => {
    const w = sprawdzWydarzenie({ ...dobre, tytul: '  SKS  ', sala: ' 110L ', osoby: [' Jula ', '', 'Kuba'] })
    expect(w.ok && w.wydarzenie).toMatchObject({ tytul: 'SKS', sala: '110L', osoby: ['Jula', 'Kuba'] })
  })

  it('cały dzień czyści godziny', () => {
    const w = sprawdzWydarzenie({ ...dobre, calyDzien: true })
    expect(w.ok && w.wydarzenie).toMatchObject({ calyDzien: true, godzina: null, godzinaDo: null })
  })

  it('odrzuca błędne dane z opisem', () => {
    expect(blad({ ...dobre, tytul: '   ' })).toMatch(/tytuł/i)
    expect(blad({ ...dobre, kategoria: 'ZEBRANIA/INNE' })).toMatch(/kategori/i)
    expect(blad({ ...dobre, miesiac: 11, dzien: 31 })).toMatch(/dzień/i)
    expect(blad({ ...dobre, dni: 0 })).toMatch(/dni/i)
    expect(blad({ ...dobre, dni: 61 })).toMatch(/dni/i)
    expect(blad({ ...dobre, godzina: '25:00' })).toMatch(/GG:MM/)
    expect(blad({ ...dobre, godzinaDo: '17:00' })).toMatch(/po godzinie „od”/)
    expect(blad({ ...dobre, godzina: null })).toMatch(/„od”/)
    expect(blad({ ...dobre, budynek: 'X' })).toMatch(/budynek/i)
    expect(blad({ ...dobre, osoby: 'Jula' })).toMatch(/listą/)
    expect(blad(null)).toMatch(/brak/i)
  })

  it('„Poza uczelnią” jest poprawnym budynkiem', () => {
    expect(sprawdzWydarzenie({ ...dobre, budynek: 'POZA', sala: 'Pralnia' }).ok).toBe(true)
  })
})

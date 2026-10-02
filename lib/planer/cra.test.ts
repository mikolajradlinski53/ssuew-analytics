import { describe, it, expect } from 'vitest'
import { csvCra, nazwaPlikuCra, wierszeCra } from '@/lib/planer/cra'
import { POLA_DOMYSLNE, type Wydarzenie } from '@/lib/planer/typy'

function w(nadpisz: Partial<Wydarzenie>): Wydarzenie {
  return {
    id: 'x', tytul: 'A', kategoria: 'INNE', rok: 2026, miesiac: 10, dzien: 7,
    godzina: null, sala: null, osoby: [], ...POLA_DOMYSLNE, ...nadpisz,
  }
}

describe('eksport do CRA', () => {
  it('wiersz to temat, data, od, do, sala', () => {
    expect(wierszeCra([w({ tytul: 'SKS', godzina: '19:00', godzinaDo: '21:00', budynek: 'B/L', sala: '110L' })]))
      .toEqual([['SKS', '07.10.2026', '19:00', '21:00', 'B/L 110L']])
  })

  it('wydarzenie wielodniowe to wiersz na każdy dzień - sala rezerwuje się na dzień', () => {
    const wiersze = wierszeCra([w({ tytul: 'Wyjazd', dzien: 31, dni: 2, calyDzien: true })])
    expect(wiersze.map((r) => r[1])).toEqual(['31.10.2026', '01.11.2026'])
    expect(wiersze[0].slice(2, 4)).toEqual(['', ''])
  })

  it('sortuje po dacie', () => {
    const wiersze = wierszeCra([w({ tytul: 'Później', dzien: 9 }), w({ tytul: 'Wcześniej', dzien: 2 })])
    expect(wiersze.map((r) => r[0])).toEqual(['Wcześniej', 'Później'])
  })

  it('plik ma BOM, nagłówek, średniki i cytuje pola ze średnikiem', () => {
    const csv = csvCra([w({ tytul: 'Gala; finał', godzina: '18:00', budynek: 'CKU' })])
    expect(csv.startsWith('﻿Temat;Data;Od;Do;Sala\r\n')).toBe(true)
    expect(csv).toContain('"Gala; finał";07.10.2026;18:00;;CKU\r\n')
  })

  it('nazwa pliku z rokiem i miesiącem', () => {
    expect(nazwaPlikuCra({ m: 3, y: 2027 })).toBe('cra-2027-03.csv')
  })
})

import { describe, it, expect } from 'vitest'
import { budujEksport } from '@/lib/planer/eksport'
import { POLA_DOMYSLNE, type Wydarzenie } from '@/lib/planer/typy'

const PAZ = { m: 10, y: 2026 }

function w(nadpisz: Partial<Wydarzenie>): Wydarzenie {
  return {
    id: 'x', tytul: 'A', kategoria: 'INNE', rok: 2026, miesiac: 10, dzien: 7,
    godzina: null, sala: null, osoby: [], ...POLA_DOMYSLNE, ...nadpisz,
  }
}

const zebranie = w({
  id: 'z', tytul: 'Zebranie', kategoria: 'ZEBRANIA', godzina: '18:00', godzinaDo: '20:00',
  budynek: 'B/L', sala: '110L', osoby: ['Jula', 'Kuba'],
})
const nabor = w({ id: 'n', tytul: 'Nabór', kategoria: 'APLIKACJE', godzina: '08:00' })
const wyjazd = w({ id: 'y', tytul: 'Wyjazd', kategoria: 'PROJEKTY', dzien: 30, dni: 4, calyDzien: true })

describe('budujEksport', () => {
  const e = budujEksport([nabor, zebranie, wyjazd], PAZ)

  it('nazywa plik rokiem i miesiącem', () => {
    expect(e.nazwaPliku).toBe('planer-2026-10.xlsx')
    expect(e.tytul).toBe('Październik 2026')
  })

  it('kalendarz to tygodnie od poniedziałku', () => {
    expect(e.kalendarz).toHaveLength(5)
    expect(e.kalendarz[0].map((k) => k.dzien)).toEqual([null, null, null, 1, 2, 3, 4])
  })

  it('w komórce najważniejsze na górze, z numerem rangi, miejscem i osobami', () => {
    const siodmy = e.kalendarz.flat().find((k) => k.dzien === 7)!
    expect(siodmy.linie[0]).toEqual({
      tekst: '① 18:00–20:00 Zebranie · B/L 110L · Jula, Kuba',
      kolor: '#1d4ed8',
      pogrubiona: true,
    })
    expect(siodmy.linie[1].tekst).toBe('• 08:00 Nabór')
  })

  it('wielodniowe jest w każdym dniu z numerem dnia', () => {
    const ostatni = e.kalendarz.flat().find((k) => k.dzien === 31)!
    expect(ostatni.linie[0].tekst).toBe('③ cały dzień Wyjazd (2/4)')
  })

  it('lista ma jeden wiersz na wydarzenie, po dacie i randze', () => {
    expect(e.lista.map((r) => r[7])).toEqual(['Zebranie', 'Nabór', 'Wyjazd'])
    expect(e.lista[0]).toEqual([
      '07.10.2026', 'środa', '', '18:00', '20:00', 1, 'Zebrania', 'Zebranie', 'B/L', '110L', 'Jula, Kuba',
    ])
    expect(e.lista[2][2]).toBe('02.11.2026')
    expect(e.lista[2][3]).toBe('cały dzień')
  })

  it('pomija wydarzenia spoza miesiąca', () => {
    expect(budujEksport([w({ miesiac: 11, dzien: 15 })], PAZ).lista).toEqual([])
  })
})

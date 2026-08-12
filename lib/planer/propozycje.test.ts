import { describe, it, expect } from 'vitest'
import { stanPropozycji, opiszPropozycje } from '@/lib/planer/propozycje'
import type { Propozycja } from '@/lib/planer/propozycje'
import type { Wydarzenie } from '@/lib/planer/typy'

const wydarzenie: Wydarzenie = {
  id: 'w1', tytul: 'ZEBRANIE ZARZĄDU', kategoria: 'ZEBRANIA',
  rok: 2026, miesiac: 10, dzien: 7, godzina: '18:00', sala: '9J', osoby: ['Jula'],
}

const przeniesienie: Propozycja = {
  id: 'p1', rodzaj: 'przeniesienie', autor: 'Jula', utworzone: 0,
  wydarzenieId: 'w1', zDnia: 7, naDzien: 9, tytulWydarzenia: 'ZEBRANIE ZARZĄDU',
}

const nowe: Propozycja = {
  id: 'p2', rodzaj: 'nowe', autor: 'Kuba', utworzone: 0,
  wydarzenie: {
    tytul: 'SZKOLENIE', kategoria: 'INNE', rok: 2026, miesiac: 11,
    dzien: 12, godzina: null, sala: null, osoby: [],
  },
}

describe('stanPropozycji', () => {
  it('propozycja przeniesienia jest wykonalna, gdy wydarzenie stoi tam, gdzie było', () => {
    expect(stanPropozycji(przeniesienie, [wydarzenie])).toEqual({ mozna: true, ostrzezenie: null })
  })

  it('ostrzega, gdy ktoś zdążył przesunąć wydarzenie gdzie indziej', () => {
    // Propozycja mówi, GDZIE coś ma być, a nie skąd wychodzi — więc nadal wykonalna.
    const s = stanPropozycji(przeniesienie, [{ ...wydarzenie, dzien: 11 }])
    expect(s.mozna).toBe(true)
    expect(s.ostrzezenie).toMatch(/11/)
  })

  it('propozycja do nieistniejącego wydarzenia jest niewykonalna', () => {
    expect(stanPropozycji(przeniesienie, [])).toEqual({
      mozna: false,
      ostrzezenie: 'Tego wydarzenia już nie ma — propozycję można tylko odrzucić.',
    })
  })

  it('propozycja nowego wydarzenia jest zawsze wykonalna', () => {
    expect(stanPropozycji(nowe, [])).toEqual({ mozna: true, ostrzezenie: null })
  })
})

describe('opiszPropozycje', () => {
  it('opisuje przeniesienie', () => {
    expect(opiszPropozycje(przeniesienie)).toBe('Przenieś „ZEBRANIE ZARZĄDU" z 7. na 9.')
  })

  it('opisuje nowe wydarzenie', () => {
    expect(opiszPropozycje(nowe)).toBe('Dodaj „SZKOLENIE" 12.11')
  })
})

import { describe, it, expect } from 'vitest'
import {
  sprawdzTrescNotatki, tytulRozmowy, dopiszPytanie, odczytajOdpowiedzCzatu,
  DLUGOSC_NOTATKI, LIMIT_WIADOMOSCI,
} from '@/lib/asystent/pamiec'

describe('sprawdzTrescNotatki', () => {
  it('przycina i odrzuca puste', () => {
    expect(sprawdzTrescNotatki('  Zebrania w środy  ')).toBe('Zebrania w środy')
    expect(sprawdzTrescNotatki('   ')).toBeNull()
    expect(sprawdzTrescNotatki(5)).toBeNull()
    expect(sprawdzTrescNotatki('x'.repeat(DLUGOSC_NOTATKI + 10))).toHaveLength(DLUGOSC_NOTATKI)
  })
})

describe('tytulRozmowy', () => {
  it('pierwsze pytanie w jednej linii, długie przycięte z wielokropkiem', () => {
    expect(tytulRozmowy('Co z\n retencją?')).toBe('Co z retencją?')
    const t = tytulRozmowy('a'.repeat(100))
    expect(t).toHaveLength(60)
    expect(t.endsWith('…')).toBe(true)
  })
})

describe('dopiszPytanie', () => {
  const w = (rola: 'ja' | 'deck', tresc: string) => ({ rola, tresc, kiedy: 1 })

  it('dopisuje pytanie na końcu', () => {
    expect(dopiszPytanie([w('ja', 'A'), w('deck', 'B')], 'C', 5, false)).toEqual([w('ja', 'A'), w('deck', 'B'), { rola: 'ja', tresc: 'C', kiedy: 5 }])
  })

  it('ponowienie nie dubluje pytania bez odpowiedzi', () => {
    const lista = [w('ja', 'A'), w('deck', 'B'), w('ja', 'C')]
    expect(dopiszPytanie(lista, 'C', 9, true)).toBe(lista)
  })

  it('pełna rozmowa - null', () => {
    const pelna = Array.from({ length: LIMIT_WIADOMOSCI - 1 }, (_, i) => w(i % 2 ? 'deck' : 'ja', 'x'))
    expect(dopiszPytanie(pelna, 'C', 1, false)).toBeNull()
  })
})

describe('odczytajOdpowiedzCzatu', () => {
  it('odpowiedź z propozycją i bez', () => {
    expect(odczytajOdpowiedzCzatu('{"odpowiedz":"Tak.","propozycjaNotatki":" Zebrania w środy "}'))
      .toEqual({ odpowiedz: 'Tak.', propozycja: 'Zebrania w środy' })
    expect(odczytajOdpowiedzCzatu('{"odpowiedz":"Tak.","propozycjaNotatki":null}')).toEqual({ odpowiedz: 'Tak.', propozycja: null })
    expect(odczytajOdpowiedzCzatu('{"odpowiedz":"Tak."}')).toEqual({ odpowiedz: 'Tak.', propozycja: null })
  })

  it('zły kształt - null', () => {
    expect(odczytajOdpowiedzCzatu('nie json')).toBeNull()
    expect(odczytajOdpowiedzCzatu('{"odpowiedz":""}')).toBeNull()
    expect(odczytajOdpowiedzCzatu('{"tekst":"x"}')).toBeNull()
  })
})

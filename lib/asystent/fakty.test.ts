import { describe, it, expect } from 'vitest'
import { faktyKokpitu, najblizszeWydarzenia } from '@/lib/asystent/fakty'
import { POLA_DOMYSLNE, type Wydarzenie } from '@/lib/planer/typy'

const DZIS = { rok: 2026, miesiac: 10, dzien: 2 } // piątek

function w(nadpisz: Partial<Wydarzenie>): Wydarzenie {
  return {
    id: 'x', tytul: 'Zebranie Zarządu', kategoria: 'ZEBRANIA', rok: 2026, miesiac: 10, dzien: 2,
    godzina: '18:00', sala: '110L', osoby: ['wszyscy'], ...POLA_DOMYSLNE, budynek: 'B/L', ...nadpisz,
  }
}

const baza = { rola: 'owner' as const, wydarzenia: [], propozycje: 0, alerty: [], dzis: DZIS }

describe('faktyKokpitu', () => {
  it('nic się nie dzieje - pusta lista', () => {
    expect(faktyKokpitu(baza)).toEqual([])
  })

  it('najbliższe wydarzenie dziś albo jutro, z czasem i miejscem', () => {
    const f = faktyKokpitu({ ...baza, wydarzenia: [w({ id: 'j', dzien: 3, tytul: 'SKS', kategoria: 'SSUEW', godzina: '19:00' }), w({})] })
    expect(f[0]).toMatchObject({ etykieta: 'Dziś 18:00', tresc: 'Zebranie Zarządu', szczegol: 'B/L 110L · wszyscy' })
  })

  it('jutro, gdy dziś nic nie ma', () => {
    const f = faktyKokpitu({ ...baza, wydarzenia: [w({ dzien: 3 })] })
    expect(f[0].etykieta).toBe('Jutro 18:00')
  })

  it('propozycje widzi tylko owner, z polską odmianą', () => {
    expect(faktyKokpitu({ ...baza, propozycje: 3 })[0]).toMatchObject({ etykieta: 'Do decyzji', tresc: '3 propozycje' })
    expect(faktyKokpitu({ ...baza, propozycje: 5 })[0].tresc).toBe('5 propozycji')
    expect(faktyKokpitu({ ...baza, rola: 'board', propozycje: 3 })).toEqual([])
  })

  it('alerty z pierwszym powodem', () => {
    const f = faktyKokpitu({ ...baza, alerty: [{ tytul: "Retencja W'25 poniżej normy" }, { tytul: 'b' }] })
    expect(f[0]).toMatchObject({ etykieta: 'Analytics', tresc: '2 alerty', szczegol: "Retencja W'25 poniżej normy", link: '/analytics/alerty' })
  })
})

describe('najblizszeWydarzenia', () => {
  it('od dziś, po kolei, z czytelnym „kiedy”', () => {
    const lista = najblizszeWydarzenia([
      w({ id: 'za-tydzien', tytul: 'Gala', dzien: 12, godzina: null }),
      w({ id: 'jutro', tytul: 'SKS', dzien: 3, godzina: '19:00' }),
      w({ id: 'wtorek', tytul: 'Komisja', dzien: 6, godzina: '17:00' }),
      w({ id: 'dzis', tytul: 'Zebranie', dzien: 2 }),
      w({ id: 'wczoraj', tytul: 'Minione', dzien: 1 }),
    ], DZIS, 4)
    expect(lista).toEqual([
      { id: 'dzis', kiedy: 'dziś 18:00', tytul: 'Zebranie' },
      { id: 'jutro', kiedy: 'jutro 19:00', tytul: 'SKS' },
      { id: 'wtorek', kiedy: 'wt 17:00', tytul: 'Komisja' },
      { id: 'za-tydzien', kiedy: '12.10', tytul: 'Gala' },
    ])
  })

  it('wielodniowe zaczęte wcześniej „trwa”, cały dzień bez godziny', () => {
    const lista = najblizszeWydarzenia([w({ id: 'wyjazd', tytul: 'Wyjazd', miesiac: 9, dzien: 30, dni: 4, calyDzien: true })], DZIS, 2)
    expect(lista).toEqual([{ id: 'wyjazd', kiedy: 'trwa', tytul: 'Wyjazd' }])
  })

  it('obcina do żądanej liczby', () => {
    expect(najblizszeWydarzenia([w({ id: 'a' }), w({ id: 'b', dzien: 3 }), w({ id: 'c', dzien: 4 })], DZIS, 2)).toHaveLength(2)
  })
})

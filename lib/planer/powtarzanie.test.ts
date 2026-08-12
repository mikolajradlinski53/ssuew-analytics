import { describe, it, expect } from 'vitest'
import { terminyCoTydzien } from '@/lib/planer/powtarzanie'
import { miesiaceSemestru } from '@/lib/planer/semestry'

const ZIMOWY = miesiaceSemestru(2026, 'Z')

describe('terminyCoTydzien', () => {
  it('bez powtórzeń zwraca sam termin początkowy', () => {
    expect(terminyCoTydzien({ rok: 2026, miesiac: 10, dzien: 7 }, ZIMOWY, 1)).toEqual([
      { rok: 2026, miesiac: 10, dzien: 7 },
    ])
  })

  it('odmierza kolejne terminy co siedem dni', () => {
    expect(terminyCoTydzien({ rok: 2026, miesiac: 10, dzien: 7 }, ZIMOWY, 3)).toEqual([
      { rok: 2026, miesiac: 10, dzien: 7 },
      { rok: 2026, miesiac: 10, dzien: 14 },
      { rok: 2026, miesiac: 10, dzien: 21 },
    ])
  })

  it('przechodzi przez granicę miesiąca', () => {
    // 28 października + 7 dni to 4 listopada.
    expect(terminyCoTydzien({ rok: 2026, miesiac: 10, dzien: 28 }, ZIMOWY, 2)).toEqual([
      { rok: 2026, miesiac: 10, dzien: 28 },
      { rok: 2026, miesiac: 11, dzien: 4 },
    ])
  })

  it('przechodzi przez granicę roku', () => {
    // 30 grudnia 2026 + 7 dni to 6 stycznia 2027, a to wciąż ten sam semestr.
    expect(terminyCoTydzien({ rok: 2026, miesiac: 12, dzien: 30 }, ZIMOWY, 2)).toEqual([
      { rok: 2026, miesiac: 12, dzien: 30 },
      { rok: 2027, miesiac: 1, dzien: 6 },
    ])
  })

  it('urywa się na końcu semestru zamiast wychodzić poza niego', () => {
    // Luty 2027 kończy semestr zimowy; marca już nie ma.
    const terminy = terminyCoTydzien({ rok: 2027, miesiac: 2, dzien: 22 }, ZIMOWY, 5)
    expect(terminy).toEqual([{ rok: 2027, miesiac: 2, dzien: 22 }])
  })

  it('nie zwraca niczego przy liczbie mniejszej od jedynki', () => {
    expect(terminyCoTydzien({ rok: 2026, miesiac: 10, dzien: 7 }, ZIMOWY, 0)).toEqual([])
  })
})

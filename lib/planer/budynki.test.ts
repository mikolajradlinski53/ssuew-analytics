import { describe, it, expect } from 'vitest'
import { BUDYNKI, POZA, jestBudynkiem, jestMiejscemSpecjalnym, etykietaBudynku } from '@/lib/planer/budynki'

describe('budynki', () => {
  it('zna budynki UEW i miejsce poza uczelnią', () => {
    expect(BUDYNKI).toContain('B/L')
    expect(BUDYNKI).toContain('ŚLĘŻAK')
    expect(jestBudynkiem('CKU')).toBe(true)
    expect(jestBudynkiem(POZA)).toBe(true)
  })

  it('odrzuca nieznany budynek', () => {
    expect(jestBudynkiem('X')).toBe(false)
  })

  it('nie ma duplikatów', () => {
    expect(new Set(BUDYNKI).size).toBe(BUDYNKI.length)
  })

  it('„POZA” ma ludzką etykietę, budynek - swój kod', () => {
    expect(etykietaBudynku(POZA)).toBe('Poza uczelnią')
    expect(etykietaBudynku('B/J')).toBe('B/J')
  })
})

describe('miejsca spoza budynków', () => {
  it('online, inne miasto, wyjazd i teren UE są poprawnym miejscem', () => {
    for (const kod of ['ONLINE', 'MIASTO', 'WYJAZD', 'UE']) expect(jestBudynkiem(kod)).toBe(true)
  })

  it('mają ludzkie etykiety', () => {
    expect(etykietaBudynku('ONLINE')).toBe('Online')
    expect(etykietaBudynku('MIASTO')).toBe('Inne miasto')
    expect(etykietaBudynku('WYJAZD')).toBe('Wyjazd')
  })

  it('tylko prawdziwe budynki mają sale, które mogą kolidować', () => {
    expect(jestMiejscemSpecjalnym('ONLINE')).toBe(true)
    expect(jestMiejscemSpecjalnym('POZA')).toBe(true)
    expect(jestMiejscemSpecjalnym('B/L')).toBe(false)
  })
})

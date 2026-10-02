import { describe, it, expect } from 'vitest'
import { BUDYNKI, POZA, jestBudynkiem, etykietaBudynku } from '@/lib/planer/budynki'

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

  it('„POZA” ma ludzką etykietę, budynek — swój kod', () => {
    expect(etykietaBudynku(POZA)).toBe('Poza uczelnią')
    expect(etykietaBudynku('B/J')).toBe('B/J')
  })
})

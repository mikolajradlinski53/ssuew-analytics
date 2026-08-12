import { describe, it, expect } from 'vitest'
import { KATEGORIE, KLUCZE_KATEGORII, jestKategoria } from '@/lib/planer/typy'

describe('kategorie', () => {
  it('zna siedem kategorii z dotychczasowego Planera', () => {
    expect(KLUCZE_KATEGORII).toHaveLength(7)
    expect(KLUCZE_KATEGORII).toContain('ZEBRANIA/INNE')
  })

  it('każda ma etykietę, kolor obrysu i tło', () => {
    for (const klucz of KLUCZE_KATEGORII) {
      const k = KATEGORIE[klucz]
      expect(k.etykieta.length).toBeGreaterThan(0)
      expect(k.obrys).toMatch(/^#[0-9a-f]{6}$/i)
      expect(k.tlo).toMatch(/^rgba\(/)
    }
  })

  it('rozpoznaje kategorię spoza listy', () => {
    expect(jestKategoria('ZEBRANIA')).toBe(true)
    expect(jestKategoria('WYCIECZKA')).toBe(false)
  })
})

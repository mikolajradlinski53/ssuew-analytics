import { describe, it, expect } from 'vitest'
import { KATEGORIE, KLUCZE_KATEGORII, jestKategoria, numerRangi } from '@/lib/planer/typy'

describe('kategorie', () => {
  it('siedem kategorii w kolejności ważności - Komisje zaraz po Zebraniach', () => {
    expect(KLUCZE_KATEGORII).toEqual(['ZEBRANIA', 'KOMISJE', 'SSUEW', 'PROJEKTY', 'UE', 'APLIKACJE', 'INNE'])
  })

  it('każda ma etykietę, rangę, kolor obrysu, tło i kolor do druku', () => {
    for (const klucz of KLUCZE_KATEGORII) {
      const k = KATEGORIE[klucz]
      expect(k.etykieta.length).toBeGreaterThan(0)
      expect(k.obrys).toMatch(/^#[0-9a-f]{6}$/i)
      expect(k.druk).toMatch(/^#[0-9a-f]{6}$/i)
      expect(k.tlo).toMatch(/^rgba\(/)
    }
  })

  it('numer rangi mają tylko cztery najważniejsze kategorie', () => {
    expect(numerRangi('ZEBRANIA')).toBe(1)
    expect(numerRangi('KOMISJE')).toBe(2)
    expect(numerRangi('PROJEKTY')).toBe(4)
    expect(numerRangi('UE')).toBeNull()
    expect(numerRangi('APLIKACJE')).toBeNull()
    expect(numerRangi('INNE')).toBeNull()
  })

  it('dawna kategoria „Zeb./inne” nie jest już kategorią', () => {
    expect(jestKategoria('ZEBRANIA/INNE')).toBe(false)
    expect(jestKategoria('WYCIECZKA')).toBe(false)
  })
})

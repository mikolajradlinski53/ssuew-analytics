import { describe, it, expect } from 'vitest'
import { olsMultiple } from '@/lib/stats'

describe('olsMultiple — macierz osobliwa', () => {
  it('nie zwraca NaN przy współliniowych kolumnach', () => {
    // dwie identyczne kolumny → X^T X osobliwa
    const col = [1, 2, 3, 4]
    const res = olsMultiple([col, [...col]], [1, 2, 3, 4], [])
    expect(res.betas.every((b) => Number.isFinite(b))).toBe(true)
    expect(Number.isFinite(res.r2)).toBe(true)
  })
})

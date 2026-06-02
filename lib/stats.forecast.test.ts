import { describe, it, expect } from 'vitest'
import { linearForecast } from '@/lib/stats'

describe('linearForecast', () => {
  it('prognozuje idealną prostą bez niepewności', () => {
    const f = linearForecast([2, 4, 6, 8], 1)
    expect(f).toHaveLength(1)
    expect(f[0].yhat).toBe(10)
    expect(f[0].lo).toBe(10)
    expect(f[0].hi).toBe(10)
  })
  it('zwraca tyle punktów ile kroków', () => {
    expect(linearForecast([2, 4, 6, 8], 2)).toHaveLength(2)
  })
  it('dla zaszumionych danych lo < yhat < hi', () => {
    const f = linearForecast([2, 5, 6, 9, 9], 1)
    expect(f[0].lo).toBeLessThan(f[0].yhat)
    expect(f[0].hi).toBeGreaterThan(f[0].yhat)
  })
  it('nie schodzi poniżej zera (lo >= 0)', () => {
    const f = linearForecast([5, 3, 1, 0], 2)
    expect(f.every((p) => p.lo >= 0)).toBe(true)
  })
})

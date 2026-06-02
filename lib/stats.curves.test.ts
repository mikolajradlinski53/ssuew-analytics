import { describe, it, expect } from 'vitest'
import { survivalCurve } from '@/lib/stats'

describe('survivalCurve', () => {
  it('zaczyna od 100% w semestrze 0', () => {
    expect(survivalCurve(4, 8)[0]).toEqual({ sem: 0, pct: 100 })
  })
  it('ma długość max+1 punktów', () => {
    expect(survivalCurve(4, 8)).toHaveLength(9)
  })
  it('spada wykładniczo (avg = średnia rozkładu)', () => {
    const c = survivalCurve(4, 8)
    expect(c[4].pct).toBeCloseTo(36.8, 0) // 100*exp(-1)
  })
  it('dla avg<=0 zwraca 100% w sem 0 i 0% dalej', () => {
    const c = survivalCurve(0, 2)
    expect(c).toEqual([{ sem: 0, pct: 100 }, { sem: 1, pct: 0 }, { sem: 2, pct: 0 }])
  })
})

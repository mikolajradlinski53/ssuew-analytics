import { describe, it, expect } from 'vitest'
import { correlationMatrix } from '@/lib/stats'

describe('correlationMatrix', () => {
  const rows = [
    { x: 1, y: 2, z: 1 },
    { x: 2, y: 4, z: 1 },
    { x: 3, y: 6, z: 1 },
    { x: 4, y: 8, z: 2 },
  ]
  it('przekątna = 1', () => {
    const cells = correlationMatrix(rows, ['x', 'y'])
    expect(cells.find((c) => c.a === 'x' && c.b === 'x')?.r).toBe(1)
  })
  it('x i y idealnie skorelowane → r ≈ 1', () => {
    const cells = correlationMatrix(rows, ['x', 'y'])
    const r = cells.find((c) => c.a === 'x' && c.b === 'y')?.r
    expect(r).toBeCloseTo(1, 5)
  })
  it('za mało wspólnych wartości → r = null', () => {
    const sparse = [{ a: 1, b: null }, { a: 2, b: null }, { a: 3, b: 5 }] as Record<string, number | null>[]
    const cells = correlationMatrix(sparse, ['a', 'b'])
    expect(cells.find((c) => c.a === 'a' && c.b === 'b')?.r).toBeNull()
  })
})

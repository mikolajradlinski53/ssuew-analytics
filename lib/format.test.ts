import { describe, it, expect } from 'vitest'
import { easeOutCubic, formatNumber } from '@/lib/format'

describe('easeOutCubic', () => {
  it('zaczyna w 0 i kończy w 1', () => {
    expect(easeOutCubic(0)).toBe(0)
    expect(easeOutCubic(1)).toBe(1)
  })
  it('jest monotoniczny i wypukły (szybko na starcie)', () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5)
  })
})

describe('formatNumber', () => {
  it('formatuje z liczbą miejsc po przecinku', () => {
    expect(formatNumber(3.456, 1)).toBe('3.5')
    expect(formatNumber(42, 0)).toBe('42')
  })
})

import { describe, it, expect } from 'vitest'
import { dniWMiesiacu, pierwszyDzienTygodnia, dzienTygodnia, naMinuty } from '@/lib/planer/daty'

describe('dniWMiesiacu', () => {
  it('liczy dni zwykłych miesięcy', () => {
    expect(dniWMiesiacu(2026, 10)).toBe(31)
    expect(dniWMiesiacu(2026, 11)).toBe(30)
  })
  it('rozpoznaje luty w roku przestępnym', () => {
    expect(dniWMiesiacu(2027, 2)).toBe(28)
    expect(dniWMiesiacu(2028, 2)).toBe(29)
  })
})

describe('pierwszyDzienTygodnia', () => {
  it('liczy od poniedziałku jako zera', () => {
    // 1 października 2026 to czwartek → 3
    expect(pierwszyDzienTygodnia(2026, 10)).toBe(3)
    // 1 lutego 2027 to poniedziałek → 0
    expect(pierwszyDzienTygodnia(2027, 2)).toBe(0)
  })
})

describe('dzienTygodnia', () => {
  it('zwraca polską nazwę', () => {
    expect(dzienTygodnia(2026, 10, 1)).toBe('czwartek')
    expect(dzienTygodnia(2026, 10, 4)).toBe('niedziela')
  })
})

describe('naMinuty', () => {
  it('zamienia godzinę na minuty od północy', () => {
    expect(naMinuty('18:00')).toBe(1080)
    expect(naMinuty('09:30')).toBe(570)
  })
  it('zwraca null, gdy godziny nie ma', () => {
    expect(naMinuty(null)).toBeNull()
    expect(naMinuty('')).toBeNull()
  })
})

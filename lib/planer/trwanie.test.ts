import { describe, it, expect } from 'vitest'
import {
  przesunDate, dniMiedzy, koniec, dniTrwaniaWMiesiacu, nachodziNaMiesiac, naIso, zIso, porownajDaty,
} from '@/lib/planer/trwanie'

const zjazd = { rok: 2026, miesiac: 10, dzien: 30, dni: 4 }

describe('trwanie', () => {
  it('koniec przechodzi przez granicę miesiąca', () => {
    expect(koniec(zjazd)).toEqual({ rok: 2026, miesiac: 11, dzien: 2 })
  })

  it('jednodniowe kończy się w dniu startu', () => {
    expect(koniec({ rok: 2026, miesiac: 10, dzien: 7, dni: 1 })).toEqual({ rok: 2026, miesiac: 10, dzien: 7 })
  })

  it('rozkłada dni trwania na miesiące', () => {
    expect(dniTrwaniaWMiesiacu(zjazd, { m: 10, y: 2026 })).toEqual([30, 31])
    expect(dniTrwaniaWMiesiacu(zjazd, { m: 11, y: 2026 })).toEqual([1, 2])
  })

  it('wie, na które miesiące nachodzi', () => {
    expect(nachodziNaMiesiac(zjazd, { m: 11, y: 2026 })).toBe(true)
    expect(nachodziNaMiesiac(zjazd, { m: 12, y: 2026 })).toBe(false)
  })

  it('liczy dni od–do włącznie', () => {
    expect(dniMiedzy({ rok: 2026, miesiac: 10, dzien: 30 }, { rok: 2026, miesiac: 11, dzien: 2 })).toBe(4)
    expect(dniMiedzy({ rok: 2026, miesiac: 10, dzien: 7 }, { rok: 2026, miesiac: 10, dzien: 7 })).toBe(1)
  })

  it('przesuwa datę przez koniec roku', () => {
    expect(przesunDate({ rok: 2026, miesiac: 12, dzien: 31 }, 1)).toEqual({ rok: 2027, miesiac: 1, dzien: 1 })
  })

  it('nie gubi dnia na zmianie czasu', () => {
    // 25.10.2026 to przejście na czas zimowy — doba ma 25 godzin.
    expect(dniMiedzy({ rok: 2026, miesiac: 10, dzien: 24 }, { rok: 2026, miesiac: 10, dzien: 26 })).toBe(3)
  })

  it('porównuje daty', () => {
    expect(porownajDaty({ rok: 2026, miesiac: 10, dzien: 1 }, { rok: 2026, miesiac: 9, dzien: 30 })).toBeGreaterThan(0)
  })

  it('zamienia na ISO i z powrotem', () => {
    expect(naIso({ rok: 2026, miesiac: 3, dzien: 5 })).toBe('2026-03-05')
    expect(zIso('2026-03-05')).toEqual({ rok: 2026, miesiac: 3, dzien: 5 })
    expect(zIso('')).toBeNull()
    expect(zIso('bzdura')).toBeNull()
  })
})

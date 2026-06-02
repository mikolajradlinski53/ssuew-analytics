import { describe, it, expect } from 'vitest'
import { parseSemestr, orgKpiByEdition } from '@/lib/stats'
import type { KpiPeriod } from '@/types'

describe('parseSemestr', () => {
  it('letni → wiosna następnego roku', () => {
    expect(parseSemestr('letni 2025/2026')).toEqual({ sezon: 'wiosna', rok: 2026 })
  })
  it('zimowy → jesień pierwszego roku', () => {
    expect(parseSemestr('zimowy 2025/2026')).toEqual({ sezon: 'jesien', rok: 2025 })
  })
  it('nierozpoznany → null', () => {
    expect(parseSemestr('coś dziwnego')).toBeNull()
  })
})

describe('orgKpiByEdition', () => {
  const periods: KpiPeriod[] = [
    { id: 'a', komisja_id: 'k1', semestr: 'letni 2025/2026', projekty_planowane: 10, projekty_zrealizowane: 8, notatka: null, created_at: '' },
    { id: 'b', komisja_id: 'k2', semestr: 'letni 2025/2026', projekty_planowane: 10, projekty_zrealizowane: 6, notatka: null, created_at: '' },
  ]
  it('średnia realizacji per okres, mapowana na edycję', () => {
    const m = orgKpiByEdition(periods)
    expect(m.get('wiosna-2026')).toBe(70) // (80 + 60) / 2
  })
})

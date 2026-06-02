import { describe, it, expect } from 'vitest'
import { kpiByKomisja } from '@/lib/stats'
import type { KpiPeriod } from '@/types'

function p(id: string, kom: string, sem: string, created: string): KpiPeriod {
  return { id, komisja_id: kom, semestr: sem, projekty_planowane: 10, projekty_zrealizowane: 5, notatka: null, created_at: created }
}

describe('kpiByKomisja', () => {
  const periods = [
    p('1', 'k1', 'zimowy 2024/2025', '2024-10-01'),
    p('2', 'k1', 'letni 2024/2025', '2025-03-01'),
    p('3', 'k2', 'letni 2024/2025', '2025-03-01'),
  ]
  it('grupuje po komisja_id', () => {
    const m = kpiByKomisja(periods)
    expect(m.size).toBe(2)
    expect(m.get('k1')).toHaveLength(2)
    expect(m.get('k2')).toHaveLength(1)
  })
  it('sortuje okresy komisji wg created_at', () => {
    const m = kpiByKomisja(periods)
    expect(m.get('k1')!.map((x) => x.id)).toEqual(['1', '2'])
  })
})

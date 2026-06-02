import { describe, it, expect } from 'vitest'
import { computeOverview } from '@/lib/overview'
import type { Rekrutacja, Kohorta, KpiPeriod } from '@/types'

const rekr: Rekrutacja[] = [
  { id: '1', edycja: "W'24", sezon: 'wiosna', rok: 2024, zgloszenia: 10, przyjeci: 5, created_at: '' },
  { id: '2', edycja: "J'24", sezon: 'jesien', rok: 2024, zgloszenia: 20, przyjeci: 15, created_at: '' },
]
const koh: Kohorta[] = [
  { id: '1', edycja: "W'24", sezon: 'wiosna', rok: 2024, n_czlonkow: 5, avg_retention_sem: 4, max_retention_sem: 6, in_progress: false, created_at: '' },
  { id: '2', edycja: "J'24", sezon: 'jesien', rok: 2024, n_czlonkow: 15, avg_retention_sem: 2, max_retention_sem: 5, in_progress: true, created_at: '' },
]
const kpi: KpiPeriod[] = [
  { id: 'p1', komisja_id: 'k1', semestr: 'letni 2025/2026', projekty_planowane: 10, projekty_zrealizowane: 8, notatka: null, created_at: '' },
]

describe('computeOverview', () => {
  it('liczy średni conversion rate', () => {
    // (50% + 75%) / 2 = 62.5
    expect(computeOverview(rekr, koh, kpi).avgConversion).toBe(62.5)
  })
  it('liczy retencję tylko z ukończonych kohort', () => {
    // tylko kohorta W'24 (in_progress=false) → 4
    expect(computeOverview(rekr, koh, kpi).histRetention).toBe(4)
  })
  it('bierze ostatnią edycję wg roku/sezonu', () => {
    const m = computeOverview(rekr, koh, kpi)
    expect(m.lastEdycja).toBe("J'24")
    expect(m.lastAccepted).toBe(15)
    expect(m.lastApplications).toBe(20)
  })
  it('liczy średnią realizację KPI', () => {
    expect(computeOverview(rekr, koh, kpi).avgKpiRealization).toBe(80)
  })
  it('zwraca null dla pustych danych', () => {
    const m = computeOverview([], [], [])
    expect(m.avgConversion).toBeNull()
    expect(m.histRetention).toBeNull()
    expect(m.lastEdycja).toBeNull()
  })
})

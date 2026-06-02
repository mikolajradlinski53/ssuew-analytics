import { describe, it, expect } from 'vitest'
import { buildFunnel } from '@/lib/stats'
import type { Rekrutacja, Kohorta } from '@/types'

const rekr: Rekrutacja[] = [
  { id: '1', edycja: "J'24", sezon: 'jesien', rok: 2024, zgloszenia: 40, przyjeci: 20, created_at: '' },
  { id: '2', edycja: "W'25", sezon: 'wiosna', rok: 2025, zgloszenia: 10, przyjeci: 8, created_at: '' },
]
const koh: Kohorta[] = [
  { id: '1', edycja: "J'24", sezon: 'jesien', rok: 2024, n_czlonkow: 20, avg_retention_sem: 4, max_retention_sem: 8, in_progress: false, created_at: '' },
]

describe('buildFunnel', () => {
  it('agreguje wszystkie edycje i liczy % względem zgłoszeń', () => {
    const f = buildFunnel(rekr, koh, { threshold: 1 })
    expect(f[0]).toMatchObject({ stage: 'Zgłoszenia', count: 50, pct: 100 })
    expect(f[1]).toMatchObject({ stage: 'Przyjęci', count: 28 })
    expect(f[2]).toMatchObject({ stage: 'Aktywni', count: 20 }) // tylko J'24 ma kohortę
  })
  it('liczy utrzymanych z modelu przeżycia przy progu', () => {
    const f = buildFunnel(rekr, koh, { threshold: 4 })
    // 20 * exp(-1) ≈ 7.36 → 7
    expect(f[3]).toMatchObject({ stage: 'Utrzymani po 4 sem.', count: 7 })
  })
  it('filtruje do jednej edycji', () => {
    const f = buildFunnel(rekr, koh, { edycja: "W'25", threshold: 1 })
    expect(f[0].count).toBe(10)
    expect(f[2].count).toBe(0) // brak kohorty dla W'25
  })
})

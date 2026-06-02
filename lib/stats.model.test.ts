import { describe, it, expect } from 'vitest'
import { retentionModel } from '@/lib/stats'
import type { Kohorta } from '@/types'

function koh(edycja: string, sezon: 'jesien' | 'wiosna', rok: number, n: number, avg: number): Kohorta {
  return { id: edycja, edycja, sezon, rok, n_czlonkow: n, avg_retention_sem: avg, max_retention_sem: Math.ceil(avg) + 1, in_progress: false, created_at: '' }
}

const cohorts: Kohorta[] = [
  koh("W'22", 'wiosna', 2022, 11, 4.4),
  koh("J'22", 'jesien', 2022, 33, 4.2),
  koh("W'23", 'wiosna', 2023, 10, 4.2),
  koh("J'23", 'jesien', 2023, 28, 3.9),
]

describe('retentionModel', () => {
  it('zwraca model przy >=4 ukończonych kohortach', () => {
    const m = retentionModel(cohorts)
    expect(m).not.toBeNull()
    expect(m!.n).toBe(4)
  })
  it('predict zwraca skończoną, nieujemną liczbę', () => {
    const m = retentionModel(cohorts)!
    const p = m.predict(m.nextEdNr, 1, 20)
    expect(Number.isFinite(p)).toBe(true)
    expect(p).toBeGreaterThanOrEqual(0)
  })
  it('zwraca null przy <4 ukończonych kohortach', () => {
    expect(retentionModel(cohorts.slice(0, 3))).toBeNull()
  })
  it('pomija kohorty in_progress', () => {
    const withProgress = [...cohorts, { ...koh("J'24", 'jesien', 2024, 30, 3.5), in_progress: true }]
    expect(retentionModel(withProgress)!.n).toBe(4)
  })
})

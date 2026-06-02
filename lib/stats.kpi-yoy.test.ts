import { describe, it, expect } from 'vitest'
import { kpiRatio, kpiByKategoria, kpiSummary } from '@/lib/stats'
import type { KpiMetric } from '@/types'

function km(id: string, kat: string, nazwa: string, poprz: number, biez: number): KpiMetric {
  return { id, kategoria: kat, nazwa, okres_poprzedni: '2024/2025', wartosc_poprzednia: poprz, okres_biezacy: '2025/2026', wartosc_biezaca: biez, created_at: '' }
}

const metrics = [
  km('1', 'SKS', 'Listopad', 57, 84),   // 1.47 up
  km('2', 'SKS', 'Luty', 34, 44),       // 1.29 up
  km('3', 'Ankieta', 'Zimowa', 47, 28), // 0.60 down
]

describe('kpiRatio', () => {
  it('liczy stosunek r/r', () => {
    expect(kpiRatio(km('x', 'k', 'n', 50, 75))).toBeCloseTo(1.5, 5)
  })
  it('zwraca 0 gdy poprzednia = 0', () => {
    expect(kpiRatio(km('x', 'k', 'n', 0, 10))).toBe(0)
  })
})

describe('kpiByKategoria', () => {
  it('grupuje po kategorii', () => {
    const m = kpiByKategoria(metrics)
    expect(m.get('SKS')).toHaveLength(2)
    expect(m.get('Ankieta')).toHaveLength(1)
  })
})

describe('kpiSummary', () => {
  it('liczy ile wzrosło/spadło i średni ratio', () => {
    const s = kpiSummary(metrics)
    expect(s.up).toBe(2)
    expect(s.down).toBe(1)
    expect(s.avgRatio).toBeGreaterThan(1)
  })
  it('puste → zera', () => {
    expect(kpiSummary([])).toEqual({ up: 0, down: 0, avgRatio: 0 })
  })
})

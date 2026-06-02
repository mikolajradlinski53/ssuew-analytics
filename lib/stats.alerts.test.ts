import { describe, it, expect } from 'vitest'
import { buildAlerts } from '@/lib/stats'
import type { Kohorta, KpiMetric } from '@/types'

function km(id: string, kat: string, nazwa: string, poprz: number, biez: number): KpiMetric {
  return { id, kategoria: kat, nazwa, okres_poprzedni: '2024/2025', wartosc_poprzednia: poprz, okres_biezacy: '2025/2026', wartosc_biezaca: biez, created_at: '' }
}
function koh(edycja: string, sezon: 'jesien' | 'wiosna', rok: number, avg: number): Kohorta {
  return { id: edycja, edycja, sezon, rok, n_czlonkow: 20, avg_retention_sem: avg, max_retention_sem: 8, in_progress: false, created_at: '' }
}

describe('buildAlerts', () => {
  it('puste dane → brak alertów', () => {
    expect(buildAlerts([], [], [])).toEqual([])
  })

  it('metryka KPI z dużym spadkiem r/r → alert krytyczny z linkiem /kpi', () => {
    const metrics = [km('m1', 'Wydarzenia', 'Gala', 100, 30)] // ratio 0.3 < 0.6
    const alerts = buildAlerts([], [], metrics)
    const crit = alerts.find((a) => a.severity === 'critical')
    expect(crit).toBeTruthy()
    expect(crit!.href).toBe('/kpi')
  })

  it('umiarkowany spadek (ratio 0.7) → warning', () => {
    const alerts = buildAlerts([], [], [km('m2', 'SKS', 'Luty', 100, 70)])
    expect(alerts.some((a) => a.severity === 'warning' && a.href === '/kpi')).toBe(true)
  })

  it('wzrost r/r → brak alertu KPI', () => {
    const alerts = buildAlerts([], [], [km('m3', 'SKS', 'Listopad', 57, 84)])
    expect(alerts).toEqual([])
  })

  it('spadkowy trend retencji → ostrzeżenie z linkiem /retencja', () => {
    const cohorts = [koh("W'22", 'wiosna', 2022, 4.4), koh("J'24", 'jesien', 2024, 2.1)]
    expect(buildAlerts([], cohorts, []).some((a) => a.href === '/retencja')).toBe(true)
  })

  it('sortuje critical przed warning', () => {
    const metrics = [km('m1', 'Wydarzenia', 'Gala', 100, 30)]
    const cohorts = [koh("W'22", 'wiosna', 2022, 4.4), koh("J'24", 'jesien', 2024, 2.1)]
    const sev = buildAlerts([], cohorts, metrics).map((a) => a.severity)
    expect(sev.lastIndexOf('critical')).toBeLessThan(sev.indexOf('warning'))
  })
})

import { describe, it, expect } from 'vitest'
import { buildAlerts } from '@/lib/stats'
import type { Kohorta, KpiPeriod, Komisja } from '@/types'

function kp(id: string, kod: string, plan: number, real: number): KpiPeriod {
  const komisja: Komisja = { id, kod, nazwa: kod, przewodniczacy: null, created_at: '' }
  return { id, komisja_id: id, komisja, semestr: 'letni 2025/2026', projekty_planowane: plan, projekty_zrealizowane: real, notatka: null, created_at: '' }
}
function koh(edycja: string, sezon: 'jesien' | 'wiosna', rok: number, avg: number): Kohorta {
  return { id: edycja, edycja, sezon, rok, n_czlonkow: 20, avg_retention_sem: avg, max_retention_sem: 8, in_progress: false, created_at: '' }
}

describe('buildAlerts', () => {
  it('puste dane → brak alertów', () => {
    expect(buildAlerts([], [], [])).toEqual([])
  })

  it('komisja głęboko poniżej normy → alert krytyczny z linkiem do /komisje', () => {
    const periods = [
      kp('k1', 'P.KA.', 10, 8), kp('k2', 'P.KF.', 10, 8), kp('k3', 'P.KKZ.', 10, 8),
      kp('k4', 'P.KHR.', 10, 8), kp('k5', 'P.KP.', 10, 8), kp('k6', 'P.KDiJK.', 10, 3),
    ]
    const alerts = buildAlerts([], [], periods)
    const crit = alerts.find((a) => a.severity === 'critical')
    expect(crit).toBeTruthy()
    expect(crit!.href).toBe('/komisje')
  })

  it('spadkowy trend retencji → ostrzeżenie z linkiem do /retencja', () => {
    const cohorts = [koh("W'22", 'wiosna', 2022, 4.4), koh("J'24", 'jesien', 2024, 2.1)]
    const alerts = buildAlerts([], cohorts, [])
    expect(alerts.some((a) => a.href === '/retencja')).toBe(true)
  })

  it('sortuje critical przed warning', () => {
    const periods = [
      kp('k1', 'P.KA.', 10, 8), kp('k2', 'P.KF.', 10, 8), kp('k3', 'P.KKZ.', 10, 8),
      kp('k4', 'P.KHR.', 10, 8), kp('k5', 'P.KP.', 10, 8), kp('k6', 'P.KDiJK.', 10, 3),
    ]
    const cohorts = [koh("W'22", 'wiosna', 2022, 4.4), koh("J'24", 'jesien', 2024, 2.1)]
    const alerts = buildAlerts([], cohorts, periods)
    const sev = alerts.map((a) => a.severity)
    const firstWarning = sev.indexOf('warning')
    const lastCritical = sev.lastIndexOf('critical')
    expect(lastCritical).toBeLessThan(firstWarning)
  })
})

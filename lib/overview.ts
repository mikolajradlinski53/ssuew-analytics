import { mean } from '@/lib/stats'
import type { Rekrutacja, Kohorta, KpiPeriod } from '@/types'

export interface OverviewMetrics {
  avgConversion: number | null
  histRetention: number | null
  lastEdycja: string | null
  lastAccepted: number | null
  lastApplications: number | null
  avgKpiRealization: number | null
}

function round(n: number, dp: number): number {
  const f = 10 ** dp
  return Math.round(n * f) / f
}

export function computeOverview(
  rekrutacje: Rekrutacja[],
  kohorty: Kohorta[],
  kpiPeriods: KpiPeriod[],
): OverviewMetrics {
  const crs = rekrutacje
    .filter((r) => r.zgloszenia > 0)
    .map((r) => (r.przyjeci / r.zgloszenia) * 100)

  const completed = kohorty.filter((k) => !k.in_progress)

  const last =
    [...rekrutacje].sort((a, b) => a.rok - b.rok || (a.sezon === 'wiosna' ? -1 : 1)).at(-1) ?? null

  const kpiPct = kpiPeriods
    .filter((p) => p.projekty_planowane > 0)
    .map((p) => (p.projekty_zrealizowane / p.projekty_planowane) * 100)

  return {
    avgConversion: crs.length ? round(mean(crs), 1) : null,
    histRetention: completed.length ? round(mean(completed.map((k) => k.avg_retention_sem)), 2) : null,
    lastEdycja: last?.edycja ?? null,
    lastAccepted: last?.przyjeci ?? null,
    lastApplications: last?.zgloszenia ?? null,
    avgKpiRealization: kpiPct.length ? round(mean(kpiPct), 1) : null,
  }
}

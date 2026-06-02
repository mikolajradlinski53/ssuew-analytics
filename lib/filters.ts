import type { Sezon } from '@/types'

export type SezonFilter = 'all' | Sezon

export interface Filters {
  sezon: SezonFilter
  fromYear: number | null
  toYear: number | null
}

export const DEFAULT_FILTERS: Filters = { sezon: 'all', fromYear: null, toYear: null }

export function parseFilters(params: URLSearchParams): Filters {
  const sezon = params.get('sezon')
  const from = params.get('from')
  const to = params.get('to')
  return {
    sezon: sezon === 'jesien' || sezon === 'wiosna' ? sezon : 'all',
    fromYear: from && /^\d{4}$/.test(from) ? Number(from) : null,
    toYear: to && /^\d{4}$/.test(to) ? Number(to) : null,
  }
}

export function buildFilterQuery(f: Filters): string {
  const p = new URLSearchParams()
  if (f.sezon !== 'all') p.set('sezon', f.sezon)
  if (f.fromYear != null) p.set('from', String(f.fromYear))
  if (f.toYear != null) p.set('to', String(f.toYear))
  const s = p.toString()
  return s ? `?${s}` : ''
}

interface Edycjowy {
  sezon: Sezon
  rok: number
}

export function applyFilters<T extends Edycjowy>(rows: T[], f: Filters): T[] {
  return rows.filter((r) => {
    if (f.sezon !== 'all' && r.sezon !== f.sezon) return false
    if (f.fromYear != null && r.rok < f.fromYear) return false
    if (f.toYear != null && r.rok > f.toYear) return false
    return true
  })
}

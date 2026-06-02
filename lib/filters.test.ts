import { describe, it, expect } from 'vitest'
import { parseFilters, buildFilterQuery, applyFilters, DEFAULT_FILTERS, type Filters } from '@/lib/filters'

describe('parseFilters', () => {
  it('zwraca domyślne dla pustych parametrów', () => {
    expect(parseFilters(new URLSearchParams())).toEqual(DEFAULT_FILTERS)
  })
  it('czyta sezon i zakres lat', () => {
    const f = parseFilters(new URLSearchParams('sezon=jesien&from=2023&to=2025'))
    expect(f).toEqual({ sezon: 'jesien', fromYear: 2023, toYear: 2025 })
  })
  it('ignoruje nieprawidłowe wartości', () => {
    const f = parseFilters(new URLSearchParams('sezon=xxx&from=abc'))
    expect(f).toEqual({ sezon: 'all', fromYear: null, toYear: null })
  })
})

describe('buildFilterQuery', () => {
  it('pomija domyślne', () => {
    expect(buildFilterQuery(DEFAULT_FILTERS)).toBe('')
  })
  it('serializuje ustawione filtry', () => {
    const f: Filters = { sezon: 'wiosna', fromYear: 2022, toYear: null }
    expect(buildFilterQuery(f)).toBe('?sezon=wiosna&from=2022')
  })
  it('roundtrip parse(build(f)) === f', () => {
    const f: Filters = { sezon: 'jesien', fromYear: 2023, toYear: 2025 }
    const q = buildFilterQuery(f).replace(/^\?/, '')
    expect(parseFilters(new URLSearchParams(q))).toEqual(f)
  })
})

describe('applyFilters', () => {
  const rows = [
    { sezon: 'jesien' as const, rok: 2022 },
    { sezon: 'wiosna' as const, rok: 2024 },
    { sezon: 'jesien' as const, rok: 2025 },
  ]
  it('filtruje po sezonie', () => {
    expect(applyFilters(rows, { sezon: 'jesien', fromYear: null, toYear: null })).toHaveLength(2)
  })
  it('filtruje po zakresie lat', () => {
    expect(applyFilters(rows, { sezon: 'all', fromYear: 2024, toYear: null })).toHaveLength(2)
  })
})

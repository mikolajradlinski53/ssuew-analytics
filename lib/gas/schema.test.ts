import { describe, it, expect } from 'vitest'
import { TABELE, jestTabela } from '@/lib/gas/schema'

describe('schemat zakładek', () => {
  it('zna pięć zakładek arkusza', () => {
    expect(TABELE).toEqual(['rekrutacje', 'kohorty', 'kpi', 'czlonkowie', 'kody'])
  })

  it('rozpoznaje poprawną nazwę zakładki', () => {
    expect(jestTabela('kpi')).toBe(true)
  })

  it('odrzuca nazwę spoza schematu', () => {
    expect(jestTabela('uzytkownicy')).toBe(false)
  })
})

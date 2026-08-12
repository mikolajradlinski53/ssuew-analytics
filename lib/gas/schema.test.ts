import { describe, it, expect } from 'vitest'
import { TABELE, jestTabela } from '@/lib/gas/schema'

describe('schemat zakładek', () => {
  it('zna pięć zakładek arkusza', () => {
    expect(TABELE).toEqual(['rekrutacje', 'kohorty', 'kpi_punkty', 'czlonkowie', 'kody'])
  })

  it('rozpoznaje poprawną nazwę zakładki', () => {
    expect(jestTabela('kpi_punkty')).toBe(true)
  })

  it('odrzuca nazwę spoza schematu', () => {
    expect(jestTabela('uzytkownicy')).toBe(false)
  })

  it('nie wpuszcza już starej zakładki dwuokresowej', () => {
    // `kpi` zostaje w arkuszu jako archiwum, ale aplikacja nie ma prawa jej czytać.
    expect(jestTabela('kpi')).toBe(false)
  })
})

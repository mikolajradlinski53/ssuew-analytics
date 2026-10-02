import { describe, it, expect } from 'vitest'
import { czyOdswiezyc, sladKontekstu, GODZINA_MS } from '@/lib/asystent/odswiezanie'

const ZAPIS = { slad: 'abc', dzien: '02.10.2026', utworzono: 0, model: 'm', odprawa: { podsumowanie: 'x', zagrozenia: [], dzis: [] } }

describe('czyOdswiezyc', () => {
  it('bez zapisanej odprawy - tak', () => {
    expect(czyOdswiezyc(null, 'abc', '02.10.2026', 0)).toBe(true)
  })
  it('w ciągu godziny - nigdy, nawet po zmianie danych', () => {
    expect(czyOdswiezyc(ZAPIS, 'inny', '02.10.2026', GODZINA_MS - 1)).toBe(false)
  })
  it('po godzinie i ze zmienionymi danymi - tak', () => {
    expect(czyOdswiezyc(ZAPIS, 'inny', '02.10.2026', GODZINA_MS)).toBe(true)
  })
  it('po godzinie, te same dane - nie', () => {
    expect(czyOdswiezyc(ZAPIS, 'abc', '02.10.2026', GODZINA_MS * 5)).toBe(false)
  })
  it('nowy dzień - tak, nawet przy tych samych danych', () => {
    expect(czyOdswiezyc(ZAPIS, 'abc', '03.10.2026', GODZINA_MS)).toBe(true)
  })
})

describe('sladKontekstu', () => {
  it('pomija datę - upływ dnia sam nie zmienia śladu', () => {
    const a = { meta: { data: '02.10.2026', dzienTygodnia: 'piątek' }, kpi: [1] } as never
    const b = { meta: { data: '03.10.2026', dzienTygodnia: 'sobota' }, kpi: [1] } as never
    expect(sladKontekstu(a)).toBe(sladKontekstu(b))
    expect(sladKontekstu(a)).not.toBe(sladKontekstu({ ...(a as object), kpi: [2] } as never))
  })
})

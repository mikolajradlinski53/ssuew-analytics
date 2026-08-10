import { describe, it, expect } from 'vitest'
import { rozpatrzKod, normalizujKod, losujKod, DLUGOSC_KODU } from '@/lib/auth/kody'
import type { KodDostepu } from '@/types'

function kod(nadpisz: Partial<KodDostepu> = {}): KodDostepu {
  return {
    id: 'k1',
    kod: '482913',
    etykieta: 'Jula',
    rola: 'board',
    urzadzenie: '',
    ip_pierwszy: '',
    ostatnie_uzycie: '',
    aktywny: true,
    created_at: '',
    ...nadpisz,
  }
}

describe('normalizujKod', () => {
  it('zostawia same cyfry, bo w arkuszu kod bywa rozdzielony', () => {
    expect(normalizujKod(' 482 913 ')).toBe('482913')
    expect(normalizujKod('482-913')).toBe('482913')
  })
})

describe('losujKod', () => {
  it('daje sześć cyfr', () => {
    expect(losujKod()).toMatch(/^\d+$/)
    expect(losujKod()).toHaveLength(DLUGOSC_KODU)
  })
  it('nie powtarza się w kolejnych wywołaniach', () => {
    const partia = new Set(Array.from({ length: 50 }, () => losujKod()))
    expect(partia.size).toBeGreaterThan(45)
  })
})

describe('rozpatrzKod', () => {
  it('wpuszcza nieużywany kod i wiąże go z urządzeniem', () => {
    const w = rozpatrzKod([kod()], '482913', null)
    expect(w.ok).toBe(true)
    if (!w.ok) return
    expect(w.pierwszeUzycie).toBe(true)
    expect(w.urzadzenie).toHaveLength(32)
  })

  it('wpuszcza znane urządzenie i nie zmienia przypisania', () => {
    const w = rozpatrzKod([kod({ urzadzenie: 'u-abc' })], '482913', 'u-abc')
    expect(w.ok).toBe(true)
    if (!w.ok) return
    expect(w.pierwszeUzycie).toBe(false)
    expect(w.urzadzenie).toBe('u-abc')
  })

  it('odmawia, gdy kod jest już związany z innym urządzeniem', () => {
    const w = rozpatrzKod([kod({ urzadzenie: 'u-abc' })], '482913', 'u-inne')
    expect(w).toEqual({ ok: false, powod: 'inne-urzadzenie' })
  })

  it('odmawia, gdy urządzenie w ogóle się nie przedstawia, a kod jest zajęty', () => {
    const w = rozpatrzKod([kod({ urzadzenie: 'u-abc' })], '482913', null)
    expect(w).toEqual({ ok: false, powod: 'inne-urzadzenie' })
  })

  it('odmawia kodowi wyłączonemu', () => {
    const w = rozpatrzKod([kod({ aktywny: false })], '482913', null)
    expect(w).toEqual({ ok: false, powod: 'nieaktywny' })
  })

  it('odmawia kodowi, którego nie ma na liście', () => {
    const w = rozpatrzKod([kod()], '000000', null)
    expect(w).toEqual({ ok: false, powod: 'nieznany' })
  })

  it('odmawia pustemu wpisowi bez przeszukiwania listy', () => {
    expect(rozpatrzKod([kod()], '   ', null)).toEqual({ ok: false, powod: 'nieznany' })
  })
})

import { describe, it, expect } from 'vitest'
import { rozpatrzKod, normalizujKod } from '@/lib/auth/kody'
import type { KodDostepu } from '@/types'

function kod(nadpisz: Partial<KodDostepu> = {}): KodDostepu {
  return {
    id: 'k1',
    kod: 'DECK-START',
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
  it('nie zważa na wielkość liter ani spacje', () => {
    expect(normalizujKod('  deck-start ')).toBe('DECK-START')
  })
})

describe('rozpatrzKod', () => {
  it('wpuszcza nieużywany kod i wiąże go z urządzeniem', () => {
    const w = rozpatrzKod([kod()], 'deck-start', null)
    expect(w.ok).toBe(true)
    if (!w.ok) return
    expect(w.pierwszeUzycie).toBe(true)
    expect(w.urzadzenie).toHaveLength(32)
  })

  it('wpuszcza znane urządzenie i nie zmienia przypisania', () => {
    const w = rozpatrzKod([kod({ urzadzenie: 'u-abc' })], 'DECK-START', 'u-abc')
    expect(w.ok).toBe(true)
    if (!w.ok) return
    expect(w.pierwszeUzycie).toBe(false)
    expect(w.urzadzenie).toBe('u-abc')
  })

  it('odmawia, gdy kod jest już związany z innym urządzeniem', () => {
    const w = rozpatrzKod([kod({ urzadzenie: 'u-abc' })], 'DECK-START', 'u-inne')
    expect(w).toEqual({ ok: false, powod: 'inne-urzadzenie' })
  })

  it('odmawia, gdy urządzenie w ogóle się nie przedstawia, a kod jest zajęty', () => {
    const w = rozpatrzKod([kod({ urzadzenie: 'u-abc' })], 'DECK-START', null)
    expect(w).toEqual({ ok: false, powod: 'inne-urzadzenie' })
  })

  it('odmawia kodowi wyłączonemu', () => {
    const w = rozpatrzKod([kod({ aktywny: false })], 'DECK-START', null)
    expect(w).toEqual({ ok: false, powod: 'nieaktywny' })
  })

  it('odmawia kodowi, którego nie ma na liście', () => {
    const w = rozpatrzKod([kod()], 'CZEGOS-TAKIEGO-NIE-MA', null)
    expect(w).toEqual({ ok: false, powod: 'nieznany' })
  })

  it('odmawia pustemu wpisowi bez przeszukiwania listy', () => {
    expect(rozpatrzKod([kod()], '   ', null)).toEqual({ ok: false, powod: 'nieznany' })
  })
})

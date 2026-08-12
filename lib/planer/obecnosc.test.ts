import { describe, it, expect } from 'vitest'
import { aktualni, inicjaly, kolorOsoby, type Znak } from '@/lib/planer/obecnosc'

const teraz = Date.now()

function znak(nadpisz: Partial<Znak> = {}): Znak {
  return { uid: 'u1', kto: 'Jula', ostatniZnak: teraz, patrzyNa: null, ...nadpisz }
}

describe('aktualni', () => {
  it('zostawia znak sprzed 30 sekund', () => {
    expect(aktualni([znak({ ostatniZnak: teraz - 30_000 })], teraz)).toHaveLength(1)
  })

  it('odsiewa znak sprzed trzech minut', () => {
    // Gwałtownie zamknięta przeglądarka nie zdąży się wymeldować — bez wygasania
    // pasek pokazywałby duchy.
    expect(aktualni([znak({ ostatniZnak: teraz - 180_000 })], teraz)).toHaveLength(0)
  })

  it('nie gubi nikogo, gdy wszyscy są świeży', () => {
    const lista = [znak({ uid: 'a' }), znak({ uid: 'b' })]
    expect(aktualni(lista, teraz)).toHaveLength(2)
  })
})

describe('inicjaly', () => {
  it('bierze dwie pierwsze litery', () => {
    expect(inicjaly('Jula')).toBe('JU')
  })
  it('dla „wszyscy" daje gwiazdkę', () => {
    expect(inicjaly('wszyscy')).toBe('★')
  })
  it('radzi sobie z jedną literą', () => {
    expect(inicjaly('J')).toBe('J')
  })
})

describe('kolorOsoby', () => {
  it('daje ten sam kolor przy każdym wywołaniu', () => {
    expect(kolorOsoby('Jula')).toBe(kolorOsoby('Jula'))
  })
  it('rozróżnia różne imiona', () => {
    expect(kolorOsoby('Jula')).not.toBe(kolorOsoby('Kuba'))
  })
  it('zawsze zwraca kolor w zapisie szesnastkowym', () => {
    expect(kolorOsoby('Ćwikła')).toMatch(/^#[0-9a-f]{6}$/i)
  })
})

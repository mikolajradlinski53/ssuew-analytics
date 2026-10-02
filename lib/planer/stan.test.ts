import { describe, it, expect } from 'vitest'
import {
  naStanSesji, naSklad, dodajDoSkladu, usunZeSkladu, opiszTrwanie,
} from '@/lib/planer/stan'

describe('naStanSesji', () => {
  it('brak dokumentu semestru to wyłączona sesja', () => {
    expect(naStanSesji(undefined)).toEqual({ wlaczony: false, od: null, przez: null })
  })

  it('czyta włączoną sesję', () => {
    expect(naStanSesji({ trybWspolny: true, trybWspolnyOd: 1000, trybWspolnyPrzez: 'ja' }))
      .toEqual({ wlaczony: true, od: 1000, przez: 'ja' })
  })
})

describe('Skład', () => {
  it('naSklad odrzuca puste i nie-tekstowe wpisy', () => {
    expect(naSklad({ osoby: ['Jula', '', 3, '  ', 'Kuba'] })).toEqual(['Jula', 'Kuba'])
    expect(naSklad(undefined)).toEqual([])
  })

  it('dodaje osobę bez spacji na brzegach', () => {
    expect(dodajDoSkladu(['Jula'], '  Kuba ')).toEqual(['Jula', 'Kuba'])
  })

  it('nie dubluje osoby niezależnie od wielkości liter', () => {
    const sklad = ['Jula']
    expect(dodajDoSkladu(sklad, 'jula')).toBe(sklad)
  })

  it('nie przyjmuje słowa „wszyscy” - to zarezerwowany znacznik całego zarządu', () => {
    const sklad = ['Jula']
    expect(dodajDoSkladu(sklad, 'Wszyscy')).toBe(sklad)
  })

  it('usuwa osobę', () => {
    expect(usunZeSkladu(['Jula', 'Kuba'], 'Jula')).toEqual(['Kuba'])
  })
})

describe('opiszTrwanie', () => {
  it('poniżej godziny same minuty', () => {
    expect(opiszTrwanie(0, 25 * 60_000)).toBe('25 min')
  })

  it('godziny i minuty', () => {
    expect(opiszTrwanie(0, 80 * 60_000)).toBe('1 h 20 min')
  })
})

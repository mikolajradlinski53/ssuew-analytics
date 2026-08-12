import { describe, it, expect } from 'vitest'
import { kolizjeWMiesiacu } from '@/lib/planer/kolizje'
import type { Wydarzenie } from '@/lib/planer/typy'

function w(nadpisz: Partial<Wydarzenie> = {}): Wydarzenie {
  return {
    id: Math.random().toString(36).slice(2),
    tytul: 'Zebranie',
    kategoria: 'ZEBRANIA',
    rok: 2026,
    miesiac: 10,
    dzien: 7,
    godzina: null,
    sala: null,
    osoby: [],
    ...nadpisz,
  }
}

describe('kolizje osób', () => {
  it('dwa wydarzenia tej samej osoby bez godzin to kolizja miękka', () => {
    const k = kolizjeWMiesiacu([w({ osoby: ['Jula'] }), w({ osoby: ['Jula'] })])
    expect(k.get(7)?.osoby[0]).toMatchObject({ osoba: 'Jula', ile: 2, twarda: false })
  })

  it('godziny w odstępie 60 minut to kolizja twarda', () => {
    const k = kolizjeWMiesiacu([
      w({ osoby: ['Jula'], godzina: '17:00' }),
      w({ osoby: ['Jula'], godzina: '18:00' }),
    ])
    expect(k.get(7)?.osoby[0].twarda).toBe(true)
  })

  it('godziny w odstępie 120 minut nie są twarde', () => {
    const k = kolizjeWMiesiacu([
      w({ osoby: ['Jula'], godzina: '16:00' }),
      w({ osoby: ['Jula'], godzina: '18:00' }),
    ])
    expect(k.get(7)?.osoby[0].twarda).toBe(false)
  })

  it('jedno wydarzenie osoby to nie kolizja', () => {
    expect(kolizjeWMiesiacu([w({ osoby: ['Jula'] })]).get(7)).toBeUndefined()
  })

  it('„wszyscy” nie tworzy kolizji', () => {
    // Inaczej każde zebranie zarządu kolidowałoby z każdym wydarzeniem tego dnia
    // i ostrzeżenia straciłyby sens.
    const k = kolizjeWMiesiacu([w({ osoby: ['wszyscy'] }), w({ osoby: ['wszyscy'] })])
    expect(k.get(7)).toBeUndefined()
  })

  it('nie miesza dni', () => {
    const k = kolizjeWMiesiacu([w({ osoby: ['Jula'], dzien: 7 }), w({ osoby: ['Jula'], dzien: 8 })])
    expect(k.size).toBe(0)
  })
})

describe('kolizje sal', () => {
  it('ta sama sala w odstępie 30 minut to kolizja', () => {
    const k = kolizjeWMiesiacu([
      w({ sala: '9J', godzina: '17:00' }),
      w({ sala: '9J', godzina: '17:30' }),
    ])
    expect(k.get(7)?.sale[0]).toMatchObject({ sala: '9J' })
  })

  it('ta sama sala w odstępie 3 godzin to nie kolizja', () => {
    const k = kolizjeWMiesiacu([
      w({ sala: '9J', godzina: '15:00' }),
      w({ sala: '9J', godzina: '18:00' }),
    ])
    expect(k.get(7)).toBeUndefined()
  })

  it('sala bez godziny nie tworzy kolizji', () => {
    // Bez godzin nie da się orzec konfliktu sali.
    const k = kolizjeWMiesiacu([w({ sala: '9J' }), w({ sala: '9J' })])
    expect(k.get(7)).toBeUndefined()
  })
})

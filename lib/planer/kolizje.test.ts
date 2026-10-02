import { describe, it, expect } from 'vitest'
import { kolizjeWMiesiacu } from '@/lib/planer/kolizje'
import { POLA_DOMYSLNE, type Wydarzenie } from '@/lib/planer/typy'

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
    ...POLA_DOMYSLNE,
    ...nadpisz,
  }
}

const PAZ = { m: 10, y: 2026 }

describe('kolizje osób', () => {
  it('dwa wydarzenia tej samej osoby bez godzin to kolizja miękka', () => {
    const k = kolizjeWMiesiacu([w({ osoby: ['Jula'] }), w({ osoby: ['Jula'] })], PAZ)
    expect(k.get(7)?.osoby[0]).toMatchObject({ osoba: 'Jula', ile: 2, twarda: false })
  })

  it('godziny w odstępie 60 minut to kolizja twarda', () => {
    const k = kolizjeWMiesiacu([
      w({ osoby: ['Jula'], godzina: '17:00' }),
      w({ osoby: ['Jula'], godzina: '18:00' }),
    ], PAZ)
    expect(k.get(7)?.osoby[0].twarda).toBe(true)
  })

  it('godziny w odstępie 120 minut nie są twarde', () => {
    const k = kolizjeWMiesiacu([
      w({ osoby: ['Jula'], godzina: '16:00' }),
      w({ osoby: ['Jula'], godzina: '18:00' }),
    ], PAZ)
    expect(k.get(7)?.osoby[0].twarda).toBe(false)
  })

  it('jedno wydarzenie osoby to nie kolizja', () => {
    expect(kolizjeWMiesiacu([w({ osoby: ['Jula'] })], PAZ).get(7)).toBeUndefined()
  })

  it('„wszyscy” nie tworzy kolizji', () => {
    // Inaczej każde zebranie zarządu kolidowałoby z każdym wydarzeniem tego dnia
    // i ostrzeżenia straciłyby sens.
    const k = kolizjeWMiesiacu([w({ osoby: ['wszyscy'] }), w({ osoby: ['wszyscy'] })], PAZ)
    expect(k.get(7)).toBeUndefined()
  })

  it('nie miesza dni', () => {
    const k = kolizjeWMiesiacu([w({ osoby: ['Jula'], dzien: 7 }), w({ osoby: ['Jula'], dzien: 8 })], PAZ)
    expect(k.size).toBe(0)
  })
})

describe('kolizje sal', () => {
  it('ta sama sala w odstępie 30 minut to kolizja', () => {
    const k = kolizjeWMiesiacu([
      w({ sala: '9J', godzina: '17:00' }),
      w({ sala: '9J', godzina: '17:30' }),
    ], PAZ)
    expect(k.get(7)?.sale[0]).toMatchObject({ sala: '9J' })
  })

  it('ta sama sala w odstępie 3 godzin to nie kolizja', () => {
    const k = kolizjeWMiesiacu([
      w({ sala: '9J', godzina: '15:00' }),
      w({ sala: '9J', godzina: '18:00' }),
    ], PAZ)
    expect(k.get(7)).toBeUndefined()
  })

  it('sala bez godziny nie tworzy kolizji', () => {
    // Bez godzin nie da się orzec konfliktu sali.
    const k = kolizjeWMiesiacu([w({ sala: '9J' }), w({ sala: '9J' })], PAZ)
    expect(k.get(7)).toBeUndefined()
  })
})

describe('kolizje - przedziały, całe dni, wiele dni', () => {
  it('nakładające się przedziały od-do to kolizja twarda', () => {
    const k = kolizjeWMiesiacu([
      w({ osoby: ['Jula'], godzina: '16:00', godzinaDo: '19:00' }),
      w({ osoby: ['Jula'], godzina: '18:30', godzinaDo: '20:00' }),
    ], PAZ)
    expect(k.get(7)?.osoby[0].twarda).toBe(true)
  })

  it('przedziały stykające się końcem nie kolidują', () => {
    const k = kolizjeWMiesiacu([
      w({ osoby: ['Jula'], godzina: '17:00', godzinaDo: '18:00' }),
      w({ osoby: ['Jula'], godzina: '18:00', godzinaDo: '19:00' }),
    ], PAZ)
    expect(k.get(7)?.osoby[0].twarda).toBe(false)
  })

  it('osoba na wydarzeniu całodniowym jest zajęta cały dzień', () => {
    const k = kolizjeWMiesiacu([
      w({ osoby: ['Jula'], calyDzien: true }),
      w({ osoby: ['Jula'], godzina: '21:00' }),
    ], PAZ)
    expect(k.get(7)?.osoby[0].twarda).toBe(true)
  })

  it('wyjazd ze startem w październiku koliduje z listopadowym zebraniem tej osoby', () => {
    const k = kolizjeWMiesiacu([
      w({ osoby: ['Jula'], dzien: 30, dni: 4 }),
      w({ osoby: ['Jula'], miesiac: 11, dzien: 1, godzina: '18:00' }),
    ], { m: 11, y: 2026 })
    expect(k.get(1)?.osoby[0]).toMatchObject({ osoba: 'Jula', twarda: true })
  })

  it('ta sama sala w różnych budynkach to dwa miejsca', () => {
    const k = kolizjeWMiesiacu([
      w({ budynek: 'B/L', sala: '110L', godzina: '17:00' }),
      w({ budynek: 'CKU', sala: '110L', godzina: '17:00' }),
    ], PAZ)
    expect(k.get(7)).toBeUndefined()
  })

  it('ten sam budynek i sala w tym samym czasie to kolizja z nazwą miejsca', () => {
    const k = kolizjeWMiesiacu([
      w({ budynek: 'B/L', sala: '110L', godzina: '17:00' }),
      w({ budynek: 'B/L', sala: '110L', godzina: '17:30' }),
    ], PAZ)
    expect(k.get(7)?.sale[0].sala).toBe('B/L 110L')
  })

  it('„Poza uczelnią” nie daje kolizji sali', () => {
    const k = kolizjeWMiesiacu([
      w({ budynek: 'POZA', sala: 'Pralnia', godzina: '20:00' }),
      w({ budynek: 'POZA', sala: 'Pralnia', godzina: '20:00' }),
    ], PAZ)
    expect(k.get(7)).toBeUndefined()
  })
})

describe('kolizje - przez północ', () => {
  it('impreza 18:00-04:00 koliduje z wydarzeniem tej osoby o 23:00', () => {
    const k = kolizjeWMiesiacu([
      w({ osoby: ['Jula'], godzina: '18:00', godzinaDo: '04:00' }),
      w({ osoby: ['Jula'], godzina: '23:00', godzinaDo: '23:30' }),
    ], PAZ)
    expect(k.get(7)?.osoby[0].twarda).toBe(true)
  })

  it('impreza 18:00-04:00 nie koliduje z porannym wydarzeniem tego samego dnia', () => {
    const k = kolizjeWMiesiacu([
      w({ osoby: ['Jula'], godzina: '18:00', godzinaDo: '04:00' }),
      w({ osoby: ['Jula'], godzina: '09:00', godzinaDo: '10:00' }),
    ], PAZ)
    expect(k.get(7)?.osoby[0].twarda).toBe(false)
  })
})

describe('kolizje - aplikacje', () => {
  it('nabór aplikacji nie koliduje z wydarzeniem tej samej osoby', () => {
    // Aplikacje to termin, nie spotkanie - nikt nie siedzi na nich w sali.
    const k = kolizjeWMiesiacu([
      w({ osoby: ['Jula'], kategoria: 'APLIKACJE', calyDzien: true }),
      w({ osoby: ['Jula'], godzina: '18:00' }),
    ], PAZ)
    expect(k.get(7)).toBeUndefined()
  })

  it('aplikacje nie zajmują sali', () => {
    const k = kolizjeWMiesiacu([
      w({ kategoria: 'APLIKACJE', budynek: 'B/L', sala: '110L', godzina: '17:00' }),
      w({ budynek: 'B/L', sala: '110L', godzina: '17:00' }),
    ], PAZ)
    expect(k.get(7)).toBeUndefined()
  })
})

describe('kolizje - miejsca spoza budynków', () => {
  it('dwa spotkania online o tej samej porze nie kolidują salą', () => {
    const k = kolizjeWMiesiacu([
      w({ budynek: 'ONLINE', sala: 'Teams', godzina: '20:00' }),
      w({ budynek: 'ONLINE', sala: 'Teams', godzina: '20:00' }),
    ], PAZ)
    expect(k.get(7)).toBeUndefined()
  })
})

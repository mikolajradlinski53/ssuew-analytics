import { describe, it, expect } from 'vitest'
import { naWydarzenie } from '@/lib/planer/mapowanie'

describe('naWydarzenie', () => {
  it('składa wydarzenie z dokumentu Firestore', () => {
    const w = naWydarzenie('abc', {
      tytul: 'ZEBRANIE ZARZĄDU',
      kategoria: 'ZEBRANIA',
      rok: 2026, miesiac: 10, dzien: 7,
      godzina: '18:00', sala: '9J', osoby: ['Jula'],
    })
    expect(w).toEqual({
      id: 'abc',
      tytul: 'ZEBRANIE ZARZĄDU',
      kategoria: 'ZEBRANIA',
      rok: 2026, miesiac: 10, dzien: 7,
      godzina: '18:00', sala: '9J', osoby: ['Jula'],
    })
  })

  it('uzupełnia braki bezpiecznymi wartościami', () => {
    // Dokument może przyjść niekompletny — ręcznie dopisany w konsoli Firebase
    // albo zapisany starszą wersją aplikacji. Jedno takie wydarzenie nie może
    // wysadzić całego kalendarza.
    const w = naWydarzenie('x', { tytul: 'Coś' })
    expect(w).toMatchObject({ osoby: [], godzina: null, sala: null, kategoria: 'INNE' })
  })

  it('odrzuca nieznaną kategorię na rzecz INNE', () => {
    expect(naWydarzenie('x', { kategoria: 'WYCIECZKA' }).kategoria).toBe('INNE')
  })

  it('pustą godzinę i salę zamienia na null, nie na pusty napis', () => {
    // Pusty napis przeszedłby przez `if (w.godzina)` jako fałsz, ale w Firestore
    // zajmowałby pole i mylił przy ręcznym przeglądaniu bazy.
    const w = naWydarzenie('x', { godzina: '', sala: '' })
    expect(w.godzina).toBeNull()
    expect(w.sala).toBeNull()
  })
})

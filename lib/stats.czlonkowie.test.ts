import { describe, it, expect } from 'vitest'
import { kolejneSemestry, memberStatusCounts, survivalFromMembers } from '@/lib/stats'
import type { Czlonek } from '@/types'

function cz(id: string, status: Czlonek['status'], aktywnosc: number[]): Czlonek {
  return { id, kohorta_edycja: "J'24", imie_nazwisko: 'X', status, aktywnosc, created_at: '' }
}

describe('kolejneSemestry', () => {
  it('generuje kolejne semestry od jesieni 2024 do W27', () => {
    expect(kolejneSemestry('jesien', 2024, 5).map((s) => s.label)).toEqual(["W'25", "J'25", "W'26", "J'26", "W'27"])
  })
  it('start od wiosny', () => {
    expect(kolejneSemestry('wiosna', 2025, 2).map((s) => s.label)).toEqual(["J'25", "W'26"])
  })
})

describe('memberStatusCounts', () => {
  it('zlicza statusy', () => {
    const m = [cz('1', 'aktywny', []), cz('2', 'aktywny', []), cz('3', 'alumn', [])]
    const c = memberStatusCounts(m)
    expect(c.aktywny).toBe(2)
    expect(c.alumn).toBe(1)
    expect(c.zawieszone).toBe(0)
  })
})

describe('survivalFromMembers', () => {
  it('liczy % aktywnych per semestr (z wiodącym 100)', () => {
    const m = [cz('1', 'aktywny', [1, 1, 0]), cz('2', 'aktywny', [1, 0, 0]), cz('3', 'nieaktywny', [0, 0, 0]), cz('4', 'aktywny', [2, 1, 0])]
    // sem0: 3/4 aktywni=75, sem1: 2/4=50, sem2: 0/4=0
    expect(survivalFromMembers(m)).toEqual([100, 75, 50, 0])
  })
  it('puste → [100]', () => {
    expect(survivalFromMembers([])).toEqual([100])
  })
})

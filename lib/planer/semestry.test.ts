import { describe, it, expect } from 'vitest'
import { idSemestru, nazwaSemestru, miesiaceSemestru, opisSemestru } from '@/lib/planer/semestry'

describe('semestry', () => {
  it('składa identyfikator z roku akademickiego i typu', () => {
    expect(idSemestru(2026, 'Z')).toBe('2026Z')
    expect(idSemestru(2026, 'L')).toBe('2026L')
  })

  it('nazywa semestr po ludzku', () => {
    expect(nazwaSemestru(2026, 'Z')).toBe('Zimowy 2026/2027')
    expect(nazwaSemestru(2026, 'L')).toBe('Letni 2026/2027')
  })

  it('zimowy trwa od października do lutego następnego roku', () => {
    expect(miesiaceSemestru(2026, 'Z')).toEqual([
      { m: 10, y: 2026 }, { m: 11, y: 2026 }, { m: 12, y: 2026 },
      { m: 1, y: 2027 }, { m: 2, y: 2027 },
    ])
  })

  it('letni trwa od marca do czerwca', () => {
    expect(miesiaceSemestru(2026, 'L')).toEqual([
      { m: 3, y: 2027 }, { m: 4, y: 2027 }, { m: 5, y: 2027 }, { m: 6, y: 2027 },
    ])
  })

  it('składa gotowy opis semestru', () => {
    const s = opisSemestru(2026, 'Z')
    expect(s).toMatchObject({ id: '2026Z', nazwa: 'Zimowy 2026/2027', archiwalny: false })
    expect(s.miesiace).toHaveLength(5)
  })
})

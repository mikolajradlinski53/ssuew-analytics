import { describe, it, expect } from 'vitest'
import { poWydarzeniach, type Komentarz } from '@/lib/planer/komentarze'

function k(id: string, wydarzenieId: string, utworzone: number): Komentarz {
  return { id, wydarzenieId, tresc: 'x', autor: 'Jula', utworzone }
}

describe('poWydarzeniach', () => {
  it('grupuje komentarze po wydarzeniu', () => {
    const mapa = poWydarzeniach([k('1', 'w1', 1), k('2', 'w2', 2), k('3', 'w1', 3)])
    expect(mapa.get('w1')).toHaveLength(2)
    expect(mapa.get('w2')).toHaveLength(1)
  })

  it('wydarzenie bez komentarzy nie ma wpisu', () => {
    expect(poWydarzeniach([k('1', 'w1', 1)]).get('w2')).toBeUndefined()
  })

  it('układa od najstarszego, bo wątek czyta się od początku', () => {
    const mapa = poWydarzeniach([k('nowy', 'w1', 200), k('stary', 'w1', 100)])
    expect(mapa.get('w1')!.map((x) => x.id)).toEqual(['stary', 'nowy'])
  })

  it('pusta lista daje pustą mapę', () => {
    expect(poWydarzeniach([]).size).toBe(0)
  })
})

import { describe, it, expect } from 'vitest'
import { sprawdzRozmowe, rozmowaDlaGemini, LIMIT_HISTORII, LIMIT_ZNAKOW, INSTRUKCJA_CZATU } from '@/lib/asystent/czat'

const K = { meta: { data: '02.10.2026', dzienTygodnia: 'piątek' } } as never

describe('sprawdzRozmowe', () => {
  it('przyjmuje rozmowę kończącą się pytaniem', () => {
    expect(sprawdzRozmowe({ wiadomosci: [{ rola: 'ja', tresc: ' Co z KPI? ' }] })).toEqual([{ rola: 'ja', tresc: 'Co z KPI?' }])
  })

  it('odrzuca pustą, z nieznaną rolą i bez pytania na końcu', () => {
    expect(sprawdzRozmowe({ wiadomosci: [] })).toBeNull()
    expect(sprawdzRozmowe({ wiadomosci: [{ rola: 'system', tresc: 'x' }] })).toBeNull()
    expect(sprawdzRozmowe({ wiadomosci: [{ rola: 'ja', tresc: '   ' }] })).toBeNull()
    expect(sprawdzRozmowe({ wiadomosci: [{ rola: 'ja', tresc: 'a' }, { rola: 'deck', tresc: 'b' }] })).toBeNull()
    expect(sprawdzRozmowe(null)).toBeNull()
  })

  it('przycina historię i za długie wiadomości', () => {
    const dluga = Array.from({ length: 30 }, (_, i) => ({ rola: i % 2 ? 'deck' : 'ja', tresc: `w${i}` }))
    dluga.push({ rola: 'ja', tresc: 'x'.repeat(LIMIT_ZNAKOW + 50) })
    const r = sprawdzRozmowe({ wiadomosci: dluga })!
    expect(r).toHaveLength(LIMIT_HISTORII)
    expect(r[r.length - 1].tresc).toHaveLength(LIMIT_ZNAKOW)
  })
})

describe('rozmowaDlaGemini', () => {
  it('najpierw obraz projektu, potem rozmowa w rolach Gemini', () => {
    const r = rozmowaDlaGemini(K, [{ rola: 'ja', tresc: 'Pytanie' }, { rola: 'deck', tresc: 'Odpowiedź' }, { rola: 'ja', tresc: 'Dalej' }])
    expect(r[0].rola).toBe('user')
    expect(r[0].tekst).toContain('"02.10.2026"')
    expect(r[1].rola).toBe('model')
    expect(r.slice(2)).toEqual([
      { rola: 'user', tekst: 'Pytanie' },
      { rola: 'model', tekst: 'Odpowiedź' },
      { rola: 'user', tekst: 'Dalej' },
    ])
  })

  it('historia ucięta w połowie zaczyna się od pytania, nie od odpowiedzi', () => {
    const r = rozmowaDlaGemini(K, [{ rola: 'deck', tresc: 'stara odpowiedź' }, { rola: 'ja', tresc: 'Pytanie' }])
    expect(r.slice(2)).toEqual([{ rola: 'user', tekst: 'Pytanie' }])
  })

  it('dwa pytania z rzędu skleja w jedno', () => {
    const r = rozmowaDlaGemini(K, [{ rola: 'ja', tresc: 'A' }, { rola: 'ja', tresc: 'B' }])
    expect(r.slice(2)).toEqual([{ rola: 'user', tekst: 'A\n\nB' }])
  })

  it('instrukcja zakazuje długich myślników', () => {
    expect(INSTRUKCJA_CZATU).toMatch(/„-”/)
  })
})

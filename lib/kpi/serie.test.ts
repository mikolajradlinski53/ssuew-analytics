import { describe, it, expect } from 'vitest'
import { serieZWierszy, ilorazSerii, ostatniPunkt, serieWgKategorii, porownajOkresy } from '@/lib/kpi/serie'
import type { KpiMetric } from '@/types'

function w(
  kategoria: string, nazwa: string, okres: string, wartosc: number, created_at = '2026-01-01',
): KpiMetric {
  return { id: `${kategoria}-${nazwa}-${okres}-${created_at}`, kategoria, nazwa, okres, wartosc, created_at }
}

describe('serieZWierszy', () => {
  it('skleja wiersze tej samej metryki w jedną serię', () => {
    const serie = serieZWierszy([
      w('Koordynatorzy', 'Adapciak', '2025/2026', 1),
      w('Koordynatorzy', 'Adapciak', '2024/2025', 2),
    ])
    expect(serie).toHaveLength(1)
    expect(serie[0].punkty.map((p) => p.okres)).toEqual(['2024/2025', '2025/2026'])
    expect(serie[0].punkty.map((p) => p.wartosc)).toEqual([2, 1])
  })

  it('przy powtórzonym okresie zostawia wiersz o późniejszym created_at', () => {
    const serie = serieZWierszy([
      w('SKS', 'Listopad', '2025/2026', 57, '2026-01-01'),
      w('SKS', 'Listopad', '2025/2026', 84, '2026-06-01'),
    ])
    expect(serie[0].punkty).toHaveLength(1)
    expect(serie[0].punkty[0].wartosc).toBe(84)
  })

  it('kolejność wejścia nie decyduje — starszy wiersz nie nadpisze nowszego', () => {
    const serie = serieZWierszy([
      w('SKS', 'Listopad', '2025/2026', 84, '2026-06-01'),
      w('SKS', 'Listopad', '2025/2026', 57, '2026-01-01'),
    ])
    expect(serie[0].punkty[0].wartosc).toBe(84)
  })

  it('różne nazwy w tej samej kategorii dają osobne serie', () => {
    const serie = serieZWierszy([
      w('Koordynatorzy', 'Gala', '2024/2025', 1),
      w('Koordynatorzy', 'Adapciak', '2024/2025', 2),
    ])
    expect(serie.map((s) => s.nazwa)).toEqual(['Adapciak', 'Gala'])
  })

  it('sortuje okresy po roku, nie leksykalnie', () => {
    const serie = serieZWierszy([
      w('X', 'Y', 'letni 2026/2027', 3),
      w('X', 'Y', '2024/2025', 1),
      w('X', 'Y', 'zimowy 2025/2026', 2),
    ])
    expect(serie[0].punkty.map((p) => p.wartosc)).toEqual([1, 2, 3])
  })

  it('punkt niesie id swojego wiersza', () => {
    const wiersz = w('X', 'Y', '2024/2025', 1)
    const serie = serieZWierszy([wiersz])
    expect(serie[0].punkty[0].id).toBe(wiersz.id)
  })

  it('pusta lista daje pustą listę', () => {
    expect(serieZWierszy([])).toEqual([])
  })
})

describe('porownajOkresy', () => {
  it('bez czterocyfrowego roku schodzi do porównania tekstowego', () => {
    expect(porownajOkresy('alfa', 'beta')).toBeLessThan(0)
  })
})

describe('ilorazSerii', () => {
  const seria = (wartosci: number[]) => ({
    kategoria: 'X',
    nazwa: 'Y',
    punkty: wartosci.map((v, i) => ({ id: String(i), okres: `${2020 + i}/${2021 + i}`, wartosc: v })),
  })

  it('liczy z dwóch ostatnich punktów, nie z pierwszych', () => {
    expect(ilorazSerii(seria([10, 2, 1]))).toBe(0.5)
  })

  it('seria jednopunktowa daje 0', () => {
    expect(ilorazSerii(seria([5]))).toBe(0)
  })

  it('seria pusta daje 0', () => {
    expect(ilorazSerii(seria([]))).toBe(0)
  })

  it('zerowy mianownik daje 0', () => {
    expect(ilorazSerii(seria([0, 7]))).toBe(0)
  })
})

describe('ostatniPunkt', () => {
  it('zwraca null dla serii pustej', () => {
    expect(ostatniPunkt({ kategoria: 'X', nazwa: 'Y', punkty: [] })).toBeNull()
  })

  it('zwraca ostatni, nie pierwszy', () => {
    const serie = serieZWierszy([
      w('X', 'Y', '2024/2025', 1),
      w('X', 'Y', '2025/2026', 9),
    ])
    expect(ostatniPunkt(serie[0])?.wartosc).toBe(9)
  })
})

describe('serieWgKategorii', () => {
  it('grupuje po kategorii z zachowaniem kolejności', () => {
    const serie = serieZWierszy([
      w('A', 'jeden', '2024/2025', 1),
      w('B', 'dwa', '2024/2025', 2),
      w('A', 'trzy', '2024/2025', 3),
    ])
    const mapa = serieWgKategorii(serie)
    expect([...mapa.keys()]).toEqual(['A', 'B'])
    expect(mapa.get('A')).toHaveLength(2)
  })
})

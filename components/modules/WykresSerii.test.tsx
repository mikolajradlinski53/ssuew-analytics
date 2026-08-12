import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { WykresSerii } from '@/components/modules/WykresSerii'
import type { PunktKpi } from '@/types'

const punkty = (wartosci: number[]): PunktKpi[] =>
  wartosci.map((v, i) => ({ id: String(i), okres: `${2020 + i}/${2021 + i}`, wartosc: v }))

describe('WykresSerii', () => {
  it('przy dwóch punktach rysuje dwa słupki i żadnej linii', () => {
    const { container } = render(<WykresSerii punkty={punkty([2, 1])} etykieta="Adapciak" />)
    expect(container.querySelectorAll('rect')).toHaveLength(2)
    expect(container.querySelector('polyline')).toBeNull()
  })

  it('przy pięciu punktach rysuje jedną linię i kropki', () => {
    const { container } = render(<WykresSerii punkty={punkty([1, 3, 2, 5, 4])} etykieta="Gala" />)
    expect(container.querySelectorAll('polyline')).toHaveLength(1)
    expect(container.querySelectorAll('circle')).toHaveLength(5)
    expect(container.querySelectorAll('rect')).toHaveLength(0)
  })

  it('powyżej ośmiu punktów zostawia samą linię', () => {
    const { container } = render(<WykresSerii punkty={punkty([1, 2, 3, 4, 5, 6, 7, 8, 9])} etykieta="Długa" />)
    expect(container.querySelectorAll('polyline')).toHaveLength(1)
    expect(container.querySelectorAll('circle')).toHaveLength(0)
  })

  it('seria jednopunktowa nie rysuje linii ani słupków', () => {
    const { container } = render(<WykresSerii punkty={punkty([7])} etykieta="Nowa" />)
    expect(container.querySelector('polyline')).toBeNull()
    expect(container.querySelectorAll('rect')).toHaveLength(0)
    expect(container.querySelector('line')).not.toBeNull()
  })

  it('seria płaska nie dzieli przez zero', () => {
    const { container } = render(<WykresSerii punkty={punkty([5, 5, 5])} etykieta="Płaska" />)
    const punktyLinii = container.querySelector('polyline')?.getAttribute('points') ?? ''
    expect(punktyLinii).not.toContain('NaN')
  })

  it('same zera nie dzielą przez zero przy słupkach', () => {
    const { container } = render(<WykresSerii punkty={punkty([0, 0])} etykieta="Zera" />)
    const wysokosci = [...container.querySelectorAll('rect')].map((r) => r.getAttribute('height'))
    expect(wysokosci.join()).not.toContain('NaN')
  })

  it('opis dla czytnika ekranu wymienia wszystkie okresy', () => {
    const { container } = render(<WykresSerii punkty={punkty([2, 1])} etykieta="Adapciak" />)
    const tytul = container.querySelector('title')?.textContent ?? ''
    expect(tytul).toContain('Adapciak')
    expect(tytul).toContain('2020/2021')
    expect(tytul).toContain('2021/2022')
  })

  it('pusta seria mówi o braku danych zamiast się wywalać', () => {
    const { container } = render(<WykresSerii punkty={[]} etykieta="Pusta" />)
    expect(container.querySelector('title')?.textContent).toContain('brak danych')
  })
})

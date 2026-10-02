import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { KartaProjektu } from '@/components/modules/KartaProjektu'
import type { KondycjaProjektu, Projekt } from '@/types'

function p(nadpisz: Partial<Projekt> = {}): Projekt {
  return {
    id: 'x', projekt: 'Gala', edycja: '2025/2026', obszar: 'Kultura',
    budzet_plan: 5000, budzet_wydany: 4500, przedluzenia: 0,
    aplikujacy: 30, uczestnicy: 20, partnerzy_fin: 2, partnerzy_barter: 1,
    problemy: '', created_at: '', ...nadpisz,
  }
}
const k = (nadpisz: Partial<KondycjaProjektu> = {}): KondycjaProjektu => ({
  projekt: p(), poprzednia: null, flagi: [], ...nadpisz,
})

describe('KartaProjektu', () => {
  it('projekt bez flag mówi o braku zastrzeżeń', () => {
    render(<KartaProjektu kondycja={k()} />)
    expect(screen.getByText(/bez zastrzeżeń/i)).toBeInTheDocument()
  })

  it('flaga alarmowa dostaje własny znacznik i pokazuje szczegół', () => {
    const { container } = render(
      <KartaProjektu kondycja={k({ flagi: [{ id: 'a', waga: 'alarm', tytul: 'Budżet przekroczony', detal: 'o 40%' }] })} />,
    )
    expect(container.querySelector('[data-waga="alarm"]')).not.toBeNull()
    expect(screen.getByText(/o 40%/)).toBeInTheDocument()
  })

  it('rozróżnia wagi flag znacznikiem, nie tylko kolorem', () => {
    const { container } = render(
      <KartaProjektu
        kondycja={k({
          flagi: [
            { id: 'a', waga: 'alarm', tytul: 'A', detal: '1' },
            { id: 'b', waga: 'uwaga', tytul: 'B', detal: '2' },
            { id: 'c', waga: 'info', tytul: 'C', detal: '3' },
          ],
        })}
      />,
    )
    expect(container.querySelectorAll('[data-waga]')).toHaveLength(3)
    expect(container.querySelector('[data-waga="uwaga"]')).not.toBeNull()
    expect(container.querySelector('[data-waga="info"]')).not.toBeNull()
  })

  it('pierwsza edycja jest oznaczona, żeby cisza nie wyglądała na spokój', () => {
    render(<KartaProjektu kondycja={k({ poprzednia: null })} />)
    expect(screen.getByText(/brak danych z poprzedniej edycji/i)).toBeInTheDocument()
  })

  it('mając poprzednią edycję nie pokazuje tej adnotacji', () => {
    render(<KartaProjektu kondycja={k({ poprzednia: p({ edycja: '2024/2025' }) })} />)
    expect(screen.queryByText(/brak danych z poprzedniej edycji/i)).toBeNull()
  })

  it('pokazuje liczby, żeby nie trzeba było wchodzić w arkusz', () => {
    const { container } = render(<KartaProjektu kondycja={k()} />)
    const tekst = container.textContent ?? ''
    expect(tekst).toContain('Gala')
    expect(tekst).toContain('Kultura')
    expect(tekst).toContain('2025/2026')
    expect(tekst).toMatch(/uczestnicy/i)
  })
})

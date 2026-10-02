import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { KartaWydarzenia } from '@/components/planer/KartaWydarzenia'
import { POLA_DOMYSLNE, type Wydarzenie } from '@/lib/planer/typy'

const w: Wydarzenie = {
  id: '1', tytul: 'ZEBRANIE ZARZĄDU', kategoria: 'ZEBRANIA',
  rok: 2026, miesiac: 10, dzien: 7, godzina: '18:00', sala: '9J', osoby: ['Jula'],
  ...POLA_DOMYSLNE,
}

describe('KartaWydarzenia', () => {
  it('pokazuje godzinę i tytuł', () => {
    render(<KartaWydarzenia wydarzenie={w} onOtworz={vi.fn()} przeciagalne={false} />)
    expect(screen.getByText('18:00')).toBeInTheDocument()
    expect(screen.getByText(/ZEBRANIE ZARZĄDU/)).toBeInTheDocument()
  })

  it('bez godziny nie pokazuje pustego miejsca po niej', () => {
    render(<KartaWydarzenia wydarzenie={{ ...w, godzina: null }} onOtworz={vi.fn()} przeciagalne={false} />)
    expect(screen.queryByText('18:00')).toBeNull()
  })

  it('jest przeciągalna tylko wtedy, gdy wolno edytować', () => {
    const { rerender, container } = render(
      <KartaWydarzenia wydarzenie={w} onOtworz={vi.fn()} przeciagalne={false} />,
    )
    expect(container.querySelector('[draggable="true"]')).toBeNull()
    rerender(<KartaWydarzenia wydarzenie={w} onOtworz={vi.fn()} przeciagalne />)
    expect(container.querySelector('[draggable="true"]')).not.toBeNull()
  })

  it('pokazuje kropkę, gdy wydarzenie ma rozmowę', () => {
    const { container, rerender } = render(
      <KartaWydarzenia wydarzenie={w} onOtworz={vi.fn()} przeciagalne={false} />,
    )
    expect(container.querySelector('[data-rozmowa]')).toBeNull()
    rerender(<KartaWydarzenia wydarzenie={w} onOtworz={vi.fn()} przeciagalne={false} maRozmowe />)
    expect(container.querySelector('[data-rozmowa]')).not.toBeNull()
  })

  it('najważniejsze kategorie mają numer rangi, aplikacje — nie', () => {
    const { container, rerender } = render(<KartaWydarzenia wydarzenie={w} onOtworz={vi.fn()} przeciagalne={false} />)
    expect(container.querySelector('[data-numer-rangi]')?.textContent).toBe('1')
    rerender(<KartaWydarzenia wydarzenie={{ ...w, kategoria: 'APLIKACJE' }} onOtworz={vi.fn()} przeciagalne={false} />)
    expect(container.querySelector('[data-numer-rangi]')).toBeNull()
  })

  it('pokazuje przedział godzin i miejsce', () => {
    render(
      <KartaWydarzenia
        wydarzenie={{ ...w, godzinaDo: '20:00', budynek: 'B/L', sala: '110L' }}
        onOtworz={vi.fn()}
        przeciagalne={false}
      />,
    )
    expect(screen.getByText('18:00–20:00')).toBeInTheDocument()
    expect(screen.getByText('B/L 110L')).toBeInTheDocument()
  })

  it('cały dzień zamiast godziny', () => {
    render(<KartaWydarzenia wydarzenie={{ ...w, calyDzien: true, godzina: null }} onOtworz={vi.fn()} przeciagalne={false} />)
    expect(screen.getByText('cały dzień')).toBeInTheDocument()
  })

  it('miejsce poza uczelnią', () => {
    render(<KartaWydarzenia wydarzenie={{ ...w, budynek: 'POZA', sala: 'Pralnia' }} onOtworz={vi.fn()} przeciagalne={false} />)
    expect(screen.getByText('Poza: Pralnia')).toBeInTheDocument()
  })

  it('pokazuje dopisek dnia wydarzenia wielodniowego', () => {
    render(<KartaWydarzenia wydarzenie={w} onOtworz={vi.fn()} przeciagalne={false} dopisek="2/4" />)
    expect(screen.getByText('2/4')).toBeInTheDocument()
  })
})

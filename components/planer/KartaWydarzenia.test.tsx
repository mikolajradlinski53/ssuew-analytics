import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { KartaWydarzenia } from '@/components/planer/KartaWydarzenia'
import type { Wydarzenie } from '@/lib/planer/typy'

const w: Wydarzenie = {
  id: '1', tytul: 'ZEBRANIE ZARZĄDU', kategoria: 'ZEBRANIA',
  rok: 2026, miesiac: 10, dzien: 7, godzina: '18:00', sala: '9J', osoby: ['Jula'],
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
})

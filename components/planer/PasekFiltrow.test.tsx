import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PasekFiltrow } from '@/components/planer/PasekFiltrow'
import { KLUCZE_KATEGORII } from '@/lib/planer/typy'

const wspolne = {
  aktywne: new Set(KLUCZE_KATEGORII),
  onPrzelacz: vi.fn(),
  osoby: ['Jula', 'Kuba'],
  osoba: '',
  onOsoba: vi.fn(),
  widok: 'miesiac' as const,
  onWidok: vi.fn(),
}

describe('PasekFiltrow', () => {
  it('pokazuje wszystkie kategorie', () => {
    render(<PasekFiltrow {...wspolne} />)
    expect(screen.getByRole('button', { name: 'Zebrania' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aplikacje' })).toBeInTheDocument()
  })

  it('kliknięcie kategorii ją przełącza', () => {
    const onPrzelacz = vi.fn()
    render(<PasekFiltrow {...wspolne} onPrzelacz={onPrzelacz} />)
    fireEvent.click(screen.getByRole('button', { name: 'Zebrania' }))
    expect(onPrzelacz).toHaveBeenCalledWith('ZEBRANIA')
  })

  it('lista osób pochodzi z wydarzeń', () => {
    render(<PasekFiltrow {...wspolne} />)
    expect(screen.getByRole('option', { name: 'Jula' })).toBeInTheDocument()
  })

  it('przełącza widok na semestr', () => {
    const onWidok = vi.fn()
    render(<PasekFiltrow {...wspolne} onWidok={onWidok} />)
    fireEvent.click(screen.getByRole('button', { name: /semestr/i }))
    expect(onWidok).toHaveBeenCalledWith('semestr')
  })
})

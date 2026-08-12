import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PanelWydarzenia } from '@/components/planer/PanelWydarzenia'
import type { Wydarzenie } from '@/lib/planer/typy'

const w: Wydarzenie = {
  id: '1', tytul: 'ZEBRANIE ZARZĄDU', kategoria: 'ZEBRANIA',
  rok: 2026, miesiac: 10, dzien: 7, godzina: '18:00', sala: '9J', osoby: ['Jula', 'Kuba'],
}

const wspolne = { onZapisz: vi.fn(), onUsun: vi.fn(), onZamknij: vi.fn(), miesiac: { m: 10, y: 2026 } }

describe('PanelWydarzenia', () => {
  it('pokazuje dane wydarzenia', () => {
    render(<PanelWydarzenia {...wspolne} wydarzenie={w} mozeEdytowac={false} />)
    expect(screen.getByDisplayValue('ZEBRANIE ZARZĄDU')).toBeInTheDocument()
    expect(screen.getByDisplayValue('9J')).toBeInTheDocument()
  })

  it('bez uprawnień pola są zablokowane, a usuwania nie ma', () => {
    render(<PanelWydarzenia {...wspolne} wydarzenie={w} mozeEdytowac={false} />)
    expect(screen.getByDisplayValue('ZEBRANIE ZARZĄDU')).toBeDisabled()
    expect(screen.queryByRole('button', { name: /usuń/i })).toBeNull()
  })

  it('z uprawnieniami zapisuje zmieniony tytuł', () => {
    const onZapisz = vi.fn()
    render(<PanelWydarzenia {...wspolne} onZapisz={onZapisz} wydarzenie={w} mozeEdytowac />)
    fireEvent.change(screen.getByDisplayValue('ZEBRANIE ZARZĄDU'), { target: { value: 'ZEBRANIE SKS' } })
    fireEvent.click(screen.getByRole('button', { name: /zapisz/i }))
    expect(onZapisz).toHaveBeenCalledWith(expect.objectContaining({ tytul: 'ZEBRANIE SKS' }))
  })

  it('w trybie nowego wydarzenia startuje z pustymi polami', () => {
    render(<PanelWydarzenia {...wspolne} wydarzenie={null} mozeEdytowac />)
    expect(screen.getByLabelText(/tytuł/i)).toHaveValue('')
  })

  it('osoby rozdziela po przecinku i przycina spacje', () => {
    const onZapisz = vi.fn()
    render(<PanelWydarzenia {...wspolne} onZapisz={onZapisz} wydarzenie={w} mozeEdytowac />)
    fireEvent.change(screen.getByDisplayValue('Jula, Kuba'), { target: { value: ' Jula ,Daria, ' } })
    fireEvent.click(screen.getByRole('button', { name: /zapisz/i }))
    expect(onZapisz).toHaveBeenCalledWith(expect.objectContaining({ osoby: ['Jula', 'Daria'] }))
  })
})

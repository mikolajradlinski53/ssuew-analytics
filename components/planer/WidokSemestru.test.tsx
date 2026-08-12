import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WidokSemestru } from '@/components/planer/WidokSemestru'
import { miesiaceSemestru } from '@/lib/planer/semestry'
import type { Wydarzenie } from '@/lib/planer/typy'

const wydarzenia: Wydarzenie[] = [
  { id: '1', tytul: 'A', kategoria: 'ZEBRANIA', rok: 2026, miesiac: 10, dzien: 7, godzina: '18:00', sala: null, osoby: ['Jula'] },
  { id: '2', tytul: 'B', kategoria: 'SSUEW', rok: 2026, miesiac: 10, dzien: 7, godzina: '18:30', sala: null, osoby: ['Jula'] },
  { id: '3', tytul: 'C', kategoria: 'INNE', rok: 2026, miesiac: 11, dzien: 3, godzina: null, sala: null, osoby: [] },
]

describe('WidokSemestru', () => {
  it('pokazuje wszystkie miesiące semestru', () => {
    render(<WidokSemestru miesiace={miesiaceSemestru(2026, 'Z')} wydarzenia={wydarzenia} onWejdz={vi.fn()} />)
    expect(screen.getByText(/Październik/i)).toBeInTheDocument()
    expect(screen.getByText(/Luty/i)).toBeInTheDocument()
  })

  it('liczy wydarzenia w każdym miesiącu', () => {
    render(<WidokSemestru miesiace={miesiaceSemestru(2026, 'Z')} wydarzenia={wydarzenia} onWejdz={vi.fn()} />)
    expect(screen.getByText('2 wydarzenia')).toBeInTheDocument()
    expect(screen.getByText('1 wydarzenie')).toBeInTheDocument()
  })

  it('wejście w miesiąc oddaje jego numer', () => {
    const onWejdz = vi.fn()
    render(<WidokSemestru miesiace={miesiaceSemestru(2026, 'Z')} wydarzenia={wydarzenia} onWejdz={onWejdz} />)
    fireEvent.click(screen.getByRole('button', { name: /Listopad/i }))
    expect(onWejdz).toHaveBeenCalledWith({ m: 11, y: 2026 })
  })

  it('pokazuje liczbę dni z kolizjami', () => {
    render(<WidokSemestru miesiace={miesiaceSemestru(2026, 'Z')} wydarzenia={wydarzenia} onWejdz={vi.fn()} />)
    expect(screen.getByText(/1 dzień z kolizją/)).toBeInTheDocument()
  })
})

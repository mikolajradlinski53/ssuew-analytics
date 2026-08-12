import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WidokMiesiaca } from '@/components/planer/WidokMiesiaca'
import type { Wydarzenie } from '@/lib/planer/typy'

const wydarzenia: Wydarzenie[] = [
  { id: '1', tytul: 'ZEBRANIE', kategoria: 'ZEBRANIA', rok: 2026, miesiac: 10, dzien: 7, godzina: '18:00', sala: null, osoby: ['Jula'] },
  { id: '2', tytul: 'REKRUTACJA', kategoria: 'SSUEW', rok: 2026, miesiac: 10, dzien: 7, godzina: '18:30', sala: null, osoby: ['Jula'] },
]

const wspolne = {
  miesiac: { m: 10, y: 2026 },
  onOtworz: vi.fn(),
  onPrzenies: vi.fn(),
  mozeEdytowac: false,
}

describe('WidokMiesiaca', () => {
  it('rysuje kratkę dla każdego dnia miesiąca', () => {
    render(<WidokMiesiaca {...wspolne} wydarzenia={[]} />)
    // Październik ma 31 dni.
    expect(screen.getByText('31')).toBeInTheDocument()
    expect(screen.queryByText('32')).toBeNull()
  })

  it('umieszcza wydarzenie w jego dniu', () => {
    render(<WidokMiesiaca {...wspolne} wydarzenia={wydarzenia} />)
    expect(screen.getByText(/ZEBRANIE/)).toBeInTheDocument()
  })

  it('oznacza dzień z twardą kolizją', () => {
    // Jula ma dwa wydarzenia w odstępie 30 minut siódmego października.
    render(<WidokMiesiaca {...wspolne} wydarzenia={wydarzenia} />)
    expect(screen.getByLabelText(/kolizja/i)).toBeInTheDocument()
  })

  it('nie oznacza dnia bez kolizji', () => {
    render(<WidokMiesiaca {...wspolne} wydarzenia={[wydarzenia[0]]} />)
    expect(screen.queryByLabelText(/kolizja/i)).toBeNull()
  })
})

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PasekEksportuCra } from '@/components/planer/PasekEksportuCra'
import { POLA_DOMYSLNE, type Wydarzenie } from '@/lib/planer/typy'

const w = (id: string): Wydarzenie => ({
  id, tytul: id, kategoria: 'INNE', rok: 2026, miesiac: 10, dzien: 7,
  godzina: null, sala: null, osoby: [], ...POLA_DOMYSLNE,
})

const wspolne = {
  wMiesiacu: [w('a'), w('b')],
  wszystkie: [w('a'), w('b'), w('c')],
  miesiac: { m: 10, y: 2026 },
  onZakoncz: vi.fn(),
}

describe('PasekEksportuCra', () => {
  it('bez zaznaczenia nie da się pobrać pustego pliku', () => {
    render(<PasekEksportuCra {...wspolne} zaznaczone={new Set()} onZmien={vi.fn()} />)
    expect(screen.getByRole('button', { name: /pobierz csv/i })).toBeDisabled()
  })

  it('liczy zaznaczone także spoza oglądanego miesiąca', () => {
    render(<PasekEksportuCra {...wspolne} zaznaczone={new Set(['a', 'c'])} onZmien={vi.fn()} />)
    expect(screen.getByText(/zaznaczono 2/)).toBeInTheDocument()
  })

  it('zaznacza cały miesiąc, nie ruszając wyboru z innych miesięcy', () => {
    const onZmien = vi.fn()
    render(<PasekEksportuCra {...wspolne} zaznaczone={new Set(['c'])} onZmien={onZmien} />)
    fireEvent.click(screen.getByRole('button', { name: /zaznacz cały miesiąc/i }))
    expect([...onZmien.mock.calls[0][0]].sort()).toEqual(['a', 'b', 'c'])
  })

  it('gdy cały miesiąc jest zaznaczony - odznacza go', () => {
    const onZmien = vi.fn()
    render(<PasekEksportuCra {...wspolne} zaznaczone={new Set(['a', 'b', 'c'])} onZmien={onZmien} />)
    fireEvent.click(screen.getByRole('button', { name: /odznacz miesiąc/i }))
    expect([...onZmien.mock.calls[0][0]]).toEqual(['c'])
  })
})

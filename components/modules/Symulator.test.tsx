import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Symulator from '@/components/modules/Symulator'
import type { Rekrutacja, Kohorta } from '@/types'

const rekr: Rekrutacja[] = [
  { id: '1', edycja: "J'24", sezon: 'jesien', rok: 2024, zgloszenia: 40, przyjeci: 20, created_at: '' },
  { id: '2', edycja: "W'25", sezon: 'wiosna', rok: 2025, zgloszenia: 10, przyjeci: 8, created_at: '' },
]
const koh: Kohorta[] = [
  { id: '1', edycja: "J'24", sezon: 'jesien', rok: 2024, n_czlonkow: 20, avg_retention_sem: 4, max_retention_sem: 8, in_progress: false, created_at: '' },
]

describe('Symulator', () => {
  it('renderuje trzy sekcje co-jeśli', () => {
    render(<Symulator rekrutacje={rekr} kohorty={koh} />)
    expect(screen.getByText(/Rekrutacja/)).toBeInTheDocument()
    expect(screen.getByText(/Retencja/)).toBeInTheDocument()
    expect(screen.getByText(/Utrzymanie/)).toBeInTheDocument()
  })
  it('ma przycisk zapisu scenariusza', () => {
    render(<Symulator rekrutacje={rekr} kohorty={koh} />)
    expect(screen.getByRole('button', { name: /Zapisz scenariusz/ })).toBeInTheDocument()
  })
})

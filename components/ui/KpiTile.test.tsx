import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { KpiTile } from '@/components/ui/KpiTile'

describe('KpiTile', () => {
  it('renderuje etykietę, wartość i podtekst', () => {
    render(<KpiTile label="Conversion" value="77.9%" sub="avg" />)
    expect(screen.getByText('Conversion')).toBeInTheDocument()
    expect(screen.getByText('77.9%')).toBeInTheDocument()
    expect(screen.getByText('avg')).toBeInTheDocument()
  })

  it('stosuje klasę koloru akcentu', () => {
    render(<KpiTile label="X" value="1" accent="accent" />)
    expect(screen.getByText('1').className).toContain('text-deck-accent')
  })
})

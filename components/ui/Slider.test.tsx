import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Slider } from '@/components/ui/Slider'

describe('Slider', () => {
  it('pokazuje etykietę i wartość', () => {
    render(<Slider label="Próg" min={1} max={8} value={3} onChange={() => {}} />)
    expect(screen.getByText('Próg')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})

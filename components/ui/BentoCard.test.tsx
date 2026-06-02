import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { BentoCard } from '@/components/ui/BentoCard'

describe('BentoCard', () => {
  it('renderuje tytuł i dzieci', () => {
    render(
      <BentoCard title="Komisje">
        <span>treść</span>
      </BentoCard>,
    )
    expect(screen.getByText('Komisje')).toBeInTheDocument()
    expect(screen.getByText('treść')).toBeInTheDocument()
  })

  it('dodaje klasę col-span przy span=2', () => {
    const { container } = render(<BentoCard span={2}>x</BentoCard>)
    expect(container.firstElementChild?.className).toContain('col-span-2')
  })

  it('stosuje styl danger', () => {
    const { container } = render(<BentoCard tone="danger">x</BentoCard>)
    expect(container.firstElementChild?.className).toContain('bg-deck-danger-bg')
  })
})

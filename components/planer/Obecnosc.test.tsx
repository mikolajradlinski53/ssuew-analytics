import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Obecnosc } from '@/components/planer/Obecnosc'
import type { Znak } from '@/lib/planer/obecnosc'

const teraz = Date.now()

describe('Obecnosc', () => {
  it('nie pokazuje niczego, gdy nikogo nie ma', () => {
    const { container } = render(<Obecnosc znaki={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('pokazuje inicjały obecnych', () => {
    const znaki: Znak[] = [{ uid: 'a', kto: 'Jula', ostatniZnak: teraz, patrzyNa: null }]
    render(<Obecnosc znaki={znaki} />)
    expect(screen.getByText('JU')).toBeInTheDocument()
  })

  it('odsiewa nieaktualne znaki', () => {
    const znaki: Znak[] = [
      { uid: 'a', kto: 'Jula', ostatniZnak: teraz, patrzyNa: null },
      { uid: 'b', kto: 'Kuba', ostatniZnak: teraz - 300_000, patrzyNa: null },
    ]
    render(<Obecnosc znaki={znaki} />)
    expect(screen.getByText('JU')).toBeInTheDocument()
    expect(screen.queryByText('KU')).toBeNull()
  })
})

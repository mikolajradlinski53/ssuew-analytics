import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TekstAsystenta, naKawalki } from '@/components/deck/TekstAsystenta'

describe('TekstAsystenta', () => {
  it('akapity, wypunktowania i pogrubienia', () => {
    const { container } = render(<TekstAsystenta tekst={"Retencja **spada**.\n\n- J'25: 2,1 sem.\n- W'25: 1,8 sem."} />)
    expect(screen.getByText('spada').tagName).toBe('STRONG')
    expect(container.querySelectorAll('li')).toHaveLength(2)
    expect(container.querySelectorAll('p')).toHaveLength(1)
  })

  it('lista zaraz pod zdaniem, bez pustej linii', () => {
    expect(naKawalki('Dwa ryzyka:\n- rekrutacja\n- retencja')).toEqual([
      { typ: 'akapit', linie: ['Dwa ryzyka:'] },
      { typ: 'lista', punkty: ['rekrutacja', 'retencja'] },
    ])
  })

  it('pogrubienie na początku linii nie jest punktem listy', () => {
    expect(naKawalki('**Uwaga**: limit')).toEqual([{ typ: 'akapit', linie: ['**Uwaga**: limit'] }])
  })
})

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ModuleSkeleton } from '@/components/ui/ModuleSkeleton'

/** Ile kart (powłok deck-card) rysuje dany wariant. */
function ileKart(container: HTMLElement) {
  return container.querySelectorAll('section.deck-card').length
}

describe('ModuleSkeleton', () => {
  it('oznacza się jako ładowanie dla czytników ekranu', () => {
    render(<ModuleSkeleton variant="rekrutacje" />)
    expect(screen.getByLabelText('Ładowanie')).toHaveAttribute('aria-busy', 'true')
  })

  it('rysuje karty z chrome, a nie gołe prostokąty', () => {
    // Sedno poprzedniej usterki: skeleton pokazywał bloki bez obwódki
    // i nagłówka, więc po załadowaniu układ podskakiwał.
    const { container } = render(<ModuleSkeleton variant="rekrutacje" />)
    expect(ileKart(container)).toBeGreaterThan(0)
  })

  it.each([
    ['rekrutacje', 5],
    ['retencja', 3],
    ['lejek', 1],
    ['czlonkowie', 2],
  ] as const)('wariant %s odwzorowuje liczbę kart modułu (%i)', (wariant, oczekiwane) => {
    const { container } = render(<ModuleSkeleton variant={wariant} />)
    expect(ileKart(container)).toBe(oczekiwane)
  })

  it('wariant domyślny też rysuje karty', () => {
    const { container } = render(<ModuleSkeleton />)
    expect(ileKart(container)).toBe(3)
  })
})

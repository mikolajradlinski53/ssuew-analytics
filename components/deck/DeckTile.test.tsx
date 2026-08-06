import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { ReactNode } from 'react'
import { DeckTile } from '@/components/deck/DeckTile'

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

describe('DeckTile', () => {
  it('kafelek żywy jest odnośnikiem do modułu', () => {
    render(
      <DeckTile stan="zywy" href="/analytics" etykieta="moduł 01" tytul="SSUEW Analytics">
        treść
      </DeckTile>,
    )
    expect(screen.getByRole('link', { name: /SSUEW Analytics/ })).toHaveAttribute('href', '/analytics')
  })

  it('kafelek zablokowany nie jest odnośnikiem', () => {
    render(
      <DeckTile stan="zablokowany" href="/strony" etykieta="moduł 04" tytul="Strony">
        treść
      </DeckTile>,
    )
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('Strony')).toBeInTheDocument()
  })

  it('kafelek zablokowany pokazuje etap, w którym powstanie', () => {
    render(
      <DeckTile stan="zablokowany" href="/orbita" etykieta="moduł 03" tytul="Orbita" wkrotce="etap 2">
        x
      </DeckTile>,
    )
    expect(screen.getByText('etap 2')).toBeInTheDocument()
  })

  it('rozciąga się na dwie kolumny przy span=2', () => {
    const { container } = render(
      <DeckTile stan="zywy" href="/a" etykieta="e" tytul="t" span={2}>
        x
      </DeckTile>,
    )
    expect(container.firstElementChild?.className).toContain('col-span-2')
  })

  it('pokazuje odznakę, gdy została podana', () => {
    render(
      <DeckTile stan="zywy" href="/a" etykieta="e" tytul="t" odznaka="2 alerty">
        x
      </DeckTile>,
    )
    expect(screen.getByText('2 alerty')).toBeInTheDocument()
  })
})

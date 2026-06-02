import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

import { Sidebar } from '@/components/ui/Sidebar'

describe('Sidebar', () => {
  it('renderuje wszystkie pozycje nawigacji', () => {
    render(<Sidebar />)
    expect(screen.getByText('Przegląd')).toBeInTheDocument()
    expect(screen.getByText('Rekrutacje')).toBeInTheDocument()
    expect(screen.getByText('Korelacje')).toBeInTheDocument()
    expect(screen.getByText(/Wpisz dane/)).toBeInTheDocument()
  })

  it('linki mają poprawne href', () => {
    render(<Sidebar />)
    expect(screen.getByRole('link', { name: /Rekrutacje/ })).toHaveAttribute('href', '/rekrutacje')
    expect(screen.getByRole('link', { name: /Wpisz dane/ })).toHaveAttribute('href', '/wpis')
  })

  it('podświetla aktywną pozycję (pathname=/)', () => {
    render(<Sidebar />)
    expect(screen.getByRole('link', { name: /Przegląd/ }).className).toContain('text-deck-accent')
  })
})

import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
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
})

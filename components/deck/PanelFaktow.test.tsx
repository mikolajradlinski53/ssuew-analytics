import { act, render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { ReactNode } from 'react'
import { PanelFaktow } from '@/components/deck/PanelFaktow'

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: ReactNode; href: string }) => <a href={href} {...rest}>{children}</a>,
}))

describe('PanelFaktow', () => {
  it('fakty są odnośnikami do modułów', async () => {
    await act(async () => {
      render(<PanelFaktow fakty={Promise.resolve([{ etykieta: 'Do decyzji', tresc: '3 propozycje', szczegol: 'od zarządu', link: '/planer' }])} />)
    })
    expect(screen.getByRole('link', { name: /3 propozycje/ })).toHaveAttribute('href', '/planer')
  })

  it('pusta lista - „nic pilnego”', async () => {
    await act(async () => {
      render(<PanelFaktow fakty={Promise.resolve([])} />)
    })
    expect(screen.getByText(/Nic pilnego/)).toBeInTheDocument()
  })
})

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { ReactNode } from 'react'
import { DeckHub } from '@/components/deck/DeckHub'

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const wyloguj = vi.fn()
const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }))
vi.mock('@/lib/auth/useAuth', () => ({ useAuth: () => ({ wyloguj }) }))

const dane = { konwersja: 61.1, retencja: 3.81, kpiWzrosty: 20, kpiRazem: 28, alerty: 2 }

describe('DeckHub', () => {
  it('pokazuje kafelek Analytics jako odnośnik', () => {
    render(<DeckHub rola="owner" email="ja@e.com" dane={dane} />)
    expect(screen.getByRole('link', { name: /SSUEW Analytics/ })).toHaveAttribute('href', '/analytics')
  })

  it('pokazuje Orbitę właścicielowi', () => {
    render(<DeckHub rola="owner" email="ja@e.com" dane={dane} />)
    expect(screen.getByText('Orbita')).toBeInTheDocument()
  })

  it('ukrywa Orbitę przed zarządem — nie wyszarza, tylko nie renderuje', () => {
    render(<DeckHub rola="board" email="z@e.com" dane={dane} />)
    expect(screen.queryByText('Orbita')).toBeNull()
  })

  it('pokazuje liczbę alertów na kafelku Analytics', () => {
    render(<DeckHub rola="owner" email="ja@e.com" dane={dane} />)
    expect(screen.getByText('2 alerty')).toBeInTheDocument()
  })

  it('nie pokazuje odznaki alertów, gdy alertów nie ma', () => {
    render(<DeckHub rola="owner" email="ja@e.com" dane={{ ...dane, alerty: 0 }} />)
    // Sama etykieta „alerty" zostaje w kafelku statystyk — znika tylko odznaka
    // z liczbą, więc szukamy wzorca „<liczba> alerty".
    expect(screen.queryByText(/\d+ alerty/)).toBeNull()
  })

  it('pokazuje adres i rolę zalogowanego', () => {
    render(<DeckHub rola="board" email="zarzad@e.com" dane={dane} />)
    expect(screen.getByText('zarzad@e.com')).toBeInTheDocument()
    expect(screen.getByText('board')).toBeInTheDocument()
  })

  it('ma przycisk wylogowania', () => {
    // Kokpit jest ekranem, na ktorym sie laduje po zalogowaniu. Bez tego
    // przycisku nie da sie z niego wyjsc — powloka z sidebarem obejmuje
    // wylacznie /analytics/*, wiec tam wylogowania po prostu nie widac.
    render(<DeckHub rola="owner" email="ja@e.com" dane={dane} />)
    const przycisk = screen.getByRole('button', { name: /wyloguj/i })
    fireEvent.click(przycisk)
    expect(wyloguj).toHaveBeenCalled()
  })
})

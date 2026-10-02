import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import LoginPage from '@/app/login/page'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock('@/lib/auth/useAuth', () => ({
  useAuth: () => ({ rola: null, laduje: false, blad: null, zalogujHaslem: vi.fn(), zalogujKodem: vi.fn() }),
}))

describe('LoginPage', () => {
  it('marka D.E.C.K. z pełną nazwą zamiast starej', () => {
    render(<LoginPage />)
    expect(screen.getByText('D.E.C.K.')).toBeInTheDocument()
    expect(screen.getByText('Diagnostic Evaluation of Change & KPIs')).toBeInTheDocument()
    expect(screen.queryByText('SSUEW Analytics')).toBeNull()
  })

  it('liczby są dekoracją z neutralnymi podpisami, nie udają wskaźników', () => {
    render(<LoginPage />)
    for (const podpis of ['sygnał', 'szyfrowanie', 'węzły']) expect(screen.getByText(podpis)).toBeInTheDocument()
    expect(screen.queryByText('conversion')).toBeNull()
    expect(screen.queryByText('retention')).toBeNull()
  })

  it('logi i formularz kodu zostają', () => {
    render(<LoginPage />)
    expect(screen.getByText('private vault: awaiting operator')).toBeInTheDocument()
    expect(screen.getByLabelText('Cyfra 1 z 6')).toBeInTheDocument()
  })
})

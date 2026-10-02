import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { CyfraDekodowana, KLATKI, TEMPO_MS } from '@/components/deck/CyfraDekodowana'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('CyfraDekodowana', () => {
  it('przewija znaki i kończy na właściwej cyfrze', () => {
    vi.useFakeTimers()
    const { container } = render(<CyfraDekodowana cyfra="7" />)
    expect(container.querySelector('.kod__znak--dekoduje')).not.toBeNull()
    // Klatka po klatce: każda planuje następną dopiero po przerysowaniu.
    for (let i = 0; i < KLATKI; i++) act(() => vi.advanceTimersByTime(TEMPO_MS))
    expect(screen.getByText('7')).not.toHaveClass('kod__znak--dekoduje')
  })

  it('przy ograniczonym ruchu cyfra jest od razu', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    render(<CyfraDekodowana cyfra="3" />)
    expect(screen.getByText('3')).not.toHaveClass('kod__znak--dekoduje')
  })
})

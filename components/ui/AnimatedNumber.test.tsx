import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeAll } from 'vitest'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'

beforeAll(() => {
  // reduced-motion → komponent ustawia wartość natychmiast (bez RAF)
  window.matchMedia = (query: string) =>
    ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() {
        return false
      },
    }) as unknown as MediaQueryList
})

describe('AnimatedNumber', () => {
  it('pokazuje wartość (reduced motion → natychmiast)', () => {
    render(<AnimatedNumber value={42} suffix="%" />)
    expect(screen.getByText('42%')).toBeInTheDocument()
  })
  it('respektuje miejsca po przecinku i prefix', () => {
    render(<AnimatedNumber value={3.456} decimals={1} prefix="~" />)
    expect(screen.getByText('~3.5')).toBeInTheDocument()
  })
})

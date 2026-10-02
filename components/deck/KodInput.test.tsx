import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { KodInput } from '@/components/deck/KodInput'
import { KLATKI, TEMPO_MS } from '@/components/deck/CyfraDekodowana'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const pole = (i: number) => screen.getByLabelText(`Cyfra ${i} z 6`)
const dokoncz = () => {
  for (let i = 0; i < KLATKI; i++) act(() => vi.advanceTimersByTime(TEMPO_MS))
}

describe('KodInput', () => {
  it('wpisana cyfra dekoduje się w kratce, a fokus idzie dalej', () => {
    vi.useFakeTimers()
    const { container } = render(<KodInput onKomplet={vi.fn()} stan="wpisywanie" motyw="orbita" />)
    fireEvent.change(pole(1), { target: { value: '4' } })
    expect(pole(1)).toHaveValue('4')
    expect(pole(2)).toHaveFocus()
    expect(container.querySelector('.kod__znak--dekoduje')).not.toBeNull()
    dokoncz()
    expect(container.querySelector('.kod__slot .kod__znak')).toHaveTextContent('4')
    expect(container.querySelector('.kod__znak--dekoduje')).toBeNull()
  })

  it('nadpisanie cyfry animuje od nowa', () => {
    vi.useFakeTimers()
    const { container } = render(<KodInput onKomplet={vi.fn()} stan="wpisywanie" motyw="orbita" />)
    fireEvent.change(pole(1), { target: { value: '4' } })
    dokoncz()
    fireEvent.change(pole(1), { target: { value: '5' } })
    expect(container.querySelector('.kod__znak--dekoduje')).not.toBeNull()
  })

  it('sześć cyfr wysyła kod dokładnie raz', () => {
    // Ograniczony ruch: pomija animację zbierania kratek, której jsdom nie umie odegrać.
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    const onKomplet = vi.fn()
    render(<KodInput onKomplet={onKomplet} stan="wpisywanie" motyw="orbita" />)
    '123456'.split('').forEach((c, i) => fireEvent.change(pole(i + 1), { target: { value: c } }))
    expect(onKomplet).toHaveBeenCalledTimes(1)
    expect(onKomplet).toHaveBeenCalledWith('123456')
  })

  it('wklejony kod animuje wszystkie kratki', () => {
    vi.useFakeTimers()
    const { container } = render(<KodInput onKomplet={vi.fn()} stan="wpisywanie" motyw="orbita" />)
    fireEvent.paste(pole(1), { clipboardData: { getData: () => '123' } })
    expect(container.querySelectorAll('.kod__znak--dekoduje')).toHaveLength(3)
  })
})

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BanerSesji } from '@/components/planer/BanerSesji'

const GODZINE_TEMU = Date.now() - 65 * 60 * 1000

describe('BanerSesji', () => {
  it('nie pokazuje się przy wyłączonej sesji', () => {
    const { container } = render(
      <BanerSesji stan={{ wlaczony: false, od: null, przez: null }} mozeWylaczyc onWylacz={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('pokazuje, jak długo sesja trwa', () => {
    // Wyłączanie jest ręczne, więc czas trwania to jedyne, co czyni zapomnienie widocznym.
    render(<BanerSesji stan={{ wlaczony: true, od: GODZINE_TEMU, przez: 'kontakt@x.pl' }} mozeWylaczyc onWylacz={vi.fn()} />)
    expect(screen.getByText(/1 h 5 min/)).toBeInTheDocument()
  })

  it('zarząd widzi baner, ale bez przycisku wyłączenia', () => {
    render(<BanerSesji stan={{ wlaczony: true, od: GODZINE_TEMU, przez: 'x' }} mozeWylaczyc={false} onWylacz={vi.fn()} />)
    expect(screen.getByText(/Sesja Operacyjna/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /wyłącz/i })).toBeNull()
  })

  it('właściciel wyłącza sesję', () => {
    const onWylacz = vi.fn()
    render(<BanerSesji stan={{ wlaczony: true, od: GODZINE_TEMU, przez: 'x' }} mozeWylaczyc onWylacz={onWylacz} />)
    fireEvent.click(screen.getByRole('button', { name: /wyłącz/i }))
    expect(onWylacz).toHaveBeenCalled()
  })
})

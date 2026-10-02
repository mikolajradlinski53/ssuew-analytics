import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WyborOsob } from '@/components/planer/WyborOsob'

const SKLAD = ['Jula', 'Kuba', 'Daria']

describe('WyborOsob', () => {
  it('zaznacza wybrane osoby', () => {
    render(<WyborOsob sklad={SKLAD} wybrane={['Kuba']} onZmien={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Kuba' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Jula' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('dokłada osobę do wybranych', () => {
    const onZmien = vi.fn()
    render(<WyborOsob sklad={SKLAD} wybrane={['Kuba']} onZmien={onZmien} />)
    fireEvent.click(screen.getByRole('button', { name: 'Jula' }))
    expect(onZmien).toHaveBeenCalledWith(['Kuba', 'Jula'])
  })

  it('odznacza wybraną osobę', () => {
    const onZmien = vi.fn()
    render(<WyborOsob sklad={SKLAD} wybrane={['Kuba', 'Jula']} onZmien={onZmien} />)
    fireEvent.click(screen.getByRole('button', { name: 'Kuba' }))
    expect(onZmien).toHaveBeenCalledWith(['Jula'])
  })

  it('„Wszyscy” zastępuje pojedyncze osoby', () => {
    const onZmien = vi.fn()
    render(<WyborOsob sklad={SKLAD} wybrane={['Kuba']} onZmien={onZmien} />)
    fireEvent.click(screen.getByRole('button', { name: 'Wszyscy' }))
    expect(onZmien).toHaveBeenCalledWith(['wszyscy'])
  })

  it('wybór osoby zdejmuje „Wszyscy”', () => {
    const onZmien = vi.fn()
    render(<WyborOsob sklad={SKLAD} wybrane={['wszyscy']} onZmien={onZmien} />)
    fireEvent.click(screen.getByRole('button', { name: 'Daria' }))
    expect(onZmien).toHaveBeenCalledWith(['Daria'])
  })

  it('osoba spoza Składu zostaje widoczna i da się ją odpiąć', () => {
    const onZmien = vi.fn()
    render(<WyborOsob sklad={SKLAD} wybrane={['Ola', 'Kuba']} onZmien={onZmien} />)
    fireEvent.click(screen.getByRole('button', { name: /Ola/ }))
    expect(onZmien).toHaveBeenCalledWith(['Kuba'])
  })

  it('zablokowany nie pozwala klikać', () => {
    render(<WyborOsob sklad={SKLAD} wybrane={[]} onZmien={vi.fn()} zablokowane />)
    expect(screen.getByRole('button', { name: 'Jula' })).toBeDisabled()
  })
})

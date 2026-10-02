import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Sklad } from '@/components/planer/Sklad'

const wspolne = { onZamknij: vi.fn() }

describe('Sklad', () => {
  it('dodaje osobę bez spacji na brzegach', () => {
    const onZmien = vi.fn()
    render(<Sklad {...wspolne} osoby={['Jula']} onZmien={onZmien} />)
    fireEvent.change(screen.getByLabelText('Nowa osoba'), { target: { value: '  Kuba ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj' }))
    expect(onZmien).toHaveBeenCalledWith(['Jula', 'Kuba'])
  })

  it('nie dubluje osoby i mówi dlaczego', () => {
    const onZmien = vi.fn()
    render(<Sklad {...wspolne} osoby={['Jula']} onZmien={onZmien} />)
    fireEvent.change(screen.getByLabelText('Nowa osoba'), { target: { value: 'jula' } })
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj' }))
    expect(onZmien).not.toHaveBeenCalled()
    expect(screen.getByText(/już jest/i)).toBeInTheDocument()
  })

  it('usuwa osobę', () => {
    const onZmien = vi.fn()
    render(<Sklad {...wspolne} osoby={['Jula', 'Kuba']} onZmien={onZmien} />)
    fireEvent.click(screen.getByRole('button', { name: 'Usuń Jula' }))
    expect(onZmien).toHaveBeenCalledWith(['Kuba'])
  })

  it('pusty skład zaprasza do dodania pierwszej osoby', () => {
    render(<Sklad {...wspolne} osoby={[]} onZmien={vi.fn()} />)
    expect(screen.getByText(/pierwszą osobę/i)).toBeInTheDocument()
  })
})

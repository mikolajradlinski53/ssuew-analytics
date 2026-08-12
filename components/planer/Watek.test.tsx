import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Watek } from '@/components/planer/Watek'
import type { Komentarz } from '@/lib/planer/komentarze'

const komentarze: Komentarz[] = [
  { id: '1', wydarzenieId: 'w1', tresc: 'przenieść?', autor: 'Jula', utworzone: 1 },
]

describe('Watek', () => {
  it('pusty wątek zachęca do napisania', () => {
    render(<Watek komentarze={[]} onDodaj={vi.fn()} />)
    expect(screen.getByText(/nikt jeszcze nic nie napisał/i)).toBeInTheDocument()
  })

  it('pokazuje treść i autora', () => {
    render(<Watek komentarze={komentarze} onDodaj={vi.fn()} />)
    expect(screen.getByText('przenieść?')).toBeInTheDocument()
    expect(screen.getByText(/Jula/)).toBeInTheDocument()
  })

  it('wysyła wpisaną treść i czyści pole', () => {
    const onDodaj = vi.fn()
    render(<Watek komentarze={[]} onDodaj={onDodaj} />)
    const pole = screen.getByPlaceholderText(/napisz/i)
    fireEvent.change(pole, { target: { value: 'zgadzam się' } })
    fireEvent.click(screen.getByRole('button', { name: /wyślij/i }))
    expect(onDodaj).toHaveBeenCalledWith('zgadzam się')
    expect(pole).toHaveValue('')
  })

  it('sama spacja nie wysyła', () => {
    const onDodaj = vi.fn()
    render(<Watek komentarze={[]} onDodaj={onDodaj} />)
    fireEvent.change(screen.getByPlaceholderText(/napisz/i), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: /wyślij/i }))
    expect(onDodaj).not.toHaveBeenCalled()
  })
})

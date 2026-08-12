import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Skrzynka } from '@/components/planer/Skrzynka'
import type { Propozycja } from '@/lib/planer/propozycje'
import type { Wydarzenie } from '@/lib/planer/typy'

const wydarzenie: Wydarzenie = {
  id: 'w1', tytul: 'ZEBRANIE', kategoria: 'ZEBRANIA',
  rok: 2026, miesiac: 10, dzien: 7, godzina: null, sala: null, osoby: [],
}

const p: Propozycja = {
  id: 'p1', rodzaj: 'przeniesienie', autor: 'Jula', utworzone: 0,
  wydarzenieId: 'w1', zDnia: 7, naDzien: 9, tytulWydarzenia: 'ZEBRANIE',
}

const wspolne = { onPrzyjmij: vi.fn(), onOdrzuc: vi.fn() }

describe('Skrzynka', () => {
  it('pusta skrzynka mówi, że nic nie czeka', () => {
    render(<Skrzynka {...wspolne} propozycje={[]} wydarzenia={[]} />)
    expect(screen.getByText(/nic nie czeka/i)).toBeInTheDocument()
  })

  it('pokazuje opis propozycji i jej autora', () => {
    render(<Skrzynka {...wspolne} propozycje={[p]} wydarzenia={[wydarzenie]} />)
    expect(screen.getByText(/Przenieś „ZEBRANIE" z 7\. na 9\./)).toBeInTheDocument()
    expect(screen.getByText(/Jula/)).toBeInTheDocument()
  })

  it('nieaktualnej propozycji nie da się przyjąć', () => {
    render(<Skrzynka {...wspolne} propozycje={[p]} wydarzenia={[]} />)
    expect(screen.queryByRole('button', { name: /przyjmij/i })).toBeNull()
    expect(screen.getByText(/już nie ma/i)).toBeInTheDocument()
  })

  it('ostrzega, gdy ktoś zdążył przesunąć wydarzenie', () => {
    render(<Skrzynka {...wspolne} propozycje={[p]} wydarzenia={[{ ...wydarzenie, dzien: 11 }]} />)
    expect(screen.getByText(/przesunął to wydarzenie na 11/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /przyjmij/i })).toBeInTheDocument()
  })

  it('przyjęcie oddaje całą propozycję', () => {
    const onPrzyjmij = vi.fn()
    render(<Skrzynka {...wspolne} onPrzyjmij={onPrzyjmij} propozycje={[p]} wydarzenia={[wydarzenie]} />)
    fireEvent.click(screen.getByRole('button', { name: /przyjmij/i }))
    expect(onPrzyjmij).toHaveBeenCalledWith(p)
  })

  it('odrzucenie oddaje identyfikator', () => {
    const onOdrzuc = vi.fn()
    render(<Skrzynka {...wspolne} onOdrzuc={onOdrzuc} propozycje={[p]} wydarzenia={[wydarzenie]} />)
    fireEvent.click(screen.getByRole('button', { name: /odrzuć/i }))
    expect(onOdrzuc).toHaveBeenCalledWith('p1')
  })
})

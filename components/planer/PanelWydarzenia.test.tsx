import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PanelWydarzenia } from '@/components/planer/PanelWydarzenia'
import { POLA_DOMYSLNE, type Wydarzenie } from '@/lib/planer/typy'

const w: Wydarzenie = {
  id: '1', tytul: 'ZEBRANIE ZARZĄDU', kategoria: 'ZEBRANIA',
  rok: 2026, miesiac: 10, dzien: 7, godzina: '18:00', sala: '9J', osoby: ['Jula', 'Kuba'],
  ...POLA_DOMYSLNE,
}

const wspolne = {
  onZapisz: vi.fn(), onUsun: vi.fn(), onZamknij: vi.fn(),
  miesiac: { m: 10, y: 2026 }, sklad: ['Jula', 'Kuba', 'Daria'], mozeUsunac: true,
}

function zapisz() {
  fireEvent.click(screen.getByRole('button', { name: /zapisz/i }))
}

describe('PanelWydarzenia', () => {
  it('pokazuje dane wydarzenia', () => {
    render(<PanelWydarzenia {...wspolne} wydarzenie={w} mozeEdytowac={false} />)
    expect(screen.getByDisplayValue('ZEBRANIE ZARZĄDU')).toBeInTheDocument()
    expect(screen.getByDisplayValue('9J')).toBeInTheDocument()
  })

  it('bez uprawnień pola są zablokowane, a usuwania nie ma', () => {
    render(<PanelWydarzenia {...wspolne} wydarzenie={w} mozeEdytowac={false} />)
    expect(screen.getByDisplayValue('ZEBRANIE ZARZĄDU')).toBeDisabled()
    expect(screen.queryByRole('button', { name: /usuń/i })).toBeNull()
  })

  it('zapisuje zmieniony tytuł bez identyfikatora w danych', () => {
    const onZapisz = vi.fn()
    render(<PanelWydarzenia {...wspolne} onZapisz={onZapisz} wydarzenie={w} mozeEdytowac />)
    fireEvent.change(screen.getByDisplayValue('ZEBRANIE ZARZĄDU'), { target: { value: 'ZEBRANIE SKS' } })
    zapisz()
    expect(onZapisz).toHaveBeenCalledWith(expect.objectContaining({ tytul: 'ZEBRANIE SKS' }), 1)
    expect(onZapisz.mock.calls[0][0]).not.toHaveProperty('id')
  })

  it('nowe wydarzenie startuje z pustym tytułem i nie da się go zapisać bez tytułu', () => {
    render(<PanelWydarzenia {...wspolne} wydarzenie={null} mozeEdytowac />)
    expect(screen.getByLabelText(/tytuł/i)).toHaveValue('')
    expect(screen.getByRole('button', { name: /zapisz/i })).toBeDisabled()
  })

  it('kategorię wybiera się przyciskiem', () => {
    const onZapisz = vi.fn()
    render(<PanelWydarzenia {...wspolne} onZapisz={onZapisz} wydarzenie={w} mozeEdytowac />)
    fireEvent.click(screen.getByRole('button', { name: 'Projekty' }))
    zapisz()
    expect(onZapisz).toHaveBeenCalledWith(expect.objectContaining({ kategoria: 'PROJEKTY' }), 1)
  })

  it('osoby wybiera się przyciskami ze Składu', () => {
    const onZapisz = vi.fn()
    render(<PanelWydarzenia {...wspolne} onZapisz={onZapisz} wydarzenie={w} mozeEdytowac />)
    fireEvent.click(screen.getByRole('button', { name: 'Daria' }))
    zapisz()
    expect(onZapisz).toHaveBeenCalledWith(expect.objectContaining({ osoby: ['Jula', 'Kuba', 'Daria'] }), 1)
  })

  it('cały dzień chowa godziny i zapisuje je jako puste', () => {
    const onZapisz = vi.fn()
    render(<PanelWydarzenia {...wspolne} onZapisz={onZapisz} wydarzenie={w} mozeEdytowac />)
    fireEvent.click(screen.getByLabelText('Cały dzień'))
    expect(screen.queryByLabelText('Od')).toBeNull()
    zapisz()
    expect(onZapisz).toHaveBeenCalledWith(expect.objectContaining({ calyDzien: true, godzina: null }), 1)
  })

  it('godzina „do” równa „od” blokuje zapis z komunikatem', () => {
    render(<PanelWydarzenia {...wspolne} wydarzenie={w} mozeEdytowac />)
    fireEvent.change(screen.getByLabelText('Do'), { target: { value: '18:00' } })
    expect(screen.getByRole('alert')).toHaveTextContent(/taka sama jak „od”/)
    expect(screen.getByRole('button', { name: /zapisz/i })).toBeDisabled()
  })

  it('„do” wcześniejsze niż „od” to koniec następnego dnia — z podpowiedzią', () => {
    const onZapisz = vi.fn()
    render(<PanelWydarzenia {...wspolne} onZapisz={onZapisz} wydarzenie={w} mozeEdytowac />)
    fireEvent.change(screen.getByLabelText('Do'), { target: { value: '04:00' } })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText(/następnego dnia/i)).toBeInTheDocument()
    zapisz()
    expect(onZapisz).toHaveBeenCalledWith(expect.objectContaining({ godzina: '18:00', godzinaDo: '04:00' }), 1)
  })

  it('data końca zamienia się na liczbę dni', () => {
    const onZapisz = vi.fn()
    render(<PanelWydarzenia {...wspolne} onZapisz={onZapisz} wydarzenie={w} mozeEdytowac />)
    fireEvent.change(screen.getByLabelText(/do dnia/i), { target: { value: '2026-10-09' } })
    zapisz()
    expect(onZapisz).toHaveBeenCalledWith(expect.objectContaining({ dni: 3 }), 1)
  })

  it('budynek z listy, a przy „Poza uczelnią” pole pyta o nazwę miejsca', () => {
    const onZapisz = vi.fn()
    render(<PanelWydarzenia {...wspolne} onZapisz={onZapisz} wydarzenie={w} mozeEdytowac />)
    fireEvent.change(screen.getByLabelText('Budynek'), { target: { value: 'POZA' } })
    expect(screen.getByPlaceholderText('nazwa miejsca')).toBeInTheDocument()
    zapisz()
    expect(onZapisz).toHaveBeenCalledWith(expect.objectContaining({ budynek: 'POZA' }), 1)
  })

  it('online to miejsce bez sali — pole pyta o platformę', () => {
    const onZapisz = vi.fn()
    render(<PanelWydarzenia {...wspolne} onZapisz={onZapisz} wydarzenie={w} mozeEdytowac />)
    fireEvent.change(screen.getByLabelText('Budynek'), { target: { value: 'ONLINE' } })
    expect(screen.getByLabelText('Szczegóły')).toHaveAttribute('placeholder', 'np. Teams, Meet')
    zapisz()
    expect(onZapisz).toHaveBeenCalledWith(expect.objectContaining({ budynek: 'ONLINE' }), 1)
  })

  it('powtarzanie widać tylko przy nowym wydarzeniu', () => {
    const { rerender } = render(<PanelWydarzenia {...wspolne} wydarzenie={w} mozeEdytowac />)
    expect(screen.queryByLabelText(/powtórz co tydzień/i)).toBeNull()
    rerender(<PanelWydarzenia {...wspolne} wydarzenie={null} mozeEdytowac />)
    expect(screen.getByLabelText(/powtórz co tydzień/i)).toBeInTheDocument()
  })

  it('wybrana liczba powtórzeń jedzie do zapisu', () => {
    const onZapisz = vi.fn()
    render(<PanelWydarzenia {...wspolne} onZapisz={onZapisz} wydarzenie={null} mozeEdytowac />)
    fireEvent.change(screen.getByLabelText(/tytuł/i), { target: { value: 'SKS' } })
    fireEvent.change(screen.getByLabelText(/powtórz co tydzień/i), { target: { value: '4' } })
    zapisz()
    expect(onZapisz).toHaveBeenCalledWith(expect.anything(), 4)
  })

  it('bez prawa usuwania nie ma kosza — usuwa wyłącznie właściciel', () => {
    render(<PanelWydarzenia {...wspolne} wydarzenie={w} mozeEdytowac mozeUsunac={false} />)
    expect(screen.queryByRole('button', { name: /usuń/i })).toBeNull()
  })

  it('z prawem usuwania kosz jest', () => {
    render(<PanelWydarzenia {...wspolne} wydarzenie={w} mozeEdytowac />)
    expect(screen.getByRole('button', { name: /usuń/i })).toBeInTheDocument()
  })
})

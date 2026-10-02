import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WidokMiesiaca } from '@/components/planer/WidokMiesiaca'
import { POLA_DOMYSLNE, type Wydarzenie } from '@/lib/planer/typy'

const wydarzenia: Wydarzenie[] = [
  { id: '1', tytul: 'ZEBRANIE', kategoria: 'ZEBRANIA', rok: 2026, miesiac: 10, dzien: 7, godzina: '18:00', sala: null, osoby: ['Jula'], ...POLA_DOMYSLNE },
  { id: '2', tytul: 'REKRUTACJA', kategoria: 'SSUEW', rok: 2026, miesiac: 10, dzien: 7, godzina: '18:30', sala: null, osoby: ['Jula'], ...POLA_DOMYSLNE },
]

const wspolne = {
  miesiac: { m: 10, y: 2026 },
  onOtworz: vi.fn(),
  onPrzenies: vi.fn(),
  onPrzesun: vi.fn(),
  onDodajWDniu: vi.fn(),
  mozeEdytowac: false,
}

/**
 * Siatka i lista na telefon sa w DOM naraz — o tym, ktora widac, decyduje CSS.
 * Testy pytaja w obrebie siatki, zeby nie trafic w karte z listy.
 */
function siatka(container: HTMLElement) {
  return within(container.querySelector('[data-widok="siatka"]') as HTMLElement)
}

const wyjazd: Wydarzenie = {
  id: '3', tytul: 'WYJAZD', kategoria: 'PROJEKTY', rok: 2026, miesiac: 10, dzien: 8,
  godzina: null, sala: null, osoby: [], ...POLA_DOMYSLNE, dni: 3,
}

function lista(container: HTMLElement) {
  return within(container.querySelector('[data-widok="lista"]') as HTMLElement)
}

describe('WidokMiesiaca', () => {
  it('rysuje kratkę dla każdego dnia miesiąca', () => {
    render(<WidokMiesiaca {...wspolne} wydarzenia={[]} />)
    // Październik ma 31 dni.
    expect(screen.getByText('31')).toBeInTheDocument()
    expect(screen.queryByText('32')).toBeNull()
  })

  it('umieszcza wydarzenie w jego dniu', () => {
    const { container } = render(<WidokMiesiaca {...wspolne} wydarzenia={wydarzenia} />)
    expect(siatka(container).getByText(/ZEBRANIE/)).toBeInTheDocument()
  })

  it('oznacza dzień z twardą kolizją', () => {
    // Jula ma dwa wydarzenia w odstępie 30 minut siódmego października.
    render(<WidokMiesiaca {...wspolne} wydarzenia={wydarzenia} />)
    expect(screen.getByLabelText(/kolizja/i)).toBeInTheDocument()
  })

  it('nie oznacza dnia bez kolizji', () => {
    render(<WidokMiesiaca {...wspolne} wydarzenia={[wydarzenia[0]]} />)
    expect(screen.queryByLabelText(/kolizja/i)).toBeNull()
  })

  it('bez uprawnień nie ma przycisków dodawania w kratkach', () => {
    render(<WidokMiesiaca {...wspolne} wydarzenia={[]} />)
    expect(screen.queryByRole('button', { name: /Dodaj wydarzenie/ })).toBeNull()
  })

  it('z uprawnieniami kliknięcie plusa w kratce oddaje jej dzień', () => {
    const onDodajWDniu = vi.fn()
    const { container } = render(
      <WidokMiesiaca {...wspolne} onDodajWDniu={onDodajWDniu} mozeEdytowac wydarzenia={[]} />,
    )
    fireEvent.click(siatka(container).getByRole('button', { name: 'Dodaj wydarzenie 12' }))
    expect(onDodajWDniu).toHaveBeenCalledWith(12)
  })

  it('strzałka w prawo przesuwa wydarzenie o dzień, w dół o tydzień', () => {
    // Przeciaganie dziala tylko mysza — bez klawiatury kalendarza nie da sie
    // ulozyc bez niej.
    const onPrzesun = vi.fn()
    const { container } = render(
      <WidokMiesiaca {...wspolne} onPrzesun={onPrzesun} mozeEdytowac wydarzenia={[wydarzenia[0]]} />,
    )
    const karta = siatka(container).getByRole('button', { name: /ZEBRANIE/ })
    fireEvent.keyDown(karta, { key: 'ArrowRight' })
    expect(onPrzesun).toHaveBeenCalledWith('1', 1)
    fireEvent.keyDown(karta, { key: 'ArrowDown' })
    expect(onPrzesun).toHaveBeenCalledWith('1', 7)
  })

  it('wydarzenie wielodniowe to jeden pasek, nie kopie w kratkach', () => {
    const { container } = render(<WidokMiesiaca {...wspolne} wydarzenia={[wyjazd]} />)
    expect(container.querySelectorAll('[data-widok="siatka"] [data-pasek]')).toHaveLength(1)
    expect(siatka(container).getAllByText('WYJAZD')).toHaveLength(1)
  })

  it('na telefonie wielodniowe jest w każdym dniu z dopiskiem', () => {
    const { container } = render(<WidokMiesiaca {...wspolne} wydarzenia={[wyjazd]} />)
    expect(lista(container).getByText('1/3')).toBeInTheDocument()
    expect(lista(container).getByText('3/3')).toBeInTheDocument()
  })

  it('w kratce najważniejsze na górze, mimo późniejszej godziny', () => {
    const dzien: Wydarzenie[] = [
      { ...wydarzenia[0], id: 'a', kategoria: 'APLIKACJE', godzina: '08:00', osoby: [], dzien: 9 },
      { ...wydarzenia[0], id: 'z', kategoria: 'ZEBRANIA', godzina: '20:00', osoby: [], dzien: 9 },
    ]
    const { container } = render(<WidokMiesiaca {...wspolne} wydarzenia={dzien} />)
    const rangi = [...container.querySelectorAll('[data-widok="siatka"] [data-ranga]')].map(
      (e) => (e as HTMLElement).dataset.ranga,
    )
    expect(rangi).toEqual(['1', '6'])
  })

  it('pasek ze startem w poprzednim miesiącu nie jest przeciągalny', () => {
    const zPazdziernika: Wydarzenie = { ...wyjazd, dzien: 30, dni: 4 }
    const { container } = render(
      <WidokMiesiaca {...wspolne} miesiac={{ m: 11, y: 2026 }} mozeEdytowac wydarzenia={[zPazdziernika]} />,
    )
    const pasek = container.querySelector('[data-widok="siatka"] [data-pasek]')
    expect(pasek).not.toBeNull()
    expect(pasek?.getAttribute('draggable')).toBeNull()
  })

  it('pokazuje legendę rang', () => {
    const { container } = render(<WidokMiesiaca {...wspolne} wydarzenia={[]} />)
    expect(container.querySelector('[data-legenda]')?.textContent).toMatch(/1Zebrania/)
  })
})

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { CzatDeck } from '@/components/deck/CzatDeck'

type Trasa = (body: unknown) => { status?: number; json: unknown }
let trasy: Record<string, Trasa>
const wywolania: { klucz: string; body: unknown }[] = []

beforeEach(() => {
  localStorage.clear()
  wywolania.length = 0
  trasy = {}
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const klucz = `${init?.method ?? 'GET'} ${url}`
    const body = init?.body ? JSON.parse(init.body as string) : undefined
    wywolania.push({ klucz, body })
    const t = trasy[klucz]
    if (!t) return new Response(JSON.stringify({ error: `brak trasy ${klucz}` }), { status: 500 })
    const { status = 200, json } = t(body)
    return new Response(JSON.stringify(json), { status })
  }))
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function otworz() {
  await act(async () => {
    render(<CzatDeck />)
  })
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Zapytaj D\.E\.C\.K\./ }))
  })
}

async function zapytaj(tekst: string) {
  fireEvent.change(screen.getByRole('textbox', { name: /Pytanie/ }), { target: { value: tekst } })
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Wyślij/ }))
  })
}

describe('CzatDeck - rozmowa', () => {
  it('nowa rozmowa: pytanie idzie bez id, odpowiedź się pokazuje, id zostaje zapamiętane', async () => {
    trasy['POST /api/asystent/czat'] = () => ({ json: { rozmowaId: 'w1', odpowiedz: 'Retencja **spada**.', propozycja: null } })
    await otworz()
    await zapytaj('Co z retencją?')
    expect(await screen.findByText('spada')).toBeInTheDocument()
    expect(wywolania.at(-1)?.body).toEqual({ rozmowaId: null, pytanie: 'Co z retencją?', ponow: false })
    expect(localStorage.getItem('deck-rozmowa')).toBe('w1')
  })

  it('wznawia ostatni wątek po wejściu', async () => {
    localStorage.setItem('deck-rozmowa', 'w1')
    trasy['GET /api/asystent/rozmowy/w1'] = () => ({
      json: { id: 'w1', tytul: 'T', utworzono: 1, zmieniono: 2, wiadomosci: [
        { rola: 'ja', tresc: 'Wcześniejsze pytanie', kiedy: 1 },
        { rola: 'deck', tresc: 'Wcześniejsza odpowiedź', kiedy: 2 },
      ] },
    })
    await otworz()
    expect(await screen.findByText('Wcześniejsza odpowiedź')).toBeInTheDocument()
  })

  it('propozycja notatki: poprawka i zapis', async () => {
    trasy['POST /api/asystent/czat'] = () => ({ json: { rozmowaId: 'w1', odpowiedz: 'Jasne.', propozycja: 'Zebrania w środy' } })
    trasy['POST /api/asystent/notatki'] = (b) => ({ status: 201, json: { id: 'n1', ...(b as object), utworzono: 1 } })
    await otworz()
    await zapytaj('Zebrania mamy w środy')
    const pole = await screen.findByRole('textbox', { name: /Treść notatki/ })
    fireEvent.change(pole, { target: { value: 'Zebrania zarządu w środy o 18:00' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Zapisz notatkę/ }))
    })
    expect(wywolania.at(-1)?.body).toEqual({ tresc: 'Zebrania zarządu w środy o 18:00', zrodlo: 'rozmowa' })
    expect(await screen.findByText(/Zapisano w notatkach/)).toBeInTheDocument()
  })

  it('propozycję można pominąć', async () => {
    trasy['POST /api/asystent/czat'] = () => ({ json: { rozmowaId: 'w1', odpowiedz: 'Jasne.', propozycja: 'X' } })
    await otworz()
    await zapytaj('Coś')
    fireEvent.click(await screen.findByRole('button', { name: /Pomiń/ }))
    expect(screen.queryByRole('textbox', { name: /Treść notatki/ })).toBeNull()
  })

  it('błąd: pytanie zostaje bez odpowiedzi, „Ponów” wysyła je z ponow', async () => {
    trasy['POST /api/asystent/czat'] = () => ({ status: 429, json: { error: 'Darmowy limit Gemini na tę chwilę wyczerpany - spróbuj za minutę.', rozmowaId: 'w1' } })
    await otworz()
    await zapytaj('Co z KPI?')
    expect(await screen.findByRole('alert')).toHaveTextContent(/limit Gemini/)
    expect(screen.getByText('Co z KPI?')).toBeInTheDocument()
    trasy['POST /api/asystent/czat'] = () => ({ json: { rozmowaId: 'w1', odpowiedz: 'Już jest.', propozycja: null } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Ponów/ }))
    })
    expect(wywolania.at(-1)?.body).toEqual({ rozmowaId: 'w1', pytanie: 'Co z KPI?', ponow: true })
    expect(await screen.findByText('Już jest.')).toBeInTheDocument()
  })

  it('„Nowa rozmowa” czyści widok i zapomina wątek', async () => {
    trasy['POST /api/asystent/czat'] = () => ({ json: { rozmowaId: 'w1', odpowiedz: 'Odp.', propozycja: null } })
    await otworz()
    await zapytaj('Pierwsze')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Nowa rozmowa/ }))
    })
    expect(screen.queryByText('Odp.')).toBeNull()
    expect(localStorage.getItem('deck-rozmowa')).toBeNull()
  })
})

describe('CzatDeck - wątki i notatki', () => {
  it('lista wątków: otwarcie i usunięcie', async () => {
    trasy['GET /api/asystent/rozmowy'] = () => ({ json: [{ id: 'w1', tytul: 'O retencji', zmieniono: Date.UTC(2026, 9, 2, 12) }] })
    trasy['GET /api/asystent/rozmowy/w1'] = () => ({ json: { id: 'w1', tytul: 'O retencji', utworzono: 1, zmieniono: 2, wiadomosci: [{ rola: 'deck', tresc: 'Stara odpowiedź', kiedy: 2 }] } })
    trasy['DELETE /api/asystent/rozmowy/w1'] = () => ({ json: { ok: true } })
    await otworz()
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: 'Wątki' }))
    })
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /^O retencji/ }))
    })
    expect(await screen.findByText('Stara odpowiedź')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: 'Wątki' }))
    })
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /Usuń rozmowę „O retencji”/ }))
    })
    expect(wywolania.some((w) => w.klucz === 'DELETE /api/asystent/rozmowy/w1')).toBe(true)
    expect(screen.queryByRole('button', { name: /O retencji/ })).toBeNull()
  })

  it('„Wyczyść wszystkie rozmowy” z potwierdzeniem', async () => {
    trasy['GET /api/asystent/rozmowy'] = () => ({ json: [{ id: 'w1', tytul: 'A', zmieniono: 1 }] })
    trasy['DELETE /api/asystent/rozmowy'] = () => ({ json: { usuniete: 1 } })
    await otworz()
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: 'Wątki' }))
    })
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /Wyczyść wszystkie rozmowy/ }))
    })
    expect(window.confirm).toHaveBeenCalled()
    expect(await screen.findByText(/Brak zapisanych rozmów/)).toBeInTheDocument()
  })

  it('notatki: licznik, dodanie, poprawka i usunięcie', async () => {
    trasy['GET /api/asystent/notatki'] = () => ({ json: [{ id: 'n1', tresc: 'Zebrania w środy', utworzono: 1, zrodlo: 'rozmowa' }] })
    trasy['POST /api/asystent/notatki'] = (b) => ({ status: 201, json: { id: 'n2', utworzono: 2, ...(b as object) } })
    trasy['PATCH /api/asystent/notatki/n1'] = (b) => ({ json: { ok: true, ...(b as object) } })
    trasy['DELETE /api/asystent/notatki/n2'] = () => ({ json: { ok: true } })
    await otworz()
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: 'Notatki' }))
    })
    expect(await screen.findByText('1/50')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: /Nowa notatka/ }), { target: { value: 'Cel retencji 3,5 sem.' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Dodaj notatkę/ }))
    })
    expect(wywolania.at(-1)?.body).toEqual({ tresc: 'Cel retencji 3,5 sem.', zrodlo: 'reczna' })
    expect(await screen.findByText('2/50')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Popraw notatkę „Zebrania w środy”/ }))
    const edycja = screen.getByRole('textbox', { name: /Popraw treść/ })
    fireEvent.change(edycja, { target: { value: 'Zebrania w środy o 18:00' } })
    await act(async () => {
      fireEvent.click(within(edycja.closest('li')!).getByRole('button', { name: /Zapisz/ }))
    })
    expect(await screen.findByText('Zebrania w środy o 18:00')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Usuń notatkę „Cel retencji 3,5 sem\.”/ }))
    })
    expect(screen.queryByText('Cel retencji 3,5 sem.')).toBeNull()
  })
})

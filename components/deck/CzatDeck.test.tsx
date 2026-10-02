import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { CzatDeck } from '@/components/deck/CzatDeck'

beforeEach(() => sessionStorage.clear())
afterEach(() => vi.unstubAllGlobals())

function otworz() {
  render(<CzatDeck />)
  fireEvent.click(screen.getByRole('button', { name: /Zapytaj D\.E\.C\.K\./ }))
}

function zapytaj(tekst: string) {
  fireEvent.change(screen.getByRole('textbox', { name: /Pytanie/ }), { target: { value: tekst } })
  fireEvent.click(screen.getByRole('button', { name: /Wyślij/ }))
}

describe('CzatDeck', () => {
  it('wysyła rozmowę i pokazuje odpowiedź', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ odpowiedz: "Retencja W'25 spada do **1,8 sem.**" }), { status: 200 }))
    vi.stubGlobal('fetch', f)
    otworz()
    zapytaj('Co z retencją?')
    expect(await screen.findByText('1,8 sem.')).toBeInTheDocument()
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/asystent/czat')
    expect(JSON.parse(init.body as string)).toEqual({ wiadomosci: [{ rola: 'ja', tresc: 'Co z retencją?' }] })
    expect(screen.getByText('Co z retencją?')).toBeInTheDocument()
  })

  it('limit - komunikat, a pytanie wraca do pola', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ error: 'Darmowy limit Gemini na tę chwilę wyczerpany - spróbuj za minutę.' }), { status: 429 },
    )))
    otworz()
    zapytaj('Co z KPI?')
    expect(await screen.findByRole('alert')).toHaveTextContent(/limit Gemini/)
    expect(screen.getByRole('textbox', { name: /Pytanie/ })).toHaveValue('Co z KPI?')
  })

  it('historia przeżywa przeładowanie w tej samej karcie', () => {
    sessionStorage.setItem('deck-czat', JSON.stringify([
      { rola: 'ja', tresc: 'Wcześniejsze pytanie' },
      { rola: 'deck', tresc: 'Wcześniejsza odpowiedź' },
    ]))
    otworz()
    expect(screen.getByText('Wcześniejsza odpowiedź')).toBeInTheDocument()
  })

  it('„Wyczyść” kasuje rozmowę', () => {
    sessionStorage.setItem('deck-czat', JSON.stringify([{ rola: 'ja', tresc: 'Stare' }, { rola: 'deck', tresc: 'Odp' }]))
    otworz()
    fireEvent.click(screen.getByRole('button', { name: /Wyczyść/ }))
    expect(screen.queryByText('Stare')).toBeNull()
    expect(sessionStorage.getItem('deck-czat')).toBe('[]')
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/asystent/czat/route'
import { BladAsystenta } from '@/lib/asystent/gemini'

const ktoPyta = vi.fn()
const zapytajGemini = vi.fn()
vi.mock('@/lib/auth/guard', () => ({ ktoPyta: (...a: unknown[]) => ktoPyta(...a) }))
vi.mock('@/lib/asystent/gemini', async (oryginal) => ({
  ...(await oryginal<typeof import('@/lib/asystent/gemini')>()),
  zapytajGemini: (...a: unknown[]) => zapytajGemini(...a),
}))
vi.mock('@/lib/asystent/dane', () => ({
  pobierzArkusz: async () => ({ rekrutacje: [], kohorty: [], punkty: [], projekty: [], czlonkowie: [], czasMs: 1 }),
  pobierzPlaner: async () => ({ wydarzenia: [], sesja: { wlaczony: false, od: null, przez: null }, sklad: [], propozycje: 0, ok: true }),
  daneProjektu: (a: object, p: object) => ({ ...a, ...p }),
  zbudujKontekst: () => ({ meta: { data: '02.10.2026', dzienTygodnia: 'piątek' } }),
}))

const zadanie = (body: unknown) => ({ json: async () => body }) as never
const PYTANIE = { wiadomosci: [{ rola: 'ja', tresc: 'Co z retencją?' }] }
const WLASCICIEL = { uid: 'u', email: 'ja', rola: 'owner' }

describe('POST /api/asystent/czat', () => {
  beforeEach(() => {
    ktoPyta.mockReset()
    zapytajGemini.mockReset()
  })

  it('bez sesji 401, zarząd 403', async () => {
    ktoPyta.mockResolvedValue(null)
    expect((await POST(zadanie(PYTANIE))).status).toBe(401)
    ktoPyta.mockResolvedValue({ uid: 'kod:1', email: 'Jula', rola: 'board' })
    expect((await POST(zadanie(PYTANIE))).status).toBe(403)
    expect(zapytajGemini).not.toHaveBeenCalled()
  })

  it('zła rozmowa to 400', async () => {
    ktoPyta.mockResolvedValue(WLASCICIEL)
    expect((await POST(zadanie({ wiadomosci: [] }))).status).toBe(400)
  })

  it('odpowiedź z obrazem projektu w rozmowie', async () => {
    ktoPyta.mockResolvedValue(WLASCICIEL)
    zapytajGemini.mockResolvedValue({ tekst: 'Retencja spada.', model: 'gemini-3.8-flash' })
    const res = await POST(zadanie(PYTANIE))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ odpowiedz: 'Retencja spada.' })
    const { wiadomosci } = zapytajGemini.mock.calls[0][0]
    expect(wiadomosci[0].tekst).toContain('02.10.2026')
    expect(wiadomosci[wiadomosci.length - 1]).toEqual({ rola: 'user', tekst: 'Co z retencją?' })
  })

  it('limit Gemini to 429 z ludzkim komunikatem', async () => {
    ktoPyta.mockResolvedValue(WLASCICIEL)
    zapytajGemini.mockRejectedValue(new BladAsystenta('limit', 'x'))
    const res = await POST(zadanie(PYTANIE))
    expect(res.status).toBe(429)
    expect((await res.json()).error).toMatch(/limit Gemini/)
  })
})

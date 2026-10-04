import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET as lista, POST as dodaj } from '@/app/api/asystent/notatki/route'
import { PATCH as zmien, DELETE as usun } from '@/app/api/asystent/notatki/[id]/route'

const ktoPyta = vi.fn()
const pamiec = {
  listaNotatek: vi.fn(), liczbaNotatek: vi.fn(), dodajNotatke: vi.fn(), zmienNotatke: vi.fn(), usunNotatke: vi.fn(),
}
vi.mock('@/lib/auth/guard', () => ({ ktoPyta: (...a: unknown[]) => ktoPyta(...a) }))
vi.mock('@/lib/asystent/pamiecDane', () => ({
  listaNotatek: (...a: unknown[]) => pamiec.listaNotatek(...a),
  liczbaNotatek: (...a: unknown[]) => pamiec.liczbaNotatek(...a),
  dodajNotatke: (...a: unknown[]) => pamiec.dodajNotatke(...a),
  zmienNotatke: (...a: unknown[]) => pamiec.zmienNotatke(...a),
  usunNotatke: (...a: unknown[]) => pamiec.usunNotatke(...a),
}))

const zadanie = (body?: unknown) => ({ json: async () => body }) as never
const z = (id: string) => ({ params: Promise.resolve({ id }) })

describe('/api/asystent/notatki', () => {
  beforeEach(() => {
    ktoPyta.mockReset().mockResolvedValue({ uid: 'u', email: 'ja', rola: 'owner' })
    Object.values(pamiec).forEach((f) => f.mockReset())
  })

  it('zarząd 403', async () => {
    ktoPyta.mockResolvedValue({ uid: 'kod:1', email: 'Jula', rola: 'board' })
    expect((await lista(zadanie())).status).toBe(403)
    expect((await dodaj(zadanie({ tresc: 'x' }))).status).toBe(403)
  })

  it('dodaje przyciętą notatkę ze źródłem', async () => {
    pamiec.liczbaNotatek.mockResolvedValue(3)
    pamiec.dodajNotatke.mockResolvedValue({ id: 'n1', tresc: 'Zebrania w środy', utworzono: 1, zrodlo: 'rozmowa' })
    const res = await dodaj(zadanie({ tresc: '  Zebrania w środy ', zrodlo: 'rozmowa' }))
    expect(res.status).toBe(201)
    expect(pamiec.dodajNotatke).toHaveBeenCalledWith('Zebrania w środy', 'rozmowa')
  })

  it('pusta 400, przy 50 notatkach 409', async () => {
    expect((await dodaj(zadanie({ tresc: '  ' }))).status).toBe(400)
    pamiec.liczbaNotatek.mockResolvedValue(50)
    const res = await dodaj(zadanie({ tresc: 'Nowa' }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/50/)
  })

  it('poprawia i usuwa; nieznana 404', async () => {
    pamiec.zmienNotatke.mockResolvedValue(true)
    expect((await zmien(zadanie({ tresc: 'Nowa treść' }), z('n1'))).status).toBe(200)
    expect(pamiec.zmienNotatke).toHaveBeenCalledWith('n1', 'Nowa treść')
    pamiec.zmienNotatke.mockResolvedValue(false)
    expect((await zmien(zadanie({ tresc: 'x' }), z('brak'))).status).toBe(404)
    expect((await usun(zadanie(), z('n1'))).status).toBe(200)
    expect(pamiec.usunNotatke).toHaveBeenCalledWith('n1')
  })
})

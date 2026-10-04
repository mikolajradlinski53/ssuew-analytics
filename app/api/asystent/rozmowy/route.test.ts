import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET as lista, DELETE as wszystkie } from '@/app/api/asystent/rozmowy/route'
import { GET as jedna, DELETE as usunJedna } from '@/app/api/asystent/rozmowy/[id]/route'

const ktoPyta = vi.fn()
const pamiec = {
  listaRozmow: vi.fn(), czytajRozmowe: vi.fn(), usunRozmowe: vi.fn(), usunWszystkieRozmowy: vi.fn(),
}
vi.mock('@/lib/auth/guard', () => ({ ktoPyta: (...a: unknown[]) => ktoPyta(...a) }))
vi.mock('@/lib/asystent/pamiecDane', () => ({
  listaRozmow: (...a: unknown[]) => pamiec.listaRozmow(...a),
  czytajRozmowe: (...a: unknown[]) => pamiec.czytajRozmowe(...a),
  usunRozmowe: (...a: unknown[]) => pamiec.usunRozmowe(...a),
  usunWszystkieRozmowy: (...a: unknown[]) => pamiec.usunWszystkieRozmowy(...a),
}))

const zada = {} as never
const z = (id: string) => ({ params: Promise.resolve({ id }) })

describe('/api/asystent/rozmowy', () => {
  beforeEach(() => {
    ktoPyta.mockReset().mockResolvedValue({ uid: 'u', email: 'ja', rola: 'owner' })
    Object.values(pamiec).forEach((f) => f.mockReset())
  })

  it('zarząd nie widzi rozmów', async () => {
    ktoPyta.mockResolvedValue({ uid: 'kod:1', email: 'Jula', rola: 'board' })
    expect((await lista(zada)).status).toBe(403)
    expect((await jedna(zada, z('w1'))).status).toBe(403)
    expect(pamiec.listaRozmow).not.toHaveBeenCalled()
  })

  it('lista i jedna rozmowa', async () => {
    pamiec.listaRozmow.mockResolvedValue([{ id: 'w1', tytul: 'T', zmieniono: 2 }])
    expect(await (await lista(zada)).json()).toEqual([{ id: 'w1', tytul: 'T', zmieniono: 2 }])
    pamiec.czytajRozmowe.mockResolvedValue({ id: 'w1', tytul: 'T', utworzono: 1, zmieniono: 2, wiadomosci: [] })
    expect((await (await jedna(zada, z('w1'))).json()).id).toBe('w1')
    pamiec.czytajRozmowe.mockResolvedValue(null)
    expect((await jedna(zada, z('brak'))).status).toBe(404)
  })

  it('usuwa jedną i wszystkie', async () => {
    expect((await usunJedna(zada, z('w1'))).status).toBe(200)
    expect(pamiec.usunRozmowe).toHaveBeenCalledWith('w1')
    pamiec.usunWszystkieRozmowy.mockResolvedValue(7)
    expect(await (await wszystkie(zada)).json()).toEqual({ usuniete: 7 })
  })
})

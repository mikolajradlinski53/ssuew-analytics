import { describe, it, expect, vi, beforeEach } from 'vitest'

const ktoPyta = vi.fn()
const dodajPropozycje = vi.fn()
const zmienDzien = vi.fn()
const trybWspolny = vi.fn()

vi.mock('@/lib/auth/guard', () => ({ ktoPyta: (...a: unknown[]) => ktoPyta(...a) }))
vi.mock('@/lib/firebase/admin', () => ({
  propozycjeRef: () => ({ add: (d: unknown) => dodajPropozycje(d) }),
  wydarzeniaRef: () => ({ doc: (id: string) => ({ update: (d: unknown) => zmienDzien(id, d) }) }),
  semestrRef: () => ({ get: async () => ({ data: () => ({ trybWspolny: trybWspolny() }) }) }),
}))

function zada(body: unknown) {
  return { json: () => Promise.resolve(body) } as never
}

const PRZENIESIENIE = {
  semestr: '2026Z', akcja: 'propozycja-przeniesienia',
  wydarzenieId: 'w1', zDnia: 7, naDzien: 9, tytulWydarzenia: 'ZEBRANIE',
}

describe('POST /api/planer', () => {
  beforeEach(() => {
    vi.resetModules()
    ktoPyta.mockReset()
    dodajPropozycje.mockReset()
    zmienDzien.mockReset()
    trybWspolny.mockReset().mockReturnValue(false)
  })

  it('bez sesji odmawia', async () => {
    ktoPyta.mockResolvedValue(null)
    const { POST } = await import('@/app/api/planer/route')
    expect((await POST(zada(PRZENIESIENIE))).status).toBe(401)
  })

  it('zarząd zgłasza propozycję przeniesienia', async () => {
    ktoPyta.mockResolvedValue({ uid: 'kod:482913', email: 'Jula', rola: 'board' })
    const { POST } = await import('@/app/api/planer/route')
    const res = await POST(zada(PRZENIESIENIE))
    expect(res.status).toBe(201)
    expect(dodajPropozycje).toHaveBeenCalledWith(
      expect.objectContaining({ rodzaj: 'przeniesienie', autor: 'Jula', naDzien: 9 }),
    )
  })

  it('zarząd NIE przesuwa wprost, gdy tryb wspólny jest wyłączony', async () => {
    ktoPyta.mockResolvedValue({ uid: 'kod:482913', email: 'Jula', rola: 'board' })
    const { POST } = await import('@/app/api/planer/route')
    const res = await POST(zada({ semestr: '2026Z', akcja: 'przenies', wydarzenieId: 'w1', naDzien: 9 }))
    expect(res.status).toBe(403)
    expect(zmienDzien).not.toHaveBeenCalled()
  })

  it('zarząd przesuwa wprost, gdy tryb wspólny jest włączony', async () => {
    // O tym decyduje SERWER, nie klient — klient wie tylko po to, żeby pokazać
    // właściwy interfejs.
    trybWspolny.mockReturnValue(true)
    ktoPyta.mockResolvedValue({ uid: 'kod:482913', email: 'Jula', rola: 'board' })
    const { POST } = await import('@/app/api/planer/route')
    const res = await POST(zada({ semestr: '2026Z', akcja: 'przenies', wydarzenieId: 'w1', naDzien: 9 }))
    expect(res.status).toBe(200)
    expect(zmienDzien).toHaveBeenCalledWith('w1', expect.objectContaining({ dzien: 9 }))
  })

  it('właściciel przesuwa wprost niezależnie od trybu', async () => {
    ktoPyta.mockResolvedValue({ uid: 'u1', email: 'kontakt@x.pl', rola: 'owner' })
    const { POST } = await import('@/app/api/planer/route')
    const res = await POST(zada({ semestr: '2026Z', akcja: 'przenies', wydarzenieId: 'w1', naDzien: 9 }))
    expect(res.status).toBe(200)
  })

  it('nieznana akcja to 400', async () => {
    ktoPyta.mockResolvedValue({ uid: 'u1', email: 'a@b.c', rola: 'owner' })
    const { POST } = await import('@/app/api/planer/route')
    expect((await POST(zada({ semestr: '2026Z', akcja: 'wysadz-baze' }))).status).toBe(400)
  })
})

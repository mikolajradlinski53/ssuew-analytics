import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const zweryfikujToken = vi.fn()
const odczytajSesjeKodu = vi.fn()
vi.mock('@/lib/auth/verify', () => ({ zweryfikujToken: (t: string) => zweryfikujToken(t) }))
vi.mock('@/lib/auth/session', () => ({ odczytajSesjeKodu: (t: string) => odczytajSesjeKodu(t) }))

function zada(ciasteczka: Record<string, string> = {}) {
  return {
    cookies: { get: (n: string) => (ciasteczka[n] ? { value: ciasteczka[n] } : undefined) },
  } as never
}

describe('ktoPyta', () => {
  beforeEach(() => {
    vi.resetModules()
    zweryfikujToken.mockReset()
    odczytajSesjeKodu.mockReset()
    odczytajSesjeKodu.mockResolvedValue(null)
    vi.stubEnv('DECK_OWNER_EMAIL', 'ja@example.com')
    vi.stubEnv('DECK_BOARD_EMAILS', 'zarzad@example.com')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('zwraca null bez ciasteczka', async () => {
    const { ktoPyta } = await import('@/lib/auth/guard')
    expect(await ktoPyta(zada())).toBeNull()
    expect(zweryfikujToken).not.toHaveBeenCalled()
  })

  it('zwraca null, gdy token jest nieważny', async () => {
    zweryfikujToken.mockResolvedValue(null)
    const { ktoPyta } = await import('@/lib/auth/guard')
    expect(await ktoPyta(zada({ deck_session: 'zly-token' }))).toBeNull()
  })

  it('zwraca rolę owner dla właściciela', async () => {
    zweryfikujToken.mockResolvedValue({ uid: 'u1', email: 'ja@example.com' })
    const { ktoPyta } = await import('@/lib/auth/guard')
    expect(await ktoPyta(zada({ deck_session: 'token' }))).toEqual({ uid: 'u1', email: 'ja@example.com', rola: 'owner' })
  })

  it('zwraca rolę board dla adresu zarządu', async () => {
    zweryfikujToken.mockResolvedValue({ uid: 'u2', email: 'zarzad@example.com' })
    const { ktoPyta } = await import('@/lib/auth/guard')
    expect(await ktoPyta(zada({ deck_session: 'token' }))).toEqual({ uid: 'u2', email: 'zarzad@example.com', rola: 'board' })
  })

  it('zwraca null dla ważnego tokenu spoza listy adresów', async () => {
    zweryfikujToken.mockResolvedValue({ uid: 'u9', email: 'obcy@example.com' })
    const { ktoPyta } = await import('@/lib/auth/guard')
    expect(await ktoPyta(zada({ deck_session: 'token' }))).toBeNull()
  })

  it('wpuszcza na bilet kodowy, gdy nie ma konta z hasłem', async () => {
    odczytajSesjeKodu.mockResolvedValue({ kod: 'DECK-START', urzadzenie: 'u-1', rola: 'board' })
    const { ktoPyta } = await import('@/lib/auth/guard')
    expect(await ktoPyta(zada({ deck_kod: 'bilet' }))).toEqual({
      uid: 'kod:DECK-START',
      email: 'DECK-START',
      rola: 'board',
    })
  })

  it('konto z hasłem ma pierwszeństwo przed biletem kodowym', async () => {
    zweryfikujToken.mockResolvedValue({ uid: 'u1', email: 'ja@example.com' })
    odczytajSesjeKodu.mockResolvedValue({ kod: 'DECK-START', urzadzenie: 'u-1', rola: 'board' })
    const { ktoPyta } = await import('@/lib/auth/guard')
    const kto = await ktoPyta(zada({ deck_session: 'token', deck_kod: 'bilet' }))
    expect(kto?.rola).toBe('owner')
  })

  it('spada na bilet kodowy, gdy token konta jest nieważny', async () => {
    zweryfikujToken.mockResolvedValue(null)
    odczytajSesjeKodu.mockResolvedValue({ kod: 'DECK-START', urzadzenie: 'u-1', rola: 'board' })
    const { ktoPyta } = await import('@/lib/auth/guard')
    expect((await ktoPyta(zada({ deck_session: 'stary', deck_kod: 'bilet' })))?.rola).toBe('board')
  })

  it('odmawia, gdy bilet kodowy jest podrobiony', async () => {
    odczytajSesjeKodu.mockResolvedValue(null)
    const { ktoPyta } = await import('@/lib/auth/guard')
    expect(await ktoPyta(zada({ deck_kod: 'podrobka' }))).toBeNull()
  })
})

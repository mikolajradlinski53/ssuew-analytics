import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const zweryfikujToken = vi.fn()
vi.mock('@/lib/auth/verify', () => ({ zweryfikujToken: (t: string) => zweryfikujToken(t) }))

function zada(ciasteczko?: string) {
  return {
    cookies: { get: (n: string) => (ciasteczko && n === 'deck_session' ? { value: ciasteczko } : undefined) },
  } as never
}

describe('ktoPyta', () => {
  beforeEach(() => {
    vi.resetModules()
    zweryfikujToken.mockReset()
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
    expect(await ktoPyta(zada('zly-token'))).toBeNull()
  })

  it('zwraca rolę owner dla właściciela', async () => {
    zweryfikujToken.mockResolvedValue({ uid: 'u1', email: 'ja@example.com' })
    const { ktoPyta } = await import('@/lib/auth/guard')
    expect(await ktoPyta(zada('token'))).toEqual({ uid: 'u1', email: 'ja@example.com', rola: 'owner' })
  })

  it('zwraca rolę board dla adresu zarządu', async () => {
    zweryfikujToken.mockResolvedValue({ uid: 'u2', email: 'zarzad@example.com' })
    const { ktoPyta } = await import('@/lib/auth/guard')
    expect(await ktoPyta(zada('token'))).toEqual({ uid: 'u2', email: 'zarzad@example.com', rola: 'board' })
  })

  it('zwraca null dla ważnego tokenu spoza listy adresów', async () => {
    zweryfikujToken.mockResolvedValue({ uid: 'u9', email: 'obcy@example.com' })
    const { ktoPyta } = await import('@/lib/auth/guard')
    expect(await ktoPyta(zada('token'))).toBeNull()
  })
})

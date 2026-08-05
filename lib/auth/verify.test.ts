import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const jwtVerify = vi.fn()
vi.mock('jose', () => ({
  jwtVerify: (...a: unknown[]) => jwtVerify(...a),
  createRemoteJWKSet: () => 'jwks',
}))

describe('zweryfikujToken', () => {
  beforeEach(() => {
    vi.resetModules()
    jwtVerify.mockReset()
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'deck-test')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('zwraca uid i e-mail z ważnego tokenu', async () => {
    jwtVerify.mockResolvedValue({ payload: { sub: 'u1', email: 'ja@example.com' } })
    const { zweryfikujToken } = await import('@/lib/auth/verify')
    expect(await zweryfikujToken('abc')).toEqual({ uid: 'u1', email: 'ja@example.com' })
  })

  it('sprawdza wystawcę i odbiorcę zgodnie z projektem Firebase', async () => {
    jwtVerify.mockResolvedValue({ payload: { sub: 'u1', email: 'a@b.c' } })
    const { zweryfikujToken } = await import('@/lib/auth/verify')
    await zweryfikujToken('abc')
    expect(jwtVerify.mock.calls[0][2]).toEqual({
      issuer: 'https://securetoken.google.com/deck-test',
      audience: 'deck-test',
    })
  })

  it('zwraca null przy tokenie odrzuconym przez podpis', async () => {
    jwtVerify.mockRejectedValue(new Error('signature verification failed'))
    const { zweryfikujToken } = await import('@/lib/auth/verify')
    expect(await zweryfikujToken('zly')).toBeNull()
  })

  it('zwraca null, gdy token nie niesie adresu e-mail', async () => {
    jwtVerify.mockResolvedValue({ payload: { sub: 'u1' } })
    const { zweryfikujToken } = await import('@/lib/auth/verify')
    expect(await zweryfikujToken('abc')).toBeNull()
  })
})

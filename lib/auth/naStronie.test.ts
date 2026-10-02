import { describe, it, expect, vi, beforeEach } from 'vitest'

const ciasteczka: Record<string, string> = {}
const ktoZCiasteczek = vi.fn()

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (n: string) => (ciasteczka[n] ? { value: ciasteczka[n] } : undefined),
  }),
}))
vi.mock('@/lib/auth/guard', () => ({
  ktoZCiasteczek: (...a: unknown[]) => ktoZCiasteczek(...a),
}))

describe('ktoNaStronie', () => {
  beforeEach(() => {
    for (const k of Object.keys(ciasteczka)) delete ciasteczka[k]
    ktoZCiasteczek.mockReset().mockResolvedValue(null)
  })

  it('podaje dalej bilet kodu - kokpit nie może go pominąć', async () => {
    ciasteczka.deck_kod = 'bilet'
    const { ktoNaStronie } = await import('@/lib/auth/naStronie')
    await ktoNaStronie()
    expect(ktoZCiasteczek).toHaveBeenCalledWith(undefined, 'bilet')
  })

  it('podaje dalej token konta z hasłem', async () => {
    ciasteczka.deck_session = 'token'
    const { ktoNaStronie } = await import('@/lib/auth/naStronie')
    await ktoNaStronie()
    expect(ktoZCiasteczek).toHaveBeenCalledWith('token', undefined)
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const zweryfikujToken = vi.fn()
vi.mock('@/lib/auth/verify', () => ({ zweryfikujToken: (t: string) => zweryfikujToken(t) }))

function zada(body: unknown) {
  return { json: () => Promise.resolve(body) } as never
}

describe('POST /api/session', () => {
  beforeEach(() => {
    vi.resetModules()
    zweryfikujToken.mockReset()
    vi.stubEnv('DECK_OWNER_EMAIL', 'ja@example.com')
    vi.stubEnv('DECK_BOARD_EMAILS', '')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('odmawia bez tokenu', async () => {
    const { POST } = await import('@/app/api/session/route')
    expect((await POST(zada({}))).status).toBe(401)
  })

  it('odmawia, gdy token jest nieważny', async () => {
    zweryfikujToken.mockResolvedValue(null)
    const { POST } = await import('@/app/api/session/route')
    expect((await POST(zada({ token: 'zly' }))).status).toBe(401)
  })

  it('odmawia adresowi spoza listy i podaje go w komunikacie', async () => {
    zweryfikujToken.mockResolvedValue({ uid: 'u9', email: 'obcy@example.com' })
    const { POST } = await import('@/app/api/session/route')
    const res = await POST(zada({ token: 'abc' }))
    expect(res.status).toBe(403)
    // Adres w komunikacie jest po to, zeby dalo sie go wkleic do DECK_OWNER_EMAIL.
    expect((await res.json()).error).toContain('obcy@example.com')
  })

  it('nie ustawia ciasteczka przy odmowie', async () => {
    zweryfikujToken.mockResolvedValue({ uid: 'u9', email: 'obcy@example.com' })
    const { POST } = await import('@/app/api/session/route')
    const res = await POST(zada({ token: 'abc' }))
    expect(res.cookies.get('deck_session')).toBeUndefined()
  })

  it('ustawia ciasteczko httpOnly i zwraca rolę właściciela', async () => {
    zweryfikujToken.mockResolvedValue({ uid: 'u1', email: 'ja@example.com' })
    const { POST } = await import('@/app/api/session/route')
    const res = await POST(zada({ token: 'abc' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ rola: 'owner', email: 'ja@example.com' })
    expect(res.cookies.get('deck_session')?.value).toBe('abc')
    expect(res.cookies.get('deck_session')?.httpOnly).toBe(true)
  })
})

describe('DELETE /api/session', () => {
  it('kasuje ciasteczko sesji', async () => {
    const { DELETE } = await import('@/app/api/session/route')
    const res = await DELETE()
    expect(res.status).toBe(200)
    expect(res.cookies.get('deck_session')?.value).toBe('')
  })
})

// @vitest-environment node
// Moduł żyje wyłącznie na serwerze, a jsdom podsuwa TextEncoder z innej realm,
// przez co jose nie rozpoznaje własnego Uint8Array.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('sesja kodowa', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('DECK_SESSION_SECRET', 'sekret-testowy-o-dlugosci-32-znakow!!')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('podpisany bilet daje się odczytać', async () => {
    const { podpiszSesjeKodu, odczytajSesjeKodu } = await import('@/lib/auth/session')
    const bilet = await podpiszSesjeKodu({ kod: 'DECK-START', urzadzenie: 'u-1' })
    expect(await odczytajSesjeKodu(bilet)).toMatchObject({
      kod: 'DECK-START',
      urzadzenie: 'u-1',
      rola: 'board',
    })
  })

  it('odrzuca bilet po zmianie choćby jednego znaku', async () => {
    const { podpiszSesjeKodu, odczytajSesjeKodu } = await import('@/lib/auth/session')
    const bilet = await podpiszSesjeKodu({ kod: 'DECK-START', urzadzenie: 'u-1' })
    const podrobiony = bilet.slice(0, -2) + (bilet.endsWith('A') ? 'BB' : 'AA')
    expect(await odczytajSesjeKodu(podrobiony)).toBeNull()
  })

  it('odrzuca bilet podpisany innym sekretem', async () => {
    const { podpiszSesjeKodu } = await import('@/lib/auth/session')
    const bilet = await podpiszSesjeKodu({ kod: 'DECK-START', urzadzenie: 'u-1' })

    vi.resetModules()
    vi.stubEnv('DECK_SESSION_SECRET', 'zupelnie-inny-sekret-tez-32-znaki!!!!')
    const { odczytajSesjeKodu } = await import('@/lib/auth/session')
    expect(await odczytajSesjeKodu(bilet)).toBeNull()
  })

  it('odrzuca śmieci zamiast biletu', async () => {
    const { odczytajSesjeKodu } = await import('@/lib/auth/session')
    expect(await odczytajSesjeKodu('to-nie-jest-bilet')).toBeNull()
    expect(await odczytajSesjeKodu('')).toBeNull()
  })

  it('nie podpisuje niczym, gdy sekret nie jest ustawiony', async () => {
    vi.stubEnv('DECK_SESSION_SECRET', '')
    vi.resetModules()
    const { podpiszSesjeKodu } = await import('@/lib/auth/session')
    await expect(podpiszSesjeKodu({ kod: 'x', urzadzenie: 'y' })).rejects.toThrow()
  })

  it('losuje różne identyfikatory urządzeń', async () => {
    const { nowyIdentyfikatorUrzadzenia } = await import('@/lib/auth/session')
    const a = nowyIdentyfikatorUrzadzenia()
    const b = nowyIdentyfikatorUrzadzenia()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThanOrEqual(16)
  })
})

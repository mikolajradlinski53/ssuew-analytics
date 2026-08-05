import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('gas config', () => {
  beforeEach(() => vi.resetModules())
  afterEach(() => vi.unstubAllEnvs())

  it('nie jest skonfigurowany bez zmiennych środowiskowych', async () => {
    vi.stubEnv('GAS_URL', '')
    vi.stubEnv('GAS_TOKEN', '')
    const { isConfigured } = await import('@/lib/gas/config')
    expect(isConfigured).toBe(false)
  })

  it('nie jest skonfigurowany, gdy brakuje samego tokenu', async () => {
    vi.stubEnv('GAS_URL', 'https://script.google.com/macros/s/abc/exec')
    vi.stubEnv('GAS_TOKEN', '')
    const { isConfigured } = await import('@/lib/gas/config')
    expect(isConfigured).toBe(false)
  })

  it('jest skonfigurowany, gdy są oba', async () => {
    vi.stubEnv('GAS_URL', 'https://script.google.com/macros/s/abc/exec')
    vi.stubEnv('GAS_TOKEN', 'tajne')
    const { isConfigured, GAS_URL } = await import('@/lib/gas/config')
    expect(isConfigured).toBe(true)
    expect(GAS_URL).toContain('/exec')
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

function odpowiedz(tresc: string) {
  return { text: () => Promise.resolve(tresc) } as unknown as Response
}

describe('gasList', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('GAS_URL', 'https://script.google.com/macros/s/abc/exec')
    vi.stubEnv('GAS_TOKEN', 'tajne')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('zwraca listę wierszy', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      odpowiedz('[{"id":"1","edycja":"J\'25","rok":2025}]'),
    ))
    const { gasList } = await import('@/lib/gas/client')
    const dane = await gasList('rekrutacje')
    expect(dane).toHaveLength(1)
    expect(dane[0].edycja).toBe("J'25")
  })

  it('dokłada token i nazwę zakładki do adresu', async () => {
    const f = vi.fn().mockResolvedValue(odpowiedz('[]'))
    vi.stubGlobal('fetch', f)
    const { gasList } = await import('@/lib/gas/client')
    await gasList('kpi')
    expect(f.mock.calls[0][0]).toContain('token=tajne')
    expect(f.mock.calls[0][0]).toContain('t=kpi')
  })

  it('zamienia odpowiedź ok:false na GasError z kodem ze skryptu', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      odpowiedz('{"ok":false,"kod":403,"error":"Brak dostepu"}'),
    ))
    const { gasList, GasError } = await import('@/lib/gas/client')
    await expect(gasList('kpi')).rejects.toBeInstanceOf(GasError)
    await expect(gasList('kpi')).rejects.toMatchObject({ kod: 403 })
  })

  it('zamienia odpowiedź w HTML na czytelny błąd', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      odpowiedz('<!DOCTYPE html><html>Zaloguj się</html>'),
    ))
    const { gasList } = await import('@/lib/gas/client')
    await expect(gasList('kpi')).rejects.toMatchObject({ kod: 502 })
  })

  it('zamienia zerwane czytanie treści na GasError, a nie surowy wyjątek', async () => {
    // Połączenie urywa się już po nagłówkach, w trakcie pobierania treści.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      text: () => Promise.reject(new Error('socket hang up')),
    } as unknown as Response))
    const { gasList, GasError } = await import('@/lib/gas/client')
    await expect(gasList('kpi')).rejects.toBeInstanceOf(GasError)
    await expect(gasList('kpi')).rejects.toMatchObject({ kod: 504 })
  })

  it('zwraca pustą listę, gdy skrypt nie jest skonfigurowany', async () => {
    vi.stubEnv('GAS_URL', '')
    vi.stubEnv('GAS_TOKEN', '')
    const f = vi.fn()
    vi.stubGlobal('fetch', f)
    const { gasList } = await import('@/lib/gas/client')
    expect(await gasList('kpi')).toEqual([])
    expect(f).not.toHaveBeenCalled()
  })
})

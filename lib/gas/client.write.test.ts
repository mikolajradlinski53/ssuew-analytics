import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

function odpowiedz(tresc: string) {
  return { text: () => Promise.resolve(tresc) } as unknown as Response
}

describe('gasWrite', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('GAS_URL', 'https://script.google.com/macros/s/abc/exec')
    vi.stubEnv('GAS_TOKEN', 'tajne')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('wysyła token, zakładkę, operację i wiersze', async () => {
    const f = vi.fn().mockResolvedValue(odpowiedz('{"ok":true,"rows":[{"id":"a"}]}'))
    vi.stubGlobal('fetch', f)
    const { gasWrite } = await import('@/lib/gas/client')
    await gasWrite('kpi', 'insert', [{ kategoria: 'SKS', nazwa: 'Maj' }])

    const [, init] = f.mock.calls[0]
    const body = JSON.parse(init.body)
    expect(init.method).toBe('POST')
    expect(body).toMatchObject({ token: 'tajne', t: 'kpi', op: 'insert' })
    expect(body.rows).toHaveLength(1)
  })

  it('nie pozwala cache-ować zapisu', async () => {
    // Zapis podany z cache oznaczalby ciche gubienie danych — zadanie
    // wygladaloby na wykonane, a do arkusza nic by nie poszlo.
    const f = vi.fn().mockResolvedValue(odpowiedz('{"ok":true,"rows":[]}'))
    vi.stubGlobal('fetch', f)
    const { gasWrite } = await import('@/lib/gas/client')
    await gasWrite('rekrutacje', 'upsert', [{ edycja: "J'26" }])

    const [, init] = f.mock.calls[0]
    expect(init.cache).toBe('no-store')
    expect(init.next).toBeUndefined()
  })

  it('zwraca wiersze z koperty odpowiedzi', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      odpowiedz('{"ok":true,"rows":[{"id":"a"},{"id":"b"}]}'),
    ))
    const { gasWrite } = await import('@/lib/gas/client')
    const wynik = await gasWrite('kpi', 'insert', [{}, {}])
    expect(wynik).toHaveLength(2)
  })

  it('rzuca GasError, gdy skrypt odmawia', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      odpowiedz('{"ok":false,"kod":404,"error":"Nie ma wiersza"}'),
    ))
    const { gasWrite, GasError } = await import('@/lib/gas/client')
    await expect(gasWrite('kpi', 'update', [{ id: 'x' }])).rejects.toBeInstanceOf(GasError)
  })

  it('rzuca GasError 503, gdy skrypt nie jest skonfigurowany', async () => {
    vi.stubEnv('GAS_URL', '')
    vi.stubEnv('GAS_TOKEN', '')
    const { gasWrite } = await import('@/lib/gas/client')
    await expect(gasWrite('kpi', 'insert', [{}])).rejects.toMatchObject({ kod: 503 })
  })
})

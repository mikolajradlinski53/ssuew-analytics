import { describe, it, expect, vi, afterEach } from 'vitest'
import { zapytajGemini, BladAsystenta, komunikatBledu, bezDlugichMyslnikow, MODELE_DOMYSLNE } from '@/lib/asystent/gemini'

function odpowiedz(status: number, body: unknown) {
  const f = vi.fn(async () => new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', f)
  return f
}

const OK = { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'Retencja \u2014 spada' }] } }] }

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('zapytajGemini', () => {
  it('bez klucza nie dzwoni i zgłasza brak klucza', async () => {
    vi.stubEnv('GEMINI_API_KEY', '')
    const f = odpowiedz(200, OK)
    await expect(zapytajGemini({ instrukcja: 'x', wiadomosci: [{ rola: 'user', tekst: 'y' }] }))
      .rejects.toMatchObject({ kod: 'brak-klucza' })
    expect(f).not.toHaveBeenCalled()
  })

  it('wysyła instrukcję, rozmowę i klucz w nagłówku; zwraca tekst bez długich myślników', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'klucz')
    vi.stubEnv('GEMINI_MODEL', '')
    const f = odpowiedz(200, OK)
    const { tekst, model } = await zapytajGemini({ instrukcja: 'Jesteś D.E.C.K.', wiadomosci: [{ rola: 'user', tekst: 'Co z retencją?' }] })
    expect(tekst).toBe('Retencja - spada')
    expect(model).toBe(MODELE_DOMYSLNE[0])
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain(`models/${MODELE_DOMYSLNE[0]}:generateContent`)
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('klucz')
    const body = JSON.parse(init.body as string)
    expect(body.systemInstruction.parts[0].text).toBe('Jesteś D.E.C.K.')
    expect(body.contents).toEqual([{ role: 'user', parts: [{ text: 'Co z retencją?' }] }])
  })

  it('ze schematem prosi o JSON', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'klucz')
    const f = odpowiedz(200, OK)
    await zapytajGemini({ instrukcja: 'x', wiadomosci: [{ rola: 'user', tekst: 'y' }], schemat: { type: 'OBJECT' } })
    const body = JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(body.generationConfig).toEqual({ responseMimeType: 'application/json', responseSchema: { type: 'OBJECT' } })
  })

  it('model z GEMINI_MODEL', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'klucz')
    vi.stubEnv('GEMINI_MODEL', 'gemini-inny')
    const f = odpowiedz(200, OK)
    await zapytajGemini({ instrukcja: 'x', wiadomosci: [{ rola: 'user', tekst: 'y' }] })
    expect((f.mock.calls[0] as unknown as [string])[0]).toContain('models/gemini-inny:generateContent')
  })

  it('429 to limit', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'klucz')
    odpowiedz(429, { error: { message: 'quota' } })
    await expect(zapytajGemini({ instrukcja: 'x', wiadomosci: [{ rola: 'user', tekst: 'y' }] })).rejects.toMatchObject({ kod: 'limit' })
  })

  it('blokada pytania albo odpowiedzi to odmowa', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'klucz')
    odpowiedz(200, { promptFeedback: { blockReason: 'SAFETY' } })
    await expect(zapytajGemini({ instrukcja: 'x', wiadomosci: [{ rola: 'user', tekst: 'y' }] })).rejects.toMatchObject({ kod: 'odmowa' })
    odpowiedz(200, { candidates: [{ finishReason: 'SAFETY', content: { parts: [] } }] })
    await expect(zapytajGemini({ instrukcja: 'x', wiadomosci: [{ rola: 'user', tekst: 'y' }] })).rejects.toMatchObject({ kod: 'odmowa' })
  })

  it('pusta odpowiedź to błąd formatu', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'klucz')
    odpowiedz(200, { candidates: [{ finishReason: 'STOP', content: { parts: [] } }] })
    await expect(zapytajGemini({ instrukcja: 'x', wiadomosci: [{ rola: 'user', tekst: 'y' }] })).rejects.toMatchObject({ kod: 'format' })
  })
})

describe('zapytajGemini - modele zapasowe', () => {
  const PYTANIE = { instrukcja: 'x', wiadomosci: [{ rola: 'user' as const, tekst: 'y' }] }
  const kolejno = (...statusy: number[]) => {
    const f = vi.fn()
    for (const s of statusy) f.mockResolvedValueOnce(new Response(JSON.stringify(s === 200 ? OK : { error: { message: 'x' } }), { status: s }))
    vi.stubGlobal('fetch', f)
    return f
  }
  const modelZ = (f: ReturnType<typeof vi.fn>, i: number) => (f.mock.calls[i] as unknown as [string])[0]

  it('przeciążony model (503) - odpowiada następny z listy', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'klucz')
    vi.stubEnv('GEMINI_MODEL', 'model-a, model-b')
    const f = kolejno(503, 200)
    const wynik = await zapytajGemini(PYTANIE)
    expect(wynik.model).toBe('model-b')
    expect(modelZ(f, 0)).toContain('models/model-a:')
    expect(modelZ(f, 1)).toContain('models/model-b:')
  })

  it('limit na jednym modelu - próbuje kolejnego', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'klucz')
    vi.stubEnv('GEMINI_MODEL', 'model-a,model-b')
    kolejno(429, 200)
    expect((await zapytajGemini(PYTANIE)).model).toBe('model-b')
  })

  it('domyślnie trzy modele, a gdy wszystkie przeciążone - błąd sieci', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'klucz')
    vi.stubEnv('GEMINI_MODEL', '')
    const f = kolejno(503, 503, 503)
    await expect(zapytajGemini(PYTANIE)).rejects.toMatchObject({ kod: 'siec' })
    expect(MODELE_DOMYSLNE).toHaveLength(3)
    MODELE_DOMYSLNE.forEach((m, i) => expect(modelZ(f, i)).toContain(`models/${m}:`))
  })

  it('wszystkie na limicie - limit', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'klucz')
    vi.stubEnv('GEMINI_MODEL', 'model-a,model-b')
    kolejno(429, 503)
    await expect(zapytajGemini(PYTANIE)).rejects.toMatchObject({ kod: 'limit' })
  })

  it('błędne zapytanie (400) nie przełącza modelu', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'klucz')
    vi.stubEnv('GEMINI_MODEL', 'model-a,model-b')
    const f = kolejno(400, 200)
    await expect(zapytajGemini(PYTANIE)).rejects.toMatchObject({ kod: 'siec' })
    expect(f).toHaveBeenCalledTimes(1)
  })
})

describe('komunikatBledu i myślniki', () => {
  it('mapuje kody na status i polski komunikat', () => {
    expect(komunikatBledu(new BladAsystenta('limit', 'x'))).toMatchObject({ status: 429 })
    expect(komunikatBledu(new BladAsystenta('brak-klucza', 'x')).error).toMatch(/GEMINI_API_KEY/)
    expect(komunikatBledu(new Error('?'))).toMatchObject({ status: 500 })
  })

  it('zamienia oba długie myślniki', () => {
    expect(bezDlugichMyslnikow('a \u2014 b \u2013 c')).toBe('a - b - c')
  })
})

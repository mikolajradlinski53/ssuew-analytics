import { describe, it, expect, vi, afterEach } from 'vitest'
import { zapytajGemini, BladAsystenta, komunikatBledu, bezDlugichMyslnikow, DOMYSLNY_MODEL } from '@/lib/asystent/gemini'

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
    const tekst = await zapytajGemini({ instrukcja: 'Jesteś D.E.C.K.', wiadomosci: [{ rola: 'user', tekst: 'Co z retencją?' }] })
    expect(tekst).toBe('Retencja - spada')
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain(`models/${DOMYSLNY_MODEL}:generateContent`)
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

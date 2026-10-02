import type { ReactNode } from 'react'
import { render, renderHook, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { AnalyticsDataProvider, BanerZrodla } from '@/components/ui/AnalyticsDataProvider'
import { useAnalyticsData, DEMO_REKRUTACJE } from '@/lib/useAnalyticsData'

const LIVE_REKR = [{ id: 'r1', edycja: "J'26", sezon: 'jesien', rok: 2026, zgloszenia: 120, przyjeci: 40, created_at: '' }]

/** Odpowiedzi API po ścieżce; brak wpisu = pusta lista, jak przy pustej zakładce. */
function api(odpowiedzi: Record<string, { status: number; body: unknown }>) {
  const f = vi.fn(async (url: string) => {
    const o = odpowiedzi[url] ?? { status: 200, body: [] }
    return new Response(JSON.stringify(o.body), { status: o.status })
  })
  vi.stubGlobal('fetch', f)
  return f
}

const wrapper = ({ children }: { children: ReactNode }) => <AnalyticsDataProvider>{children}</AnalyticsDataProvider>

afterEach(() => vi.unstubAllGlobals())

describe('AnalyticsDataProvider', () => {
  it('awaria jednej zakładki nie wyrzuca pozostałych do trybu demo', async () => {
    api({
      '/api/rekrutacje': { status: 200, body: LIVE_REKR },
      '/api/kpi': { status: 400, body: { error: 'Nieznana zakladka' } },
    })
    const { result } = renderHook(() => useAnalyticsData(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.rekrutacje).toEqual(LIVE_REKR)
    expect(result.current.zrodla.rekrutacje).toBe('live')
    expect(result.current.zrodla.kpi).toBe('demo')
    expect(result.current.bledy.join(' ')).toMatch(/KPI.*Nieznana zakladka/)
  })

  it('pusta zakładka daje dane przykładowe bez komunikatu o błędzie', async () => {
    api({})
    const { result } = renderHook(() => useAnalyticsData(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.rekrutacje).toEqual(DEMO_REKRUTACJE)
    expect(result.current.usingDemo).toBe(true)
    expect(result.current.bledy).toEqual([])
  })

  it('pobiera dane raz na całą sekcję, nie raz na moduł', async () => {
    const f = api({})
    function Dwa() {
      useAnalyticsData()
      useAnalyticsData()
      return null
    }
    render(<AnalyticsDataProvider><Dwa /><Dwa /></AnalyticsDataProvider>)
    await waitFor(() => expect(f).toHaveBeenCalledTimes(3))
  })
})

describe('BanerZrodla', () => {
  it('przy komplecie danych na żywo milczy', async () => {
    api({
      '/api/rekrutacje': { status: 200, body: LIVE_REKR },
      '/api/kpi': { status: 200, body: [{ id: 'k', kategoria: 'SKS', nazwa: 'X', okres: '2025/2026', wartosc: 1, created_at: '' }] },
      '/api/kohorty': { status: 200, body: [{ id: 'h', edycja: "J'26" }] },
    })
    const { container } = render(<AnalyticsDataProvider><BanerZrodla /></AnalyticsDataProvider>)
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(3))
    await waitFor(() => expect(container.textContent).toBe(''))
  })

  it('nazywa moduł z danymi przykładowymi i powód', async () => {
    api({
      '/api/rekrutacje': { status: 200, body: LIVE_REKR },
      '/api/kpi': { status: 400, body: { error: 'Nieznana zakladka' } },
    })
    render(<AnalyticsDataProvider><BanerZrodla /></AnalyticsDataProvider>)
    const baner = await screen.findByRole('status')
    expect(baner.textContent).toMatch(/dane przykładowe/i)
    expect(baner.textContent).toMatch(/KPI: Nieznana zakladka/)
    // Rekrutacje przyszły z arkusza - baner nie może ich oczerniać.
    expect(baner.textContent).not.toMatch(/Rekrutacje/)
  })
})

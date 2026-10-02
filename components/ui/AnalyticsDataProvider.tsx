'use client'
import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  AnalyticsDataContext,
  NAZWA_ZBIORU,
  useAnalyticsData,
  useAnalyticsZrodlo,
  type Zbior,
} from '@/lib/useAnalyticsData'

export function AnalyticsDataProvider({ children }: { children: ReactNode }) {
  const dane = useAnalyticsZrodlo()
  return <AnalyticsDataContext.Provider value={dane}>{children}</AnalyticsDataContext.Provider>
}

/**
 * Jedno miejsce, które mówi, że część liczb nie pochodzi z arkusza. Dane
 * przykładowe wyglądają wiarygodnie — bez tego napisu łatwo podjąć decyzję
 * na cudzych liczbach z zeszłego roku.
 */
export function BanerZrodla() {
  const { loading, zrodla, bledy } = useAnalyticsData()
  if (loading) return null

  const demo = (Object.keys(zrodla) as Zbior[]).filter((z) => zrodla[z] === 'demo')
  if (!demo.length) return null

  return (
    <div
      role="status"
      className="mb-4 flex items-start gap-2.5 rounded-lg border border-deck-warn/40 bg-deck-warn/10 px-4 py-3 text-[12px] leading-5"
    >
      <AlertTriangle size={15} className="mt-0.5 shrink-0 text-deck-warn" />
      <div>
        <p className="text-deck-text">
          <span className="font-semibold text-deck-warn">Dane przykładowe</span> w:{' '}
          {demo.map((z) => NAZWA_ZBIORU[z]).join(', ')}. To historia SSUEW zaszyta w kodzie, nie Twój arkusz.
        </p>
        {bledy.length > 0 ? (
          <ul className="mt-1 text-deck-muted">
            {bledy.map((b) => <li key={b}>Arkusz nie odpowiedział — {b}</li>)}
          </ul>
        ) : (
          <p className="mt-1 text-deck-muted">Zakładki w arkuszu są puste — dopisz dane w „Wpisz dane”.</p>
        )}
      </div>
    </div>
  )
}

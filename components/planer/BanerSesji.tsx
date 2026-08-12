'use client'
import { Radio } from 'lucide-react'
import type { StanSesjiWspolnej } from '@/lib/planer/zapis'

type Props = {
  stan: StanSesjiWspolnej
  mozeWylaczyc: boolean
  onWylacz: () => void
}

function trwanie(od: number): string {
  const minuty = Math.max(0, Math.floor((Date.now() - od) / 60000))
  const h = Math.floor(minuty / 60)
  const m = minuty % 60
  return h > 0 ? `${h} h ${m} min` : `${m} min`
}

/**
 * Sesję wyłącza się ręcznie, więc czas trwania jest jedynym, co czyni
 * zapomnienie widocznym. Zapomniana włączona sesja to bezterminowe prawo
 * zapisu dla całego zarządu.
 */
export function BanerSesji({ stan, mozeWylaczyc, onWylacz }: Props) {
  if (!stan.wlaczony) return null

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-deck-accent/45 bg-deck-accent/10 px-3 py-2.5">
      <Radio size={15} className="text-deck-accent" />
      <span className="text-[12px] font-semibold text-deck-text">Sesja Operacyjna trwa</span>
      <span className="text-[11.5px] text-deck-muted">
        wszyscy zapisują na żywo
        {stan.od !== null && ` · ${trwanie(stan.od)}`}
      </span>
      {mozeWylaczyc && (
        <button
          type="button"
          onClick={onWylacz}
          className="ml-auto rounded-md border border-deck-accent/40 px-2.5 py-1 text-[11px] text-deck-accent transition hover:bg-deck-accent/15"
        >
          Wyłącz
        </button>
      )}
    </div>
  )
}

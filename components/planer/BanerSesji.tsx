'use client'
import { Radio } from 'lucide-react'
import type { StanSesjiWspolnej } from '@/lib/planer/zapis'
import { opiszTrwanie } from '@/lib/planer/stan'

type Props = {
  stan: StanSesjiWspolnej
  mozeWylaczyc: boolean
  onWylacz: () => void
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
        {stan.od !== null && ` · ${opiszTrwanie(stan.od, Date.now())}`}
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

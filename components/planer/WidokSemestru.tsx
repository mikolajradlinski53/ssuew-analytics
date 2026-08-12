'use client'
import { AlertTriangle } from 'lucide-react'
import { kolizjeWMiesiacu } from '@/lib/planer/kolizje'
import type { Miesiac, Wydarzenie } from '@/lib/planer/typy'

const NAZWY = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
]

type Props = {
  miesiace: Miesiac[]
  wydarzenia: Wydarzenie[]
  onWejdz: (m: Miesiac) => void
}

/** Polska odmiana po liczebniku: 1 wydarzenie, 2 wydarzenia, 5 wydarzeń. */
function odmianaWydarzen(ile: number): string {
  if (ile === 1) return '1 wydarzenie'
  const reszta = ile % 10
  const setka = ile % 100
  const mnoga = reszta >= 2 && reszta <= 4 && (setka < 12 || setka > 14)
  return `${ile} ${mnoga ? 'wydarzenia' : 'wydarzeń'}`
}

function odmianaDni(ile: number): string {
  if (ile === 1) return '1 dzień z kolizją'
  const reszta = ile % 10
  const setka = ile % 100
  const mnoga = reszta >= 2 && reszta <= 4 && (setka < 12 || setka > 14)
  return `${ile} ${mnoga ? 'dni z kolizjami' : 'dni z kolizjami'}`
}

/** Pięć miesięcy naraz — do patrzenia z lotu ptaka przy układaniu planu. */
export function WidokSemestru({ miesiace, wydarzenia, onWejdz }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {miesiace.map((m) => {
        const wMiesiacu = wydarzenia.filter((w) => w.miesiac === m.m && w.rok === m.y)
        const kolizje = kolizjeWMiesiacu(wMiesiacu)
        return (
          <button
            key={`${m.y}-${m.m}`}
            type="button"
            onClick={() => onWejdz(m)}
            className="deck-card rounded-lg p-3 text-left transition hover:border-deck-accent/40"
          >
            <div className="text-sm font-semibold text-deck-text">{NAZWY[m.m - 1]}</div>
            <div className="mt-0.5 font-mono text-[10px] text-deck-muted/70">{m.y}</div>
            <div className="mt-3 text-[11px] text-deck-muted">{odmianaWydarzen(wMiesiacu.length)}</div>
            {kolizje.size > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-deck-warn">
                <AlertTriangle size={11} />
                {odmianaDni(kolizje.size)}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

'use client'
import { useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { dniWMiesiacu, pierwszyDzienTygodnia } from '@/lib/planer/daty'
import { kolizjeWMiesiacu } from '@/lib/planer/kolizje'
import type { Miesiac, Wydarzenie } from '@/lib/planer/typy'
import { KartaWydarzenia } from './KartaWydarzenia'

const NAGLOWKI = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nie']

type Props = {
  miesiac: Miesiac
  wydarzenia: Wydarzenie[]
  onOtworz: (w: Wydarzenie) => void
  onPrzenies: (id: string, naDzien: number) => void
  mozeEdytowac: boolean
}

export function WidokMiesiaca({ miesiac, wydarzenia, onOtworz, onPrzenies, mozeEdytowac }: Props) {
  const [przeciagany, setPrzeciagany] = useState<string | null>(null)

  const ile = dniWMiesiacu(miesiac.y, miesiac.m)
  const przesuniecie = pierwszyDzienTygodnia(miesiac.y, miesiac.m)
  const kolizje = useMemo(() => kolizjeWMiesiacu(wydarzenia), [wydarzenia])

  const poDniach = useMemo(() => {
    const mapa = new Map<number, Wydarzenie[]>()
    for (const w of wydarzenia) {
      const lista = mapa.get(w.dzien) ?? []
      lista.push(w)
      mapa.set(w.dzien, lista)
    }
    return mapa
  }, [wydarzenia])

  function upusc(dzien: number) {
    const id = przeciagany
    setPrzeciagany(null)
    if (id) onPrzenies(id, dzien)
  }

  return (
    <div className="deck-card rounded-lg p-3">
      <div className="mb-2 grid grid-cols-7 gap-1.5">
        {NAGLOWKI.map((n) => (
          <div key={n} className="text-center font-mono text-[10px] uppercase tracking-[0.14em] text-deck-muted/70">
            {n}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: przesuniecie }).map((_, i) => (
          <div key={`pusty-${i}`} />
        ))}

        {Array.from({ length: ile }, (_, i) => i + 1).map((dzien) => {
          const kol = kolizje.get(dzien)
          const twarda = kol?.osoby.some((o) => o.twarda) || (kol?.sale.length ?? 0) > 0
          return (
            <div
              key={dzien}
              onDragOver={mozeEdytowac ? (e) => e.preventDefault() : undefined}
              onDrop={mozeEdytowac ? () => upusc(dzien) : undefined}
              className="min-h-[92px] rounded-md border border-white/8 bg-white/[0.02] p-1.5"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="font-mono text-[10px] text-deck-muted">{dzien}</span>
                {kol && (
                  <AlertTriangle
                    size={11}
                    aria-label={twarda ? 'kolizja twarda' : 'kolizja miękka'}
                    className={twarda ? 'text-deck-danger' : 'text-deck-warn'}
                  />
                )}
              </div>
              <div className="space-y-1">
                {(poDniach.get(dzien) ?? []).map((w) => (
                  <KartaWydarzenia
                    key={w.id}
                    wydarzenie={w}
                    onOtworz={onOtworz}
                    przeciagalne={mozeEdytowac}
                    onPrzeciagnij={setPrzeciagany}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

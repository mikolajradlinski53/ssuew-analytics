'use client'
import { AlertTriangle, Check, Inbox, X } from 'lucide-react'
import { opiszPropozycje, stanPropozycji, type Propozycja } from '@/lib/planer/propozycje'
import type { Wydarzenie } from '@/lib/planer/typy'

type Props = {
  propozycje: Propozycja[]
  wydarzenia: Wydarzenie[]
  onPrzyjmij: (p: Propozycja) => void
  onOdrzuc: (id: string) => void
}

export function Skrzynka({ propozycje, wydarzenia, onPrzyjmij, onOdrzuc }: Props) {
  if (propozycje.length === 0) {
    return (
      <div className="deck-card rounded-lg p-6 text-center">
        <Inbox size={20} className="mx-auto text-deck-muted/60" />
        <p className="mt-2 text-[12px] text-deck-muted">Nic nie czeka na decyzję.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {propozycje.map((p) => {
        const stan = stanPropozycji(p, wydarzenia)
        return (
          <div key={p.id} className="deck-card rounded-lg p-3">
            <div className="text-[12px] text-deck-text">{opiszPropozycje(p)}</div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-deck-muted/70">
              zgłosił: {p.autor}
            </div>

            {stan.ostrzezenie && (
              <div
                className={`mt-2 flex items-start gap-1.5 text-[11px] ${
                  stan.mozna ? 'text-deck-warn' : 'text-deck-danger'
                }`}
              >
                <AlertTriangle size={11} className="mt-0.5 flex-none" />
                {stan.ostrzezenie}
              </div>
            )}

            <div className="mt-3 flex gap-2">
              {stan.mozna && (
                <button
                  type="button"
                  onClick={() => onPrzyjmij(p)}
                  className="deck-button flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[11.5px] font-semibold"
                >
                  <Check size={13} /> Przyjmij
                </button>
              )}
              <button
                type="button"
                onClick={() => onOdrzuc(p.id)}
                className="flex items-center justify-center gap-1.5 rounded-md border border-white/12 px-3 py-1.5 text-[11.5px] text-deck-muted transition hover:border-deck-danger/40 hover:text-deck-danger"
              >
                <X size={13} /> Odrzuć
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

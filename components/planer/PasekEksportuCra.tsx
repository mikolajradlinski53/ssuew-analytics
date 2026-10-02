'use client'
import { Download, X } from 'lucide-react'
import { csvCra, nazwaPlikuCra } from '@/lib/planer/cra'
import type { Miesiac, Wydarzenie } from '@/lib/planer/typy'
import { pobierzPlik } from '@/lib/pobierz'

type Props = {
  /** Wydarzenia widoczne w miesiącu — do „zaznacz wszystkie”. */
  wMiesiacu: Wydarzenie[]
  /** Wszystkie wydarzenia semestru — zaznaczenie może obejmować kilka miesięcy. */
  wszystkie: Wydarzenie[]
  zaznaczone: Set<string>
  miesiac: Miesiac
  onZmien: (zaznaczone: Set<string>) => void
  onZakoncz: () => void
}

/**
 * Pasek trybu eksportu do CRA. Zaznaczenie przeżywa przełączanie miesięcy,
 * więc da się zebrać wydarzenia z kilku miesięcy do jednego pliku.
 */
export function PasekEksportuCra({ wMiesiacu, wszystkie, zaznaczone, miesiac, onZmien, onZakoncz }: Props) {
  const wybrane = wszystkie.filter((w) => zaznaczone.has(w.id))
  const wszystkieZMiesiaca = wMiesiacu.length > 0 && wMiesiacu.every((w) => zaznaczone.has(w.id))

  function przelaczMiesiac() {
    const nowe = new Set(zaznaczone)
    for (const w of wMiesiacu) {
      if (wszystkieZMiesiaca) nowe.delete(w.id)
      else nowe.add(w.id)
    }
    onZmien(nowe)
  }

  function pobierz() {
    pobierzPlik(new Blob([csvCra(wybrane)], { type: 'text/csv;charset=utf-8' }), nazwaPlikuCra(miesiac))
  }

  return (
    <div
      role="region"
      aria-label="Eksport do CRA"
      className="flex flex-wrap items-center gap-2 rounded-lg border border-deck-accent/45 bg-deck-accent/10 px-3 py-2 text-[12px]"
    >
      <span className="font-semibold text-deck-text">Eksport do CRA</span>
      <span className="text-deck-muted">kliknij wydarzenia, które mają trafić do pliku · zaznaczono {wybrane.length}</span>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={przelaczMiesiac}
          className="rounded-md border border-white/15 px-2.5 py-1 text-[11px] text-deck-muted transition hover:text-deck-text"
        >
          {wszystkieZMiesiaca ? 'Odznacz miesiąc' : 'Zaznacz cały miesiąc'}
        </button>
        <button
          type="button"
          onClick={pobierz}
          disabled={wybrane.length === 0}
          className="deck-button flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold disabled:opacity-50"
        >
          <Download size={12} /> Pobierz CSV
        </button>
        <button type="button" onClick={onZakoncz} aria-label="Zakończ eksport" className="text-deck-muted hover:text-deck-text">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

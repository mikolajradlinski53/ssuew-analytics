'use client'
import { CalendarDays, LayoutGrid } from 'lucide-react'
import { KATEGORIE, KLUCZE_KATEGORII, type Kategoria } from '@/lib/planer/typy'

export type Widok = 'miesiac' | 'semestr'

type Props = {
  aktywne: Set<Kategoria>
  onPrzelacz: (k: Kategoria) => void
  osoby: string[]
  osoba: string
  onOsoba: (o: string) => void
  widok: Widok
  onWidok: (w: Widok) => void
}

export function PasekFiltrow({ aktywne, onPrzelacz, osoby, osoba, onOsoba, widok, onWidok }: Props) {
  return (
    <div className="deck-card flex flex-wrap items-center gap-2 rounded-lg p-3">
      {KLUCZE_KATEGORII.map((k) => {
        const wlaczona = aktywne.has(k)
        const styl = KATEGORIE[k]
        return (
          <button
            key={k}
            type="button"
            onClick={() => onPrzelacz(k)}
            style={wlaczona ? { background: styl.tlo, borderColor: styl.obrys } : undefined}
            className={`rounded-md border px-2.5 py-1 text-[11px] transition ${
              wlaczona ? 'text-deck-text' : 'border-white/10 text-deck-muted/60 hover:text-deck-muted'
            }`}
          >
            {styl.etykieta}
          </button>
        )
      })}

      <select
        value={osoba}
        onChange={(e) => onOsoba(e.target.value)}
        aria-label="Filtr osoby"
        className="deck-input ml-auto rounded-lg px-2.5 py-1.5 text-[11px]"
      >
        <option value="">Wszystkie osoby</option>
        {osoby.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>

      <div className="flex gap-1 rounded-lg border border-white/10 p-1">
        <button
          type="button"
          onClick={() => onWidok('miesiac')}
          className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] ${
            widok === 'miesiac' ? 'bg-deck-accent/15 text-deck-accent' : 'text-deck-muted'
          }`}
        >
          <CalendarDays size={13} /> Miesiąc
        </button>
        <button
          type="button"
          onClick={() => onWidok('semestr')}
          className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] ${
            widok === 'semestr' ? 'bg-deck-accent/15 text-deck-accent' : 'text-deck-muted'
          }`}
        >
          <LayoutGrid size={13} /> Semestr
        </button>
      </div>
    </div>
  )
}

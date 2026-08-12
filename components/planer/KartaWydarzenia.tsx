'use client'
import { KATEGORIE, type Wydarzenie } from '@/lib/planer/typy'

type Props = {
  wydarzenie: Wydarzenie
  onOtworz: (w: Wydarzenie) => void
  przeciagalne: boolean
  onPrzeciagnij?: (id: string) => void
}

/**
 * W kratce dnia mieści się bardzo mało, więc karta pokazuje wyłącznie kolor
 * kategorii, godzinę i skrócony tytuł. Reszta jest w panelu bocznym.
 */
export function KartaWydarzenia({ wydarzenie, onOtworz, przeciagalne, onPrzeciagnij }: Props) {
  const styl = KATEGORIE[wydarzenie.kategoria]

  return (
    <button
      type="button"
      draggable={przeciagalne || undefined}
      onDragStart={przeciagalne ? () => onPrzeciagnij?.(wydarzenie.id) : undefined}
      onClick={() => onOtworz(wydarzenie)}
      style={{ background: styl.tlo, borderColor: styl.obrys }}
      className="w-full truncate rounded border-l-2 px-1.5 py-1 text-left text-[10.5px] leading-tight text-deck-text transition hover:brightness-125"
      title={wydarzenie.tytul}
    >
      {wydarzenie.godzina && (
        <span className="mr-1 font-mono text-[9.5px] text-deck-muted">{wydarzenie.godzina}</span>
      )}
      {wydarzenie.tytul}
    </button>
  )
}

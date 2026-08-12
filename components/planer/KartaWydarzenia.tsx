'use client'
import type { KeyboardEvent } from 'react'
import { KATEGORIE, type Wydarzenie } from '@/lib/planer/typy'

type Props = {
  wydarzenie: Wydarzenie
  onOtworz: (w: Wydarzenie) => void
  przeciagalne: boolean
  onPrzeciagnij?: (id: string) => void
  /** Przesunięcie o podaną liczbę dni — obsługa klawiatury. */
  onPrzesun?: (id: string, oDni: number) => void
}

/**
 * W kratce dnia mieści się bardzo mało, więc karta pokazuje wyłącznie kolor
 * kategorii, godzinę i skrócony tytuł. Reszta jest w panelu bocznym.
 */
export function KartaWydarzenia({ wydarzenie, onOtworz, przeciagalne, onPrzeciagnij, onPrzesun }: Props) {
  const styl = KATEGORIE[wydarzenie.kategoria]

  /**
   * Przeciąganie działa tylko myszą, więc te same przesunięcia obsługują
   * strzałki: w bok o dzień, w pionie o tydzień. Bez tego kalendarza nie da
   * się ułożyć bez myszy.
   */
  function naKlawisz(e: KeyboardEvent<HTMLButtonElement>) {
    if (!przeciagalne || !onPrzesun) return
    const oDni = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]
    if (oDni === undefined) return
    e.preventDefault()
    onPrzesun(wydarzenie.id, oDni)
  }

  return (
    <button
      type="button"
      draggable={przeciagalne || undefined}
      onDragStart={przeciagalne ? () => onPrzeciagnij?.(wydarzenie.id) : undefined}
      onClick={() => onOtworz(wydarzenie)}
      onKeyDown={naKlawisz}
      style={{ background: styl.tlo, borderColor: styl.obrys }}
      className="w-full truncate rounded border-l-2 px-1.5 py-1 text-left text-[10.5px] leading-tight text-deck-text transition hover:brightness-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-deck-accent"
      title={
        przeciagalne
          ? `${wydarzenie.tytul}\nStrzałki przesuwają: w bok o dzień, w pionie o tydzień.`
          : wydarzenie.tytul
      }
    >
      {wydarzenie.godzina && (
        <span className="mr-1 font-mono text-[9.5px] text-deck-muted">{wydarzenie.godzina}</span>
      )}
      {wydarzenie.tytul}
    </button>
  )
}

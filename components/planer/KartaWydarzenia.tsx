'use client'
import type { CSSProperties, KeyboardEvent } from 'react'
import { KATEGORIE, numerRangi, type Wydarzenie } from '@/lib/planer/typy'
import { opisCzasu, opisMiejsca } from '@/lib/planer/opis'

type Props = {
  wydarzenie: Wydarzenie
  onOtworz: (w: Wydarzenie) => void
  przeciagalne: boolean
  onPrzeciagnij?: (id: string) => void
  /** Przesunięcie o podaną liczbę dni — obsługa klawiatury. */
  onPrzesun?: (id: string, oDni: number) => void
  /** Czy przy wydarzeniu toczy się rozmowa. Kropka bez liczby — liczbę widać po otwarciu. */
  maRozmowe?: boolean
  /** Który to dzień wydarzenia wielodniowego, np. „2/4” — na liście dni na telefonie. */
  dopisek?: string
}

/**
 * Ważność widać po „ciężarze” karty: Zebrania to pełny blok, SSUEW karta
 * z obrysem, Projekty karta z paskiem, UE cienka linia, Aplikacje i Inne
 * sam tekst z kropką. Wariant wybrany na Sesji Operacyjnej.
 */
function wyglad(w: Wydarzenie): { klasa: string; styl: CSSProperties } {
  const s = KATEGORIE[w.kategoria]
  switch (s.ranga) {
    case 1:
      return { klasa: 'rounded px-1.5 py-1 font-semibold text-deck-bg-deep', styl: { background: s.obrys } }
    case 2:
      return { klasa: 'rounded border px-1.5 py-1 text-deck-text', styl: { background: s.tlo, borderColor: s.obrys } }
    case 3:
      return { klasa: 'rounded border-l-[3px] px-1.5 py-1 text-deck-text', styl: { background: s.tlo, borderColor: s.obrys } }
    case 4:
      return { klasa: 'border-l-2 px-1.5 py-0.5 text-deck-text/90', styl: { borderColor: s.obrys } }
    default:
      return { klasa: 'px-1 py-0.5 text-deck-muted', styl: {} }
  }
}

export function KartaWydarzenia({
  wydarzenie, onOtworz, przeciagalne, onPrzeciagnij, onPrzesun, maRozmowe, dopisek,
}: Props) {
  const s = KATEGORIE[wydarzenie.kategoria]
  const { klasa, styl } = wyglad(wydarzenie)
  const numer = numerRangi(wydarzenie.kategoria)
  const pelna = s.ranga === 1
  const czas = opisCzasu(wydarzenie)
  const miejsce = opisMiejsca(wydarzenie)

  /**
   * Przeciąganie działa tylko myszą, więc te same przesunięcia obsługują
   * strzałki: w bok o dzień, w pionie o tydzień.
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
      data-ranga={s.ranga}
      draggable={przeciagalne || undefined}
      onDragStart={przeciagalne ? () => onPrzeciagnij?.(wydarzenie.id) : undefined}
      onClick={() => onOtworz(wydarzenie)}
      onKeyDown={naKlawisz}
      style={styl}
      className={`block w-full text-left text-[10.5px] leading-tight transition hover:brightness-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-deck-accent ${klasa}`}
      title={
        przeciagalne
          ? `${wydarzenie.tytul}\nStrzałki przesuwają: w bok o dzień, w pionie o tydzień.`
          : wydarzenie.tytul
      }
    >
      <span className="flex items-start gap-1">
        {numer !== null ? (
          <span
            data-numer-rangi
            style={pelna ? undefined : { background: s.obrys }}
            className={`mt-px shrink-0 rounded px-1 font-mono text-[8.5px] font-bold text-deck-bg-deep ${pelna ? 'bg-deck-bg-deep/20' : ''}`}
          >
            {numer}
          </span>
        ) : (
          <span aria-hidden className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: s.obrys }} />
        )}
        {maRozmowe && (
          <span
            data-rozmowa
            aria-label="ma komentarze"
            className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-deck-accent"
          />
        )}
        <span className="min-w-0 truncate">
          {wydarzenie.tytul}
          {dopisek && <span className="ml-1 font-mono text-[9px] opacity-70">{dopisek}</span>}
        </span>
      </span>
      {(czas || miejsce) && (
        <span className={`mt-0.5 block truncate font-mono text-[9.5px] ${pelna ? 'text-deck-bg-deep/75' : 'text-deck-muted'}`}>
          {czas && <span>{czas}</span>}
          {czas && miejsce && ' · '}
          {miejsce && <span>{miejsce}</span>}
        </span>
      )}
    </button>
  )
}

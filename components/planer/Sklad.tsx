'use client'
import { useState } from 'react'
import { Users, X } from 'lucide-react'
import { dodajDoSkladu, usunZeSkladu } from '@/lib/planer/stan'

type Props = {
  osoby: string[]
  onZmien: (osoby: string[]) => void
  onZamknij: () => void
}

/**
 * Lista osób do wyboru przy wydarzeniach. Zmiany nazwy celowo nie ma: osoby
 * są zapisane w wydarzeniach po etykiecie, więc zmiana musiałaby przepisać
 * każde z nich — prościej usunąć i dodać.
 */
export function Sklad({ osoby, onZmien, onZamknij }: Props) {
  const [nowa, setNowa] = useState('')
  const [uwaga, setUwaga] = useState<string | null>(null)

  function dodaj() {
    const po = dodajDoSkladu(osoby, nowa)
    if (po === osoby) {
      setUwaga(nowa.trim() ? `„${nowa.trim()}” już jest w składzie.` : null)
      return
    }
    onZmien(po)
    setNowa('')
    setUwaga(null)
  }

  return (
    <section aria-label="Skład zarządu" className="deck-card rounded-lg p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-deck-text">
          <Users size={14} /> Skład zarządu
        </h2>
        <button type="button" onClick={onZamknij} aria-label="Zamknij" className="text-deck-muted hover:text-deck-text">
          <X size={15} />
        </button>
      </div>
      <p className="mb-3 text-[11px] leading-relaxed text-deck-muted">
        Osoby do wyboru przy wydarzeniach. Usunięcie nie zmienia wydarzeń, w których ktoś już jest.
      </p>

      {osoby.length === 0 ? (
        <p className="mb-3 text-[11.5px] text-deck-muted">Skład jest pusty — dodaj pierwszą osobę.</p>
      ) : (
        <ul className="mb-3 flex flex-wrap gap-1.5">
          {osoby.map((o) => (
            <li key={o} className="deck-chip flex items-center gap-1.5 rounded-md py-1 pl-2.5 pr-1 text-[11.5px] text-deck-text">
              {o}
              <button
                type="button"
                aria-label={`Usuń ${o}`}
                onClick={() => onZmien(usunZeSkladu(osoby, o))}
                className="grid h-4 w-4 place-items-center rounded text-deck-muted hover:text-deck-danger"
              >
                <X size={11} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          dodaj()
        }}
        className="flex gap-2"
      >
        <input
          aria-label="Nowa osoba"
          value={nowa}
          onChange={(e) => {
            setNowa(e.target.value)
            setUwaga(null)
          }}
          placeholder="imię"
          className="deck-input min-w-0 flex-1 rounded-lg px-3 py-2 text-sm"
        />
        <button type="submit" disabled={!nowa.trim()} className="deck-button rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">
          Dodaj
        </button>
      </form>
      {uwaga && <p role="status" className="mt-2 text-[11px] text-deck-warn">{uwaga}</p>}
    </section>
  )
}

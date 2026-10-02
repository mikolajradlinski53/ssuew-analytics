'use client'

type Props = {
  sklad: string[]
  wybrane: string[]
  onZmien: (osoby: string[]) => void
  zablokowane?: boolean
}

const WSZYSCY = 'wszyscy'

function klasa(aktywny: boolean): string {
  return `rounded-md border px-2.5 py-1 text-[11.5px] transition disabled:cursor-not-allowed disabled:opacity-60 ${
    aktywny
      ? 'border-deck-accent/50 bg-deck-accent/15 text-deck-accent'
      : 'border-white/10 text-deck-muted hover:text-deck-text'
  }`
}

/**
 * Osoby z listy zamiast wpisywania z palca — literówka nie tworzy nowej osoby.
 * „Wszyscy” wyklucza pojedyncze osoby i odwrotnie. Osoby zapisane w starszych
 * wydarzeniach, których nie ma w Składzie, zostają jako przyciski do odpięcia,
 * żeby nic nie znikało bez decyzji.
 */
export function WyborOsob({ sklad, wybrane, onZmien, zablokowane = false }: Props) {
  const wszyscy = wybrane.includes(WSZYSCY)
  const spozaSkladu = wybrane.filter((o) => o !== WSZYSCY && !sklad.includes(o))

  function przelacz(osoba: string) {
    const bez = wybrane.filter((o) => o !== WSZYSCY)
    onZmien(bez.includes(osoba) ? bez.filter((o) => o !== osoba) : [...bez, osoba])
  }

  return (
    <div role="group" aria-label="Osoby" className="flex flex-wrap gap-1.5">
      <button
        type="button"
        aria-pressed={wszyscy}
        disabled={zablokowane}
        onClick={() => onZmien(wszyscy ? [] : [WSZYSCY])}
        className={klasa(wszyscy)}
      >
        Wszyscy
      </button>
      {sklad.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={wybrane.includes(o)}
          disabled={zablokowane}
          onClick={() => przelacz(o)}
          className={klasa(wybrane.includes(o))}
        >
          {o}
        </button>
      ))}
      {spozaSkladu.map((o) => (
        <button
          key={o}
          type="button"
          disabled={zablokowane}
          onClick={() => onZmien(wybrane.filter((x) => x !== o))}
          title="Spoza Składu — kliknij, żeby odpiąć"
          className="rounded-md border border-dashed border-white/15 px-2.5 py-1 text-[11.5px] text-deck-muted/70 transition hover:text-deck-danger disabled:opacity-60"
        >
          {o} ×
        </button>
      ))}
      {sklad.length === 0 && (
        <span className="self-center text-[11px] text-deck-muted/70">Skład zarządu jest pusty.</span>
      )}
    </div>
  )
}

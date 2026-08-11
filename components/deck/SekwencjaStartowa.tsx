'use client'

type Props = {
  /** Kolejne meldunki systemów. Wchodzą po kolei, nie naraz. */
  linie: string[]
}

/**
 * Stopka kokpitu melduje się jak systemy po odpaleniu — jeden wpis za drugim.
 * Opóźnienie idzie przez CSS, nie przez stan Reacta: sekwencja odtwarza się
 * raz, przy wejściu, i nie potrzebuje do tego ani jednego przerysowania.
 */
export function SekwencjaStartowa({ linie }: Props) {
  return (
    <div className="deck-boot flex flex-wrap items-center gap-5">
      {linie.map((linia, i) => (
        <span
          key={linia}
          className="inline-flex items-center gap-2"
          style={{ animationDelay: `${260 + i * 220}ms` }}
        >
          <i className="h-1.5 w-1.5 rounded-full bg-deck-accent shadow-[0_0_9px_var(--color-deck-accent)]" />
          {linia}
        </span>
      ))}
    </div>
  )
}

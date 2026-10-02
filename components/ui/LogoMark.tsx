/**
 * Monogram D.E.C.K. rysowany w CSS. Wcześniej był tu obrazek `/logo.svg`,
 * którego nie ma w `public/` - błąd ładowania przychodził przed hydracją,
 * więc zapasowa litera nigdy się nie pokazywała i zostawał pęknięty obrazek.
 */
export function LogoMark() {
  return (
    <span
      aria-hidden="true"
      className="grid h-9 w-9 place-items-center rounded-lg border border-deck-accent/40 bg-deck-accent/12 font-mono text-[15px] font-extrabold text-deck-accent shadow-[0_0_28px_rgba(46,230,166,0.22)]"
    >
      D
    </span>
  )
}

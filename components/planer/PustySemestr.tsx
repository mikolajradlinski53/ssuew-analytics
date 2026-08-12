'use client'
import { CalendarPlus, MousePointerClick, TriangleAlert } from 'lucide-react'

type Props = {
  nazwaSemestru: string
  mozeEdytowac: boolean
  onDodaj: () => void
}

/**
 * Nowy semestr jest z definicji pusty, a pusta siatka niczego nie podpowiada.
 * Ten ekran mówi, co się właśnie stanie i od czego zacząć — pojawia się tylko
 * wtedy, gdy w całym semestrze nie ma jeszcze ani jednego wydarzenia.
 */
export function PustySemestr({ nazwaSemestru, mozeEdytowac, onDodaj }: Props) {
  return (
    <div className="deck-card rounded-lg p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg border border-deck-accent/35 bg-deck-accent/12 text-deck-accent">
        <CalendarPlus size={22} />
      </div>

      <h2 className="mt-4 text-base font-semibold text-deck-text">
        {nazwaSemestru} jest jeszcze pusty
      </h2>

      {mozeEdytowac ? (
        <>
          <p className="mx-auto mt-2 max-w-md text-[12px] leading-relaxed text-deck-muted">
            Dodaj pierwsze wydarzenie, a kalendarz zacznie pilnować reszty.
          </p>

          <div className="mx-auto mt-6 grid max-w-lg gap-2 text-left">
            <Wskazowka ikona={<MousePointerClick size={13} />}>
              Najedź na dzień i kliknij <b>+</b>, żeby dodać coś od razu w tej dacie.
            </Wskazowka>
            <Wskazowka ikona={<CalendarPlus size={13} />}>
              Kartę wydarzenia przeciągniesz na inny dzień myszą.
            </Wskazowka>
            <Wskazowka ikona={<TriangleAlert size={13} />}>
              Gdy ktoś dostanie dwie rzeczy w odstępie krótszym niż 90 minut albo dwa
              wydarzenia trafią do tej samej sali, dzień dostanie ostrzeżenie.
            </Wskazowka>
          </div>

          <button
            type="button"
            onClick={onDodaj}
            className="deck-button mt-7 rounded-lg px-5 py-2.5 text-sm font-semibold"
          >
            Dodaj pierwsze wydarzenie
          </button>
        </>
      ) : (
        <p className="mx-auto mt-2 max-w-md text-[12px] leading-relaxed text-deck-muted">
          Kalendarz na ten semestr nie został jeszcze ułożony. Pojawi się tutaj, gdy
          ktoś zacznie go wypełniać.
        </p>
      )}
    </div>
  )
}

function Wskazowka({ ikona, children }: { ikona: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-md border border-white/8 bg-white/[0.02] px-3 py-2 text-[11.5px] leading-relaxed text-deck-muted">
      <span className="mt-0.5 flex-none text-deck-accent">{ikona}</span>
      <span>{children}</span>
    </div>
  )
}

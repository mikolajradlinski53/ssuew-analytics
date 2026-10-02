'use client'
import { AlertTriangle, CircleAlert, Info } from 'lucide-react'
import type { Flaga, KondycjaProjektu } from '@/types'

/**
 * Waga niesie własną etykietę i ikonę, nie tylko kolor - na wydruku
 * i przy daltonizmie sam odcień nie odróżniłby alarmu od uwagi.
 */
const STYL: Record<Flaga['waga'], { klasa: string; Ikona: typeof Info; etykieta: string }> = {
  alarm: { klasa: 'text-deck-danger', Ikona: AlertTriangle, etykieta: 'ALARM' },
  uwaga: { klasa: 'text-deck-warn', Ikona: CircleAlert, etykieta: 'UWAGA' },
  info: { klasa: 'text-deck-muted', Ikona: Info, etykieta: 'INFO' },
}

const zl = (v: number) => `${Math.round(v).toLocaleString('pl-PL')} zł`

export function KartaProjektu({ kondycja }: { kondycja: KondycjaProjektu }) {
  const { projekt: p, poprzednia, flagi } = kondycja

  return (
    <div className="deck-row rounded-lg px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-deck-text">{p.projekt}</span>
          {p.obszar && <span className="text-[11px] text-deck-muted">{p.obszar}</span>}
        </div>
        <span className="text-[10px] uppercase tracking-[0.14em] text-deck-muted">{p.edycja}</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] tabular-nums text-deck-muted">
        <span>budżet <span className="text-deck-text">{zl(p.budzet_wydany)}</span> z {zl(p.budzet_plan)}</span>
        <span>uczestnicy <span className="text-deck-text">{p.uczestnicy}</span></span>
        <span>aplikacje <span className="text-deck-text">{p.aplikujacy}</span></span>
        <span>partnerzy <span className="text-deck-text">{p.partnerzy_fin}</span> fin. / {p.partnerzy_barter} barter.</span>
      </div>

      {flagi.length ? (
        <ul className="mt-3 space-y-1.5">
          {flagi.map((f) => {
            const { klasa, Ikona, etykieta } = STYL[f.waga]
            return (
              <li key={f.id} data-waga={f.waga} className="flex items-start gap-2 text-[11px]">
                <Ikona size={13} className={`mt-px shrink-0 ${klasa}`} />
                <span className={`w-14 shrink-0 font-semibold tracking-wide ${klasa}`}>{etykieta}</span>
                <span className="text-deck-text">
                  {f.tytul}
                  <span className="text-deck-muted"> - {f.detal}</span>
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-3 text-[11px] text-deck-accent">Bez zastrzeżeń ✓</p>
      )}

      {!poprzednia && (
        <p className="mt-2 text-[10.5px] italic text-deck-muted/80">
          Brak danych z poprzedniej edycji - porównania milczą, bo nie ma z czym zestawiać.
        </p>
      )}
    </div>
  )
}

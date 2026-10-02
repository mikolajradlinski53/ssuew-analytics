'use client'

export type StanKropki = 'ok' | 'uwaga' | 'blad' | 'czeka'

export interface DanePaska {
  /** Czas odpowiedzi arkusza; `null`, gdy nie odpowiedział. */
  czasArkuszaMs: number | null
  firestoreOk: boolean
  metryki: number
  alerty: number
}

/** Arkusz wolniejszy niż 3 s to już odczuwalne czekanie. */
const WOLNY_ARKUSZ_MS = 3000

const KROPKA: Record<StanKropki, string> = {
  ok: 'bg-deck-accent shadow-[0_0_8px_var(--color-deck-accent)]',
  uwaga: 'bg-deck-warn',
  blad: 'bg-deck-danger',
  czeka: 'animate-pulse bg-deck-muted/50',
}

function sekundy(ms: number): string {
  return `${(ms / 1000).toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`
}

function Segment({ nazwa, stan, etykieta, wartosc, indeks }: {
  nazwa: string
  stan: StanKropki
  etykieta: string
  wartosc: string
  indeks: number
}) {
  return (
    <span
      data-segment={nazwa}
      data-stan={stan}
      className="flex items-center gap-2 border-r border-white/[0.06] px-3.5 py-2"
      // Segmenty meldują się po kolei - jak systemy po starcie.
      style={{ animationDelay: `${260 + indeks * 180}ms` }}
    >
      <i className={`h-1.5 w-1.5 flex-none rounded-full ${KROPKA[stan]}`} aria-hidden="true" />
      {etykieta} <b className="font-medium text-deck-text">{wartosc}</b>
    </span>
  )
}

/**
 * Stopka jak pasek stanu edytora: prawdziwe dane zamiast ozdobnych meldunków.
 * Kropka zmienia kolor, gdy coś nie działa albo działa wolno.
 */
export function PasekStatusu({ kodem, godzina, dane }: { kodem: boolean; godzina: string; dane: DanePaska | null }) {
  const arkusz: StanKropki = !dane
    ? 'czeka'
    : dane.czasArkuszaMs === null ? 'blad' : dane.czasArkuszaMs > WOLNY_ARKUSZ_MS ? 'uwaga' : 'ok'

  return (
    <div
      role="status"
      aria-label="Stan systemów"
      className="deck-boot flex flex-wrap items-stretch overflow-hidden rounded-md border border-deck-accent/25 bg-deck-accent/[0.04] font-mono text-[10.5px] text-deck-muted"
    >
      <span className="flex items-center bg-deck-accent px-3.5 py-2 font-bold tracking-[0.14em] text-deck-bg-deep">
        D.E.C.K.<i className="deck-kursor" aria-hidden="true" />
      </span>
      <Segment
        indeks={0}
        nazwa="arkusz"
        stan={arkusz}
        etykieta="arkusz"
        wartosc={!dane ? 'łączę…' : dane.czasArkuszaMs === null ? 'brak' : sekundy(dane.czasArkuszaMs)}
      />
      <Segment
        indeks={1}
        nazwa="firestore"
        stan={!dane ? 'czeka' : dane.firestoreOk ? 'ok' : 'blad'}
        etykieta="Firestore"
        wartosc={!dane ? 'łączę…' : dane.firestoreOk ? 'ok' : 'brak'}
      />
      <Segment indeks={2} nazwa="sesja" stan="ok" etykieta="sesja" wartosc={kodem ? 'kod' : 'hasło'} />
      <Segment
        indeks={3}
        nazwa="metryki"
        stan={!dane ? 'czeka' : dane.alerty > 0 ? 'uwaga' : 'ok'}
        etykieta="metryki"
        wartosc={!dane ? '-' : `${dane.metryki} · alerty ${dane.alerty}`}
      />
      <span className="ml-auto flex items-center gap-2 px-3.5 py-2" style={{ animationDelay: '980ms' }}>
        odświeżono <b className="font-medium text-deck-text">{godzina}</b>
      </span>
    </div>
  )
}

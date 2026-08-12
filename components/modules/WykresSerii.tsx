'use client'
import type { PunktKpi } from '@/types'

type Props = {
  punkty: PunktKpi[]
  /** Nazwa metryki — trafia do opisu dla czytnika ekranu. */
  etykieta: string
  className?: string
}

const SZER = 120
const WYS = 28
const MARG = 3
/** Powyżej tylu punktów kropki zlewają się w paciorki i tylko zaśmiecają linię. */
const MAX_KROPEK = 8

/**
 * Przebieg metryki przez lata. Czysty SVG, bez Rechartsa: na stronie stoi
 * kilkanaście takich wykresów naraz, a Recharts montuje na każdy własny
 * kontener i obserwator rozmiaru — przy tej liczbie widać to przy ładowaniu.
 *
 * Forma dobiera się do długości serii, bo dwa punkty połączone linią udawałyby
 * trend, którego z dwóch pomiarów nie da się zobaczyć.
 */
export function WykresSerii({ punkty, etykieta, className }: Props) {
  const opis = punkty.length
    ? `${etykieta}: ${punkty.map((p) => `${p.okres} — ${p.wartosc}`).join(', ')}`
    : `${etykieta}: brak danych`

  return (
    <svg
      viewBox={`0 0 ${SZER} ${WYS}`}
      className={className}
      role="img"
      preserveAspectRatio="none"
    >
      <title>{opis}</title>
      {punkty.length < 2 && <Kreska />}
      {punkty.length === 2 && <Slupki punkty={punkty} />}
      {punkty.length > 2 && <Linia punkty={punkty} />}
    </svg>
  )
}

function Kreska() {
  return (
    <line
      x1={MARG} y1={WYS / 2} x2={SZER - MARG} y2={WYS / 2}
      stroke="currentColor" strokeOpacity={0.25} strokeWidth={1}
    />
  )
}

/**
 * Słupki są zakotwiczone w zerze. Długość słupka znaczy wielkość, więc oś
 * ucięta od dołu kłamałaby o proporcji między latami.
 */
function Slupki({ punkty }: { punkty: PunktKpi[] }) {
  const max = Math.max(...punkty.map((p) => p.wartosc), 0) || 1
  const szer = (SZER - 3 * MARG) / 2
  return (
    <>
      {punkty.map((p, i) => {
        const wys = Math.max(1, (Math.max(0, p.wartosc) / max) * (WYS - 2 * MARG))
        return (
          <rect
            key={p.id}
            x={MARG + i * (szer + MARG)}
            y={WYS - MARG - wys}
            width={szer}
            height={wys}
            fill="currentColor"
            fillOpacity={i === punkty.length - 1 ? 0.9 : 0.35}
            rx={1}
          />
        )
      })}
    </>
  )
}

/**
 * Linia skaluje się do rzeczywistego zakresu serii, a nie do zera. Tu liczy się
 * kształt zmiany; przy wartościach rzędu 100 oś od zera spłaszczyłaby wszystko
 * do prostej.
 */
function Linia({ punkty }: { punkty: PunktKpi[] }) {
  const wartosci = punkty.map((p) => p.wartosc)
  const min = Math.min(...wartosci)
  const rozpietosc = Math.max(...wartosci) - min || 1
  const x = (i: number) => MARG + (i / (punkty.length - 1)) * (SZER - 2 * MARG)
  const y = (v: number) => WYS - MARG - ((v - min) / rozpietosc) * (WYS - 2 * MARG)

  return (
    <>
      <polyline
        points={punkty.map((p, i) => `${x(i)},${y(p.wartosc)}`).join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {punkty.length <= MAX_KROPEK &&
        punkty.map((p, i) => (
          <circle key={p.id} cx={x(i)} cy={y(p.wartosc)} r={1.8} fill="currentColor" />
        ))}
    </>
  )
}

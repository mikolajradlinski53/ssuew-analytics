'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ANIMACJE } from '@/lib/deck/animacjeKodu'

export const MOTYWY = ['orbita', 'obwod', 'elektron'] as const
export type Motyw = (typeof MOTYWY)[number]

export const DLUGOSC_KODU = 6

type Stan = 'wpisywanie' | 'sprawdzanie' | 'ok' | 'blad'

type Props = {
  onKomplet: (kod: string) => void | Promise<void>
  stan: Stan
  /** Wymuszenie motywu — do podglądu. Bez tego losuje się przy każdym wejściu. */
  motyw?: Motyw
}

function losujMotyw(): Motyw {
  return MOTYWY[Math.floor(Math.random() * MOTYWY.length)]
}

export function KodInput({ onKomplet, stan, motyw }: Props) {
  // Losujemy raz, po zamontowaniu. Gdyby motyw wypadał podczas renderu, serwer
  // i przeglądarka wylosowałyby różne i React zgłosiłby niezgodność drzewa.
  // To jedyny sposób na wartość, która ma się różnić między nimi — świadomie
  // płacimy za to jednym dodatkowym renderem przy wejściu.
  const [wylosowany, setWylosowany] = useState<Motyw | null>(motyw ?? null)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- patrz wyżej
    if (!motyw) setWylosowany(losujMotyw())
  }, [motyw])

  const aktywnyMotyw = motyw ?? wylosowany
  const [cyfry, setCyfry] = useState<string[]>(() => Array(DLUGOSC_KODU).fill(''))
  const pola = useRef<(HTMLInputElement | null)[]>([])
  const wyslano = useRef(false)

  const kod = useMemo(() => cyfry.join(''), [cyfry])
  const komplet = kod.length === DLUGOSC_KODU && !cyfry.includes('')

  useEffect(() => {
    if (komplet && !wyslano.current) {
      wyslano.current = true
      void onKomplet(kod)
    }
    if (!komplet) wyslano.current = false
  }, [komplet, kod, onKomplet])

  // Po odmowie czyścimy pola i wracamy na początek — bez tego trzeba by
  // kasować sześć kratek ręcznie, żeby spróbować jeszcze raz.
  useEffect(() => {
    if (stan === 'blad') {
      const t = setTimeout(() => {
        setCyfry(Array(DLUGOSC_KODU).fill(''))
        pola.current[0]?.focus()
      }, 620)
      return () => clearTimeout(t)
    }
  }, [stan])

  // Ruch zbierania kratek odpalamy dopiero po komplecie i tylko wtedy, gdy
  // ktoś nie poprosił systemu o ograniczenie animacji.
  const rzad = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!komplet || !aktywnyMotyw || !rzad.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const sloty = Array.from(rzad.current.querySelectorAll<HTMLElement>('.kod__slot'))
    if (!sloty.length) return
    return ANIMACJE[aktywnyMotyw](sloty, rzad.current)
  }, [komplet, aktywnyMotyw])

  const ustaw = useCallback((i: number, znak: string) => {
    setCyfry((poprzednie) => {
      const nowe = [...poprzednie]
      nowe[i] = znak
      return nowe
    })
  }, [])

  function naZmiane(i: number, wartosc: string) {
    const cyfra = wartosc.replace(/\D/g, '').slice(-1)
    if (!cyfra) return
    ustaw(i, cyfra)
    pola.current[i + 1]?.focus()
  }

  function naKlawisz(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (cyfry[i]) {
        ustaw(i, '')
      } else if (i > 0) {
        ustaw(i - 1, '')
        pola.current[i - 1]?.focus()
      }
      return
    }
    if (e.key === 'ArrowLeft') pola.current[i - 1]?.focus()
    if (e.key === 'ArrowRight') pola.current[i + 1]?.focus()
  }

  function naWklejenie(e: React.ClipboardEvent<HTMLInputElement>) {
    const wklejone = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DLUGOSC_KODU)
    if (!wklejone) return
    e.preventDefault()
    const nowe = Array(DLUGOSC_KODU).fill('')
    wklejone.split('').forEach((z, idx) => (nowe[idx] = z))
    setCyfry(nowe)
    pola.current[Math.min(wklejone.length, DLUGOSC_KODU - 1)]?.focus()
  }

  // Do czasu wylosowania motywu renderujemy neutralny szkielet — inaczej
  // pierwsza klatka pokazałaby motyw, który zaraz się zmieni.
  const klasaMotywu = aktywnyMotyw ? `kod--${aktywnyMotyw}` : ''

  return (
    <div
      className={`kod ${klasaMotywu} kod--${stan}`}
      data-komplet={komplet || undefined}
      aria-busy={stan === 'sprawdzanie' || undefined}
    >
      <div className="kod__rzad" ref={rzad}>
        {cyfry.map((cyfra, i) => (
          <label key={i} className="kod__slot">
            <input
              ref={(el) => {
                pola.current[i] = el
              }}
              value={cyfra}
              onChange={(e) => naZmiane(i, e.target.value)}
              onKeyDown={(e) => naKlawisz(i, e)}
              onPaste={naWklejenie}
              onFocus={(e) => e.target.select()}
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              maxLength={1}
              disabled={stan === 'sprawdzanie' || stan === 'ok'}
              aria-label={`Cyfra ${i + 1} z ${DLUGOSC_KODU}`}
              className="kod__pole"
            />
            <span className="kod__ramka" aria-hidden="true" />
            <svg className="kod__luk" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <rect className="kod__luk-sciezka" x="1" y="1" width="98" height="98" rx="10" pathLength={1} />
            </svg>
          </label>
        ))}

        <span className="kod__hub" aria-hidden="true" />
        <svg className="kod__pierscien" viewBox="0 0 120 120" aria-hidden="true">
          <circle className="kod__pierscien-sciezka" cx="60" cy="60" r="50" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    </div>
  )
}

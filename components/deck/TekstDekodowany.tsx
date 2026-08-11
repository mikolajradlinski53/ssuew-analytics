'use client'
import { useEffect, useRef, useState } from 'react'

const SZUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*/<>[]{}'

type Props = {
  tekst: string
  /** Ile milisekund na jeden znak, zanim zaskoczy na właściwy. */
  tempo?: number
  className?: string
  as?: 'span' | 'h1' | 'h2' | 'div'
}

/**
 * Tekst zaskakuje znak po znaku, jakby się rozszyfrowywał. Litery przed
 * kursorem są już właściwe, za nim lecą losowe — dlatego długość nigdy się
 * nie zmienia i układ strony nie skacze w trakcie.
 */
export function TekstDekodowany({ tekst, tempo = 34, className = '', as = 'span' }: Props) {
  const [pokazywany, setPokazywany] = useState(tekst)
  const uchwyt = useRef(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Ustawienie systemowe da się sprawdzić dopiero w przeglądarce, więc ta
      // jedna aktualizacja stanu w efekcie jest nieunikniona. Kosztuje jeden
      // render przy wejściu i nie powtarza się.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- patrz wyżej
      setPokazywany(tekst)
      return
    }

    let odsloniete = 0
    const start = performance.now()

    function klatka(teraz: number) {
      odsloniete = Math.floor((teraz - start) / tempo)
      if (odsloniete >= tekst.length) {
        setPokazywany(tekst)
        return
      }
      setPokazywany(
        tekst
          .split('')
          .map((znak, i) => {
            if (i < odsloniete) return znak
            // Spacje zostawiamy — bez nich słowa zlewałyby się w jeden ciąg.
            if (znak === ' ') return ' '
            return SZUM[Math.floor(Math.random() * SZUM.length)]
          })
          .join(''),
      )
      uchwyt.current = requestAnimationFrame(klatka)
    }

    uchwyt.current = requestAnimationFrame(klatka)
    return () => cancelAnimationFrame(uchwyt.current)
  }, [tekst, tempo])

  const Znacznik = as
  return (
    <Znacznik className={className} aria-label={tekst}>
      <span aria-hidden="true">{pokazywany}</span>
    </Znacznik>
  )
}

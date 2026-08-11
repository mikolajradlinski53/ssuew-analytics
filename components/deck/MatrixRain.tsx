'use client'
import { useEffect, useRef } from 'react'

const ZNAKI = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ｦｧｨｩｪｫ<>[]{}/\\=+*'
const ROZMIAR = 15

type Props = {
  /** 0–1. Wyżej niż 0.35 i tekst nad spodem przestaje być czytelny. */
  moc?: number
}

export function MatrixRain({ moc = 0.28 }: Props) {
  const plotno = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = plotno.current
    if (!c) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const ctx = c.getContext('2d', { alpha: true })
    if (!ctx) return

    let kolumny: number[] = []
    let szerokosc = 0
    let wysokosc = 0
    let klatka = 0

    function wymiaruj() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      szerokosc = window.innerWidth
      wysokosc = window.innerHeight
      c!.width = szerokosc * dpr
      c!.height = wysokosc * dpr
      c!.style.width = `${szerokosc}px`
      c!.style.height = `${wysokosc}px`
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)

      const ile = Math.ceil(szerokosc / ROZMIAR)
      // Każda kolumna startuje z innej wysokości, żeby deszcz nie ruszał równo.
      kolumny = Array.from({ length: ile }, () => Math.random() * -wysokosc)
    }

    function rysuj() {
      // Półprzezroczyste przykrycie zamiast czyszczenia: to ono robi smugę.
      ctx!.fillStyle = 'rgba(7, 9, 13, 0.09)'
      ctx!.fillRect(0, 0, szerokosc, wysokosc)
      ctx!.font = `${ROZMIAR}px ui-monospace, monospace`

      for (let i = 0; i < kolumny.length; i++) {
        const x = i * ROZMIAR
        const y = kolumny[i]
        const znak = ZNAKI[Math.floor(Math.random() * ZNAKI.length)]

        // Czoło strugi świeci, ogon jest przygaszony — stąd wrażenie głębi.
        ctx!.fillStyle = `rgba(190, 255, 230, ${moc})`
        ctx!.fillText(znak, x, y)
        ctx!.fillStyle = `rgba(46, 230, 166, ${moc * 0.55})`
        ctx!.fillText(ZNAKI[Math.floor(Math.random() * ZNAKI.length)], x, y - ROZMIAR)

        kolumny[i] = y > wysokosc + Math.random() * 400 ? 0 : y + ROZMIAR
      }
    }

    let uchwyt = 0
    let dziala = true

    function petla() {
      if (!dziala) return
      // Co druga klatka: 30 fps wystarczy deszczowi, a oszczędza baterię.
      if (klatka++ % 2 === 0) rysuj()
      uchwyt = requestAnimationFrame(petla)
    }

    function widocznosc() {
      // Karta w tle nie ma po co liczyć klatek.
      if (document.hidden) {
        dziala = false
        cancelAnimationFrame(uchwyt)
      } else if (!dziala) {
        dziala = true
        petla()
      }
    }

    wymiaruj()
    petla()
    window.addEventListener('resize', wymiaruj)
    document.addEventListener('visibilitychange', widocznosc)

    return () => {
      dziala = false
      cancelAnimationFrame(uchwyt)
      window.removeEventListener('resize', wymiaruj)
      document.removeEventListener('visibilitychange', widocznosc)
    }
  }, [moc])

  return <canvas ref={plotno} className="deck-rain" aria-hidden="true" />
}

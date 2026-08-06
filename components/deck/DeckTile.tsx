'use client'
import type { ReactNode, PointerEvent } from 'react'
import Link from 'next/link'

export type StanKafelka = 'zywy' | 'zablokowany'

type Props = {
  stan: StanKafelka
  href: string
  etykieta: string
  tytul: string
  odznaka?: string
  wkrotce?: string
  span?: 1 | 2
  rows?: 1 | 2
  children: ReactNode
}

const spanClass = { 1: '', 2: 'col-span-2' } as const
const rowsClass = { 1: '', 2: 'row-span-2' } as const

/**
 * Poświata idzie za kursorem przez zmienne CSS, nie przez stan Reacta —
 * ruch myszy nie może powodować przerysowania drzewa.
 */
function sledzKursor(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
  el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
}

export function DeckTile({
  stan,
  href,
  etykieta,
  tytul,
  odznaka,
  wkrotce,
  span = 1,
  rows = 1,
  children,
}: Props) {
  const uklad = `${spanClass[span]} ${rowsClass[rows]}`.trim()

  const naglowek = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-deck-muted/70">{etykieta}</div>
        <h2 className="mt-1 text-[17px] font-semibold leading-tight tracking-[-0.015em] text-balance">{tytul}</h2>
      </div>
      {odznaka && (
        <span className="deck-chip flex-none rounded-full px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-deck-accent">
          {odznaka}
        </span>
      )}
      {wkrotce && (
        <span className="flex-none font-mono text-[9.5px] uppercase tracking-[0.14em] text-deck-muted/60">
          {wkrotce}
        </span>
      )}
    </div>
  )

  if (stan === 'zablokowany') {
    return (
      <section className={`${uklad} deck-tile-locked flex flex-col gap-3 rounded-lg p-[18px] text-deck-muted/70`}>
        {naglowek}
        <div className="flex-1">{children}</div>
      </section>
    )
  }

  return (
    <Link
      href={href}
      onPointerMove={sledzKursor}
      className={`${uklad} deck-card deck-tile flex flex-col gap-3 rounded-lg p-[18px] text-deck-text no-underline`}
    >
      <div className="relative z-10 flex flex-1 flex-col gap-3">
        {naglowek}
        <div className="flex-1">{children}</div>
      </div>
    </Link>
  )
}

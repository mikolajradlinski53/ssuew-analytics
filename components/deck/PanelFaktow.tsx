'use client'
import { Suspense, use } from 'react'
import Link from 'next/link'
import type { Fakt } from '@/lib/asystent/fakty'

/** Fakty bez AI - zarząd widzi je zamiast odprawy. Nagłówek jest od razu, lista dopływa. */
export function PanelFaktow({ fakty }: { fakty: Promise<Fakt[]> }) {
  return (
    <section aria-labelledby="fakty-tytul" className="deck-card rounded-lg p-[18px]">
      <div className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-deck-muted/70">stan na teraz</div>
      <h2 id="fakty-tytul" className="mt-1 text-[17px] font-semibold tracking-[-0.015em]">Na teraz</h2>
      <Suspense fallback={<SzkieletFaktow />}>
        <ListaFaktow fakty={fakty} />
      </Suspense>
    </section>
  )
}

export function ListaFaktow({ fakty }: { fakty: Promise<Fakt[]> }) {
  const lista = use(fakty)
  if (!lista.length) {
    return <p className="mt-3 text-[12.5px] text-deck-muted">Nic pilnego - kalendarz i wskaźniki spokojne.</p>
  }
  return (
    <ul className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
      {lista.map((f) => (
        <li key={`${f.etykieta}-${f.tresc}`}>
          <Link
            href={f.link}
            className="block h-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] text-deck-muted transition hover:border-deck-accent/40"
          >
            {f.etykieta}
            <b className="mt-0.5 block text-[14px] font-semibold text-deck-text">{f.tresc}</b>
            {f.szczegol && <small className="mt-0.5 block text-[10.5px]">{f.szczegol}</small>}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function SzkieletFaktow() {
  return <div className="mt-3 h-16 animate-pulse rounded-lg bg-white/[0.04]" aria-hidden="true" />
}

'use client'
import { useEffect, useState } from 'react'

const ZNAKI = '0123456789'
/** Ile klatek przewijania przed właściwą cyfrą i co ile milisekund. */
export const KLATKI = 6
export const TEMPO_MS = 40

function ograniczRuch(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Wpisana cyfra „dekoduje się”: kilka klatek przypadkowych znaków, potem
 * właściwa - jak nagłówek strony. Każda nowa cyfra dostaje u rodzica nowy
 * `key`, więc komponent montuje się od zera i animacja nie potrzebuje
 * ustawiania stanu w efekcie.
 */
export function CyfraDekodowana({ cyfra }: { cyfra: string }) {
  const [klatka, setKlatka] = useState(() => (ograniczRuch() ? KLATKI : 0))

  useEffect(() => {
    if (klatka >= KLATKI) return
    const t = setTimeout(() => setKlatka((k) => k + 1), TEMPO_MS)
    return () => clearTimeout(t)
  }, [klatka])

  const gotowa = klatka >= KLATKI
  return (
    <span className={gotowa ? 'kod__znak' : 'kod__znak kod__znak--dekoduje'}>
      {gotowa ? cyfra : ZNAKI[(klatka * 7 + Number(cyfra) * 3 + 1) % ZNAKI.length]}
    </span>
  )
}

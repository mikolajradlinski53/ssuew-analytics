'use client'
import { useState } from 'react'

export function LogoMark() {
  const [ok, setOk] = useState(true)

  if (!ok) {
    return (
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-deck-accent text-sm font-extrabold text-deck-bg-deep shadow-[0_0_28px_rgba(46,230,166,0.32)]">
        S
      </span>
    )
  }

  return (
    <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-lg border border-deck-accent/35 bg-deck-accent/12 shadow-[0_0_28px_rgba(46,230,166,0.22)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="SSUEW" className="h-8 w-8 object-contain" onError={() => setOk(false)} />
    </span>
  )
}

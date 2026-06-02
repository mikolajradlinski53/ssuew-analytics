'use client'
import { useState } from 'react'

export function LogoMark() {
  const [ok, setOk] = useState(true)

  if (!ok) {
    return (
      <span className="w-6 h-6 rounded-md bg-deck-accent text-deck-bg-deep font-extrabold text-xs flex items-center justify-center">
        S
      </span>
    )
  }

  return (
    <span className="w-6 h-6 rounded-md overflow-hidden flex items-center justify-center bg-deck-accent">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="SSUEW" className="w-full h-full object-contain" onError={() => setOk(false)} />
    </span>
  )
}

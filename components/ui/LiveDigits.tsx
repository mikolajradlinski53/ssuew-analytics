'use client'
import { useEffect, useState } from 'react'

type Props = {
  label: string
  value: string
  speed?: number
}

const glyphs = '0123456789.%'

function scramble(value: string, frame: number) {
  return value
    .split('')
    .map((char, index) => {
      if (char === ' ' || char === '/' || char === "'") return char
      if (index < frame % (value.length + 8)) return char
      return glyphs[(frame + index * 7) % glyphs.length]
    })
    .join('')
}

export function LiveDigits({ label, value, speed = 90 }: Props) {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const id = window.setInterval(() => setFrame((current) => current + 1), speed)
    return () => window.clearInterval(id)
  }, [speed])

  return (
    <div className="deck-row rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-deck-muted">{label}</div>
      <div className="deck-caret mt-2 font-mono text-2xl font-semibold tabular-nums text-deck-accent">
        {scramble(value, frame)}
      </div>
    </div>
  )
}

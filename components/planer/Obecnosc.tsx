'use client'
import { aktualni, inicjaly, kolorOsoby, type Znak } from '@/lib/planer/obecnosc'

export function Obecnosc({ znaki }: { znaki: Znak[] }) {
  const obecni = aktualni(znaki)
  if (obecni.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-deck-muted/70">
        online
      </span>
      <div className="flex">
        {obecni.map((z, i) => (
          <span
            key={z.uid}
            title={z.kto}
            style={{ background: kolorOsoby(z.kto), marginLeft: i === 0 ? 0 : -6 }}
            className="grid h-6 w-6 place-items-center rounded-full text-[9.5px] font-bold text-white ring-2 ring-deck-bg-deep"
          >
            {inicjaly(z.kto)}
          </span>
        ))}
      </div>
    </div>
  )
}

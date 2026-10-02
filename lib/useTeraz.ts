'use client'
import { useEffect, useState } from 'react'

/**
 * Bieżący czas, odświeżany co `coMs`. `Date.now()` wprost w renderze jest
 * nieczyste - a przy okazji licznik stał w miejscu, dopóki coś innego nie
 * wymusiło ponownego renderu.
 */
export function useTeraz(coMs = 30_000): number {
  const [teraz, setTeraz] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setTeraz(Date.now()), coMs)
    return () => clearInterval(id)
  }, [coMs])
  return teraz
}

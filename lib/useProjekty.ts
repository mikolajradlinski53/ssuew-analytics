'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Projekt } from '@/types'

export function useProjekty() {
  const [projekty, setProjekty] = useState<Projekt[]>([])
  const [loading, setLoading] = useState(true)
  const [blad, setBlad] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setBlad(null)
    try {
      const res = await fetch('/api/projekty')
      // Pusta zakładka to pusty moduł, a nie dane demo. Kondycji projektów nie
      // da się pokazać na wymyślonych liczbach — cała jej wartość polega na tym,
      // że mówi o prawdziwych projektach, a zmyślony alarm byłby gorszy niż brak.
      if (!res.ok) throw new Error(await res.text())
      const dane = await res.json()
      setProjekty(Array.isArray(dane) ? dane : [])
    } catch (e) {
      setBlad(e instanceof Error ? e.message : 'Nie udało się pobrać projektów')
      setProjekty([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const dodajProjekt = async (payload: Omit<Projekt, 'id' | 'created_at'>) => {
    const res = await fetch('/api/projekty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(await res.text())
    await fetchAll()
  }

  return { projekty, loading, blad, dodajProjekt, refresh: fetchAll }
}

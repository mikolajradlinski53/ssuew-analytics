'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Czlonek } from '@/types'

export function useCzlonkowie() {
  const [czlonkowie, setCzlonkowie] = useState<Czlonek[]>([])
  const [loading, setLoading] = useState(true)
  const [usingDemo, setUsingDemo] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/czlonkowie')
      // Podłączony arkusz + pusta zakładka = pusta siatka (dodajesz prawdziwych
      // członków), a NIE zaślepione demo. Demo pokazujemy tylko wtedy, gdy arkusza
      // w ogóle nie ma — a to trasa sygnalizuje kodem 503, bo przeglądarka nie widzi
      // GAS_URL ani GAS_TOKEN i sama tego rozstrzygnąć nie może.
      const brakArkusza = res.status === 503
      const data = res.ok ? await res.json() : []
      const live = Array.isArray(data) && data.length > 0
      setCzlonkowie(live ? data : brakArkusza ? DEMO_CZLONKOWIE : [])
      setUsingDemo(!live && brakArkusza)
    } catch {
      setCzlonkowie(DEMO_CZLONKOWIE)
      setUsingDemo(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const addCzlonek = async (payload: Omit<Czlonek, 'id' | 'created_at'>) => {
    const res = await fetch('/api/czlonkowie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(await res.text())
    await fetchAll()
  }

  // Autosave pojedynczej zmiany (status/aktywność) — bez pełnego refetchu (płynność edycji).
  const updateCzlonek = async (id: string, patch: Partial<Pick<Czlonek, 'status' | 'aktywnosc' | 'imie_nazwisko'>>) => {
    const res = await fetch('/api/czlonkowie', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    })
    if (!res.ok) throw new Error(await res.text())
  }

  return { czlonkowie, loading, usingDemo, addCzlonek, updateCzlonek, refresh: fetchAll }
}

// Dane demo — ZAŚLEPIONE (bez prawdziwych nazwisk). Realne nazwiska tylko w Supabase.
// aktywnosc: stan per semestr (0=nieaktywny, 1=aktywny, 2=wspierający).
export const DEMO_CZLONKOWIE: Czlonek[] = [
  // Kohorta J'24 — semestry W'25, J'25, W'26, J'26, W'27
  { id: 'd1', kohorta_edycja: "J'24", imie_nazwisko: 'Członek A1', status: 'aktywny', aktywnosc: [1, 1, 1, 1, 0], created_at: '' },
  { id: 'd2', kohorta_edycja: "J'24", imie_nazwisko: 'Członek A2', status: 'wspierający', aktywnosc: [1, 1, 2, 0, 0], created_at: '' },
  { id: 'd3', kohorta_edycja: "J'24", imie_nazwisko: 'Członek A3', status: 'alumn', aktywnosc: [1, 1, 1, 2, 0], created_at: '' },
  { id: 'd4', kohorta_edycja: "J'24", imie_nazwisko: 'Członek A4', status: 'zawieszone', aktywnosc: [1, 1, 0, 0, 0], created_at: '' },
  { id: 'd5', kohorta_edycja: "J'24", imie_nazwisko: 'Członek A5', status: 'nieaktywny', aktywnosc: [0, 0, 0, 0, 0], created_at: '' },
  { id: 'd6', kohorta_edycja: "J'24", imie_nazwisko: 'Członek A6', status: 'aktywny', aktywnosc: [1, 1, 1, 1, 0], created_at: '' },
  // Kohorta W'25 — semestry J'25, W'26, J'26, W'27
  { id: 'd7', kohorta_edycja: "W'25", imie_nazwisko: 'Członek B1', status: 'aktywny', aktywnosc: [1, 1, 0, 0], created_at: '' },
  { id: 'd8', kohorta_edycja: "W'25", imie_nazwisko: 'Członek B2', status: 'nieaktywny', aktywnosc: [0, 0, 0, 0], created_at: '' },
  { id: 'd9', kohorta_edycja: "W'25", imie_nazwisko: 'Członek B3', status: 'wspierający', aktywnosc: [1, 2, 0, 0], created_at: '' },
]

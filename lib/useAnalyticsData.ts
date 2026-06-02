'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Rekrutacja, Kohorta, KpiPeriod, Komisja } from '@/types'

export function useAnalyticsData() {
  const [rekrutacje, setRekrutacje] = useState<Rekrutacja[]>([])
  const [kohorty,    setKohorty]    = useState<Kohorta[]>([])
  const [komisje,    setKomisje]    = useState<Komisja[]>([])
  const [kpiPeriods, setKpiPeriods] = useState<KpiPeriod[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [usingDemo,  setUsingDemo]  = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [rRes, kRes] = await Promise.all([
        fetch('/api/rekrutacje'),
        fetch('/api/komisje'),
      ])
      if (!rRes.ok || !kRes.ok) throw new Error('Błąd pobierania danych')
      const [rData, kData] = await Promise.all([rRes.json(), kRes.json()])

      // Preferuj dane live; gdy backend pusty/niewdrożony — dane demo (historyczne SSUEW)
      const liveRekr = Array.isArray(rData) && rData.length > 0
      const liveKpi  = Array.isArray(kData) && kData.length > 0
      setRekrutacje(liveRekr ? rData : DEMO_REKRUTACJE)
      setKpiPeriods(liveKpi  ? kData : DEMO_KPI)
      setKohorty(DEMO_KOHORTY)   // brak endpointu kohort — dane historyczne
      setKomisje(DEMO_KOMISJE)   // stały słownik komisji
      setUsingDemo(!liveRekr && !liveKpi)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Nieznany błąd'
      setError(msg)
      // Fallback: dane demo (historyczne SSUEW)
      setRekrutacje(DEMO_REKRUTACJE)
      setKohorty(DEMO_KOHORTY)
      setKomisje(DEMO_KOMISJE)
      setKpiPeriods(DEMO_KPI)
      setUsingDemo(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const addRekrutacja = async (payload: Omit<Rekrutacja, 'id' | 'created_at'>) => {
    const res = await fetch('/api/rekrutacje', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(await res.text())
    await fetchAll()
  }

  const addKpi = async (payload: Omit<KpiPeriod, 'id' | 'created_at' | 'komisja'>) => {
    const res = await fetch('/api/komisje', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(await res.text())
    await fetchAll()
  }

  return { rekrutacje, kohorty, komisje, kpiPeriods, loading, error, usingDemo, addRekrutacja, addKpi, refresh: fetchAll }
}

// ─── Dane demo (używane gdy Supabase nie jest skonfigurowane) ─────────────────

// Realne dane SSUEW (z dane_zrodlowe/KPI SSUEW.xlsx — "PRZYJĘCI DZIAŁACZE").
// Zgłoszenia/przyjęci dostępne od rekrutacji Jesień 2023.
export const DEMO_REKRUTACJE: Rekrutacja[] = [
  { id:'1', edycja:"J'23", sezon:'jesien', rok:2023, zgloszenia:100, przyjeci:38, created_at:'' },
  { id:'2', edycja:"W'24", sezon:'wiosna', rok:2024, zgloszenia:28,  przyjeci:13, created_at:'' },
  { id:'3', edycja:"J'24", sezon:'jesien', rok:2024, zgloszenia:149, przyjeci:38, created_at:'' },
  { id:'4', edycja:"W'25", sezon:'wiosna', rok:2025, zgloszenia:31,  przyjeci:10, created_at:'' },
  { id:'5', edycja:"J'25", sezon:'jesien', rok:2025, zgloszenia:138, przyjeci:45, created_at:'' },
  { id:'6', edycja:"W'26", sezon:'wiosna', rok:2026, zgloszenia:18,  przyjeci:11, created_at:'' },
]

// Realne dane SSUEW (z dane_zrodlowe/Analiza - długość działania.xlsx — PODSUMOWANIE).
// n_czlonkow = liczebność kohorty; avg/max = semestry aktywności.
export const DEMO_KOHORTY: Kohorta[] = [
  { id:'1', edycja:"W'22", sezon:'wiosna', rok:2022, n_czlonkow:14, avg_retention_sem:4.36, max_retention_sem:9,  in_progress:false, created_at:'' },
  { id:'2', edycja:"J'22", sezon:'jesien', rok:2022, n_czlonkow:39, avg_retention_sem:4.24, max_retention_sem:8,  in_progress:false, created_at:'' },
  { id:'3', edycja:"W'23", sezon:'wiosna', rok:2023, n_czlonkow:11, avg_retention_sem:4.20, max_retention_sem:7,  in_progress:false, created_at:'' },
  { id:'4', edycja:"J'23", sezon:'jesien', rok:2023, n_czlonkow:39, avg_retention_sem:3.86, max_retention_sem:6,  in_progress:false, created_at:'' },
  { id:'5', edycja:"W'24", sezon:'wiosna', rok:2024, n_czlonkow:13, avg_retention_sem:2.69, max_retention_sem:5,  in_progress:false, created_at:'' },
  { id:'6', edycja:"J'24", sezon:'jesien', rok:2024, n_czlonkow:38, avg_retention_sem:3.53, max_retention_sem:4,  in_progress:false, created_at:'' },
  { id:'7', edycja:"W'25", sezon:'wiosna', rok:2025, n_czlonkow:10, avg_retention_sem:1.80, max_retention_sem:3,  in_progress:true,  created_at:'' },
]

export const DEMO_KOMISJE: Komisja[] = [
  { id:'k1', kod:'P.KA.',    nazwa:'Komisja ds. Administracji',      przewodniczacy:null, created_at:'' },
  { id:'k2', kod:'P.KF.',    nazwa:'Komisja ds. Finansów',           przewodniczacy:null, created_at:'' },
  { id:'k3', kod:'P.KKZ.',   nazwa:'Komisja ds. Kultury i Zabawy',   przewodniczacy:null, created_at:'' },
  { id:'k4', kod:'P.KHR.',   nazwa:'Komisja ds. HR',                 przewodniczacy:null, created_at:'' },
  { id:'k5', kod:'P.KP.',    nazwa:'Komisja ds. Promocji',           przewodniczacy:null, created_at:'' },
  { id:'k6', kod:'P.KDiJK.', nazwa:'Komisja ds. DiJK',              przewodniczacy:null, created_at:'' },
]

export const DEMO_KPI: KpiPeriod[] = [
  { id:'p1', komisja_id:'k1', komisja:DEMO_KOMISJE[0], semestr:'letni 2025/2026', projekty_planowane:18, projekty_zrealizowane:14, kpi_custom:{}, notatka:null, created_at:'' },
  { id:'p2', komisja_id:'k2', komisja:DEMO_KOMISJE[1], semestr:'letni 2025/2026', projekty_planowane:12, projekty_zrealizowane:9,  kpi_custom:{}, notatka:null, created_at:'' },
  { id:'p3', komisja_id:'k3', komisja:DEMO_KOMISJE[2], semestr:'letni 2025/2026', projekty_planowane:22, projekty_zrealizowane:15, kpi_custom:{}, notatka:null, created_at:'' },
  { id:'p4', komisja_id:'k4', komisja:DEMO_KOMISJE[3], semestr:'letni 2025/2026', projekty_planowane:8,  projekty_zrealizowane:5,  kpi_custom:{}, notatka:null, created_at:'' },
  { id:'p5', komisja_id:'k5', komisja:DEMO_KOMISJE[4], semestr:'letni 2025/2026', projekty_planowane:15, projekty_zrealizowane:10, kpi_custom:{}, notatka:null, created_at:'' },
  { id:'p6', komisja_id:'k6', komisja:DEMO_KOMISJE[5], semestr:'letni 2025/2026', projekty_planowane:10, projekty_zrealizowane:7,  kpi_custom:{}, notatka:null, created_at:'' },
]

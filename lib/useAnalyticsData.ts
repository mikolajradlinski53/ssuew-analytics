'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Rekrutacja, Kohorta, KpiMetric } from '@/types'

export function useAnalyticsData() {
  const [rekrutacje, setRekrutacje] = useState<Rekrutacja[]>([])
  const [kohorty,    setKohorty]    = useState<Kohorta[]>([])
  const [kpiMetrics, setKpiMetrics] = useState<KpiMetric[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [usingDemo,  setUsingDemo]  = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [rRes, kRes, kohRes] = await Promise.all([
        fetch('/api/rekrutacje'),
        fetch('/api/kpi'),
        fetch('/api/kohorty'),
      ])
      if (!rRes.ok || !kRes.ok) throw new Error('Błąd pobierania danych')
      const [rData, kData, kohData] = await Promise.all([
        rRes.json(),
        kRes.json(),
        kohRes.ok ? kohRes.json() : [],
      ])

      // Preferuj dane live; gdy backend pusty/niewdrożony — dane demo (realne SSUEW)
      const liveRekr = Array.isArray(rData) && rData.length > 0
      const liveKpi  = Array.isArray(kData) && kData.length > 0
      const liveKoh  = Array.isArray(kohData) && kohData.length > 0
      setRekrutacje(liveRekr ? rData : DEMO_REKRUTACJE)
      setKpiMetrics(liveKpi  ? kData : DEMO_KPI_METRICS)
      setKohorty(liveKoh ? kohData : DEMO_KOHORTY)
      setUsingDemo(!liveRekr && !liveKpi && !liveKoh)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Nieznany błąd'
      setError(msg)
      setRekrutacje(DEMO_REKRUTACJE)
      setKohorty(DEMO_KOHORTY)
      setKpiMetrics(DEMO_KPI_METRICS)
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

  const addKpiMetric = async (payload: Omit<KpiMetric, 'id' | 'created_at'>) => {
    const res = await fetch('/api/kpi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(await res.text())
    await fetchAll()
  }

  const addKohorta = async (payload: Omit<Kohorta, 'id' | 'created_at' | 'survival'>) => {
    const res = await fetch('/api/kohorty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(await res.text())
    await fetchAll()
  }

  return { rekrutacje, kohorty, kpiMetrics, loading, error, usingDemo, addRekrutacja, addKpiMetric, addKohorta, refresh: fetchAll }
}

// ─── Dane demo (realne dane SSUEW, używane gdy Supabase nie jest skonfigurowane) ─

// Z dane_zrodlowe/KPI SSUEW.xlsx — "PRZYJĘCI DZIAŁACZE". Zgłoszenia od rekrutacji J'23.
export const DEMO_REKRUTACJE: Rekrutacja[] = [
  { id:'1', edycja:"J'23", sezon:'jesien', rok:2023, zgloszenia:100, przyjeci:38, created_at:'' },
  { id:'2', edycja:"W'24", sezon:'wiosna', rok:2024, zgloszenia:28,  przyjeci:13, created_at:'' },
  { id:'3', edycja:"J'24", sezon:'jesien', rok:2024, zgloszenia:149, przyjeci:38, created_at:'' },
  { id:'4', edycja:"W'25", sezon:'wiosna', rok:2025, zgloszenia:31,  przyjeci:10, created_at:'' },
  { id:'5', edycja:"J'25", sezon:'jesien', rok:2025, zgloszenia:138, przyjeci:45, created_at:'' },
  { id:'6', edycja:"W'26", sezon:'wiosna', rok:2026, zgloszenia:18,  przyjeci:11, created_at:'' },
]

// Z dane_zrodlowe/Analiza - długość działania.xlsx. avg/max z PODSUMOWANIA;
// survival = REALNA krzywa przeżycia (% aktywnych po t sem.) liczona z danych per-osoba.
export const DEMO_KOHORTY: Kohorta[] = [
  { id:'1', edycja:"W'22", sezon:'wiosna', rok:2022, n_czlonkow:14, avg_retention_sem:4.36, max_retention_sem:9,  in_progress:false, survival:[100,100,100,100,73,36,9,9,9], created_at:'' },
  { id:'2', edycja:"J'22", sezon:'jesien', rok:2022, n_czlonkow:39, avg_retention_sem:4.24, max_retention_sem:8,  in_progress:false, survival:[100,100,100,85,73,33,18,9,6], created_at:'' },
  { id:'3', edycja:"W'23", sezon:'wiosna', rok:2023, n_czlonkow:11, avg_retention_sem:4.20, max_retention_sem:7,  in_progress:false, survival:[100,100,90,90,60,30,30,20], created_at:'' },
  { id:'4', edycja:"J'23", sezon:'jesien', rok:2023, n_czlonkow:39, avg_retention_sem:3.86, max_retention_sem:6,  in_progress:false, survival:[100,100,97,83,63,31,11], created_at:'' },
  { id:'5', edycja:"W'24", sezon:'wiosna', rok:2024, n_czlonkow:13, avg_retention_sem:2.69, max_retention_sem:5,  in_progress:false, survival:[100,100,77,69,23], created_at:'' },
  { id:'6', edycja:"J'24", sezon:'jesien', rok:2024, n_czlonkow:38, avg_retention_sem:3.53, max_retention_sem:4,  in_progress:false, survival:[100,100,100,80,73], created_at:'' },
  { id:'7', edycja:"W'25", sezon:'wiosna', rok:2025, n_czlonkow:10, avg_retention_sem:1.80, max_retention_sem:3,  in_progress:true,  survival:[100,60,60,60], created_at:'' },
]

// Z dane_zrodlowe/KPI SSUEW.xlsx (arkusz 20252026): porównanie 2024/2025 → 2025/2026.
export const DEMO_KPI_METRICS: KpiMetric[] = [
  // Obecność na SKS (miesięcznie)
  { id:'sks-10', kategoria:'SKS', nazwa:'Październik', okres_poprzedni:'2024/2025', wartosc_poprzednia:48, okres_biezacy:'2025/2026', wartosc_biezaca:45, created_at:'' },
  { id:'sks-11', kategoria:'SKS', nazwa:'Listopad',   okres_poprzedni:'2024/2025', wartosc_poprzednia:57, okres_biezacy:'2025/2026', wartosc_biezaca:84, created_at:'' },
  { id:'sks-12', kategoria:'SKS', nazwa:'Grudzień',   okres_poprzedni:'2024/2025', wartosc_poprzednia:43, okres_biezacy:'2025/2026', wartosc_biezaca:56, created_at:'' },
  { id:'sks-01', kategoria:'SKS', nazwa:'Styczeń',    okres_poprzedni:'2024/2025', wartosc_poprzednia:41, okres_biezacy:'2025/2026', wartosc_biezaca:56, created_at:'' },
  { id:'sks-02', kategoria:'SKS', nazwa:'Luty',       okres_poprzedni:'2024/2025', wartosc_poprzednia:34, okres_biezacy:'2025/2026', wartosc_biezaca:44, created_at:'' },
  { id:'sks-03', kategoria:'SKS', nazwa:'Marzec',     okres_poprzedni:'2024/2025', wartosc_poprzednia:42, okres_biezacy:'2025/2026', wartosc_biezaca:47, created_at:'' },
  // Zapisy na wydarzenia wewnętrzne
  { id:'wyd-jwk', kategoria:'Wydarzenia', nazwa:'JWK',        okres_poprzedni:'2024/2025', wartosc_poprzednia:43, okres_biezacy:'2025/2026', wartosc_biezaca:52, created_at:'' },
  { id:'wyd-wig', kategoria:'Wydarzenia', nazwa:'Wigilia',    okres_poprzedni:'2024/2025', wartosc_poprzednia:83, okres_biezacy:'2025/2026', wartosc_biezaca:77, created_at:'' },
  { id:'wyd-prz', kategoria:'Wydarzenia', nazwa:'Przydziałki',okres_poprzedni:'2024/2025', wartosc_poprzednia:56, okres_biezacy:'2025/2026', wartosc_biezaca:64, created_at:'' },
  { id:'wyd-wwk', kategoria:'Wydarzenia', nazwa:'WWK',        okres_poprzedni:'2024/2025', wartosc_poprzednia:45, okres_biezacy:'2025/2026', wartosc_biezaca:40, created_at:'' },
  // Zwrotność ankiety zarządu
  { id:'ank-zim', kategoria:'Ankieta', nazwa:'Zimowa Zarządu', okres_poprzedni:'2024/2025', wartosc_poprzednia:47, okres_biezacy:'2025/2026', wartosc_biezaca:28, created_at:'' },
  // Aplikacje na koordynatorów (pipeline liderów) — wszystkie projekty
  { id:'koo-da',   kategoria:'Koordynatorzy', nazwa:'DA',         okres_poprzedni:'2024/2025', wartosc_poprzednia:1, okres_biezacy:'2025/2026', wartosc_biezaca:1,  created_at:'' },
  { id:'koo-rj',   kategoria:'Koordynatorzy', nazwa:'RJ',         okres_poprzedni:'2024/2025', wartosc_poprzednia:2, okres_biezacy:'2025/2026', wartosc_biezaca:1,  created_at:'' },
  { id:'koo-jwk',  kategoria:'Koordynatorzy', nazwa:'JWK',        okres_poprzedni:'2024/2025', wartosc_poprzednia:1, okres_biezacy:'2025/2026', wartosc_biezaca:2,  created_at:'' },
  { id:'koo-twe',  kategoria:'Koordynatorzy', nazwa:'TWE',        okres_poprzedni:'2024/2025', wartosc_poprzednia:1, okres_biezacy:'2025/2026', wartosc_biezaca:2,  created_at:'' },
  { id:'koo-zfue', kategoria:'Koordynatorzy', nazwa:'ZFUE',       okres_poprzedni:'2024/2025', wartosc_poprzednia:1, okres_biezacy:'2025/2026', wartosc_biezaca:1,  created_at:'' },
  { id:'koo-bal',  kategoria:'Koordynatorzy', nazwa:'Bal',        okres_poprzedni:'2024/2025', wartosc_poprzednia:1, okres_biezacy:'2025/2026', wartosc_biezaca:1,  created_at:'' },
  { id:'koo-me',   kategoria:'Koordynatorzy', nazwa:'ME',         okres_poprzedni:'2024/2025', wartosc_poprzednia:2, okres_biezacy:'2025/2026', wartosc_biezaca:1,  created_at:'' },
  { id:'koo-wig',  kategoria:'Koordynatorzy', nazwa:'Wigilia',    okres_poprzedni:'2024/2025', wartosc_poprzednia:9, okres_biezacy:'2025/2026', wartosc_biezaca:12, created_at:'' },
  { id:'koo-tedx', kategoria:'Koordynatorzy', nazwa:'TEDx',       okres_poprzedni:'2024/2025', wartosc_poprzednia:1, okres_biezacy:'2025/2026', wartosc_biezaca:1,  created_at:'' },
  { id:'koo-prz',  kategoria:'Koordynatorzy', nazwa:'Przydziałki',okres_poprzedni:'2024/2025', wartosc_poprzednia:2, okres_biezacy:'2025/2026', wartosc_biezaca:2,  created_at:'' },
  { id:'koo-wwk',  kategoria:'Koordynatorzy', nazwa:'WWK',        okres_poprzedni:'2024/2025', wartosc_poprzednia:1, okres_biezacy:'2025/2026', wartosc_biezaca:1,  created_at:'' },
  { id:'koo-rw',   kategoria:'Koordynatorzy', nazwa:'RW',         okres_poprzedni:'2024/2025', wartosc_poprzednia:1, okres_biezacy:'2025/2026', wartosc_biezaca:1,  created_at:'' },
  { id:'koo-ada',  kategoria:'Koordynatorzy', nazwa:'Adapciak',   okres_poprzedni:'2024/2025', wartosc_poprzednia:2, okres_biezacy:'2025/2026', wartosc_biezaca:1,  created_at:'' },
  { id:'koo-ani',  kategoria:'Koordynatorzy', nazwa:'Animalia',   okres_poprzedni:'2024/2025', wartosc_poprzednia:1, okres_biezacy:'2025/2026', wartosc_biezaca:2,  created_at:'' },
  { id:'koo-lwk',  kategoria:'Koordynatorzy', nazwa:'LWK',        okres_poprzedni:'2024/2025', wartosc_poprzednia:1, okres_biezacy:'2025/2026', wartosc_biezaca:1,  created_at:'' },
  { id:'koo-gal',  kategoria:'Koordynatorzy', nazwa:'Gala',       okres_poprzedni:'2024/2025', wartosc_poprzednia:1, okres_biezacy:'2025/2026', wartosc_biezaca:5,  created_at:'' },
  { id:'koo-grad', kategoria:'Koordynatorzy', nazwa:'Graduation', okres_poprzedni:'2024/2025', wartosc_poprzednia:1, okres_biezacy:'2025/2026', wartosc_biezaca:2,  created_at:'' },
]

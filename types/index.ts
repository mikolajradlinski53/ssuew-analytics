export type Sezon = 'jesien' | 'wiosna'

export interface Rekrutacja {
  id: string
  edycja: string        // np. "J'25", "W'26"
  sezon: Sezon
  rok: number           // rok akademicki startu, np. 2025
  zgloszenia: number
  przyjeci: number
  created_at: string
}

export interface Kohorta {
  id: string
  edycja: string
  sezon: Sezon
  rok: number
  n_czlonkow: number
  avg_retention_sem: number   // avg semestrów aktywności
  max_retention_sem: number   // max obserwowany
  in_progress: boolean        // kohorta jeszcze aktywna
  // Realna krzywa przeżycia: % aktywnych po t semestrach (index = semestr, 0..max).
  // Liczona z danych per-osoba. Gdy brak — moduł retencji używa aproksymacji.
  survival?: number[]
  created_at: string
}

export interface Komisja {
  id: string
  kod: string           // np. "P.KA."
  nazwa: string
  przewodniczacy: string | null
  created_at: string
}

export interface KpiPeriod {
  id: string
  komisja_id: string
  komisja?: Komisja
  semestr: string       // np. "letni 2025/2026"
  projekty_planowane: number
  projekty_zrealizowane: number
  kpi_custom?: Record<string, string>  // elastyczne dodatkowe KPI
  notatka: string | null
  created_at: string
}

export interface StatResult {
  r: number
  r2: number
  p_approx: string
  significant: boolean
  interpretation: string
}

export interface RegressionResult {
  r2: number
  coefficients: { name: string; beta: number; interpretation: string }[]
  prediction: number
  warning: string | null
}

// Realny model KPI SSUEW: metryka rok-do-roku (wartość zeszłoroczna vs tegoroczna)
export interface KpiMetric {
  id: string
  kategoria: string          // np. 'SKS', 'Wydarzenia', 'Ankieta', 'Koordynatorzy'
  nazwa: string              // np. 'Październik', 'Wigilia'
  okres_poprzedni: string    // np. '2024/2025'
  wartosc_poprzednia: number
  okres_biezacy: string      // np. '2025/2026'
  wartosc_biezaca: number
  created_at: string
}

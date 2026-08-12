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

// Członek kohorty — aktywność per semestr (widok per-osoba). Nazwiska tylko w Supabase.
export type CzlonekStatus = 'aktywny' | 'wspierający' | 'alumn' | 'zawieszone' | 'nieaktywny'

export interface Czlonek {
  id: string
  kohorta_edycja: string     // np. "J'24"
  imie_nazwisko: string      // na żywo prawdziwe; demo: zaślepione
  status: CzlonekStatus
  aktywnosc: number[]        // stan per semestr: 0=nieaktywny, 1=aktywny, 2=wspierający
  created_at: string
}

// Jeden pomiar metryki w jednym okresie — dokładnie jeden wiersz zakładki `kpi_punkty`.
// Format długi: dodanie kolejnego roku to dopisanie wierszy, nie zmiana kodu.
export interface KpiMetric {
  id: string
  kategoria: string          // np. 'SKS', 'Koordynatorzy', 'Frekwencja P.KA.'
  nazwa: string              // np. 'Październik', 'Wigilia', 'Gala'
  okres: string              // np. '2025/2026'
  wartosc: number
  created_at: string
}

// Punkt serii. Niesie `id` wiersza, żeby dało się edytować wartość w miejscu.
export interface PunktKpi {
  id: string
  okres: string
  wartosc: number
}

// Metryka w czasie — jednostka, którą widzi interfejs.
// Rozpoznawana po parze (kategoria, nazwa); zmiana nazwy rozrywa serię na dwie.
export interface SeriaKpi {
  kategoria: string
  nazwa: string
  punkty: PunktKpi[]         // rosnąco po okresie, bez powtórzeń
}

// Kod dostępu dla osób bez konta z hasłem. Wiąże się z przeglądarką przy
// pierwszym użyciu; `ip_pierwszy` jest tylko do wglądu i niczego nie blokuje.
export interface KodDostepu {
  id: string
  kod: string
  etykieta: string
  rola: 'board'
  urzadzenie: string
  ip_pierwszy: string
  ostatnie_uzycie: string
  aktywny: boolean
  created_at: string
}

export interface StrategicKpi {
  id: string
  title: string
  value: string
  score: number
  trend: 'up' | 'down' | 'flat'
  detail: string
  recommendation: string
}

export interface ExecutiveInsight {
  id: string
  priority: 'high' | 'medium' | 'low'
  title: string
  metric: string
  detail: string
  action: string
  href: string
}

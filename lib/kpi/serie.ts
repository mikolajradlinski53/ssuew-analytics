import type { KpiMetric, PunktKpi, SeriaKpi } from '@/types'

/**
 * Okresy zapisujemy jako '2024/2025'. Samo porównanie tekstowe dałoby dla tego
 * formatu dobry wynik, ale rozsypałoby się na 'letni 2025/2026' — dlatego
 * najpierw szukamy pierwszej czterocyfrowej liczby.
 */
function rokZOkresu(okres: string): number | null {
  const m = okres.match(/\d{4}/)
  return m ? Number(m[0]) : null
}

export function porownajOkresy(a: string, b: string): number {
  const ra = rokZOkresu(a)
  const rb = rokZOkresu(b)
  if (ra !== null && rb !== null && ra !== rb) return ra - rb
  return a.localeCompare(b, 'pl')
}

/**
 * Skleja surowe wiersze arkusza w serie. Metryka jest rozpoznawana po parze
 * (kategoria, nazwa) — zmiana nazwy w arkuszu rozrywa serię na dwie.
 *
 * Deduplikacja jest tutaj, a nie tylko w migracji, bo ten sam okres może wpaść
 * dwa razy również przy zwykłym wpisywaniu — i wtedy prawdą jest wpis nowszy.
 */
export function serieZWierszy(wiersze: KpiMetric[]): SeriaKpi[] {
  type Grupa = { kategoria: string; nazwa: string; punkty: Map<string, KpiMetric> }
  const grupy = new Map<string, Grupa>()

  for (const w of wiersze) {
    const klucz = `${w.kategoria} ${w.nazwa}`
    let g = grupy.get(klucz)
    if (!g) {
      g = { kategoria: w.kategoria, nazwa: w.nazwa, punkty: new Map() }
      grupy.set(klucz, g)
    }
    const byl = g.punkty.get(w.okres)
    if (!byl || w.created_at >= byl.created_at) g.punkty.set(w.okres, w)
  }

  const serie: SeriaKpi[] = [...grupy.values()].map((g) => ({
    kategoria: g.kategoria,
    nazwa: g.nazwa,
    punkty: [...g.punkty.values()]
      .map((w): PunktKpi => ({ id: w.id, okres: w.okres, wartosc: w.wartosc }))
      .sort((a, b) => porownajOkresy(a.okres, b.okres)),
  }))

  return serie.sort(
    (a, b) => a.kategoria.localeCompare(b.kategoria, 'pl') || a.nazwa.localeCompare(b.nazwa, 'pl'),
  )
}

export function ostatniPunkt(s: SeriaKpi): PunktKpi | null {
  return s.punkty.length ? s.punkty[s.punkty.length - 1] : null
}

/**
 * Iloraz dwóch ostatnich punktów. Zwraca 0, gdy nie da się go policzyć —
 * ta sama umowa co w poprzednim modelu, więc wszędzie 0 jest odfiltrowywane
 * przed liczeniem średnich.
 */
export function ilorazSerii(s: SeriaKpi): number {
  if (s.punkty.length < 2) return 0
  const przed = s.punkty[s.punkty.length - 2].wartosc
  const teraz = s.punkty[s.punkty.length - 1].wartosc
  if (przed === 0) return 0
  return teraz / przed
}

export function serieWgKategorii(serie: SeriaKpi[]): Map<string, SeriaKpi[]> {
  const out = new Map<string, SeriaKpi[]>()
  for (const s of serie) {
    const arr = out.get(s.kategoria) ?? []
    arr.push(s)
    out.set(s.kategoria, arr)
  }
  return out
}

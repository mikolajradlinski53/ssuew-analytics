export type Kategoria = 'ZEBRANIA' | 'KOMISJE' | 'SSUEW' | 'PROJEKTY' | 'UE' | 'APLIKACJE' | 'INNE'

export interface Miesiac {
  m: number
  y: number
}

export interface Wydarzenie {
  id: string
  tytul: string
  kategoria: Kategoria
  /** Dzień STARTU. */
  rok: number
  miesiac: number
  dzien: number
  /**
   * Ile dni trwa; 1 = jednodniowe. Liczba zamiast daty końca: przesunięcie
   * zmienia tylko start, a długość zostaje.
   */
  dni: number
  /** „Cały dzień” to co innego niż „godzina jeszcze nieustalona” (`godzina: null`). */
  calyDzien: boolean
  /** Start, "18:00", albo null. */
  godzina: string | null
  /** Koniec, "20:00", albo null, gdy podano sam start. */
  godzinaDo: string | null
  /** Kod z `BUDYNKI` albo 'POZA'. */
  budynek: string | null
  /** Numer sali ("110L"), a przy budynku 'POZA' - nazwa miejsca. */
  sala: string | null
  /** 'wszyscy' znaczy cały zarząd i nie bierze udziału w liczeniu kolizji. */
  osoby: string[]
  /** Dzień wolny od zajęć (np. Dzień Rektorski) - w eksporcie na zielono. */
  dzienWolny: boolean
}

export interface Semestr {
  id: string
  nazwa: string
  miesiace: Miesiac[]
  archiwalny: boolean
}

interface StylKategorii {
  etykieta: string
  /** 1 = najważniejsza. Decyduje o wyglądzie karty i kolejności w kratce. */
  ranga: number
  /** Nasycony kolor na obrys i kropkę. */
  obrys: string
  /** Przezroczysta wersja obrysu - kładzie się na ciemnym bez utraty kontrastu tekstu. */
  tlo: string
  /** Ciemniejsza odmiana do eksportu: kolory interfejsu giną na białym arkuszu. */
  druk: string
}

/**
 * Kolejność ważności ustalona na Sesji Operacyjnej: Zebrania → Komisje → …
 * → Inne. Wygląd karty zależy od rangi, nie od kategorii - dopisanie
 * kategorii przesuwa wygląd tych poniżej.
 */
export const KATEGORIE: Record<Kategoria, StylKategorii> = {
  ZEBRANIA:  { etykieta: 'Zebrania',      ranga: 1, obrys: '#60a5fa', tlo: 'rgba(96, 165, 250, 0.14)',  druk: '#1d4ed8' },
  KOMISJE:   { etykieta: 'Komisje',       ranga: 2, obrys: '#a3e635', tlo: 'rgba(163, 230, 53, 0.14)',  druk: '#4d7c0f' },
  SSUEW:     { etykieta: 'SSUEW',         ranga: 3, obrys: '#2dd4bf', tlo: 'rgba(45, 212, 191, 0.14)',  druk: '#0f766e' },
  PROJEKTY:  { etykieta: 'Projekty',      ranga: 4, obrys: '#fbbf24', tlo: 'rgba(251, 191, 36, 0.14)',  druk: '#b45309' },
  UE:        { etykieta: 'Wydarzenia UE', ranga: 5, obrys: '#818cf8', tlo: 'rgba(129, 140, 248, 0.14)', druk: '#4338ca' },
  APLIKACJE: { etykieta: 'Aplikacje',     ranga: 6, obrys: '#fb7185', tlo: 'rgba(251, 113, 133, 0.14)', druk: '#be123c' },
  INNE:      { etykieta: 'Inne',          ranga: 7, obrys: '#a78bfa', tlo: 'rgba(167, 139, 250, 0.14)', druk: '#6d28d9' },
}

export const KLUCZE_KATEGORII = (Object.keys(KATEGORIE) as Kategoria[]).sort(
  (a, b) => KATEGORIE[a].ranga - KATEGORIE[b].ranga,
)

export function jestKategoria(nazwa: string): nazwa is Kategoria {
  return (KLUCZE_KATEGORII as string[]).includes(nazwa)
}

/** Numer rangi na karcie - tylko cztery najważniejsze; niżej byłby szumem. */
export function numerRangi(k: Kategoria): number | null {
  const r = KATEGORIE[k].ranga
  return r <= 4 ? r : null
}

/** Wartości pól, których nie było przed Sesjami Operacyjnymi. */
export const POLA_DOMYSLNE: Pick<Wydarzenie, 'dni' | 'calyDzien' | 'godzinaDo' | 'budynek' | 'dzienWolny'> = {
  dni: 1,
  calyDzien: false,
  godzinaDo: null,
  budynek: null,
  dzienWolny: false,
}

/** Wydarzenie bez identyfikatora - tyle, ile trzeba, żeby je utworzyć. */
export type NoweWydarzenie = Omit<Wydarzenie, 'id'>

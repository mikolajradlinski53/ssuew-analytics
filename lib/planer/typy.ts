export type Kategoria =
  | 'UE' | 'SSUEW' | 'PROJEKTY' | 'ZEBRANIA' | 'ZEBRANIA/INNE' | 'INNE' | 'APLIKACJE'

export interface Miesiac {
  m: number
  y: number
}

export interface Wydarzenie {
  id: string
  tytul: string
  kategoria: Kategoria
  rok: number
  miesiac: number
  dzien: number
  /** "18:00" albo null, gdy godzina nieustalona. */
  godzina: string | null
  /** "9J" albo null. Osobne pole, nie wyciągane z tytułu wyrażeniem regularnym. */
  sala: string | null
  /** 'wszyscy' znaczy cały zarząd i nie bierze udziału w liczeniu kolizji. */
  osoby: string[]
}

export interface Semestr {
  id: string
  nazwa: string
  miesiace: Miesiac[]
  archiwalny: boolean
}

interface StylKategorii {
  etykieta: string
  /** Nasycony kolor na obrys i kropkę. */
  obrys: string
  /** Przezroczysta wersja obrysu — kładzie się na ciemnym bez utraty kontrastu tekstu. */
  tlo: string
}

/**
 * Barwy przeniesione z dotychczasowego Planera, ale dobrane na nowo: tamte miały
 * jasne tła (`#eef0fe` i podobne) pod białą stronę, a część kolorów obrysu
 * (`#2563eb`, `#7c3aed`) traciła kontrast na ciemnym.
 */
export const KATEGORIE: Record<Kategoria, StylKategorii> = {
  'UE':            { etykieta: 'UE',        obrys: '#818cf8', tlo: 'rgba(129, 140, 248, 0.14)' },
  'SSUEW':         { etykieta: 'SSUEW',     obrys: '#2dd4bf', tlo: 'rgba(45, 212, 191, 0.14)' },
  'PROJEKTY':      { etykieta: 'Projekty',  obrys: '#fbbf24', tlo: 'rgba(251, 191, 36, 0.14)' },
  'ZEBRANIA':      { etykieta: 'Zebrania',  obrys: '#60a5fa', tlo: 'rgba(96, 165, 250, 0.14)' },
  'ZEBRANIA/INNE': { etykieta: 'Zeb./inne', obrys: '#38bdf8', tlo: 'rgba(56, 189, 248, 0.14)' },
  'INNE':          { etykieta: 'Inne',      obrys: '#a78bfa', tlo: 'rgba(167, 139, 250, 0.14)' },
  'APLIKACJE':     { etykieta: 'Aplikacje', obrys: '#fb7185', tlo: 'rgba(251, 113, 133, 0.14)' },
}

export const KLUCZE_KATEGORII = Object.keys(KATEGORIE) as Kategoria[]

export function jestKategoria(nazwa: string): nazwa is Kategoria {
  return (KLUCZE_KATEGORII as string[]).includes(nazwa)
}

/** Wydarzenie bez identyfikatora — tyle, ile trzeba, żeby je utworzyć. */
export type NoweWydarzenie = Omit<Wydarzenie, 'id'>

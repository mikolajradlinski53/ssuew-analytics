import type { KontekstProjektu } from './kontekst'
import type { WiadomoscGemini } from './gemini'

export interface WiadomoscCzatu {
  rola: 'ja' | 'deck'
  tresc: string
}

/** Tyle ostatnich wiadomości idzie do modelu - starsze nie zmieniają odpowiedzi, a zjadają limit. */
export const LIMIT_HISTORII = 20
export const LIMIT_ZNAKOW = 4000

export const INSTRUKCJA_CZATU = `Jesteś D.E.C.K. (Diagnostic Evaluation of Change & KPIs) - asystentem analitycznym Wiceprzewodniczącego ds. Strategii i Działań Operacyjnych Samorządu Studentów Uniwersytetu Ekonomicznego we Wrocławiu.
Pierwsza wiadomość zawiera obraz projektu w JSON: KPI, rekrutacje, retencję kohort, alerty, kondycję projektów, Planer najbliższych 21 dni i członków.
Rozmawiasz z nim o tych danych: interpretujesz wskaźniki, porównujesz, wskazujesz ryzyka i proponujesz działania. Pomagasz też pisać teksty: ogłoszenia, maile, podsumowania.
Zasady: opieraj się na danych i podawaj liczby; gdy czegoś w danych nie ma, powiedz to wprost i nie zgaduj; odpowiadaj po polsku, zwięźle i konkretnie.
Formatowanie: krótkie akapity, wypunktowania zaczynane od „- ”, pogrubienie **tak**; bez nagłówków, tabel i bloków kodu. Używaj zwykłego łącznika „-”, nigdy długich myślników.`

/** Sprawdza rozmowę z przeglądarki - to wejście z zewnątrz, nie ufamy mu. */
export function sprawdzRozmowe(x: unknown): WiadomoscCzatu[] | null {
  if (typeof x !== 'object' || x === null) return null
  const lista = (x as { wiadomosci?: unknown }).wiadomosci
  if (!Array.isArray(lista) || !lista.length) return null

  const wynik: WiadomoscCzatu[] = []
  for (const w of lista as Partial<WiadomoscCzatu>[]) {
    const rola = w?.rola
    const tresc = w?.tresc
    if ((rola !== 'ja' && rola !== 'deck') || typeof tresc !== 'string' || !tresc.trim()) return null
    wynik.push({ rola, tresc: tresc.trim().slice(0, LIMIT_ZNAKOW) })
  }
  if (wynik[wynik.length - 1].rola !== 'ja') return null
  return wynik.slice(-LIMIT_HISTORII)
}

/**
 * Obraz projektu jako pierwsza wymiana, potem rozmowa. Obraz jest świeży przy
 * każdym pytaniu - zmiana w Planerze jest widoczna w następnej odpowiedzi.
 */
export function rozmowaDlaGemini(k: KontekstProjektu, rozmowa: WiadomoscCzatu[]): WiadomoscGemini[] {
  const wynik: WiadomoscGemini[] = [
    { rola: 'user', tekst: `Obraz projektu (JSON):\n${JSON.stringify(k)}` },
    { rola: 'model', tekst: 'Mam obraz projektu. Pytaj.' },
  ]
  // Po przycięciu historia może zaczynać się od odpowiedzi - zaczynamy od pierwszego pytania.
  const start = rozmowa.findIndex((w) => w.rola === 'ja')
  for (const w of rozmowa.slice(Math.max(0, start))) {
    const rola = w.rola === 'ja' ? 'user' : 'model'
    const ostatnia = wynik[wynik.length - 1]
    if (ostatnia.rola === rola) ostatnia.tekst += `\n\n${w.tresc}`
    else wynik.push({ rola, tekst: w.tresc })
  }
  return wynik
}

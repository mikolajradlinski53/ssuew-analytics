export interface Komentarz {
  id: string
  wydarzenieId: string
  tresc: string
  /** Etykieta kodu albo adres e-mail — zapisywana przez serwer z biletu. */
  autor: string
  utworzone: number
}

/**
 * Komentarze leżą płasko w semestrze, więc widok grupuje je sam. Dzięki temu
 * kropka „to wydarzenie ma rozmowę" wynika z jednej subskrypcji, zamiast
 * wymagać odpytania podkolekcji każdego wydarzenia osobno.
 */
export function poWydarzeniach(komentarze: Komentarz[]): Map<string, Komentarz[]> {
  const mapa = new Map<string, Komentarz[]>()
  for (const k of komentarze) {
    const lista = mapa.get(k.wydarzenieId) ?? []
    lista.push(k)
    mapa.set(k.wydarzenieId, lista)
  }
  for (const lista of mapa.values()) lista.sort((a, b) => a.utworzone - b.utworzone)
  return mapa
}

import { GAS_URL, GAS_TOKEN, isConfigured } from './config'
import type { Tabela, TabelaTypy } from './schema'

const LIMIT_CZASU_MS = 8000
const CACHE_S = 300

export class GasError extends Error {
  readonly kod: number
  constructor(wiadomosc: string, kod: number) {
    super(wiadomosc)
    this.name = 'GasError'
    this.kod = kod
  }
}

type Init = RequestInit & { next?: { revalidate?: number; tags?: string[] } }

/**
 * Apps Script odpowiada kodem 200 nawet przy błędzie — prawdziwy kod jest w treści.
 * Dlatego nigdzie tu nie sprawdzamy `res.ok`; to byłby fałszywy spokój.
 */
async function wywolaj(url: string, init: Init): Promise<unknown> {
  const przerwij = new AbortController()
  const zegar = setTimeout(() => przerwij.abort(), LIMIT_CZASU_MS)

  let res: Response
  try {
    res = await fetch(url, { ...init, signal: przerwij.signal })
  } catch (e) {
    const przerwane = e instanceof Error && e.name === 'AbortError'
    throw new GasError(
      przerwane
        ? `Apps Script nie odpowiedział w ${LIMIT_CZASU_MS / 1000} s`
        : 'Nie udało się połączyć z Apps Script',
      504,
    )
  } finally {
    clearTimeout(zegar)
  }

  const tresc = await res.text()
  let dane: unknown
  try {
    dane = JSON.parse(tresc)
  } catch {
    throw new GasError(
      'Apps Script zwrócił treść, która nie jest JSON-em — sprawdź, czy wdrożenie ma dostęp „Wszyscy”',
      502,
    )
  }

  if (dane && typeof dane === 'object' && !Array.isArray(dane)) {
    const koperta = dane as { ok?: boolean; kod?: number; error?: string }
    if (koperta.ok === false) {
      throw new GasError(koperta.error ?? 'Błąd Apps Script', koperta.kod ?? 500)
    }
  }
  return dane
}

/** Odczyt całej zakładki. Wynik jest cache'owany na 5 minut pod znacznikiem `analytics`. */
export async function gasList<T extends Tabela>(t: T): Promise<TabelaTypy[T][]> {
  if (!isConfigured) return []
  const url = `${GAS_URL}?token=${encodeURIComponent(GAS_TOKEN)}&t=${t}`
  const dane = await wywolaj(url, { next: { revalidate: CACHE_S, tags: ['analytics'] } })
  if (!Array.isArray(dane)) throw new GasError('Skrypt zwrócił coś innego niż listę', 502)
  return dane as TabelaTypy[T][]
}

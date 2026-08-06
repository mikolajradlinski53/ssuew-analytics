import { revalidateTag } from 'next/cache'
import { GAS_URL, GAS_TOKEN, isConfigured } from './config'
import type { Tabela, TabelaTypy } from './schema'

const LIMIT_CZASU_MS = 8000
const CACHE_S = 300

/** Jeden znacznik na wszystkie dane analityczne — zapis w dowolnej zakładce unieważnia całość. */
export const ZNACZNIK = 'analytics'

/**
 * Po zapisie cache musi zniknąć natychmiast, inaczej własną zmianę zobaczyłbyś
 * dopiero za pięć minut. `expire: 0` znaczy „nie zostawiaj nic".
 */
export function odswiezAnalytics(): void {
  revalidateTag(ZNACZNIK, { expire: 0 })
}

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

  // Pobranie treści jest wewnątrz tego samego `try` co `fetch` z dwóch powodów:
  // połączenie może urwać się już po nagłówkach, a limit 8 s ma obejmować całą
  // wymianę, nie samo nawiązanie połączenia.
  let tresc: string
  try {
    const res = await fetch(url, { ...init, signal: przerwij.signal })
    tresc = await res.text()
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
  const dane = await wywolaj(url, { next: { revalidate: CACHE_S, tags: [ZNACZNIK] } })
  if (!Array.isArray(dane)) throw new GasError('Skrypt zwrócił coś innego niż listę', 502)
  return dane as TabelaTypy[T][]
}

export type Operacja = 'insert' | 'upsert' | 'update'

/**
 * Zapis nigdy nie jest cache'owany. `rows` jest zawsze tablicą — także dla jednego wiersza,
 * żeby po stronie skryptu istniał jeden kształt żądania zamiast dwóch.
 */
export async function gasWrite<T extends Tabela>(
  t: T,
  op: Operacja,
  rows: Record<string, unknown>[],
): Promise<TabelaTypy[T][]> {
  if (!isConfigured) throw new GasError('Apps Script nie jest skonfigurowany', 503)

  const dane = await wywolaj(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: GAS_TOKEN, t, op, rows }),
    cache: 'no-store',
  })

  const koperta = dane as { rows?: unknown }
  if (!Array.isArray(koperta.rows)) throw new GasError('Skrypt nie zwrócił zapisanych wierszy', 502)
  return koperta.rows as TabelaTypy[T][]
}

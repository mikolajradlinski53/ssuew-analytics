# D.E.C.K. - asystent AI, kokpit i logowanie: plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Cel:** asystent Gemini zna dane całego projektu, pisze odprawę z zagrożeniami w kokpicie i rozmawia na czacie; kokpit i logowanie dostają nowy układ (wariant A, efekty zostają).

**Architektura:** czysta logika w `lib/asystent/` (kontekst, odprawa, fakty, czat, odświeżanie) testowana bez sieci; klient Gemini przez `fetch` z błędami nazwanymi kodami; odprawa zapisana w Firestore (`asystent/odprawa`) i odświeżana w tle przez `after()`, więc kokpit nigdy nie czeka na model. Zarząd widzi panel faktów bez AI.

**Stack:** Next.js 16, React 19, TypeScript, Gemini API (`generateContent`, REST), Firestore Admin SDK, Vitest.

**Spec:** [docs/superpowers/specs/2026-10-02-deck-asystent-kokpit-design.md](../specs/2026-10-02-deck-asystent-kokpit-design.md)

**Konwencje:** po polsku; **w tekstach widocznych dla użytkownika tylko „-”, nigdy długie myślniki**; commit dopiero po zerowym kodzie wyjścia `npx vitest run …` (nie przez `| grep`, który maskuje błąd); stopka commitów `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Pułapka narzędzi:** Write/Edit zamieniają zapis `—` na sam znak. Pliki, które celowo zawierają długi myślnik w danych testowych albo w wyrażeniu regularnym (`lib/asystent/gemini.ts`, `lib/asystent/gemini.test.ts`), po zapisaniu przepuść przez `node scratchpad/escape.mjs <plik>` - zamienia znak z powrotem na zapis `—`/`–`. Na Windows Git Bash: `MSYS_NO_PATHCONV=1` przy ścieżkach zaczynających się od „/”.

---

## Mapa plików

| Plik | Odpowiedzialność | Zadanie |
|---|---|---|
| `lib/czas.ts` | data i godzina w Warszawie (serwer liczy w UTC) | 1 |
| `lib/asystent/gemini.ts` | wywołanie Gemini, `BladAsystenta`, `komunikatBledu`, `bezDlugichMyslnikow` | 2 |
| `lib/asystent/kontekst.ts` | `DaneProjektu`, `zbudujKontekst` | 3 |
| `lib/asystent/odprawa.ts` | instrukcja, schemat, `sprawdzOdprawe`, odnośniki, `ZapisanaOdprawa` | 4 |
| `lib/asystent/fakty.ts` | panel faktów bez AI, najbliższe wydarzenia | 5 |
| `lib/asystent/odswiezanie.ts` | `sladKontekstu`, `czyOdswiezyc` | 6 |
| `lib/asystent/dane.ts` | serwer: pobranie danych, odczyt/zapis odprawy, generowanie, odświeżanie w tle | 6 |
| `lib/firebase/admin.ts` | `odprawaRef` | 6 |
| `app/api/asystent/odprawa/route.ts` | POST: odśwież odprawę | 7 |
| `components/deck/PanelFaktow.tsx`, `PanelOdprawy.tsx` | panele kokpitu | 8 |
| `components/deck/PasekStatusu.tsx`, `app/globals.css` | stopka A (kursor, wejście segmentów) | 9 |
| `components/deck/DeckHub.tsx`, `app/page.tsx` | układ kokpitu, strumienie, `after()`; usunięcie `SekwencjaStartowa.tsx` | 10 |
| `lib/asystent/czat.ts`, `app/api/asystent/czat/route.ts` | czat | 11 |
| `components/deck/CzatDeck.tsx`, `TekstAsystenta.tsx` | okno czatu | 12 |
| `app/login/page.tsx` | marka i liczby dekoracyjne | 13 |
| `components/deck/KodInput.tsx`, `CyfraDekodowana.tsx`, `app/globals.css` | animacja cyfr kodu | 14 |
| `scripts/gemini.mjs`, `package.json`, `README.md`, `.env.example` | lista modeli i próba na kluczu, dokumentacja | 15 |
| - | wdrożenie i sprawdzenie na produkcji | 16 |

---

# FAZA 1 - rdzeń asystenta

## Zadanie 1: Data i godzina w Warszawie

**Pliki:** nowy `lib/czas.ts`, test `lib/czas.test.ts`

- [ ] **Krok 1: Test**

```ts
import { describe, it, expect } from 'vitest'
import { dzisWarszawa, godzinaWarszawa } from '@/lib/czas'

describe('czas w Warszawie', () => {
  it('po północy w Warszawie to już kolejny dzień, choć w UTC jeszcze nie', () => {
    const t = new Date('2026-10-02T22:30:00Z') // 00:30 czasu letniego
    expect(dzisWarszawa(t)).toEqual({ rok: 2026, miesiac: 10, dzien: 3 })
    expect(godzinaWarszawa(t)).toBe('00:30')
  })

  it('zimą przesunięcie to godzina', () => {
    expect(godzinaWarszawa(new Date('2026-12-01T12:00:00Z'))).toBe('13:00')
  })
})
```

- [ ] **Krok 2: Uruchom - ma paść** (`npx vitest run lib/czas.test.ts`, brak modułu)

- [ ] **Krok 3: `lib/czas.ts`**

```ts
import type { Data } from '@/lib/planer/trwanie'

const STREFA = 'Europe/Warsaw'

/**
 * Dzisiejsza data w Warszawie. Serwer na Vercelu liczy w UTC - bez tego
 * między północą a 2:00 „dziś” w odprawie byłoby wczorajsze.
 */
export function dzisWarszawa(teraz: Date): Data {
  const [rok, miesiac, dzien] = new Intl.DateTimeFormat('en-CA', {
    timeZone: STREFA, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(teraz).split('-').map(Number)
  return { rok, miesiac, dzien }
}

export function godzinaWarszawa(teraz: Date): string {
  return new Intl.DateTimeFormat('pl-PL', { timeZone: STREFA, hour: '2-digit', minute: '2-digit' }).format(teraz)
}
```

- [ ] **Krok 4: Uruchom - ma przejść; commit** `feat(asystent): data i godzina w Warszawie niezaleznie od strefy serwera`

---

## Zadanie 2: Klient Gemini

**Pliki:** nowy `lib/asystent/gemini.ts`, test `lib/asystent/gemini.test.ts`

- [ ] **Krok 1: Test**

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { zapytajGemini, BladAsystenta, komunikatBledu, bezDlugichMyslnikow, DOMYSLNY_MODEL } from '@/lib/asystent/gemini'

function odpowiedz(status: number, body: unknown) {
  const f = vi.fn(async () => new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', f)
  return f
}

const OK = { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'Retencja \u2014 spada' }] } }] }

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('zapytajGemini', () => {
  it('bez klucza nie dzwoni i zgłasza brak klucza', async () => {
    vi.stubEnv('GEMINI_API_KEY', '')
    const f = odpowiedz(200, OK)
    await expect(zapytajGemini({ instrukcja: 'x', wiadomosci: [{ rola: 'user', tekst: 'y' }] }))
      .rejects.toMatchObject({ kod: 'brak-klucza' })
    expect(f).not.toHaveBeenCalled()
  })

  it('wysyła instrukcję, rozmowę i klucz w nagłówku; zwraca tekst bez długich myślników', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'klucz')
    const f = odpowiedz(200, OK)
    const tekst = await zapytajGemini({ instrukcja: 'Jesteś D.E.C.K.', wiadomosci: [{ rola: 'user', tekst: 'Co z retencją?' }] })
    expect(tekst).toBe('Retencja - spada')
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain(`models/${DOMYSLNY_MODEL}:generateContent`)
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('klucz')
    const body = JSON.parse(init.body as string)
    expect(body.systemInstruction.parts[0].text).toBe('Jesteś D.E.C.K.')
    expect(body.contents).toEqual([{ role: 'user', parts: [{ text: 'Co z retencją?' }] }])
  })

  it('ze schematem prosi o JSON', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'klucz')
    const f = odpowiedz(200, OK)
    await zapytajGemini({ instrukcja: 'x', wiadomosci: [{ rola: 'user', tekst: 'y' }], schemat: { type: 'OBJECT' } })
    const body = JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(body.generationConfig).toEqual({ responseMimeType: 'application/json', responseSchema: { type: 'OBJECT' } })
  })

  it('model z GEMINI_MODEL', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'klucz')
    vi.stubEnv('GEMINI_MODEL', 'gemini-inny')
    const f = odpowiedz(200, OK)
    await zapytajGemini({ instrukcja: 'x', wiadomosci: [{ rola: 'user', tekst: 'y' }] })
    expect((f.mock.calls[0] as unknown as [string])[0]).toContain('models/gemini-inny:generateContent')
  })

  it('429 to limit', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'klucz')
    odpowiedz(429, { error: { message: 'quota' } })
    await expect(zapytajGemini({ instrukcja: 'x', wiadomosci: [{ rola: 'user', tekst: 'y' }] })).rejects.toMatchObject({ kod: 'limit' })
  })

  it('blokada pytania albo odpowiedzi to odmowa', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'klucz')
    odpowiedz(200, { promptFeedback: { blockReason: 'SAFETY' } })
    await expect(zapytajGemini({ instrukcja: 'x', wiadomosci: [{ rola: 'user', tekst: 'y' }] })).rejects.toMatchObject({ kod: 'odmowa' })
    odpowiedz(200, { candidates: [{ finishReason: 'SAFETY', content: { parts: [] } }] })
    await expect(zapytajGemini({ instrukcja: 'x', wiadomosci: [{ rola: 'user', tekst: 'y' }] })).rejects.toMatchObject({ kod: 'odmowa' })
  })

  it('pusta odpowiedź to błąd formatu', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'klucz')
    odpowiedz(200, { candidates: [{ finishReason: 'STOP', content: { parts: [] } }] })
    await expect(zapytajGemini({ instrukcja: 'x', wiadomosci: [{ rola: 'user', tekst: 'y' }] })).rejects.toMatchObject({ kod: 'format' })
  })
})

describe('komunikatBledu i myślniki', () => {
  it('mapuje kody na status i polski komunikat', () => {
    expect(komunikatBledu(new BladAsystenta('limit', 'x'))).toMatchObject({ status: 429 })
    expect(komunikatBledu(new BladAsystenta('brak-klucza', 'x')).error).toMatch(/GEMINI_API_KEY/)
    expect(komunikatBledu(new Error('?'))).toMatchObject({ status: 500 })
  })

  it('zamienia oba długie myślniki', () => {
    expect(bezDlugichMyslnikow('a \u2014 b \u2013 c')).toBe('a - b - c')
  })
})
```

- [ ] **Krok 2: Uruchom - ma paść**

- [ ] **Krok 3: `lib/asystent/gemini.ts`**

```ts
/**
 * Klient Gemini przez zwykły `fetch` - bez dodatkowej paczki. Wołany wyłącznie
 * z serwera: klucz nigdy nie trafia do przeglądarki.
 */

export const DOMYSLNY_MODEL = 'gemini-3.8-flash'
const ADRES = 'https://generativelanguage.googleapis.com/v1beta/models'
const LIMIT_CZASU_MS = 25_000

export type KodBledu = 'brak-klucza' | 'limit' | 'odmowa' | 'siec' | 'format'

export class BladAsystenta extends Error {
  readonly kod: KodBledu
  constructor(kod: KodBledu, wiadomosc: string) {
    super(wiadomosc)
    this.name = 'BladAsystenta'
    this.kod = kod
  }
}

export interface WiadomoscGemini {
  rola: 'user' | 'model'
  tekst: string
}

export function modelGemini(): string {
  return process.env.GEMINI_MODEL || DOMYSLNY_MODEL
}

/** Użytkownik nie chce długich myślników - instrukcja to mówi, a to pilnuje. */
export function bezDlugichMyslnikow(tekst: string): string {
  return tekst.replace(/\s\u2014\s/g, ' - ').replace(/[\u2014\u2013]/g, '-')
}

const ZABLOKOWANE = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'RECITATION'])

export async function zapytajGemini(o: {
  instrukcja: string
  wiadomosci: WiadomoscGemini[]
  /** Schemat odpowiedzi (format Gemini `Schema`). Bez niego - zwykły tekst. */
  schemat?: object
}): Promise<string> {
  const klucz = process.env.GEMINI_API_KEY
  if (!klucz) throw new BladAsystenta('brak-klucza', 'Brak GEMINI_API_KEY')

  const przerwij = new AbortController()
  const zegar = setTimeout(() => przerwij.abort(), LIMIT_CZASU_MS)
  let res: Response
  try {
    res = await fetch(`${ADRES}/${modelGemini()}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': klucz },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: o.instrukcja }] },
        contents: o.wiadomosci.map((w) => ({ role: w.rola, parts: [{ text: w.tekst }] })),
        generationConfig: o.schemat ? { responseMimeType: 'application/json', responseSchema: o.schemat } : {},
      }),
      signal: przerwij.signal,
    })
  } catch (e) {
    const przerwane = e instanceof Error && e.name === 'AbortError'
    throw new BladAsystenta('siec', przerwane ? 'Gemini nie odpowiedział w 25 s' : 'Nie udało się połączyć z Gemini')
  } finally {
    clearTimeout(zegar)
  }

  if (res.status === 429) throw new BladAsystenta('limit', 'Limit zapytań Gemini wyczerpany')
  const dane = await res.json().catch(() => null)
  if (!res.ok) throw new BladAsystenta('siec', dane?.error?.message ?? `Gemini odpowiedział ${res.status}`)
  if (dane?.promptFeedback?.blockReason) throw new BladAsystenta('odmowa', `Zablokowane: ${dane.promptFeedback.blockReason}`)

  const kandydat = dane?.candidates?.[0]
  if (kandydat && ZABLOKOWANE.has(kandydat.finishReason)) {
    throw new BladAsystenta('odmowa', `Zablokowane: ${kandydat.finishReason}`)
  }
  const tekst = ((kandydat?.content?.parts ?? []) as { text?: string }[]).map((p) => p.text ?? '').join('')
  if (!tekst.trim()) throw new BladAsystenta('format', 'Gemini zwrócił pustą odpowiedź')
  return bezDlugichMyslnikow(tekst)
}

const STATUS: Record<KodBledu, number> = { 'brak-klucza': 503, limit: 429, odmowa: 422, siec: 502, format: 502 }
const KOMUNIKAT: Record<KodBledu, string> = {
  'brak-klucza': 'Brak klucza Gemini - dodaj GEMINI_API_KEY w zmiennych Vercela.',
  limit: 'Darmowy limit Gemini na tę chwilę wyczerpany - spróbuj za minutę.',
  odmowa: 'Gemini odmówił odpowiedzi na te dane.',
  siec: 'Gemini nie odpowiedział - spróbuj ponownie.',
  format: 'Gemini odpowiedział w nieoczekiwanym formacie - spróbuj ponownie.',
}

/** Błąd na odpowiedź HTTP z ludzkim komunikatem. */
export function komunikatBledu(e: unknown): { status: number; error: string } {
  if (e instanceof BladAsystenta) return { status: STATUS[e.kod], error: KOMUNIKAT[e.kod] }
  return { status: 500, error: 'Nieoczekiwany błąd asystenta.' }
}
```

- [ ] **Krok 4: Uruchom - ma przejść; commit** `feat(asystent): klient Gemini z nazwanymi bledami`

---

## Zadanie 3: Obraz projektu dla asystenta

**Pliki:** nowy `lib/asystent/kontekst.ts`, test `lib/asystent/kontekst.test.ts`

- [ ] **Krok 1: Test**

```ts
import { describe, it, expect } from 'vitest'
import { zbudujKontekst, type DaneProjektu } from '@/lib/asystent/kontekst'
import { POLA_DOMYSLNE, type Wydarzenie } from '@/lib/planer/typy'

const DZIS = { rok: 2026, miesiac: 10, dzien: 2 }

function w(nadpisz: Partial<Wydarzenie>): Wydarzenie {
  return {
    id: 'x', tytul: 'A', kategoria: 'ZEBRANIA', rok: 2026, miesiac: 10, dzien: 5,
    godzina: null, sala: null, osoby: [], ...POLA_DOMYSLNE, ...nadpisz,
  }
}

function dane(nadpisz: Partial<DaneProjektu> = {}): DaneProjektu {
  return {
    rekrutacje: [], kohorty: [], punkty: [], projekty: [], czlonkowie: [],
    semestr: { id: '2026Z', nazwa: 'Zimowy 2026/2027' },
    wydarzenia: [], sesja: { wlaczony: false, od: null, przez: null }, sklad: [], propozycje: 0,
    ...nadpisz,
  }
}

describe('zbudujKontekst', () => {
  it('ten sam stan danych daje ten sam obraz', () => {
    const d = dane({ wydarzenia: [w({ id: 'a', tytul: 'Zebranie' })] })
    expect(zbudujKontekst(d, DZIS)).toEqual(zbudujKontekst(d, DZIS))
  })

  it('bez danych - puste sekcje, nie wyjątek', () => {
    const k = zbudujKontekst(dane(), DZIS)
    expect(k.kpi).toEqual([])
    expect(k.projekty).toBeNull()
    expect(k.planer.wydarzenia).toEqual([])
    expect(k.meta).toEqual({ data: '02.10.2026', dzienTygodnia: 'piątek' })
  })

  it('Planer: tylko 21 dni od dziś, także wielodniowe zaczęte wcześniej', () => {
    const k = zbudujKontekst(dane({
      wydarzenia: [
        w({ id: 'dzis', tytul: 'Dziś', dzien: 2, godzina: '18:00' }),
        w({ id: 'za-daleko', tytul: 'Za daleko', dzien: 30 }),
        w({ id: 'wczoraj', tytul: 'Minione', dzien: 1 }),
        w({ id: 'wyjazd', tytul: 'Wyjazd', dzien: 30, miesiac: 9, dni: 4 }),
      ],
    }), DZIS)
    expect(k.planer.wydarzenia.map((x) => x.tytul)).toEqual(['Wyjazd', 'Dziś'])
  })

  it('KPI: ostatnia wartość, rok do roku i kierunek', () => {
    const k = zbudujKontekst(dane({
      punkty: [
        { id: '1', kategoria: 'SKS', nazwa: 'Listopad', okres: '2024/2025', wartosc: 50, created_at: '' },
        { id: '2', kategoria: 'SKS', nazwa: 'Listopad', okres: '2025/2026', wartosc: 30, created_at: '' },
      ],
    }), DZIS)
    expect(k.kpi[0]).toMatchObject({ nazwa: 'Listopad', wartosc: 30, rokDoRoku: 0.6, kierunek: 'spadek' })
  })

  it('członkowie liczeni po statusach w kohortach', () => {
    const k = zbudujKontekst(dane({
      czlonkowie: [
        { id: '1', kohorta_edycja: "J'25", imie_nazwisko: 'A', status: 'aktywny', aktywnosc: [], created_at: '' },
        { id: '2', kohorta_edycja: "J'25", imie_nazwisko: 'B', status: 'aktywny', aktywnosc: [], created_at: '' },
        { id: '3', kohorta_edycja: "J'25", imie_nazwisko: 'C', status: 'nieaktywny', aktywnosc: [], created_at: '' },
      ],
    }), DZIS)
    expect(k.czlonkowie).toEqual([{ kohorta: "J'25", statusy: { aktywny: 2, nieaktywny: 1 } }])
  })
})
```

- [ ] **Krok 2: Uruchom - ma paść**

- [ ] **Krok 3: `lib/asystent/kontekst.ts`**

```ts
import { buildAlerts } from '@/lib/stats'
import { ilorazSerii, ostatniPunkt, serieZWierszy } from '@/lib/kpi/serie'
import { edycje, kondycjaEdycji } from '@/lib/projekty/flagi'
import { dzienTygodnia } from '@/lib/planer/daty'
import { kolizjeWMiesiacu } from '@/lib/planer/kolizje'
import { opisCzasu, opisMiejsca, opisOsob, porownajWydarzenia } from '@/lib/planer/opis'
import { dniWydarzenia, poczatek, porownajDaty, przesunDate, type Data } from '@/lib/planer/trwanie'
import { KATEGORIE, type Miesiac, type Wydarzenie } from '@/lib/planer/typy'
import type { StanSesjiWspolnej } from '@/lib/planer/stan'
import type { Czlonek, Kohorta, KpiMetric, Projekt, Rekrutacja } from '@/types'

/** Surowe dane całego projektu - to, co serwer i tak umie pobrać. */
export interface DaneProjektu {
  rekrutacje: Rekrutacja[]
  kohorty: Kohorta[]
  punkty: KpiMetric[]
  projekty: Projekt[]
  czlonkowie: Czlonek[]
  semestr: { id: string; nazwa: string }
  wydarzenia: Wydarzenie[]
  sesja: StanSesjiWspolnej
  sklad: string[]
  propozycje: number
}

/** Ile dni Planera widzi asystent. */
export const DNI_PLANERA = 21

const dwie = (n: number) => String(n).padStart(2, '0')
const naTekst = (d: Data) => `${dwie(d.dzien)}.${dwie(d.miesiac)}.${d.rok}`

function kierunek(iloraz: number): string {
  if (!iloraz) return 'brak danych'
  if (iloraz >= 1.05) return 'wzrost'
  if (iloraz <= 0.95) return 'spadek'
  return 'bez zmian'
}

function miesiaceOkna(od: Data, doDnia: Data): Miesiac[] {
  const wynik: Miesiac[] = []
  let m = { m: od.miesiac, y: od.rok }
  while (m.y < doDnia.rok || (m.y === doDnia.rok && m.m <= doDnia.miesiac)) {
    wynik.push(m)
    m = m.m === 12 ? { m: 1, y: m.y + 1 } : { m: m.m + 1, y: m.y }
  }
  return wynik
}

/**
 * Zwięzły obraz projektu dla modelu. Czysta funkcja: ten sam stan danych daje
 * ten sam obiekt - na tym opiera się ślad, który decyduje o odświeżeniu odprawy.
 */
export function zbudujKontekst(d: DaneProjektu, dzis: Data) {
  const serie = serieZWierszy(d.punkty)
  const kpi = serie.map((s) => {
    const ost = ostatniPunkt(s)
    const q = ilorazSerii(s)
    return {
      kategoria: s.kategoria,
      nazwa: s.nazwa,
      okres: ost?.okres ?? null,
      wartosc: ost?.wartosc ?? null,
      rokDoRoku: q ? Math.round(q * 100) / 100 : null,
      kierunek: kierunek(q),
    }
  })

  const rekrutacje = [...d.rekrutacje]
    // Rok akademicki zaczyna się jesienią: J'25 przed W'26 tego samego `rok`.
    .sort((a, b) => a.rok - b.rok || (a.sezon === b.sezon ? 0 : a.sezon === 'jesien' ? -1 : 1))
    .map((r) => ({
      edycja: r.edycja,
      zgloszenia: r.zgloszenia,
      przyjeci: r.przyjeci,
      konwersjaProc: r.zgloszenia ? Math.round((r.przyjeci / r.zgloszenia) * 1000) / 10 : null,
    }))

  const retencja = d.kohorty.map((k) => ({
    edycja: k.edycja, liczebnosc: k.n_czlonkow, sredniaSemestrow: k.avg_retention_sem, wToku: k.in_progress,
  }))

  const alerty = buildAlerts(d.rekrutacje, d.kohorty, serie).map((a) => ({
    waga: a.severity, tytul: a.title, opis: a.detail,
  }))

  const ostatniaEdycja = edycje(d.projekty)[0]
  const projekty = ostatniaEdycja
    ? {
        edycja: ostatniaEdycja,
        lista: kondycjaEdycji(d.projekty, ostatniaEdycja).map((k) => ({
          projekt: k.projekt.projekt,
          obszar: k.projekt.obszar,
          flagi: k.flagi.map((f) => ({ waga: f.waga, tytul: f.tytul, detal: f.detal })),
        })),
      }
    : null

  const koniec = przesunDate(dzis, DNI_PLANERA - 1)
  const wOknie = (x: Data) => porownajDaty(x, dzis) >= 0 && porownajDaty(x, koniec) <= 0
  const wydarzenia = d.wydarzenia
    .filter((w) => dniWydarzenia(w).some(wOknie))
    .sort((a, b) => porownajDaty(poczatek(a), poczatek(b)) || porownajWydarzenia(a, b))
    .map((w) => {
      const p = poczatek(w)
      return {
        data: naTekst(p),
        dzienTygodnia: dzienTygodnia(p.rok, p.miesiac, p.dzien),
        dni: w.dni,
        tytul: w.tytul,
        kategoria: KATEGORIE[w.kategoria].etykieta,
        czas: opisCzasu(w),
        miejsce: opisMiejsca(w),
        osoby: opisOsob(w.osoby),
      }
    })

  const kolizje = miesiaceOkna(dzis, koniec).flatMap((m) =>
    [...kolizjeWMiesiacu(d.wydarzenia, m)]
      .map(([dzien, k]) => ({ data: { rok: m.y, miesiac: m.m, dzien }, k }))
      .filter((x) => wOknie(x.data))
      .map((x) => ({
        data: naTekst(x.data),
        osoby: x.k.osoby.map((o) => `${o.osoba}${o.twarda ? ' (nakładają się)' : ''}`),
        sale: x.k.sale.map((s) => s.sala),
      })),
  )

  const poKohortach = new Map<string, Record<string, number>>()
  for (const c of d.czlonkowie) {
    const statusy = poKohortach.get(c.kohorta_edycja) ?? {}
    statusy[c.status] = (statusy[c.status] ?? 0) + 1
    poKohortach.set(c.kohorta_edycja, statusy)
  }
  const czlonkowie = [...poKohortach].map(([kohorta, statusy]) => ({ kohorta, statusy }))

  return {
    meta: { data: naTekst(dzis), dzienTygodnia: dzienTygodnia(dzis.rok, dzis.miesiac, dzis.dzien) },
    kpi,
    rekrutacje,
    retencja,
    alerty,
    projekty,
    planer: {
      semestr: d.semestr.nazwa,
      sesjaOperacyjna: d.sesja.wlaczony ? 'trwa' : 'nie trwa',
      propozycjeDoDecyzji: d.propozycje,
      sklad: d.sklad,
      wydarzenia,
      kolizje,
    },
    czlonkowie,
  }
}

export type KontekstProjektu = ReturnType<typeof zbudujKontekst>
```

- [ ] **Krok 4: Uruchom - ma przejść; commit** `feat(asystent): obraz calego projektu dla modelu`

---

## Zadanie 4: Odprawa - instrukcja, schemat, walidacja

**Pliki:** nowy `lib/asystent/odprawa.ts`, test `lib/asystent/odprawa.test.ts`

- [ ] **Krok 1: Test**

```ts
import { describe, it, expect } from 'vitest'
import { sprawdzOdprawe, ODNOSNIK_OBSZARU, wiadomoscOdprawy, INSTRUKCJA_ODPRAWY } from '@/lib/asystent/odprawa'

const DOBRA = {
  podsumowanie: 'Rekrutacja trzyma poziom, retencja słabnie.',
  zagrozenia: [
    { obszar: 'retencja', waga: 'srednia', tytul: 'W\'25 odpływa', uzasadnienie: 'średnio 1,8 sem.' },
    { obszar: 'kpi', waga: 'wysoka', tytul: 'Ankieta w dół', uzasadnienie: '47 → 28' },
  ],
  dzis: ['Zebranie 18:00'],
}

describe('sprawdzOdprawe', () => {
  it('przyjmuje poprawną i ustawia zagrożenia od najpoważniejszego', () => {
    const o = sprawdzOdprawe(DOBRA)
    expect(o?.zagrozenia.map((z) => z.waga)).toEqual(['wysoka', 'srednia'])
  })

  it('odrzuca braki i nieznane wartości', () => {
    expect(sprawdzOdprawe({ ...DOBRA, podsumowanie: '' })).toBeNull()
    expect(sprawdzOdprawe({ ...DOBRA, zagrozenia: [{ ...DOBRA.zagrozenia[0], waga: 'krytyczna' }] })).toBeNull()
    expect(sprawdzOdprawe({ ...DOBRA, zagrozenia: [{ ...DOBRA.zagrozenia[0], obszar: 'pogoda' }] })).toBeNull()
    expect(sprawdzOdprawe({ ...DOBRA, zagrozenia: Array(6).fill(DOBRA.zagrozenia[0]) })).toBeNull()
    expect(sprawdzOdprawe({ ...DOBRA, dzis: 'Zebranie' })).toBeNull()
    expect(sprawdzOdprawe(null)).toBeNull()
  })

  it('każdy obszar ma odnośnik do modułu', () => {
    expect(ODNOSNIK_OBSZARU.retencja).toBe('/analytics/retencja')
    expect(ODNOSNIK_OBSZARU.planer).toBe('/planer')
  })

  it('wiadomość niesie dane jako JSON, instrukcja zakazuje długich myślników', () => {
    expect(wiadomoscOdprawy({ a: 1 } as never)).toContain('{"a":1}')
    expect(INSTRUKCJA_ODPRAWY).toMatch(/„-”/)
  })
})
```

- [ ] **Krok 2: Uruchom - ma paść**

- [ ] **Krok 3: `lib/asystent/odprawa.ts`**

```ts
import type { KontekstProjektu } from './kontekst'

export const OBSZARY = ['kpi', 'rekrutacja', 'retencja', 'projekty', 'planer', 'zespol'] as const
export const WAGI = ['wysoka', 'srednia', 'niska'] as const
export type Obszar = (typeof OBSZARY)[number]
export type Waga = (typeof WAGI)[number]

export interface Zagrozenie {
  obszar: Obszar
  waga: Waga
  tytul: string
  uzasadnienie: string
}

export interface Odprawa {
  podsumowanie: string
  zagrozenia: Zagrozenie[]
  dzis: string[]
}

/** Odprawa zapisana w Firestore razem z tym, z jakich danych powstała. */
export interface ZapisanaOdprawa {
  slad: string
  /** Data z obrazu („DD.MM.RRRR”) - nowy dzień to nowa odprawa. */
  dzien: string
  utworzono: number
  model: string
  odprawa: Odprawa
}

/** Odnośniki dobiera kod - model nie wymyśla adresów. */
export const ODNOSNIK_OBSZARU: Record<Obszar, string> = {
  kpi: '/analytics/kpi',
  rekrutacja: '/analytics/rekrutacje',
  retencja: '/analytics/retencja',
  projekty: '/analytics/projekty',
  planer: '/planer',
  zespol: '/analytics/czlonkowie',
}

export const INSTRUKCJA_ODPRAWY = `Jesteś D.E.C.K. (Diagnostic Evaluation of Change & KPIs) - asystentem analitycznym Wiceprzewodniczącego ds. Strategii i Działań Operacyjnych Samorządu Studentów Uniwersytetu Ekonomicznego we Wrocławiu.
Dostajesz obraz projektu w JSON: KPI, rekrutacje, retencję kohort, alerty, kondycję projektów, Planer najbliższych 21 dni (wydarzenia, kolizje, Sesja Operacyjna, propozycje) i członków.
Przygotuj odprawę:
- podsumowanie: 2-4 zdania, co z danych wynika teraz;
- zagrozenia: do 5 obszarów wzbudzających niepokój, od najpoważniejszego, każde z uzasadnieniem opartym na konkretnych liczbach z danych;
- dzis: do 4 krótkich punktów na dziś (wydarzenia, decyzje, kolizje).
Zasady: tylko na podstawie przekazanych danych, nic nie zmyślaj; gdy danych brakuje, powiedz to; pisz po polsku, zwięźle, rzeczowo; używaj zwykłego łącznika „-”, nigdy długich myślników.`

const S = (extra: object = {}) => ({ type: 'STRING', ...extra })

export const SCHEMAT_ODPRAWY = {
  type: 'OBJECT',
  properties: {
    podsumowanie: S(),
    zagrozenia: {
      type: 'ARRAY',
      maxItems: 5,
      items: {
        type: 'OBJECT',
        properties: {
          obszar: S({ format: 'enum', enum: [...OBSZARY] }),
          waga: S({ format: 'enum', enum: [...WAGI] }),
          tytul: S(),
          uzasadnienie: S(),
        },
        required: ['obszar', 'waga', 'tytul', 'uzasadnienie'],
      },
    },
    dzis: { type: 'ARRAY', maxItems: 4, items: S() },
  },
  required: ['podsumowanie', 'zagrozenia', 'dzis'],
}

export function wiadomoscOdprawy(k: KontekstProjektu): string {
  return `Obraz projektu (JSON):\n${JSON.stringify(k)}\n\nPrzygotuj odprawę.`
}

const tekst = (x: unknown) => (typeof x === 'string' && x.trim() ? x.trim() : null)
const KOLEJNOSC: Record<Waga, number> = { wysoka: 0, srednia: 1, niska: 2 }

/** Sprawdza odpowiedź modelu - schemat Gemini to prośba, nie gwarancja. */
export function sprawdzOdprawe(x: unknown): Odprawa | null {
  if (typeof x !== 'object' || x === null) return null
  const d = x as Record<string, unknown>
  const podsumowanie = tekst(d.podsumowanie)
  if (!podsumowanie || !Array.isArray(d.zagrozenia) || !Array.isArray(d.dzis)) return null
  if (d.zagrozenia.length > 5 || d.dzis.length > 4) return null

  const zagrozenia: Zagrozenie[] = []
  for (const z of d.zagrozenia as Record<string, unknown>[]) {
    const obszar = z?.obszar
    const waga = z?.waga
    const tytul = tekst(z?.tytul)
    const uzasadnienie = tekst(z?.uzasadnienie)
    if (!(OBSZARY as readonly unknown[]).includes(obszar) || !(WAGI as readonly unknown[]).includes(waga)) return null
    if (!tytul || !uzasadnienie) return null
    zagrozenia.push({ obszar: obszar as Obszar, waga: waga as Waga, tytul, uzasadnienie })
  }
  const dzis = (d.dzis as unknown[]).map(tekst).filter((t): t is string => t !== null)

  return { podsumowanie, zagrozenia: zagrozenia.sort((a, b) => KOLEJNOSC[a.waga] - KOLEJNOSC[b.waga]), dzis }
}
```

- [ ] **Krok 4: Uruchom - ma przejść; commit** `feat(asystent): odprawa - instrukcja, schemat i walidacja`

---

## Zadanie 5: Panel faktów (bez AI)

**Pliki:** nowy `lib/asystent/fakty.ts`, test `lib/asystent/fakty.test.ts`

- [ ] **Krok 1: Test**

```ts
import { describe, it, expect } from 'vitest'
import { faktyKokpitu, najblizszeWydarzenia } from '@/lib/asystent/fakty'
import { POLA_DOMYSLNE, type Wydarzenie } from '@/lib/planer/typy'

const DZIS = { rok: 2026, miesiac: 10, dzien: 2 } // piątek

function w(nadpisz: Partial<Wydarzenie>): Wydarzenie {
  return {
    id: 'x', tytul: 'Zebranie Zarządu', kategoria: 'ZEBRANIA', rok: 2026, miesiac: 10, dzien: 2,
    godzina: '18:00', sala: '110L', osoby: ['wszyscy'], ...POLA_DOMYSLNE, budynek: 'B/L', ...nadpisz,
  }
}

const baza = { rola: 'owner' as const, wydarzenia: [], propozycje: 0, alerty: [], dzis: DZIS }

describe('faktyKokpitu', () => {
  it('nic się nie dzieje - pusta lista', () => {
    expect(faktyKokpitu(baza)).toEqual([])
  })

  it('najbliższe wydarzenie dziś albo jutro, z czasem i miejscem', () => {
    const f = faktyKokpitu({ ...baza, wydarzenia: [w({ id: 'j', dzien: 3, tytul: 'SKS', kategoria: 'SSUEW', godzina: '19:00' }), w({})] })
    expect(f[0]).toMatchObject({ etykieta: 'Dziś 18:00', tresc: 'Zebranie Zarządu', szczegol: 'B/L 110L · wszyscy' })
  })

  it('jutro, gdy dziś nic nie ma', () => {
    const f = faktyKokpitu({ ...baza, wydarzenia: [w({ dzien: 3 })] })
    expect(f[0].etykieta).toBe('Jutro 18:00')
  })

  it('propozycje widzi tylko owner, z polską odmianą', () => {
    expect(faktyKokpitu({ ...baza, propozycje: 3 })[0]).toMatchObject({ etykieta: 'Do decyzji', tresc: '3 propozycje' })
    expect(faktyKokpitu({ ...baza, propozycje: 5 })[0].tresc).toBe('5 propozycji')
    expect(faktyKokpitu({ ...baza, rola: 'board', propozycje: 3 })).toEqual([])
  })

  it('alerty z pierwszym powodem', () => {
    const f = faktyKokpitu({ ...baza, alerty: [{ tytul: 'Retencja W\'25 poniżej normy' }, { tytul: 'b' }] })
    expect(f[0]).toMatchObject({ etykieta: 'Analytics', tresc: '2 alerty', szczegol: 'Retencja W\'25 poniżej normy', link: '/analytics/alerty' })
  })
})

describe('najblizszeWydarzenia', () => {
  it('od dziś, po kolei, z czytelnym „kiedy”', () => {
    const lista = najblizszeWydarzenia([
      w({ id: 'za-tydzien', tytul: 'Gala', dzien: 12, godzina: null }),
      w({ id: 'jutro', tytul: 'SKS', dzien: 3, godzina: '19:00' }),
      w({ id: 'wtorek', tytul: 'Komisja', dzien: 6, godzina: '17:00' }),
      w({ id: 'dzis', tytul: 'Zebranie', dzien: 2 }),
      w({ id: 'wczoraj', tytul: 'Minione', dzien: 1 }),
    ], DZIS, 4)
    expect(lista).toEqual([
      { id: 'dzis', kiedy: 'dziś 18:00', tytul: 'Zebranie' },
      { id: 'jutro', kiedy: 'jutro 19:00', tytul: 'SKS' },
      { id: 'wtorek', kiedy: 'wt 17:00', tytul: 'Komisja' },
      { id: 'za-tydzien', kiedy: '12.10', tytul: 'Gala' },
    ])
  })

  it('wielodniowe zaczęte wcześniej „trwa”, cały dzień bez godziny', () => {
    const lista = najblizszeWydarzenia([w({ id: 'wyjazd', tytul: 'Wyjazd', miesiac: 9, dzien: 30, dni: 4, calyDzien: true })], DZIS, 2)
    expect(lista).toEqual([{ id: 'wyjazd', kiedy: 'trwa', tytul: 'Wyjazd' }])
  })

  it('obcina do żądanej liczby', () => {
    expect(najblizszeWydarzenia([w({ id: 'a' }), w({ id: 'b', dzien: 3 }), w({ id: 'c', dzien: 4 })], DZIS, 2)).toHaveLength(2)
  })
})
```

- [ ] **Krok 2: Uruchom - ma paść**

- [ ] **Krok 3: `lib/asystent/fakty.ts`**

```ts
import { dzienTygodnia } from '@/lib/planer/daty'
import { opisCzasu, opisMiejsca, opisOsob, porownajWydarzenia } from '@/lib/planer/opis'
import { dniMiedzy, koniec, poczatek, porownajDaty, przesunDate, type Data } from '@/lib/planer/trwanie'
import type { Wydarzenie } from '@/lib/planer/typy'
import type { Rola } from '@/lib/auth/role'

export interface Fakt {
  etykieta: string
  tresc: string
  szczegol?: string
  link: string
}

/** 1 propozycja, 2-4 propozycje, 5+ propozycji (z wyjątkiem 12-14). */
function odmiana(n: number, [jeden, kilka, wiele]: [string, string, string]): string {
  if (n === 1) return `1 ${jeden}`
  const r = n % 10
  const s = n % 100
  return `${n} ${r >= 2 && r <= 4 && (s < 12 || s > 14) ? kilka : wiele}`
}

/**
 * Fakty bez AI: to, co zarząd widzi zawsze, a właściciel wtedy, gdy asystent
 * nie ma odprawy. Pusta lista znaczy „nic pilnego”. Trwającej sesji tu nie ma -
 * pilnuje jej osobny baner kokpitu, widoczny dla wszystkich.
 */
export function faktyKokpitu(w: {
  rola: Rola
  wydarzenia: Wydarzenie[]
  propozycje: number
  alerty: { tytul: string }[]
  dzis: Data
}): Fakt[] {
  const fakty: Fakt[] = []

  const jutro = przesunDate(w.dzis, 1)
  const najblizsze = w.wydarzenia
    .filter((x) => {
      const p = poczatek(x)
      return porownajDaty(p, w.dzis) === 0 || porownajDaty(p, jutro) === 0
    })
    .sort((a, b) => porownajDaty(poczatek(a), poczatek(b)) || porownajWydarzenia(a, b))[0]
  if (najblizsze) {
    const kiedy = porownajDaty(poczatek(najblizsze), w.dzis) === 0 ? 'Dziś' : 'Jutro'
    const czas = opisCzasu(najblizsze)
    fakty.push({
      etykieta: czas ? `${kiedy} ${czas}` : kiedy,
      tresc: najblizsze.tytul,
      szczegol: [opisMiejsca(najblizsze), opisOsob(najblizsze.osoby)].filter(Boolean).join(' · ') || undefined,
      link: '/planer',
    })
  }

  if (w.rola === 'owner' && w.propozycje > 0) {
    fakty.push({
      etykieta: 'Do decyzji',
      tresc: odmiana(w.propozycje, ['propozycja', 'propozycje', 'propozycji']),
      szczegol: 'od zarządu',
      link: '/planer',
    })
  }

  if (w.alerty.length) {
    fakty.push({
      etykieta: 'Analytics',
      tresc: odmiana(w.alerty.length, ['alert', 'alerty', 'alertów']),
      szczegol: w.alerty[0].tytul,
      link: '/analytics/alerty',
    })
  }

  return fakty
}

export interface NajblizszeWydarzenie {
  id: string
  /** „dziś 18:00”, „jutro”, „wt 17:00”, „12.10” albo „trwa”. */
  kiedy: string
  tytul: string
}

const SKROT_DNIA: Record<string, string> = {
  poniedziałek: 'pon', wtorek: 'wt', środa: 'śr', czwartek: 'czw', piątek: 'pt', sobota: 'sob', niedziela: 'nd',
}

/** Kilka najbliższych wydarzeń na kafelek Sesji Operacyjnej. Minione pomija. */
export function najblizszeWydarzenia(wydarzenia: Wydarzenie[], dzis: Data, ile: number): NajblizszeWydarzenie[] {
  return wydarzenia
    .filter((x) => porownajDaty(koniec(x), dzis) >= 0)
    .sort((a, b) => porownajDaty(poczatek(a), poczatek(b)) || porownajWydarzenia(a, b))
    .slice(0, ile)
    .map((x) => {
      const p = poczatek(x)
      const za = dniMiedzy(dzis, p) - 1
      let kiedy: string
      if (za < 0) kiedy = 'trwa'
      else if (za === 0) kiedy = 'dziś'
      else if (za === 1) kiedy = 'jutro'
      else if (za < 7) kiedy = SKROT_DNIA[dzienTygodnia(p.rok, p.miesiac, p.dzien)]
      else kiedy = `${String(p.dzien).padStart(2, '0')}.${String(p.miesiac).padStart(2, '0')}`
      if (za >= 0 && x.godzina && !x.calyDzien) kiedy += ` ${x.godzina}`
      return { id: x.id, kiedy, tytul: x.tytul }
    })
}
```

- [ ] **Krok 4: Uruchom - ma przejść; commit** `feat(asystent): panel faktow bez AI i najblizsze wydarzenia`

---

## Zadanie 6: Odświeżanie i dane serwera

**Pliki:** nowe `lib/asystent/odswiezanie.ts` (+ test), `lib/asystent/dane.ts`; modyfikacja `lib/firebase/admin.ts`

- [ ] **Krok 1: Test `lib/asystent/odswiezanie.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { czyOdswiezyc, sladKontekstu, GODZINA_MS } from '@/lib/asystent/odswiezanie'

const ZAPIS = { slad: 'abc', dzien: '02.10.2026', utworzono: 0, model: 'm', odprawa: { podsumowanie: 'x', zagrozenia: [], dzis: [] } }

describe('czyOdswiezyc', () => {
  it('bez zapisanej odprawy - tak', () => {
    expect(czyOdswiezyc(null, 'abc', '02.10.2026', 0)).toBe(true)
  })
  it('w ciągu godziny - nigdy, nawet po zmianie danych', () => {
    expect(czyOdswiezyc(ZAPIS, 'inny', '02.10.2026', GODZINA_MS - 1)).toBe(false)
  })
  it('po godzinie i ze zmienionymi danymi - tak', () => {
    expect(czyOdswiezyc(ZAPIS, 'inny', '02.10.2026', GODZINA_MS)).toBe(true)
  })
  it('po godzinie, te same dane - nie', () => {
    expect(czyOdswiezyc(ZAPIS, 'abc', '02.10.2026', GODZINA_MS * 5)).toBe(false)
  })
  it('nowy dzień - tak, nawet przy tych samych danych', () => {
    expect(czyOdswiezyc(ZAPIS, 'abc', '03.10.2026', GODZINA_MS)).toBe(true)
  })
})

describe('sladKontekstu', () => {
  it('pomija datę - upływ dnia sam nie zmienia śladu', () => {
    const a = { meta: { data: '02.10.2026', dzienTygodnia: 'piątek' }, kpi: [1] } as never
    const b = { meta: { data: '03.10.2026', dzienTygodnia: 'sobota' }, kpi: [1] } as never
    expect(sladKontekstu(a)).toBe(sladKontekstu(b))
    expect(sladKontekstu(a)).not.toBe(sladKontekstu({ ...(a as object), kpi: [2] } as never))
  })
})
```

- [ ] **Krok 2: Uruchom - ma paść**

- [ ] **Krok 3: `lib/asystent/odswiezanie.ts`**

```ts
import { createHash } from 'node:crypto'
import type { KontekstProjektu } from './kontekst'
import type { ZapisanaOdprawa } from './odprawa'

export const GODZINA_MS = 60 * 60 * 1000

/** Ślad danych bez daty - sam upływ czasu w ciągu dnia nie unieważnia odprawy. */
export function sladKontekstu(k: KontekstProjektu): string {
  const { meta: _meta, ...reszta } = k
  return createHash('sha256').update(JSON.stringify(reszta)).digest('hex')
}

/**
 * Nowa odprawa najwyżej raz na godzinę, i tylko gdy zmieniły się dane albo
 * dzień. Darmowy poziom Gemini ma limity - nie pytamy o to samo dwa razy.
 */
export function czyOdswiezyc(zapisana: ZapisanaOdprawa | null, slad: string, dzien: string, teraz: number): boolean {
  if (!zapisana) return true
  if (teraz - zapisana.utworzono < GODZINA_MS) return false
  return zapisana.slad !== slad || zapisana.dzien !== dzien
}
```

- [ ] **Krok 4: `lib/firebase/admin.ts` - dopisz na końcu**

```ts
/**
 * Odprawa asystenta. Kolekcja nie ma reguły klienta, więc jest zamknięta regułą
 * końcową - czyta i pisze wyłącznie serwer. Zarząd jej nie zobaczy.
 */
export function odprawaRef() {
  return bazaAdmin().collection('asystent').doc('odprawa')
}
```

- [ ] **Krok 5: `lib/asystent/dane.ts`**

```ts
import { gasList } from '@/lib/gas/client'
import { obrazPlanera } from '@/lib/planer/obraz'
import { odprawaRef, propozycjeRef } from '@/lib/firebase/admin'
import { SESJA_WYLACZONA, type StanSesjiWspolnej } from '@/lib/planer/stan'
import type { Wydarzenie } from '@/lib/planer/typy'
import type { Czlonek, Kohorta, KpiMetric, Projekt, Rekrutacja } from '@/types'
import type { Rola } from '@/lib/auth/role'
import { zbudujKontekst, type DaneProjektu, type KontekstProjektu } from './kontekst'
import { INSTRUKCJA_ODPRAWY, SCHEMAT_ODPRAWY, sprawdzOdprawe, wiadomoscOdprawy, type ZapisanaOdprawa } from './odprawa'
import { BladAsystenta, modelGemini, zapytajGemini } from './gemini'
import { czyOdswiezyc, sladKontekstu } from './odswiezanie'
import { dzisWarszawa } from '@/lib/czas'

export interface DaneArkusza {
  rekrutacje: Rekrutacja[]
  kohorty: Kohorta[]
  punkty: KpiMetric[]
  projekty: Projekt[]
  czlonkowie: Czlonek[]
  /** Czas odpowiedzi arkusza; `null`, gdy wszystkie zakładki zawiodły. */
  czasMs: number | null
}

export interface StanPlanera {
  wydarzenia: Wydarzenie[]
  sesja: StanSesjiWspolnej
  sklad: string[]
  propozycje: number
  ok: boolean
}

/** Arkusz - wolny (1-3 s przy pustym cache), nigdy nie rzuca. */
export async function pobierzArkusz(): Promise<DaneArkusza> {
  const start = Date.now()
  let bledy = 0
  const bezpiecznie = <T,>(p: Promise<T[]>) => p.catch(() => { bledy++; return [] as T[] })
  const [rekrutacje, kohorty, punkty, projekty, czlonkowie] = await Promise.all([
    bezpiecznie(gasList('rekrutacje')),
    bezpiecznie(gasList('kohorty')),
    bezpiecznie(gasList('kpi_punkty')),
    bezpiecznie(gasList('projekty')),
    bezpiecznie(gasList('czlonkowie')),
  ])
  return { rekrutacje, kohorty, punkty, projekty, czlonkowie, czasMs: bledy === 5 ? null : Date.now() - start }
}

/** Planer z Firestore - szybki, nigdy nie rzuca. Propozycje liczymy tylko właścicielowi. */
export async function pobierzPlaner(semestrId: string, rola: Rola): Promise<StanPlanera> {
  const [obraz, propozycje] = await Promise.all([
    obrazPlanera(semestrId).then((o) => ({ ...o, ok: true })).catch(() => ({ wydarzenia: [], sesja: SESJA_WYLACZONA, sklad: [], ok: false })),
    rola === 'owner'
      ? propozycjeRef(semestrId).count().get().then((s) => s.data().count).catch(() => 0)
      : Promise.resolve(0),
  ])
  return { ...obraz, propozycje }
}

export function daneProjektu(a: DaneArkusza, p: StanPlanera, semestr: { id: string; nazwa: string }): DaneProjektu {
  return {
    rekrutacje: a.rekrutacje, kohorty: a.kohorty, punkty: a.punkty, projekty: a.projekty, czlonkowie: a.czlonkowie,
    semestr, wydarzenia: p.wydarzenia, sesja: p.sesja, sklad: p.sklad, propozycje: p.propozycje,
  }
}

export async function czytajOdprawe(): Promise<ZapisanaOdprawa | null> {
  const d = (await odprawaRef().get()).data()
  if (!d) return null
  const odprawa = sprawdzOdprawe(d.odprawa)
  if (!odprawa || typeof d.slad !== 'string' || typeof d.utworzono !== 'number') return null
  return { slad: d.slad, dzien: String(d.dzien ?? ''), utworzono: d.utworzono, model: String(d.model ?? ''), odprawa }
}

/** Pyta Gemini, sprawdza odpowiedź i zapisuje. Rzuca `BladAsystenta`. */
export async function generujOdprawe(k: KontekstProjektu, teraz = Date.now()): Promise<ZapisanaOdprawa> {
  const tekst = await zapytajGemini({
    instrukcja: INSTRUKCJA_ODPRAWY,
    wiadomosci: [{ rola: 'user', tekst: wiadomoscOdprawy(k) }],
    schemat: SCHEMAT_ODPRAWY,
  })
  let surowe: unknown
  try {
    surowe = JSON.parse(tekst)
  } catch {
    throw new BladAsystenta('format', 'Odprawa nie jest JSON-em')
  }
  const odprawa = sprawdzOdprawe(surowe)
  if (!odprawa) throw new BladAsystenta('format', 'Odprawa niezgodna ze schematem')
  const zapis: ZapisanaOdprawa = { slad: sladKontekstu(k), dzien: k.meta.data, utworzono: teraz, model: modelGemini(), odprawa }
  await odprawaRef().set(zapis)
  return zapis
}

/**
 * Wołane z `after()` kokpitu - już po wysłaniu strony, więc Gemini nigdy nie
 * opóźnia wejścia. Nowa odprawa będzie widoczna przy następnym wejściu.
 * Nie rzuca: błąd w tle ma trafić do logów, nie wywrócić funkcji.
 */
export async function odswiezOdpraweWTle(w: {
  arkusz: Promise<DaneArkusza>
  planer: Promise<StanPlanera>
  zapisana: Promise<ZapisanaOdprawa | null>
  semestr: { id: string; nazwa: string }
  teraz: Date
}): Promise<void> {
  if (!process.env.GEMINI_API_KEY) return
  try {
    const [a, p, zapisana] = await Promise.all([w.arkusz, w.planer, w.zapisana])
    // Odprawa z pustego arkusza albo bez Planera byłaby o niczym - poczekamy.
    if (a.czasMs === null || !p.ok) return
    const k = zbudujKontekst(daneProjektu(a, p, w.semestr), dzisWarszawa(w.teraz))
    if (!czyOdswiezyc(zapisana, sladKontekstu(k), k.meta.data, w.teraz.getTime())) return
    await generujOdprawe(k, w.teraz.getTime())
  } catch (e) {
    console.error('[asystent] odprawa w tle:', e)
  }
}

export { zbudujKontekst }
```

Klej bez własnego testu: decyzję podejmuje `czyOdswiezyc` (testowana wyżej), reszta to wywołania Firestore i Gemini, których lokalnie i tak nie da się sprawdzić bez konta serwisowego - sprawdzamy na produkcji w zadaniu 16.

- [ ] **Krok 6: Testy i typy; commit**

Run: `npx vitest run lib/asystent > "$TMP/vt.log" 2>&1; echo $?` i `npx tsc --noEmit`
Commit: `feat(asystent): odswiezanie odprawy i dane serwera`

---

## Zadanie 7: API odświeżenia odprawy

**Pliki:** nowy `app/api/asystent/odprawa/route.ts`, test `app/api/asystent/odprawa/route.test.ts`

- [ ] **Krok 1: Test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const ktoPyta = vi.fn()
const generujOdprawe = vi.fn()
vi.mock('@/lib/auth/guard', () => ({ ktoPyta: (...a: unknown[]) => ktoPyta(...a) }))
vi.mock('@/lib/asystent/dane', () => ({
  pobierzArkusz: async () => ({ rekrutacje: [], kohorty: [], punkty: [], projekty: [], czlonkowie: [], czasMs: 1 }),
  pobierzPlaner: async () => ({ wydarzenia: [], sesja: { wlaczony: false, od: null, przez: null }, sklad: [], propozycje: 0, ok: true }),
  daneProjektu: (a: object, p: object) => ({ ...a, ...p, semestr: { id: '2026Z', nazwa: 'Z' } }),
  zbudujKontekst: () => ({ meta: { data: '02.10.2026', dzienTygodnia: 'piątek' } }),
  generujOdprawe: (...a: unknown[]) => generujOdprawe(...a),
}))

const zada = {} as never

describe('POST /api/asystent/odprawa', () => {
  beforeEach(() => {
    vi.resetModules()
    ktoPyta.mockReset()
    generujOdprawe.mockReset()
  })

  it('bez sesji 401, zarząd 403', async () => {
    const { POST } = await import('@/app/api/asystent/odprawa/route')
    ktoPyta.mockResolvedValue(null)
    expect((await POST(zada)).status).toBe(401)
    ktoPyta.mockResolvedValue({ uid: 'kod:1', email: 'Jula', rola: 'board' })
    expect((await POST(zada)).status).toBe(403)
    expect(generujOdprawe).not.toHaveBeenCalled()
  })

  it('właściciel dostaje nową odprawę', async () => {
    ktoPyta.mockResolvedValue({ uid: 'u', email: 'ja', rola: 'owner' })
    generujOdprawe.mockResolvedValue({ slad: 's', odprawa: { podsumowanie: 'x', zagrozenia: [], dzis: [] } })
    const { POST } = await import('@/app/api/asystent/odprawa/route')
    const res = await POST(zada)
    expect(res.status).toBe(200)
    expect((await res.json()).slad).toBe('s')
  })

  it('limit Gemini to 429 z ludzkim komunikatem', async () => {
    ktoPyta.mockResolvedValue({ uid: 'u', email: 'ja', rola: 'owner' })
    const { BladAsystenta } = await import('@/lib/asystent/gemini')
    generujOdprawe.mockRejectedValue(new BladAsystenta('limit', 'x'))
    const { POST } = await import('@/app/api/asystent/odprawa/route')
    const res = await POST(zada)
    expect(res.status).toBe(429)
    expect((await res.json()).error).toMatch(/limit/i)
  })
})
```

- [ ] **Krok 2: Uruchom - ma paść**

- [ ] **Krok 3: `app/api/asystent/odprawa/route.ts`**

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { ktoPyta } from '@/lib/auth/guard'
import { biezacySemestr } from '@/lib/planer/semestry'
import { dzisWarszawa } from '@/lib/czas'
import { komunikatBledu } from '@/lib/asystent/gemini'
import { daneProjektu, generujOdprawe, pobierzArkusz, pobierzPlaner, zbudujKontekst } from '@/lib/asystent/dane'

export const runtime = 'nodejs'
export const maxDuration = 60

/** „Odśwież” w panelu odprawy - nowa odprawa od razu. Tylko właściciel. */
export async function POST(req: NextRequest) {
  const kto = await ktoPyta(req)
  if (!kto) return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })
  if (kto.rola !== 'owner') return NextResponse.json({ error: 'Asystent jest tylko dla właściciela' }, { status: 403 })

  const teraz = new Date()
  const semestr = biezacySemestr(teraz)
  try {
    const [a, p] = await Promise.all([pobierzArkusz(), pobierzPlaner(semestr.id, kto.rola)])
    const k = zbudujKontekst(daneProjektu(a, p, { id: semestr.id, nazwa: semestr.nazwa }), dzisWarszawa(teraz))
    return NextResponse.json(await generujOdprawe(k, teraz.getTime()))
  } catch (e) {
    const { status, error } = komunikatBledu(e)
    return NextResponse.json({ error }, { status })
  }
}
```

- [ ] **Krok 4: Uruchom - ma przejść; typy; commit** `feat(asystent): API odswiezenia odprawy dla wlasciciela`

---

# FAZA 2 - kokpit

## Zadanie 8: Panel faktów i panel odprawy

**Pliki:** nowe `components/deck/PanelFaktow.tsx`, `components/deck/PanelOdprawy.tsx`; testy `components/deck/PanelFaktow.test.tsx`, `components/deck/PanelOdprawy.test.tsx`

- [ ] **Krok 1: Testy**

`components/deck/PanelFaktow.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { ReactNode } from 'react'
import { PanelFaktow } from '@/components/deck/PanelFaktow'

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: ReactNode; href: string }) => <a href={href} {...rest}>{children}</a>,
}))

describe('PanelFaktow', () => {
  it('fakty są odnośnikami do modułów', async () => {
    await act(async () => {
      render(<PanelFaktow fakty={Promise.resolve([{ etykieta: 'Do decyzji', tresc: '3 propozycje', szczegol: 'od zarządu', link: '/planer' }])} />)
    })
    expect(screen.getByRole('link', { name: /3 propozycje/ })).toHaveAttribute('href', '/planer')
  })

  it('pusta lista - „nic pilnego”', async () => {
    await act(async () => {
      render(<PanelFaktow fakty={Promise.resolve([])} />)
    })
    expect(screen.getByText(/Nic pilnego/)).toBeInTheDocument()
  })
})
```

`components/deck/PanelOdprawy.test.tsx`:

```tsx
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'
import type { ReactNode } from 'react'
import { PanelOdprawy } from '@/components/deck/PanelOdprawy'
import type { ZapisanaOdprawa } from '@/lib/asystent/odprawa'
import type { Fakt } from '@/lib/asystent/fakty'

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: ReactNode; href: string }) => <a href={href} {...rest}>{children}</a>,
}))

const ZAPIS: ZapisanaOdprawa = {
  slad: 's',
  dzien: '02.10.2026',
  utworzono: Date.UTC(2026, 9, 2, 12, 32), // 14:32 w Warszawie
  model: 'gemini-3.8-flash',
  odprawa: {
    podsumowanie: 'Rekrutacja trzyma poziom, retencja słabnie.',
    zagrozenia: [{ obszar: 'retencja', waga: 'wysoka', tytul: "W'25 odpływa", uzasadnienie: 'średnio 1,8 sem. wobec 3,8' }],
    dzis: ['Zebranie Zarządu 18:00'],
  },
}

async function panel(odprawa: ZapisanaOdprawa | null, fakty: Fakt[] = []) {
  await act(async () => {
    render(<PanelOdprawy odprawa={Promise.resolve(odprawa)} fakty={Promise.resolve(fakty)} />)
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('PanelOdprawy', () => {
  it('podsumowanie, zagrożenie z wagą i odnośnikiem, punkty na dziś, godzina', async () => {
    await panel(ZAPIS)
    expect(screen.getByText(/retencja słabnie/)).toBeInTheDocument()
    const z = screen.getByRole('link', { name: /W'25 odpływa/ })
    expect(z).toHaveAttribute('href', '/analytics/retencja')
    expect(z).toHaveAttribute('data-waga', 'wysoka')
    expect(screen.getByText('Zebranie Zarządu 18:00')).toBeInTheDocument()
    expect(screen.getByText(/02\.10\.2026 · 14:32/)).toBeInTheDocument()
  })

  it('„Odśwież” podmienia odprawę na nową', async () => {
    const nowa = { ...ZAPIS, odprawa: { ...ZAPIS.odprawa, podsumowanie: 'Nowe podsumowanie.' } }
    const f = vi.fn(async () => new Response(JSON.stringify(nowa), { status: 200 }))
    vi.stubGlobal('fetch', f)
    await panel(ZAPIS)
    fireEvent.click(screen.getByRole('button', { name: /Odśwież/ }))
    expect(await screen.findByText('Nowe podsumowanie.')).toBeInTheDocument()
    expect(f).toHaveBeenCalledWith('/api/asystent/odprawa', { method: 'POST' })
  })

  it('błąd odświeżenia zostawia starą odprawę i mówi po ludzku', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ error: 'Darmowy limit Gemini na tę chwilę wyczerpany - spróbuj za minutę.' }), { status: 429 },
    )))
    await panel(ZAPIS)
    fireEvent.click(screen.getByRole('button', { name: /Odśwież/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/limit Gemini/)
    expect(screen.getByText(/retencja słabnie/)).toBeInTheDocument()
  })

  it('bez zapisanej odprawy - zachęta i fakty', async () => {
    await panel(null, [{ etykieta: 'Analytics', tresc: '2 alerty', link: '/analytics/alerty' }])
    expect(screen.getByText(/Pierwsza odprawa/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /2 alerty/ })).toHaveAttribute('href', '/analytics/alerty')
  })
})
```

- [ ] **Krok 2: Uruchom - ma paść** (`npx vitest run components/deck/PanelFaktow.test.tsx components/deck/PanelOdprawy.test.tsx`)

- [ ] **Krok 3: `components/deck/PanelFaktow.tsx`**

```tsx
'use client'
import { Suspense, use } from 'react'
import Link from 'next/link'
import type { Fakt } from '@/lib/asystent/fakty'

/** Fakty bez AI - zarząd widzi je zamiast odprawy. Nagłówek jest od razu, lista dopływa. */
export function PanelFaktow({ fakty }: { fakty: Promise<Fakt[]> }) {
  return (
    <section aria-labelledby="fakty-tytul" className="deck-card rounded-lg p-[18px]">
      <div className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-deck-muted/70">stan na teraz</div>
      <h2 id="fakty-tytul" className="mt-1 text-[17px] font-semibold tracking-[-0.015em]">Na teraz</h2>
      <Suspense fallback={<SzkieletFaktow />}>
        <ListaFaktow fakty={fakty} />
      </Suspense>
    </section>
  )
}

export function ListaFaktow({ fakty }: { fakty: Promise<Fakt[]> }) {
  const lista = use(fakty)
  if (!lista.length) {
    return <p className="mt-3 text-[12.5px] text-deck-muted">Nic pilnego - kalendarz i wskaźniki spokojne.</p>
  }
  return (
    <ul className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
      {lista.map((f) => (
        <li key={`${f.etykieta}-${f.tresc}`}>
          <Link
            href={f.link}
            className="block h-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] text-deck-muted transition hover:border-deck-accent/40"
          >
            {f.etykieta}
            <b className="mt-0.5 block text-[14px] font-semibold text-deck-text">{f.tresc}</b>
            {f.szczegol && <small className="mt-0.5 block text-[10.5px]">{f.szczegol}</small>}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function SzkieletFaktow() {
  return <div className="mt-3 h-16 animate-pulse rounded-lg bg-white/[0.04]" aria-hidden="true" />
}
```

- [ ] **Krok 4: `components/deck/PanelOdprawy.tsx`**

```tsx
'use client'
import { Suspense, use, useState } from 'react'
import Link from 'next/link'
import { RefreshCw } from 'lucide-react'
import { ODNOSNIK_OBSZARU, type Obszar, type Odprawa, type Waga, type ZapisanaOdprawa } from '@/lib/asystent/odprawa'
import { godzinaWarszawa } from '@/lib/czas'
import type { Fakt } from '@/lib/asystent/fakty'
import { ListaFaktow, SzkieletFaktow } from './PanelFaktow'

const ETYKIETA_OBSZARU: Record<Obszar, string> = {
  kpi: 'KPI', rekrutacja: 'Rekrutacja', retencja: 'Retencja', projekty: 'Projekty', planer: 'Sesja Operacyjna', zespol: 'Zespół',
}

const STYL_WAGI: Record<Waga, string> = {
  wysoka: 'border-l-deck-danger text-deck-danger',
  srednia: 'border-l-deck-warn text-deck-warn',
  niska: 'border-l-white/25 text-deck-muted',
}

const NAZWA_WAGI: Record<Waga, string> = { wysoka: 'wysokie', srednia: 'średnie', niska: 'niskie' }

function Naglowek({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-deck-accent">asystent · gemini</div>
        <h2 id="odprawa-tytul" className="mt-1 text-[17px] font-semibold tracking-[-0.015em]">Odprawa D.E.C.K.</h2>
      </div>
      {children}
    </div>
  )
}

/** To samo miejsce, zanim Firestore odda zapisaną odprawę. */
export function SzkieletOdprawy() {
  return (
    <section aria-labelledby="odprawa-tytul" className="deck-card rounded-lg p-[18px]">
      <Naglowek />
      <div className="mt-4 space-y-2" aria-hidden="true">
        <div className="h-3 w-3/4 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-white/[0.06]" />
      </div>
    </section>
  )
}

/**
 * Odprawa czytana z Firestore - nigdy nie czeka na Gemini. „Odśwież” pyta
 * model od razu; błąd zostawia poprzednią odprawę na ekranie.
 */
export function PanelOdprawy({ odprawa, fakty }: { odprawa: Promise<ZapisanaOdprawa | null>; fakty: Promise<Fakt[]> }) {
  const zapisana = use(odprawa)
  const [biezaca, setBiezaca] = useState(zapisana)
  const [odswieza, setOdswieza] = useState(false)
  const [blad, setBlad] = useState<string | null>(null)

  async function odswiez() {
    setOdswieza(true)
    setBlad(null)
    try {
      const res = await fetch('/api/asystent/odprawa', { method: 'POST' })
      const dane = await res.json().catch(() => ({}))
      if (res.ok) setBiezaca(dane as ZapisanaOdprawa)
      else setBlad(dane.error ?? 'Nie udało się odświeżyć odprawy.')
    } catch {
      setBlad('Brak połączenia - spróbuj ponownie.')
    } finally {
      setOdswieza(false)
    }
  }

  return (
    <section aria-labelledby="odprawa-tytul" className="deck-card rounded-lg p-[18px]">
      <Naglowek>
        <div className="flex items-center gap-3 font-mono text-[10.5px] text-deck-muted">
          {biezaca && <span>{biezaca.dzien} · {godzinaWarszawa(new Date(biezaca.utworzono))}</span>}
          <button
            type="button"
            onClick={odswiez}
            disabled={odswieza}
            className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1 transition hover:border-deck-accent/40 hover:text-deck-accent disabled:opacity-60"
          >
            <RefreshCw size={12} className={odswieza ? 'animate-spin' : ''} aria-hidden="true" />
            {odswieza ? 'Analizuję...' : 'Odśwież'}
          </button>
        </div>
      </Naglowek>

      {blad && (
        <p role="alert" className="mt-3 rounded-md border border-deck-danger-border bg-deck-danger-bg/70 px-3 py-2 text-[11.5px] text-deck-danger">
          {blad}
        </p>
      )}

      {biezaca ? (
        <TrescOdprawy odprawa={biezaca.odprawa} />
      ) : (
        <>
          <p className="mt-3 text-[12.5px] leading-relaxed text-deck-muted">
            Pierwsza odprawa jeszcze nie powstała - kliknij „Odśwież” albo wróć za chwilę. Do tego czasu fakty:
          </p>
          <Suspense fallback={<SzkieletFaktow />}>
            <ListaFaktow fakty={fakty} />
          </Suspense>
        </>
      )}
    </section>
  )
}

function TrescOdprawy({ odprawa }: { odprawa: Odprawa }) {
  return (
    <div className="mt-3 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div>
        <p className="text-[13.5px] leading-relaxed text-deck-text">{odprawa.podsumowanie}</p>
        {odprawa.zagrozenia.length > 0 && (
          <ul className="mt-3 space-y-2">
            {odprawa.zagrozenia.map((z) => (
              <li key={`${z.obszar}-${z.tytul}`}>
                <Link
                  href={ODNOSNIK_OBSZARU[z.obszar]}
                  data-waga={z.waga}
                  className={`block rounded-md border border-white/10 border-l-[3px] bg-white/[0.03] px-3 py-2 transition hover:bg-white/[0.06] ${STYL_WAGI[z.waga]}`}
                >
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.16em]">
                    {ETYKIETA_OBSZARU[z.obszar]} · ryzyko {NAZWA_WAGI[z.waga]}
                  </span>
                  <b className="mt-0.5 block text-[13px] font-semibold text-deck-text">{z.tytul}</b>
                  <span className="block text-[11.5px] leading-relaxed text-deck-muted">{z.uzasadnienie}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      {odprawa.dzis.length > 0 && (
        <div>
          <div className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-deck-muted/70">dziś</div>
          <ul className="mt-2 space-y-1.5 text-[12.5px] text-deck-text">
            {odprawa.dzis.map((d) => (
              <li key={d} className="border-l border-deck-accent/40 pl-2.5">{d}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Krok 5: Uruchom - ma przejść; lint; commit**

Run: `npx vitest run components/deck/PanelFaktow.test.tsx components/deck/PanelOdprawy.test.tsx > "$TMP/vt.log" 2>&1; echo $?` (oczekiwane `0`), `npx eslint components/deck/PanelFaktow.tsx components/deck/PanelOdprawy.tsx`
Commit: `feat(kokpit): panel odprawy D.E.C.K. i panel faktow`

---

## Zadanie 9: Pasek statusu (stopka A)

**Pliki:** nowy `components/deck/PasekStatusu.tsx`, test `components/deck/PasekStatusu.test.tsx`; `app/globals.css` (kursor)

- [ ] **Krok 1: Test**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PasekStatusu, type DanePaska } from '@/components/deck/PasekStatusu'

const DANE: DanePaska = { czasArkuszaMs: 420, firestoreOk: true, metryki: 28, alerty: 0 }
const stan = (nazwa: string) => document.querySelector(`[data-segment="${nazwa}"]`)?.getAttribute('data-stan')

describe('PasekStatusu', () => {
  it('wszystko działa - zielone kropki i czas arkusza po polsku', () => {
    render(<PasekStatusu kodem={false} godzina="14:32" dane={DANE} />)
    expect(screen.getByText('0,4 s')).toBeInTheDocument()
    expect(stan('arkusz')).toBe('ok')
    expect(stan('firestore')).toBe('ok')
    expect(stan('metryki')).toBe('ok')
    expect(screen.getByText('hasło')).toBeInTheDocument()
    expect(screen.getByText('14:32')).toBeInTheDocument()
  })

  it('wolny arkusz i alerty - żółte; brak arkusza i Firestore - czerwone', () => {
    const { rerender } = render(<PasekStatusu kodem godzina="14:32" dane={{ ...DANE, czasArkuszaMs: 4200, alerty: 2 }} />)
    expect(stan('arkusz')).toBe('uwaga')
    expect(stan('metryki')).toBe('uwaga')
    expect(screen.getByText('kod')).toBeInTheDocument()
    rerender(<PasekStatusu kodem godzina="14:32" dane={{ ...DANE, czasArkuszaMs: null, firestoreOk: false }} />)
    expect(stan('arkusz')).toBe('blad')
    expect(stan('firestore')).toBe('blad')
  })

  it('zanim dane dopłyną - „łączę…” i kropki w oczekiwaniu', () => {
    render(<PasekStatusu kodem={false} godzina="14:32" dane={null} />)
    expect(stan('arkusz')).toBe('czeka')
    expect(screen.getAllByText('łączę…')).toHaveLength(2)
  })
})
```

- [ ] **Krok 2: Uruchom - ma paść**

- [ ] **Krok 3: `components/deck/PasekStatusu.tsx`**

```tsx
'use client'

export type StanKropki = 'ok' | 'uwaga' | 'blad' | 'czeka'

export interface DanePaska {
  /** Czas odpowiedzi arkusza; `null`, gdy nie odpowiedział. */
  czasArkuszaMs: number | null
  firestoreOk: boolean
  metryki: number
  alerty: number
}

/** Arkusz wolniejszy niż 3 s to już odczuwalne czekanie. */
const WOLNY_ARKUSZ_MS = 3000

const KROPKA: Record<StanKropki, string> = {
  ok: 'bg-deck-accent shadow-[0_0_8px_var(--color-deck-accent)]',
  uwaga: 'bg-deck-warn',
  blad: 'bg-deck-danger',
  czeka: 'animate-pulse bg-deck-muted/50',
}

function sekundy(ms: number): string {
  return `${(ms / 1000).toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`
}

function Segment({ nazwa, stan, etykieta, wartosc, indeks }: {
  nazwa: string
  stan: StanKropki
  etykieta: string
  wartosc: string
  indeks: number
}) {
  return (
    <span
      data-segment={nazwa}
      data-stan={stan}
      className="flex items-center gap-2 border-r border-white/[0.06] px-3.5 py-2"
      // Segmenty meldują się po kolei - jak systemy po starcie.
      style={{ animationDelay: `${260 + indeks * 180}ms` }}
    >
      <i className={`h-1.5 w-1.5 flex-none rounded-full ${KROPKA[stan]}`} aria-hidden="true" />
      {etykieta} <b className="font-medium text-deck-text">{wartosc}</b>
    </span>
  )
}

/**
 * Stopka jak pasek stanu edytora: prawdziwe dane zamiast ozdobnych meldunków.
 * Kropka zmienia kolor, gdy coś nie działa albo działa wolno.
 */
export function PasekStatusu({ kodem, godzina, dane }: { kodem: boolean; godzina: string; dane: DanePaska | null }) {
  const arkusz: StanKropki = !dane
    ? 'czeka'
    : dane.czasArkuszaMs === null ? 'blad' : dane.czasArkuszaMs > WOLNY_ARKUSZ_MS ? 'uwaga' : 'ok'

  return (
    <div
      role="status"
      aria-label="Stan systemów"
      className="deck-boot flex flex-wrap items-stretch overflow-hidden rounded-md border border-deck-accent/25 bg-deck-accent/[0.04] font-mono text-[10.5px] text-deck-muted"
    >
      <span className="flex items-center bg-deck-accent px-3.5 py-2 font-bold tracking-[0.14em] text-deck-bg-deep">
        D.E.C.K.<i className="deck-kursor" aria-hidden="true" />
      </span>
      <Segment
        indeks={0}
        nazwa="arkusz"
        stan={arkusz}
        etykieta="arkusz"
        wartosc={!dane ? 'łączę…' : dane.czasArkuszaMs === null ? 'brak' : sekundy(dane.czasArkuszaMs)}
      />
      <Segment
        indeks={1}
        nazwa="firestore"
        stan={!dane ? 'czeka' : dane.firestoreOk ? 'ok' : 'blad'}
        etykieta="Firestore"
        wartosc={!dane ? 'łączę…' : dane.firestoreOk ? 'ok' : 'brak'}
      />
      <Segment indeks={2} nazwa="sesja" stan="ok" etykieta="sesja" wartosc={kodem ? 'kod' : 'hasło'} />
      <Segment
        indeks={3}
        nazwa="metryki"
        stan={!dane ? 'czeka' : dane.alerty > 0 ? 'uwaga' : 'ok'}
        etykieta="metryki"
        wartosc={!dane ? '-' : `${dane.metryki} · alerty ${dane.alerty}`}
      />
      <span className="ml-auto flex items-center gap-2 px-3.5 py-2" style={{ animationDelay: '980ms' }}>
        odświeżono <b className="font-medium text-deck-text">{godzina}</b>
      </span>
    </div>
  )
}
```

- [ ] **Krok 4: `app/globals.css` - dopisz pod blokiem „sekwencja startowa w stopce” (po `@keyframes deck-boot-wejscie`)**

```css
/* Kursor terminala w pasku statusu. */
.deck-kursor {
  display: inline-block;
  width: 7px;
  height: 12px;
  margin-left: 5px;
  background: currentColor;
  vertical-align: -2px;
  animation: deck-kursor-mrug 1s steps(1) infinite;
}

@keyframes deck-kursor-mrug {
  50% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .deck-kursor { animation: none; }
}
```

- [ ] **Krok 5: Uruchom - ma przejść; commit** `feat(kokpit): pasek statusu z prawdziwym stanem systemow`

---

## Zadanie 10: Nowy układ kokpitu

**Pliki:** `components/deck/DeckHub.tsx` (całość), `components/deck/DeckHub.test.tsx` (całość), `app/page.tsx` (całość); usunięcie `components/deck/SekwencjaStartowa.tsx` (jedyne użycie było w DeckHub; CSS `.deck-boot` zostaje - używa go pasek)

- [ ] **Krok 1: Testy - zastąp `components/deck/DeckHub.test.tsx`**

```tsx
import { act, render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { ReactNode } from 'react'
import { DeckHub, type DaneAnalityki, type DanePlanera } from '@/components/deck/DeckHub'
import type { ZapisanaOdprawa } from '@/lib/asystent/odprawa'
import type { Fakt } from '@/lib/asystent/fakty'

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const wyloguj = vi.fn()
const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }))
vi.mock('@/lib/auth/useAuth', () => ({ useAuth: () => ({ wyloguj }) }))

const ANALITYKA: DaneAnalityki = { konwersja: 61.1, retencja: 3.81, kpiWzrosty: 20, kpiRazem: 28, alerty: 2, czasArkuszaMs: 420 }
const PLANER: DanePlanera = { propozycje: 0, sesja: { wlaczony: false, od: null, przez: null }, najblizsze: [], ok: true }
const ZAPIS: ZapisanaOdprawa = {
  slad: 's', dzien: '02.10.2026', utworzono: Date.UTC(2026, 9, 2, 12, 32), model: 'm',
  odprawa: { podsumowanie: 'Rekrutacja trzyma poziom, retencja słabnie.', zagrozenia: [], dzis: [] },
}

/** Obietnica, która nigdy się nie spełnia - arkusz, który jeszcze nie odpowiedział. */
const nigdy = <T,>() => new Promise<T>(() => {})

const obietnica = <T,>(x: T | Promise<T>) => (x instanceof Promise ? x : Promise.resolve(x))

async function hub(nadpisz: {
  rola?: 'owner' | 'board'
  email?: string
  kodem?: boolean
  analityka?: Partial<DaneAnalityki> | Promise<DaneAnalityki>
  planer?: Partial<DanePlanera> | Promise<DanePlanera>
  fakty?: Fakt[] | Promise<Fakt[]>
  odprawa?: ZapisanaOdprawa | null | Promise<ZapisanaOdprawa | null>
} = {}) {
  const rola = nadpisz.rola ?? 'owner'
  const analityka = nadpisz.analityka instanceof Promise ? nadpisz.analityka : Promise.resolve({ ...ANALITYKA, ...nadpisz.analityka })
  const planer = nadpisz.planer instanceof Promise ? nadpisz.planer : Promise.resolve({ ...PLANER, ...nadpisz.planer })
  const odprawa = rola === 'owner' ? obietnica(nadpisz.odprawa === undefined ? ZAPIS : nadpisz.odprawa) : null
  // Dane ze strumienia (use + Suspense) dopływają w mikrozadaniach - bez
  // asynchronicznego act React nie zdąży podmienić wersji zastępczej.
  return act(async () => {
    render(
      <DeckHub
        rola={rola}
        email={nadpisz.email ?? 'ja@e.com'}
        kodem={nadpisz.kodem ?? false}
        godzina="14:32"
        analityka={analityka}
        planer={planer}
        fakty={obietnica(nadpisz.fakty ?? [])}
        odprawa={odprawa}
      />,
    )
  })
}

describe('DeckHub', () => {
  it('nagłówek, kafelki, odprawa i pasek są od razu - nie czekają na dane', async () => {
    await hub({ analityka: nigdy(), planer: nigdy(), fakty: nigdy(), odprawa: nigdy() })
    expect(screen.getByRole('heading', { level: 1, name: 'D.E.C.K.' })).toBeInTheDocument()
    expect(screen.getByText('Diagnostic Evaluation of Change & KPIs')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Odprawa D.E.C.K.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /SSUEW Analytics/ })).toHaveAttribute('href', '/analytics')
    expect(screen.getByRole('link', { name: /Sesja Operacyjna/ })).toHaveAttribute('href', '/planer')
    expect(screen.getByRole('button', { name: /wyloguj/i })).toBeInTheDocument()
    expect(screen.getAllByText('łączę…').length).toBeGreaterThan(0)
  })

  it('pokazuje Orbitę właścicielowi', async () => {
    await hub()
    expect(screen.getByText('Orbita')).toBeInTheDocument()
  })

  it('ukrywa Orbitę przed zarządem - nie wyszarza, tylko nie renderuje', async () => {
    await hub({ rola: 'board', email: 'z@e.com' })
    expect(screen.queryByText('Orbita')).toBeNull()
  })

  it('właściciel widzi odprawę, nie panel faktów', async () => {
    await hub()
    expect(await screen.findByText(/retencja słabnie/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Na teraz' })).toBeNull()
  })

  it('zarząd widzi fakty, nigdy odprawy', async () => {
    await hub({ rola: 'board', email: 'Jula', kodem: true, fakty: [{ etykieta: 'Jutro 18:00', tresc: 'Zebranie Zarządu', link: '/planer' }] })
    expect(screen.getByRole('heading', { name: 'Na teraz' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /Jutro 18:00/ })).toHaveAttribute('href', '/planer')
    expect(screen.queryByRole('heading', { name: 'Odprawa D.E.C.K.' })).toBeNull()
  })

  it('pokazuje liczbę alertów na kafelku Analytics, gdy arkusz odpowie', async () => {
    await hub()
    expect(await screen.findByText('2 alerty')).toBeInTheDocument()
  })

  it('nie pokazuje odznaki alertów, gdy alertów nie ma', async () => {
    await hub({ analityka: { alerty: 0 } })
    await screen.findByText('0,4 s')
    expect(screen.queryByText(/\d+ alerty/)).toBeNull()
  })

  it('pokazuje adres i rolę zalogowanego', async () => {
    await hub({ rola: 'board', email: 'zarzad@e.com' })
    expect(screen.getByText('zarzad@e.com')).toBeInTheDocument()
    expect(screen.getByText('board')).toBeInTheDocument()
  })

  it('ma przycisk wylogowania', async () => {
    // Kokpit jest ekranem, na ktorym sie laduje po zalogowaniu. Bez tego
    // przycisku nie da sie z niego wyjsc - powloka z sidebarem obejmuje
    // wylacznie /analytics/*, wiec tam wylogowania po prostu nie widac.
    await hub()
    fireEvent.click(screen.getByRole('button', { name: /wyloguj/i }))
    expect(wyloguj).toHaveBeenCalled()
  })

  it('kafelek Sesji Operacyjnej: odznaka propozycji i najbliższe wydarzenia', async () => {
    await hub({ planer: { propozycje: 3, najblizsze: [{ id: 'a', kiedy: 'dziś 18:00', tytul: 'Zebranie Zarządu' }] } })
    expect(await screen.findByText('3 do decyzji')).toBeInTheDocument()
    expect(screen.getByText('Zebranie Zarządu')).toBeInTheDocument()
    expect(screen.getByText('dziś 18:00')).toBeInTheDocument()
  })

  it('pokazuje baner trwającej Sesji Operacyjnej z odnośnikiem do Planera', async () => {
    await hub({
      rola: 'board',
      email: 'Jula',
      planer: { sesja: { wlaczony: true, od: Date.now() - 5 * 60_000, przez: 'ja' } },
    })
    expect(await screen.findByRole('link', { name: /Sesja Operacyjna trwa/ })).toHaveAttribute('href', '/planer')
  })

  it('baner sesji nie czeka na arkusz', async () => {
    await hub({ analityka: nigdy(), planer: { sesja: { wlaczony: true, od: null, przez: 'ja' } } })
    expect(await screen.findByText(/Sesja Operacyjna trwa/)).toBeInTheDocument()
  })

  it('bez sesji baneru nie ma', async () => {
    await hub()
    await screen.findByText('0,4 s')
    expect(screen.queryByText(/Sesja Operacyjna trwa/)).toBeNull()
  })

  it('pasek statusu zna sposób wejścia', async () => {
    await hub({ rola: 'board', email: 'Jula', kodem: true })
    expect(screen.getByText('kod')).toBeInTheDocument()
  })
})
```

- [ ] **Krok 2: Uruchom - ma paść** (`npx vitest run components/deck/DeckHub.test.tsx`)

- [ ] **Krok 3: `components/deck/DeckHub.tsx` - całość**

```tsx
'use client'
import { Suspense, use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut, Radio } from 'lucide-react'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { LogoMark } from '@/components/ui/LogoMark'
import { useAuth } from '@/lib/auth/useAuth'
import { opiszTrwanie, type StanSesjiWspolnej } from '@/lib/planer/stan'
import { useTeraz } from '@/lib/useTeraz'
import type { Fakt, NajblizszeWydarzenie } from '@/lib/asystent/fakty'
import type { ZapisanaOdprawa } from '@/lib/asystent/odprawa'
import type { Rola } from '@/lib/auth/role'
import { DeckTile } from './DeckTile'
import { MatrixRain } from './MatrixRain'
import { PanelFaktow } from './PanelFaktow'
import { PanelOdprawy, SzkieletOdprawy } from './PanelOdprawy'
import { PasekStatusu, type DanePaska } from './PasekStatusu'

/** Liczby z arkusza - wolne: Apps Script odpowiada 1-3 s przy pustym cache. */
export interface DaneAnalityki {
  konwersja: number
  retencja: number
  kpiWzrosty: number
  kpiRazem: number
  alerty: number
  /** Czas odpowiedzi arkusza; `null`, gdy żadna zakładka nie odpowiedziała. */
  czasArkuszaMs: number | null
}

/** Stan z Firestore - szybszy, więc nie może czekać na arkusz. */
export interface DanePlanera {
  /** Propozycje zarządu czekające na decyzję. Liczone tylko dla właściciela. */
  propozycje: number
  /** Stan Sesji Operacyjnej bieżącego semestru. */
  sesja: StanSesjiWspolnej
  /** Kilka najbliższych wydarzeń na kafelek. */
  najblizsze: NajblizszeWydarzenie[]
  /** Firestore odpowiedział - do paska statusu. */
  ok: boolean
}

/**
 * Każdy kawałek danych to osobny strumień: nagłówek, kafelki i miejsca na
 * odprawę są od razu, liczby dopływają, gdy są gotowe. Odprawa przychodzi
 * z Firestore - Gemini nigdy nie opóźnia wejścia.
 */
type Props = {
  rola: Rola
  email: string
  /** Wejście kodem - do paska statusu. */
  kodem: boolean
  /** Godzina zebrania danych, czas Warszawy, liczona na serwerze. */
  godzina: string
  analityka: Promise<DaneAnalityki>
  planer: Promise<DanePlanera>
  fakty: Promise<Fakt[]>
  /** Zapisana odprawa asystenta. Zarząd dostaje `null` - asystent jest tylko dla właściciela. */
  odprawa: Promise<ZapisanaOdprawa | null> | null
}

export function DeckHub({ rola, email, kodem, godzina, analityka, planer, fakty, odprawa }: Props) {
  const router = useRouter()
  const { wyloguj } = useAuth()

  async function wyjdz() {
    await wyloguj()
    router.push('/login')
    router.refresh()
  }

  const dzis = new Date().toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <>
      <MatrixRain moc={0.2} />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1360px] flex-col gap-6 p-[clamp(16px,2.4vw,34px)]">
        <header className="flex flex-wrap items-end justify-between gap-6 border-b border-white/8 pb-[18px]">
          <div className="flex items-center gap-3.5">
            <LogoMark />
            <div>
              <h1
                className="deck-glitch text-[27px] font-extrabold leading-none tracking-[0.26em] text-deck-text"
                data-tekst="D.E.C.K."
              >
                D.E.C.K.
              </h1>
              <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-deck-muted/70">
                {'Diagnostic Evaluation of Change & KPIs'}
              </p>
            </div>
          </div>
          <div className="text-right font-mono text-[11.5px] text-deck-muted">
            <div className="flex items-center justify-end gap-2">
              <span className="text-deck-text">{email}</span>
              <span className="rounded-full border border-deck-accent/34 bg-deck-accent/10 px-2 py-0.5 text-[9.5px] uppercase tracking-[0.16em] text-deck-accent">
                {rola}
              </span>
              <button
                type="button"
                onClick={wyjdz}
                title="Wyloguj"
                aria-label="Wyloguj"
                className="grid h-7 w-7 place-items-center rounded-md border border-white/10 text-deck-muted transition hover:border-deck-danger/40 hover:bg-white/[0.06] hover:text-deck-danger"
              >
                <LogOut size={13} />
              </button>
            </div>
            <div className="mt-1.5 text-[10.5px] uppercase tracking-[0.12em] text-deck-muted/70">{dzis}</div>
          </div>
        </header>

        <Suspense fallback={null}>
          <BanerSesji planer={planer} />
        </Suspense>

        {odprawa ? (
          <Suspense fallback={<SzkieletOdprawy />}>
            <PanelOdprawy odprawa={odprawa} fakty={fakty} />
          </Suspense>
        ) : (
          <PanelFaktow fakty={fakty} />
        )}

        <main className="grid flex-1 auto-rows-[minmax(168px,auto)] grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {/* Zanim dane odpowiedzą, kafelki są te same, tylko bez liczb -
              da się w nie kliknąć od pierwszej chwili. */}
          <Suspense fallback={<KafelekAnalytics dane={null} />}>
            <KafelekAnalyticsZDanymi analityka={analityka} />
          </Suspense>

          <Suspense fallback={<KafelekSesji propozycje={null} najblizsze={null} />}>
            <KafelekSesjiZDanymi planer={planer} />
          </Suspense>

          {rola === 'owner' && (
            <DeckTile
              stan="zablokowany"
              href="/orbita"
              etykieta="moduł 03 · zadania"
              tytul="Orbita"
              wkrotce="etap 2"
            >
              <p className="text-[12px] leading-relaxed">Radar zadań - bliżej środka znaczy pilniej.</p>
            </DeckTile>
          )}

          <DeckTile
            stan="zablokowany"
            href="/strony"
            etykieta="moduł 04 · search console"
            tytul="Strony"
            wkrotce="etap 4"
          >
            <p className="text-[12px] leading-relaxed">Kliknięcia, wyświetlenia i pozycje nadzorowanych witryn.</p>
          </DeckTile>
        </main>

        <footer>
          <PasekZDanymi kodem={kodem} godzina={godzina} analityka={analityka} planer={planer} />
        </footer>
      </div>
    </>
  )
}

function BanerSesji({ planer }: { planer: Promise<DanePlanera> }) {
  const { sesja } = use(planer)
  const teraz = useTeraz()
  if (!sesja.wlaczony) return null

  return (
    // Sesję wyłącza się ręcznie, więc przypomnienie musi być widać także
    // spoza Planera - zapomniana sesja to bezterminowy zapis dla zarządu.
    <Link
      href="/planer"
      className="flex items-center gap-3 rounded-lg border border-deck-accent/45 bg-deck-accent/10 px-4 py-3 text-[12.5px] transition hover:bg-deck-accent/15"
    >
      <Radio size={15} className="text-deck-accent" />
      <span className="font-semibold text-deck-text">Sesja Operacyjna trwa</span>
      {sesja.od !== null && (
        <span suppressHydrationWarning className="text-deck-muted">
          {opiszTrwanie(sesja.od, teraz)}
        </span>
      )}
      <span className="ml-auto text-deck-accent">Planer →</span>
    </Link>
  )
}

function KafelekAnalyticsZDanymi({ analityka }: { analityka: Promise<DaneAnalityki> }) {
  return <KafelekAnalytics dane={use(analityka)} />
}

function KafelekAnalytics({ dane }: { dane: DaneAnalityki | null }) {
  return (
    <DeckTile
      stan="zywy"
      href="/analytics"
      etykieta="moduł 01 · analityka"
      tytul="SSUEW Analytics"
      odznaka={dane && dane.alerty > 0 ? `${dane.alerty} alerty` : undefined}
      span={2}
      rows={2}
    >
      <div className="flex h-full flex-col justify-between gap-4">
        <div className="flex items-baseline gap-2.5 tabular-nums">
          {/* AnimatedNumber renderuje własny <span> i nie przyjmuje className - styl idzie na opakowanie. */}
          <span className="text-[clamp(30px,3.4vw,46px)] font-bold leading-none tracking-[-0.035em]">
            {dane ? <AnimatedNumber value={dane.konwersja} decimals={1} /> : <Brak />}
          </span>
          <span className="text-[13px] font-medium text-deck-muted">% konwersji</span>
        </div>
        <div className="grid grid-cols-3 gap-2.5 border-t border-white/8 pt-3.5">
          <Statystyka etykieta="retencja" wartosc={dane?.retencja ?? null} miejsca={2} jednostka="sem." />
          <Statystyka
            etykieta="KPI r/r"
            wartosc={dane?.kpiWzrosty ?? null}
            miejsca={0}
            jednostka={dane ? `/ ${dane.kpiRazem} wzrostów` : 'wzrostów'}
          />
          <Statystyka etykieta="alerty" wartosc={dane?.alerty ?? null} miejsca={0} jednostka="otwarte" />
        </div>
      </div>
    </DeckTile>
  )
}

function KafelekSesjiZDanymi({ planer }: { planer: Promise<DanePlanera> }) {
  const p = use(planer)
  return <KafelekSesji propozycje={p.propozycje} najblizsze={p.najblizsze} />
}

function KafelekSesji({ propozycje, najblizsze }: { propozycje: number | null; najblizsze: NajblizszeWydarzenie[] | null }) {
  return (
    <DeckTile
      stan="zywy"
      href="/planer"
      etykieta="moduł 02 · kalendarz semestru"
      tytul="Sesja Operacyjna"
      odznaka={propozycje ? `${propozycje} do decyzji` : undefined}
    >
      <p className="text-[12px] leading-relaxed text-deck-muted">
        Kalendarz semestru układany razem z zarządem. Ranga kategorii, kolizje osób i sal, propozycje zmian
        oraz eksport do Excela i CRA.
      </p>
      <ul className="mt-3 font-mono text-[11px] text-deck-text">
        {najblizsze === null ? (
          <li className="py-1"><Brak /></li>
        ) : najblizsze.length === 0 ? (
          <li className="py-1 text-deck-muted">Brak zaplanowanych wydarzeń</li>
        ) : (
          najblizsze.map((w) => (
            <li key={w.id} className="border-t border-white/[0.06] py-1.5 first:border-t-0">
              <span className="mr-2 text-[10px] text-deck-muted">{w.kiedy}</span>
              {w.tytul}
            </li>
          ))
        )}
      </ul>
    </DeckTile>
  )
}

/**
 * Pasek celowo bez Suspense: podmiana wersji zastępczej na właściwą
 * zamontowałaby go od nowa i segmenty weszłyby drugi raz (stopka by mignęła).
 * Tu zostaje ten sam pasek, a zmieniają się tylko wartości.
 */
function PasekZDanymi({ kodem, godzina, analityka, planer }: {
  kodem: boolean
  godzina: string
  analityka: Promise<DaneAnalityki>
  planer: Promise<DanePlanera>
}) {
  const [dane, setDane] = useState<DanePaska | null>(null)
  useEffect(() => {
    let aktualny = true
    void Promise.all([analityka, planer]).then(([a, p]) => {
      if (aktualny) setDane({ czasArkuszaMs: a.czasArkuszaMs, firestoreOk: p.ok, metryki: a.kpiRazem, alerty: a.alerty })
    })
    return () => {
      aktualny = false
    }
  }, [analityka, planer])
  return <PasekStatusu kodem={kodem} godzina={godzina} dane={dane} />
}

/** Miejsce na liczbę, która jeszcze nie przyszła. */
function Brak() {
  return <span className="animate-pulse text-deck-muted/40">-</span>
}

function Statystyka({
  etykieta,
  wartosc,
  miejsca,
  jednostka,
}: {
  etykieta: string
  wartosc: number | null
  miejsca: number
  jednostka: string
}) {
  return (
    <div>
      <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-deck-muted/70">{etykieta}</div>
      <div className="mt-1.5 text-[19px] font-semibold tracking-[-0.02em] tabular-nums text-deck-text">
        {wartosc === null ? <Brak /> : <AnimatedNumber value={wartosc} decimals={miejsca} />}
        <span className="ml-1 text-[11px] font-medium text-deck-muted">{jednostka}</span>
      </div>
    </div>
  )
}
```

- [ ] **Krok 4: `app/page.tsx` - całość**

```tsx
import { after } from 'next/server'
import { redirect } from 'next/navigation'
import { ktoNaStronie } from '@/lib/auth/naStronie'
import { computeOverview } from '@/lib/overview'
import { buildAlerts } from '@/lib/stats'
import { serieZWierszy, ilorazSerii } from '@/lib/kpi/serie'
import { DeckHub, type DaneAnalityki, type DanePlanera } from '@/components/deck/DeckHub'
import { biezacySemestr } from '@/lib/planer/semestry'
import { dzisWarszawa, godzinaWarszawa } from '@/lib/czas'
import { faktyKokpitu, najblizszeWydarzenia } from '@/lib/asystent/fakty'
import {
  czytajOdprawe,
  odswiezOdpraweWTle,
  pobierzArkusz,
  pobierzPlaner,
  type DaneArkusza,
} from '@/lib/asystent/dane'
import type { ZapisanaOdprawa } from '@/lib/asystent/odprawa'

/** Zapas na odprawę generowaną w tle po wysłaniu strony (Gemini do 25 s). */
export const maxDuration = 60

function naAnalityke(a: DaneArkusza): DaneAnalityki {
  const serie = serieZWierszy(a.punkty)
  // Trzeci argument to KpiPeriod[], którego aplikacja nie pobiera - tak samo
  // wywołuje to OverviewClient.
  const m = computeOverview(a.rekrutacje, a.kohorty, [])
  const konwersja =
    m.lastApplications && m.lastApplications > 0 && m.lastAccepted != null
      ? (m.lastAccepted / m.lastApplications) * 100
      : 0
  return {
    konwersja,
    retencja: m.histRetention ?? 0,
    kpiWzrosty: serie.filter((s) => ilorazSerii(s) > 1).length,
    kpiRazem: serie.length,
    alerty: buildAlerts(a.rekrutacje, a.kohorty, serie).length,
    czasArkuszaMs: a.czasMs,
  }
}

export default async function KokpitPage() {
  // Obie drogi wejścia. Sprawdzanie samego hasła odsyłało osoby na kodzie
  // na /login, a stamtąd useAuth odsyłał je z powrotem - pętla.
  const kto = await ktoNaStronie()
  if (!kto) redirect('/login')

  const teraz = new Date()
  const semestr = biezacySemestr(teraz)
  const dzis = dzisWarszawa(teraz)

  // Celowo bez `await`: strona idzie do przeglądarki od razu, a dane
  // dopływają strumieniem. Arkusz i Firestore pytamy równolegle i raz -
  // każdy panel bierze z tych samych dwóch obietnic.
  const arkusz = pobierzArkusz()
  const planer = pobierzPlaner(semestr.id, kto.rola)

  const analityka = arkusz.then(naAnalityke)
  const danePlanera: Promise<DanePlanera> = planer.then((p) => ({
    propozycje: p.propozycje,
    sesja: p.sesja,
    ok: p.ok,
    najblizsze: najblizszeWydarzenia(p.wydarzenia, dzis, 2),
  }))
  const fakty = Promise.all([arkusz, planer]).then(([a, p]) =>
    faktyKokpitu({
      rola: kto.rola,
      wydarzenia: p.wydarzenia,
      propozycje: p.propozycje,
      alerty: buildAlerts(a.rekrutacje, a.kohorty, serieZWierszy(a.punkty)).map((x) => ({ tytul: x.title })),
      dzis,
    }),
  )

  // Asystent jest tylko dla właściciela. Zapisaną odprawę pokazujemy od razu;
  // ewentualną nową liczymy już po wysłaniu strony.
  let odprawa: Promise<ZapisanaOdprawa | null> | null = null
  if (kto.rola === 'owner') {
    const zapisana = czytajOdprawe().catch(() => null)
    odprawa = zapisana
    after(() => odswiezOdpraweWTle({
      arkusz, planer, zapisana, semestr: { id: semestr.id, nazwa: semestr.nazwa }, teraz,
    }))
  }

  return (
    <DeckHub
      rola={kto.rola}
      email={kto.email}
      kodem={kto.uid.startsWith('kod:')}
      godzina={godzinaWarszawa(teraz)}
      analityka={analityka}
      planer={danePlanera}
      fakty={fakty}
      odprawa={odprawa}
    />
  )
}
```

- [ ] **Krok 5: Usuń `components/deck/SekwencjaStartowa.tsx`** (`git rm components/deck/SekwencjaStartowa.tsx`)

- [ ] **Krok 6: Testy, typy, lint, build; commit**

Run: `npx vitest run > "$TMP/vt.log" 2>&1; echo $?` (cały zestaw, oczekiwane `0`), `npx tsc --noEmit`, `npx eslint app/page.tsx components/deck`, `npx next build`
Commit: `feat(kokpit): odprawa D.E.C.K., kafelek Sesji Operacyjnej i pasek statusu`

- [ ] **Krok 7: Podgląd w przeglądarce**

`npm run dev`, wejście na `/` kodem (bilet z `scratchpad/pomiar.mjs`). Lokalnie nie ma `FIREBASE_SERVICE_ACCOUNT`, więc odprawa i Planer będą puste (pasek: Firestore „brak”) - to oczekiwane. Sprawdzić: układ na 1280 px i 390 px, brak poziomego przewijania, deszcz Matrixa i glitch nagłówka działają, segmenty paska wchodzą po kolei.

---

# FAZA 3 - czat

## Zadanie 11: Rozmowa i API czatu

**Pliki:** nowe `lib/asystent/czat.ts`, `app/api/asystent/czat/route.ts`; testy `lib/asystent/czat.test.ts`, `app/api/asystent/czat/route.test.ts`

- [ ] **Krok 1: Test `lib/asystent/czat.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { sprawdzRozmowe, rozmowaDlaGemini, LIMIT_HISTORII, LIMIT_ZNAKOW, INSTRUKCJA_CZATU } from '@/lib/asystent/czat'

const K = { meta: { data: '02.10.2026', dzienTygodnia: 'piątek' } } as never

describe('sprawdzRozmowe', () => {
  it('przyjmuje rozmowę kończącą się pytaniem', () => {
    expect(sprawdzRozmowe({ wiadomosci: [{ rola: 'ja', tresc: ' Co z KPI? ' }] })).toEqual([{ rola: 'ja', tresc: 'Co z KPI?' }])
  })

  it('odrzuca pustą, z nieznaną rolą i bez pytania na końcu', () => {
    expect(sprawdzRozmowe({ wiadomosci: [] })).toBeNull()
    expect(sprawdzRozmowe({ wiadomosci: [{ rola: 'system', tresc: 'x' }] })).toBeNull()
    expect(sprawdzRozmowe({ wiadomosci: [{ rola: 'ja', tresc: '   ' }] })).toBeNull()
    expect(sprawdzRozmowe({ wiadomosci: [{ rola: 'ja', tresc: 'a' }, { rola: 'deck', tresc: 'b' }] })).toBeNull()
    expect(sprawdzRozmowe(null)).toBeNull()
  })

  it('przycina historię i za długie wiadomości', () => {
    const dluga = Array.from({ length: 30 }, (_, i) => ({ rola: i % 2 ? 'deck' : 'ja', tresc: `w${i}` }))
    dluga.push({ rola: 'ja', tresc: 'x'.repeat(LIMIT_ZNAKOW + 50) })
    const r = sprawdzRozmowe({ wiadomosci: dluga })!
    expect(r).toHaveLength(LIMIT_HISTORII)
    expect(r[r.length - 1].tresc).toHaveLength(LIMIT_ZNAKOW)
  })
})

describe('rozmowaDlaGemini', () => {
  it('najpierw obraz projektu, potem rozmowa w rolach Gemini', () => {
    const r = rozmowaDlaGemini(K, [{ rola: 'ja', tresc: 'Pytanie' }, { rola: 'deck', tresc: 'Odpowiedź' }, { rola: 'ja', tresc: 'Dalej' }])
    expect(r[0].rola).toBe('user')
    expect(r[0].tekst).toContain('"02.10.2026"')
    expect(r[1].rola).toBe('model')
    expect(r.slice(2)).toEqual([
      { rola: 'user', tekst: 'Pytanie' },
      { rola: 'model', tekst: 'Odpowiedź' },
      { rola: 'user', tekst: 'Dalej' },
    ])
  })

  it('historia ucięta w połowie zaczyna się od pytania, nie od odpowiedzi', () => {
    const r = rozmowaDlaGemini(K, [{ rola: 'deck', tresc: 'stara odpowiedź' }, { rola: 'ja', tresc: 'Pytanie' }])
    expect(r.slice(2)).toEqual([{ rola: 'user', tekst: 'Pytanie' }])
  })

  it('dwa pytania z rzędu skleja w jedno', () => {
    const r = rozmowaDlaGemini(K, [{ rola: 'ja', tresc: 'A' }, { rola: 'ja', tresc: 'B' }])
    expect(r.slice(2)).toEqual([{ rola: 'user', tekst: 'A\n\nB' }])
  })

  it('instrukcja zakazuje długich myślników', () => {
    expect(INSTRUKCJA_CZATU).toMatch(/„-”/)
  })
})
```

- [ ] **Krok 2: Test `app/api/asystent/czat/route.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/asystent/czat/route'
import { BladAsystenta } from '@/lib/asystent/gemini'

const ktoPyta = vi.fn()
const zapytajGemini = vi.fn()
vi.mock('@/lib/auth/guard', () => ({ ktoPyta: (...a: unknown[]) => ktoPyta(...a) }))
vi.mock('@/lib/asystent/gemini', async (oryginal) => ({
  ...(await oryginal<typeof import('@/lib/asystent/gemini')>()),
  zapytajGemini: (...a: unknown[]) => zapytajGemini(...a),
}))
vi.mock('@/lib/asystent/dane', () => ({
  pobierzArkusz: async () => ({ rekrutacje: [], kohorty: [], punkty: [], projekty: [], czlonkowie: [], czasMs: 1 }),
  pobierzPlaner: async () => ({ wydarzenia: [], sesja: { wlaczony: false, od: null, przez: null }, sklad: [], propozycje: 0, ok: true }),
  daneProjektu: (a: object, p: object) => ({ ...a, ...p }),
  zbudujKontekst: () => ({ meta: { data: '02.10.2026', dzienTygodnia: 'piątek' } }),
}))

const zadanie = (body: unknown) => ({ json: async () => body }) as never
const PYTANIE = { wiadomosci: [{ rola: 'ja', tresc: 'Co z retencją?' }] }
const WLASCICIEL = { uid: 'u', email: 'ja', rola: 'owner' }

describe('POST /api/asystent/czat', () => {
  beforeEach(() => {
    ktoPyta.mockReset()
    zapytajGemini.mockReset()
  })

  it('bez sesji 401, zarząd 403', async () => {
    ktoPyta.mockResolvedValue(null)
    expect((await POST(zadanie(PYTANIE))).status).toBe(401)
    ktoPyta.mockResolvedValue({ uid: 'kod:1', email: 'Jula', rola: 'board' })
    expect((await POST(zadanie(PYTANIE))).status).toBe(403)
    expect(zapytajGemini).not.toHaveBeenCalled()
  })

  it('zła rozmowa to 400', async () => {
    ktoPyta.mockResolvedValue(WLASCICIEL)
    expect((await POST(zadanie({ wiadomosci: [] }))).status).toBe(400)
  })

  it('odpowiedź z obrazem projektu w rozmowie', async () => {
    ktoPyta.mockResolvedValue(WLASCICIEL)
    zapytajGemini.mockResolvedValue('Retencja spada.')
    const res = await POST(zadanie(PYTANIE))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ odpowiedz: 'Retencja spada.' })
    const { wiadomosci } = zapytajGemini.mock.calls[0][0]
    expect(wiadomosci[0].tekst).toContain('02.10.2026')
    expect(wiadomosci[wiadomosci.length - 1]).toEqual({ rola: 'user', tekst: 'Co z retencją?' })
  })

  it('limit Gemini to 429 z ludzkim komunikatem', async () => {
    ktoPyta.mockResolvedValue(WLASCICIEL)
    zapytajGemini.mockRejectedValue(new BladAsystenta('limit', 'x'))
    const res = await POST(zadanie(PYTANIE))
    expect(res.status).toBe(429)
    expect((await res.json()).error).toMatch(/limit Gemini/)
  })
})
```

- [ ] **Krok 3: Uruchom - ma paść**

- [ ] **Krok 4: `lib/asystent/czat.ts`**

```ts
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
```

- [ ] **Krok 5: `app/api/asystent/czat/route.ts`**

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { ktoPyta } from '@/lib/auth/guard'
import { biezacySemestr } from '@/lib/planer/semestry'
import { dzisWarszawa } from '@/lib/czas'
import { komunikatBledu, zapytajGemini } from '@/lib/asystent/gemini'
import { INSTRUKCJA_CZATU, rozmowaDlaGemini, sprawdzRozmowe } from '@/lib/asystent/czat'
import { daneProjektu, pobierzArkusz, pobierzPlaner, zbudujKontekst } from '@/lib/asystent/dane'

export const runtime = 'nodejs'
export const maxDuration = 60

/** Czat „Zapytaj D.E.C.K.” - tylko właściciel. Historia żyje w przeglądarce. */
export async function POST(req: NextRequest) {
  const kto = await ktoPyta(req)
  if (!kto) return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })
  if (kto.rola !== 'owner') return NextResponse.json({ error: 'Asystent jest tylko dla właściciela' }, { status: 403 })

  const rozmowa = sprawdzRozmowe(await req.json().catch(() => null))
  if (!rozmowa) return NextResponse.json({ error: 'Pusta albo niepoprawna rozmowa' }, { status: 400 })

  const teraz = new Date()
  const semestr = biezacySemestr(teraz)
  try {
    const [a, p] = await Promise.all([pobierzArkusz(), pobierzPlaner(semestr.id, kto.rola)])
    const k = zbudujKontekst(daneProjektu(a, p, { id: semestr.id, nazwa: semestr.nazwa }), dzisWarszawa(teraz))
    const odpowiedz = await zapytajGemini({ instrukcja: INSTRUKCJA_CZATU, wiadomosci: rozmowaDlaGemini(k, rozmowa) })
    return NextResponse.json({ odpowiedz })
  } catch (e) {
    const { status, error } = komunikatBledu(e)
    return NextResponse.json({ error }, { status })
  }
}
```

- [ ] **Krok 6: Uruchom oba testy - mają przejść; typy; commit** `feat(asystent): czat z obrazem projektu - logika i API`

---

## Zadanie 12: Okno czatu w kokpicie

**Pliki:** nowe `components/deck/TekstAsystenta.tsx`, `components/deck/CzatDeck.tsx`; testy `components/deck/TekstAsystenta.test.tsx`, `components/deck/CzatDeck.test.tsx`; `components/deck/DeckHub.tsx`, `components/deck/DeckHub.test.tsx`

- [ ] **Krok 1: Test `components/deck/TekstAsystenta.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TekstAsystenta, naKawalki } from '@/components/deck/TekstAsystenta'

describe('TekstAsystenta', () => {
  it('akapity, wypunktowania i pogrubienia', () => {
    const { container } = render(<TekstAsystenta tekst={'Retencja **spada**.\n\n- J\'25: 2,1 sem.\n- W\'25: 1,8 sem.'} />)
    expect(screen.getByText('spada').tagName).toBe('STRONG')
    expect(container.querySelectorAll('li')).toHaveLength(2)
    expect(container.querySelectorAll('p')).toHaveLength(1)
  })

  it('lista zaraz pod zdaniem, bez pustej linii', () => {
    expect(naKawalki('Dwa ryzyka:\n- rekrutacja\n- retencja')).toEqual([
      { typ: 'akapit', linie: ['Dwa ryzyka:'] },
      { typ: 'lista', punkty: ['rekrutacja', 'retencja'] },
    ])
  })

  it('pogrubienie na początku linii nie jest punktem listy', () => {
    expect(naKawalki('**Uwaga**: limit')).toEqual([{ typ: 'akapit', linie: ['**Uwaga**: limit'] }])
  })
})
```

- [ ] **Krok 2: Test `components/deck/CzatDeck.test.tsx`**

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { CzatDeck } from '@/components/deck/CzatDeck'

beforeEach(() => sessionStorage.clear())
afterEach(() => vi.unstubAllGlobals())

function otworz() {
  render(<CzatDeck />)
  fireEvent.click(screen.getByRole('button', { name: /Zapytaj D\.E\.C\.K\./ }))
}

function zapytaj(tekst: string) {
  fireEvent.change(screen.getByRole('textbox', { name: /Pytanie/ }), { target: { value: tekst } })
  fireEvent.click(screen.getByRole('button', { name: /Wyślij/ }))
}

describe('CzatDeck', () => {
  it('wysyła rozmowę i pokazuje odpowiedź', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ odpowiedz: "Retencja W'25 spada do **1,8 sem.**" }), { status: 200 }))
    vi.stubGlobal('fetch', f)
    otworz()
    zapytaj('Co z retencją?')
    expect(await screen.findByText('1,8 sem.')).toBeInTheDocument()
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/asystent/czat')
    expect(JSON.parse(init.body as string)).toEqual({ wiadomosci: [{ rola: 'ja', tresc: 'Co z retencją?' }] })
    expect(screen.getByText('Co z retencją?')).toBeInTheDocument()
  })

  it('limit - komunikat, a pytanie wraca do pola', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ error: 'Darmowy limit Gemini na tę chwilę wyczerpany - spróbuj za minutę.' }), { status: 429 },
    )))
    otworz()
    zapytaj('Co z KPI?')
    expect(await screen.findByRole('alert')).toHaveTextContent(/limit Gemini/)
    expect(screen.getByRole('textbox', { name: /Pytanie/ })).toHaveValue('Co z KPI?')
  })

  it('historia przeżywa przeładowanie w tej samej karcie', () => {
    sessionStorage.setItem('deck-czat', JSON.stringify([
      { rola: 'ja', tresc: 'Wcześniejsze pytanie' },
      { rola: 'deck', tresc: 'Wcześniejsza odpowiedź' },
    ]))
    otworz()
    expect(screen.getByText('Wcześniejsza odpowiedź')).toBeInTheDocument()
  })

  it('„Wyczyść” kasuje rozmowę', () => {
    sessionStorage.setItem('deck-czat', JSON.stringify([{ rola: 'ja', tresc: 'Stare' }, { rola: 'deck', tresc: 'Odp' }]))
    otworz()
    fireEvent.click(screen.getByRole('button', { name: /Wyczyść/ }))
    expect(screen.queryByText('Stare')).toBeNull()
    expect(sessionStorage.getItem('deck-czat')).toBe('[]')
  })
})
```

- [ ] **Krok 3: Uruchom - ma paść**

- [ ] **Krok 4: `components/deck/TekstAsystenta.tsx`**

```tsx
import { Fragment, type ReactNode } from 'react'

export type Kawalek = { typ: 'akapit'; linie: string[] } | { typ: 'lista'; punkty: string[] }

/** Tyle formatowania, ile prosi instrukcja czatu: akapity, „- ” i **pogrubienie**. Bez biblioteki markdown. */
export function naKawalki(tekst: string): Kawalek[] {
  const wynik: Kawalek[] = []
  for (const blok of tekst.trim().split(/\n\s*\n/)) {
    let biezacy: Kawalek | null = null
    for (const linia of blok.split('\n')) {
      const punkt = linia.match(/^\s*[-*•] (.*)$/)
      if (punkt) {
        if (biezacy?.typ !== 'lista') {
          biezacy = { typ: 'lista', punkty: [] }
          wynik.push(biezacy)
        }
        biezacy.punkty.push(punkt[1].trim())
      } else if (linia.trim()) {
        if (biezacy?.typ !== 'akapit') {
          biezacy = { typ: 'akapit', linie: [] }
          wynik.push(biezacy)
        }
        biezacy.linie.push(linia.trim())
      }
    }
  }
  return wynik
}

function pogrubienia(tekst: string): ReactNode[] {
  return tekst
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((c, i) => (c.startsWith('**') && c.endsWith('**') && c.length > 4 ? <strong key={i}>{c.slice(2, -2)}</strong> : c))
}

export function TekstAsystenta({ tekst }: { tekst: string }) {
  return (
    <div className="space-y-2">
      {naKawalki(tekst).map((k, i) =>
        k.typ === 'lista' ? (
          <ul key={i} className="list-disc space-y-1 pl-4 marker:text-deck-accent">
            {k.punkty.map((p, j) => <li key={j}>{pogrubienia(p)}</li>)}
          </ul>
        ) : (
          <p key={i}>
            {k.linie.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {pogrubienia(l)}
              </Fragment>
            ))}
          </p>
        ),
      )}
    </div>
  )
}
```

- [ ] **Krok 5: `components/deck/CzatDeck.tsx`**

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { MessageSquare, Send, Trash2 } from 'lucide-react'
import { LIMIT_HISTORII, type WiadomoscCzatu } from '@/lib/asystent/czat'
import { TekstAsystenta } from './TekstAsystenta'

const KLUCZ = 'deck-czat'

/** Rozmowa z tej karty. Uszkodzony zapis to pusta rozmowa, nie wywrócony kokpit. */
function wczytaj(): WiadomoscCzatu[] {
  if (typeof window === 'undefined') return []
  try {
    const x = JSON.parse(sessionStorage.getItem(KLUCZ) ?? '[]')
    return Array.isArray(x)
      ? x.filter((w) => (w?.rola === 'ja' || w?.rola === 'deck') && typeof w?.tresc === 'string')
      : []
  } catch {
    return []
  }
}

/**
 * „Zapytaj D.E.C.K.” - rozmowa z asystentem, który przy każdym pytaniu dostaje
 * świeży obraz projektu. Historia żyje w karcie przeglądarki (sessionStorage):
 * przetrwa odświeżenie, zniknie po zamknięciu karty.
 */
export function CzatDeck() {
  const [otwarty, setOtwarty] = useState(false)
  // Odczyt w inicjalizatorze, nie w efekcie: na serwerze zwraca pustą listę,
  // a rozmowa i tak jest pokazywana dopiero po rozwinięciu.
  const [wiadomosci, setWiadomosci] = useState<WiadomoscCzatu[]>(wczytaj)
  const [pytanie, setPytanie] = useState('')
  const [czeka, setCzeka] = useState(false)
  const [blad, setBlad] = useState<string | null>(null)
  const dol = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      sessionStorage.setItem(KLUCZ, JSON.stringify(wiadomosci))
    } catch {
      // Tryb prywatny bez miejsca - rozmowa zostaje tylko w pamięci.
    }
  }, [wiadomosci])

  useEffect(() => {
    dol.current?.scrollIntoView?.({ block: 'nearest' })
  }, [wiadomosci, czeka])

  async function wyslij(e?: React.FormEvent) {
    e?.preventDefault()
    const tresc = pytanie.trim()
    if (!tresc || czeka) return
    const poprzednie = wiadomosci
    const rozmowa: WiadomoscCzatu[] = [...poprzednie, { rola: 'ja', tresc }]
    setWiadomosci(rozmowa)
    setPytanie('')
    setBlad(null)
    setCzeka(true)
    try {
      const res = await fetch('/api/asystent/czat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wiadomosci: rozmowa.slice(-LIMIT_HISTORII) }),
      })
      const dane = await res.json().catch(() => ({}))
      if (res.ok && typeof dane.odpowiedz === 'string') {
        setWiadomosci([...rozmowa, { rola: 'deck', tresc: dane.odpowiedz }])
        return
      }
      throw new Error(dane.error ?? 'D.E.C.K. nie odpowiedział - spróbuj ponownie.')
    } catch (err) {
      // Pytanie bez odpowiedzi wraca do pola - jedno kliknięcie, żeby ponowić.
      setWiadomosci(poprzednie)
      setPytanie(tresc)
      setBlad(err instanceof Error && err.message !== 'Failed to fetch' ? err.message : 'Brak połączenia - spróbuj ponownie.')
    } finally {
      setCzeka(false)
    }
  }

  return (
    <section className="deck-card rounded-lg">
      <button
        type="button"
        onClick={() => setOtwarty((o) => !o)}
        aria-expanded={otwarty}
        className="flex w-full items-center gap-2.5 px-[18px] py-3 text-left text-[13px] font-semibold text-deck-text"
      >
        <MessageSquare size={15} className="text-deck-accent" aria-hidden="true" />
        Zapytaj D.E.C.K.
        <span className="ml-auto font-mono text-[10px] font-normal text-deck-muted">{otwarty ? 'zwiń' : 'rozwiń'}</span>
      </button>

      {otwarty && (
        <div className="border-t border-white/8 px-[18px] pb-[18px]">
          <div className="max-h-[420px] space-y-3 overflow-y-auto py-3 text-[12.5px] leading-relaxed">
            {wiadomosci.length === 0 && (
              <p className="text-deck-muted">
                Pytaj o wskaźniki, ryzyka, kalendarz albo poproś o tekst. D.E.C.K. widzi te same dane co kokpit.
              </p>
            )}
            {wiadomosci.map((w, i) =>
              w.rola === 'ja' ? (
                <div key={i} className="ml-auto max-w-[85%] rounded-lg bg-deck-accent/10 px-3 py-2 text-deck-text">
                  {w.tresc}
                </div>
              ) : (
                <div key={i} className="max-w-[92%] rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-deck-text">
                  <TekstAsystenta tekst={w.tresc} />
                </div>
              ),
            )}
            {czeka && <p className="deck-caret font-mono text-[11px] text-deck-accent">D.E.C.K. analizuje dane…</p>}
            <div ref={dol} />
          </div>

          {blad && (
            <p role="alert" className="mb-2 rounded-md border border-deck-danger-border bg-deck-danger-bg/70 px-3 py-2 text-[11.5px] text-deck-danger">
              {blad}
            </p>
          )}

          <form onSubmit={wyslij} className="flex items-end gap-2">
            <textarea
              value={pytanie}
              onChange={(e) => setPytanie(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void wyslij()
                }
              }}
              rows={2}
              aria-label="Pytanie do D.E.C.K."
              placeholder="Np. które KPI spadają najmocniej i co z tym zrobić?"
              className="deck-input min-h-[44px] flex-1 resize-y rounded-lg px-3 py-2 text-[12.5px]"
            />
            <button
              type="submit"
              disabled={czeka || !pytanie.trim()}
              className="deck-button grid h-[44px] w-[44px] place-items-center rounded-lg disabled:opacity-50"
            >
              <Send size={15} aria-hidden="true" />
              <span className="sr-only">Wyślij</span>
            </button>
          </form>
          {wiadomosci.length > 0 && (
            <button
              type="button"
              onClick={() => setWiadomosci([])}
              className="mt-2 flex items-center gap-1.5 font-mono text-[10.5px] text-deck-muted hover:text-deck-danger"
            >
              <Trash2 size={11} aria-hidden="true" />
              Wyczyść rozmowę
            </button>
          )}
        </div>
      )}
    </section>
  )
}
```

- [ ] **Krok 6: `components/deck/DeckHub.tsx` - czat pod odprawą (tylko właściciel)**

Dodaj import `import { CzatDeck } from './CzatDeck'` i zamień blok odprawy:

```tsx
        {odprawa ? (
          <div className="grid gap-3">
            <Suspense fallback={<SzkieletOdprawy />}>
              <PanelOdprawy odprawa={odprawa} fakty={fakty} />
            </Suspense>
            <CzatDeck />
          </div>
        ) : (
          <PanelFaktow fakty={fakty} />
        )}
```

W `components/deck/DeckHub.test.tsx` dopisz dwa testy:

```tsx
  it('właściciel ma czat z asystentem', async () => {
    await hub()
    expect(screen.getByRole('button', { name: /Zapytaj D\.E\.C\.K\./ })).toBeInTheDocument()
  })

  it('zarząd nie ma czatu', async () => {
    await hub({ rola: 'board', email: 'Jula' })
    expect(screen.queryByRole('button', { name: /Zapytaj D\.E\.C\.K\./ })).toBeNull()
  })
```

- [ ] **Krok 7: Wszystkie testy, typy, lint; commit**

Run: `npx vitest run > "$TMP/vt.log" 2>&1; echo $?` (oczekiwane `0`), `npx tsc --noEmit`, `npx eslint components/deck`
Commit: `feat(kokpit): czat Zapytaj D.E.C.K.`

---

# FAZA 4 - logowanie

## Zadanie 13: Marka D.E.C.K. i liczby dekoracyjne

**Pliki:** `app/login/page.tsx`; nowy test `app/login/page.test.tsx`

- [ ] **Krok 1: Test**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import LoginPage from '@/app/login/page'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock('@/lib/auth/useAuth', () => ({
  useAuth: () => ({ rola: null, laduje: false, blad: null, zalogujHaslem: vi.fn(), zalogujKodem: vi.fn() }),
}))

describe('LoginPage', () => {
  it('marka D.E.C.K. z pełną nazwą zamiast starej', () => {
    render(<LoginPage />)
    expect(screen.getByText('D.E.C.K.')).toBeInTheDocument()
    expect(screen.getByText('Diagnostic Evaluation of Change & KPIs')).toBeInTheDocument()
    expect(screen.queryByText('SSUEW Analytics')).toBeNull()
  })

  it('liczby są dekoracją z neutralnymi podpisami, nie udają wskaźników', () => {
    render(<LoginPage />)
    for (const podpis of ['sygnał', 'szyfrowanie', 'węzły']) expect(screen.getByText(podpis)).toBeInTheDocument()
    expect(screen.queryByText('conversion')).toBeNull()
    expect(screen.queryByText('retention')).toBeNull()
  })

  it('logi i formularz kodu zostają', () => {
    render(<LoginPage />)
    expect(screen.getByText('private vault: awaiting operator')).toBeInTheDocument()
    expect(screen.getByLabelText('Cyfra 1 z 6')).toBeInTheDocument()
  })
})
```

- [ ] **Krok 2: Uruchom - ma paść**

- [ ] **Krok 3: `app/login/page.tsx` - dwie zmiany**

Nagłówek z logo (blok z `SSUEW Analytics` / `Private strategy command`) zamień na:

```tsx
          <div className="flex items-center gap-3">
            <LogoMark />
            <div>
              <div className="deck-glitch text-sm font-extrabold tracking-[0.26em] text-deck-text" data-tekst="D.E.C.K.">
                D.E.C.K.
              </div>
              <div className="mt-0.5 text-[10px] uppercase tracking-[0.22em] text-deck-muted">
                {'Diagnostic Evaluation of Change & KPIs'}
              </div>
            </div>
          </div>
```

Trzy `LiveDigits` zamień na:

```tsx
            {/* Ozdoba, nie dane: prawdziwe liczby są za logowaniem. */}
            <div className="mt-8 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
              <LiveDigits label="sygnał" value="-42 dBm" />
              <LiveDigits label="szyfrowanie" value="256 bit" speed={110} />
              <LiveDigits label="węzły" value="12/12" speed={125} />
            </div>
```

Deszcz Matrixa, `TekstDekodowany`, `logLines` i karta „access layer” zostają bez zmian.

- [ ] **Krok 4: Uruchom - ma przejść; commit** `feat(logowanie): marka D.E.C.K. i neutralne liczby dekoracyjne`

---

## Zadanie 14: Animowane cyfry kodu

**Pliki:** nowy `components/deck/CyfraDekodowana.tsx`; `components/deck/KodInput.tsx`; `app/globals.css` (blok `.kod`); testy `components/deck/CyfraDekodowana.test.tsx`, `components/deck/KodInput.test.tsx`

- [ ] **Krok 1: Diagnoza w prawdziwej przeglądarce - co dziś jest zepsute**

Zapisz `scratchpad/przegladarka/kod.mjs` (obok istniejącego `sciezka.mjs`, tam jest `puppeteer-core`):

```js
// Wpisuje cyfry w formularz kodu i po każdej zapisuje stan i zrzut ekranu.
// Uruchom przy działającym `npm run dev` (port 3000): node kod.mjs
import puppeteer from 'puppeteer-core'
import { existsSync } from 'node:fs'

const PRZEGLADARKI = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
]
const przegladarka = await puppeteer.launch({ executablePath: PRZEGLADARKI.find(existsSync), headless: true })
const strona = await przegladarka.newPage()
await strona.setViewport({ width: 1280, height: 800 })
strona.on('console', (m) => console.log('[konsola]', m.type(), m.text()))
strona.on('pageerror', (e) => console.log('[błąd strony]', e.message))
await strona.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' })
await strona.click('.kod__pole')

const stan = () => strona.evaluate(() => ({
  motyw: document.querySelector('.kod')?.className,
  wartosci: [...document.querySelectorAll('.kod__pole')].map((p) => p.value).join('|'),
  fokus: [...document.querySelectorAll('.kod__pole')].indexOf(document.activeElement),
  animacje: document.getAnimations().map((a) => a.animationName ?? a.constructor.name),
  kolor: getComputedStyle(document.querySelector('.kod__pole')).color,
}))

// Pięć cyfr - szósta wysłałaby prawdziwą próbę logowania.
for (const [i, cyfra] of ['4', '8', '1', '5', '9'].entries()) {
  await strona.keyboard.type(cyfra)
  await new Promise((r) => setTimeout(r, 60))
  console.log(`po ${i + 1}. cyfrze:`, JSON.stringify(await stan()))
  await strona.screenshot({ path: `kod-${i + 1}.png`, clip: { x: 840, y: 250, width: 420, height: 320 } })
}
await strona.keyboard.press('Backspace')
console.log('po Backspace:', JSON.stringify(await stan()))
await przegladarka.close()
```

Run (Git Bash, z katalogu `scratchpad/przegladarka`): `node kod.mjs`. Obejrzyj zrzuty (`Read` na `kod-1.png`...`kod-5.png`) i zapisz w notatce zadania, co się dzieje: czy fokus przechodzi dalej, czy cyfry są widoczne, czy któraś animacja rusza, czy są błędy w konsoli. Współrzędne `clip` dopasuj, jeśli formularz jest gdzie indziej.

Jeśli diagnoza pokaże błąd **poza** brakiem animacji przy wpisywaniu (np. fokus nie przechodzi, cyfra znika), najpierw napisz test, który go odtwarza w `KodInput.test.tsx`, napraw przyczynę i zrób osobny commit `fix(logowanie): ...` z opisem przyczyny. Dopiero potem kroki niżej.

- [ ] **Krok 2: Test `components/deck/CyfraDekodowana.test.tsx`**

```tsx
import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { CyfraDekodowana, KLATKI, TEMPO_MS } from '@/components/deck/CyfraDekodowana'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('CyfraDekodowana', () => {
  it('przewija znaki i kończy na właściwej cyfrze', () => {
    vi.useFakeTimers()
    const { container } = render(<CyfraDekodowana cyfra="7" />)
    expect(container.querySelector('.kod__znak--dekoduje')).not.toBeNull()
    // Klatka po klatce: każda planuje następną dopiero po przerysowaniu.
    for (let i = 0; i < KLATKI; i++) act(() => vi.advanceTimersByTime(TEMPO_MS))
    expect(screen.getByText('7')).not.toHaveClass('kod__znak--dekoduje')
  })

  it('przy ograniczonym ruchu cyfra jest od razu', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    render(<CyfraDekodowana cyfra="3" />)
    expect(screen.getByText('3')).not.toHaveClass('kod__znak--dekoduje')
  })
})
```

- [ ] **Krok 3: Test `components/deck/KodInput.test.tsx`**

```tsx
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { KodInput } from '@/components/deck/KodInput'
import { KLATKI, TEMPO_MS } from '@/components/deck/CyfraDekodowana'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const pole = (i: number) => screen.getByLabelText(`Cyfra ${i} z 6`)
const dokoncz = () => {
  for (let i = 0; i < KLATKI; i++) act(() => vi.advanceTimersByTime(TEMPO_MS))
}

describe('KodInput', () => {
  it('wpisana cyfra dekoduje się w kratce, a fokus idzie dalej', () => {
    vi.useFakeTimers()
    const { container } = render(<KodInput onKomplet={vi.fn()} stan="wpisywanie" motyw="orbita" />)
    fireEvent.change(pole(1), { target: { value: '4' } })
    expect(pole(1)).toHaveValue('4')
    expect(pole(2)).toHaveFocus()
    expect(container.querySelector('.kod__znak--dekoduje')).not.toBeNull()
    dokoncz()
    expect(container.querySelector('.kod__slot .kod__znak')).toHaveTextContent('4')
    expect(container.querySelector('.kod__znak--dekoduje')).toBeNull()
  })

  it('nadpisanie cyfry animuje od nowa', () => {
    vi.useFakeTimers()
    const { container } = render(<KodInput onKomplet={vi.fn()} stan="wpisywanie" motyw="orbita" />)
    fireEvent.change(pole(1), { target: { value: '4' } })
    dokoncz()
    fireEvent.change(pole(1), { target: { value: '5' } })
    expect(container.querySelector('.kod__znak--dekoduje')).not.toBeNull()
  })

  it('sześć cyfr wysyła kod dokładnie raz', () => {
    // Ograniczony ruch: pomija animację zbierania kratek, której jsdom nie umie odegrać.
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    const onKomplet = vi.fn()
    render(<KodInput onKomplet={onKomplet} stan="wpisywanie" motyw="orbita" />)
    '123456'.split('').forEach((c, i) => fireEvent.change(pole(i + 1), { target: { value: c } }))
    expect(onKomplet).toHaveBeenCalledTimes(1)
    expect(onKomplet).toHaveBeenCalledWith('123456')
  })

  it('wklejony kod animuje wszystkie kratki', () => {
    vi.useFakeTimers()
    const { container } = render(<KodInput onKomplet={vi.fn()} stan="wpisywanie" motyw="orbita" />)
    fireEvent.paste(pole(1), { clipboardData: { getData: () => '123' } })
    expect(container.querySelectorAll('.kod__znak--dekoduje')).toHaveLength(3)
  })
})
```

- [ ] **Krok 4: Uruchom - mają paść**

- [ ] **Krok 5: `components/deck/CyfraDekodowana.tsx`**

```tsx
'use client'
import { useEffect, useState } from 'react'

const ZNAKI = '0123456789'
/** Ile klatek przewijania przed właściwą cyfrą i co ile milisekund. */
export const KLATKI = 6
export const TEMPO_MS = 40

function ograniczRuch(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Wpisana cyfra „dekoduje się”: kilka klatek przypadkowych znaków, potem
 * właściwa - jak nagłówek strony. Każda nowa cyfra dostaje u rodzica nowy
 * `key`, więc komponent montuje się od zera i animacja nie potrzebuje
 * ustawiania stanu w efekcie.
 */
export function CyfraDekodowana({ cyfra }: { cyfra: string }) {
  const [klatka, setKlatka] = useState(() => (ograniczRuch() ? KLATKI : 0))

  useEffect(() => {
    if (klatka >= KLATKI) return
    const t = setTimeout(() => setKlatka((k) => k + 1), TEMPO_MS)
    return () => clearTimeout(t)
  }, [klatka])

  const gotowa = klatka >= KLATKI
  return (
    <span className={gotowa ? 'kod__znak' : 'kod__znak kod__znak--dekoduje'}>
      {gotowa ? cyfra : ZNAKI[(klatka * 7 + Number(cyfra) * 3 + 1) % ZNAKI.length]}
    </span>
  )
}
```

- [ ] **Krok 6: `components/deck/KodInput.tsx` - zmiany**

Import: `import { CyfraDekodowana } from './CyfraDekodowana'`.

Pod `const [cyfry, setCyfry] = ...` dodaj licznik wpisań na kratkę:

```tsx
  // Numer wpisania w każdej kratce - nowy numer to nowy `key`, czyli animacja
  // od początku, także gdy w to samo miejsce wpada ta sama cyfra.
  const [wpisania, setWpisania] = useState<number[]>(() => Array(DLUGOSC_KODU).fill(0))
  const oznaczWpisane = useCallback((indeksy: number[]) => {
    setWpisania((poprzednie) => poprzednie.map((n, i) => (indeksy.includes(i) ? n + 1 : n)))
  }, [])
```

W `naZmiane` po `ustaw(i, cyfra)` dopisz `oznaczWpisane([i])`.

W `naWklejenie` po `setCyfry(nowe)` dopisz `oznaczWpisane(wklejone.split('').map((_, idx) => idx))`.

W kratce, **po** `<span className="kod__ramka" ... />` (nie przed - CSS `.kod__pole:focus + .kod__ramka` wymaga, żeby ramka stała tuż za polem), dodaj:

```tsx
            {/* Pole ma przezroczysty tekst - cyfrę widać tutaj, z animacją. */}
            <span className="kod__cyfra" aria-hidden="true">
              {cyfra && <CyfraDekodowana key={wpisania[i]} cyfra={cyfra} />}
            </span>
```

- [ ] **Krok 7: `app/globals.css` - blok `.kod`**

W `.kod__pole` zamień `color: var(--lod);` na `color: transparent;` i dopisz pod regułą `.kod__pole:disabled`:

```css
.kod__pole::selection {
  background: transparent;
}

/* Cyfra nad polem: pole zostaje do wpisywania, a to widać. */
.kod__cyfra {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  place-items: center;
  pointer-events: none;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 24px;
  font-weight: 600;
  color: var(--lod);
}

.kod__znak--dekoduje {
  color: var(--dobrze);
  text-shadow: 0 0 12px rgba(46, 230, 168, 0.55);
  opacity: 0.85;
}
```

W bloku `@media` z mniejszymi kratkami (obok `.kod__pole { font-size: 20px; }`) dopisz `.kod__cyfra { font-size: 20px; }`.

Werdykty: `.kod--ok .kod__pole { color: var(--dobrze); }` zamień na `.kod--ok .kod__cyfra { color: var(--dobrze); }`, a `.kod--blad .kod__pole { color: var(--zle); }` na `.kod--blad .kod__cyfra { color: var(--zle); }`.

- [ ] **Krok 8: Testy; ponowna diagnoza w przeglądarce**

Run: `npx vitest run components/deck > "$TMP/vt.log" 2>&1; echo $?` (oczekiwane `0`). Potem `node kod.mjs` jeszcze raz: na zrzutach cyfry muszą być widoczne (`kolor` pola `rgba(0, 0, 0, 0)` jest teraz poprawny - cyfrę rysuje `.kod__cyfra`), a w `animacje` po wpisaniu nie może być błędów w konsoli. Obejrzyj też zrzut tuż po wpisaniu (zmień opóźnienie na 10 ms), żeby zobaczyć klatkę dekodowania.

- [ ] **Krok 9: Commit** `feat(logowanie): cyfry kodu dekoduja sie przy wpisywaniu`

---

# FAZA 5 - wdrożenie

## Zadanie 15: Narzędzie do klucza Gemini i dokumentacja

**Pliki:** nowy `scripts/gemini.mjs`; `package.json`; `README.md`; `.env.example`

- [ ] **Krok 1: `scripts/gemini.mjs`**

```js
// Sprawdzenie klucza Gemini bez uruchamiania aplikacji.
//   npm run gemini -- modele   lista modeli, które umieją generateContent
//   npm run gemini -- proba    jedno zapytanie ze schematem JSON, z czasem odpowiedzi
import { existsSync, readFileSync } from 'node:fs'

if (existsSync('.env.local')) {
  for (const linia of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = linia.match(/^\s*(GEMINI_[A-Z_]+)\s*=\s*"?([^"]*)"?\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}

const klucz = process.env.GEMINI_API_KEY
if (!klucz) {
  console.error('Brak GEMINI_API_KEY w .env.local - klucz założysz na https://aistudio.google.com/apikey')
  process.exit(1)
}
const ADRES = 'https://generativelanguage.googleapis.com/v1beta'
const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash'
const [polecenie = 'proba'] = process.argv.slice(2)

if (polecenie === 'modele') {
  const res = await fetch(`${ADRES}/models?pageSize=200`, { headers: { 'x-goog-api-key': klucz } })
  const dane = await res.json()
  if (!res.ok) {
    console.error(`HTTP ${res.status}: ${dane.error?.message}`)
    process.exit(1)
  }
  for (const m of dane.models ?? []) {
    if (m.supportedGenerationMethods?.includes('generateContent')) console.log(`${m.name.replace('models/', '')}  (${m.displayName})`)
  }
} else if (polecenie === 'proba') {
  const start = Date.now()
  const res = await fetch(`${ADRES}/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': klucz },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'Podaj dwa ryzyka dla samorządu studenckiego przed rekrutacją.' }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: { type: 'OBJECT', properties: { ryzyka: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['ryzyka'] },
      },
    }),
  })
  const dane = await res.json()
  console.log(`model ${model}: HTTP ${res.status} w ${Date.now() - start} ms`)
  console.log(res.ok ? dane.candidates?.[0]?.content?.parts?.[0]?.text : dane.error?.message)
  if (!res.ok) process.exit(1)
} else {
  console.error('Użycie: npm run gemini -- modele | proba')
  process.exit(1)
}
```

- [ ] **Krok 2: `package.json`** - w `scripts` pod `"gas"` dopisz `"gemini": "node scripts/gemini.mjs"`.

- [ ] **Krok 3: `.env.example`** - dopisz na końcu:

```
# ─── Asystent D.E.C.K. (Gemini) ─────────────────────────────────────
# Klucz z https://aistudio.google.com/apikey (darmowy poziom). Bez niego
# kokpit działa, tylko zamiast odprawy pokazuje fakty. Sprawdzenie:
# npm run gemini -- modele / npm run gemini -- proba
GEMINI_API_KEY=
# Opcjonalnie - domyślnie gemini-3.8-flash.
GEMINI_MODEL=
```

Przy okazji zamień w tym pliku długie myślniki (U+2014, m.in. po „Firebase” i po „kodem”) na „-”; kreski ramki w nagłówkach sekcji (U+2500) zostają - to inny znak. Sprawdź: `node -e "const t=require('fs').readFileSync('.env.example','utf8');console.log(/[\u2014\u2013]/.test(t))"` → `false`.

- [ ] **Krok 4: `README.md`** - nowa sekcja po „Region funkcji”:

```markdown
## Asystent D.E.C.K. (Gemini)

Odprawa w kokpicie i czat „Zapytaj D.E.C.K.” korzystają z Gemini API na darmowym poziomie.
Widzi je wyłącznie właściciel; zarząd ma w tym miejscu panel faktów bez AI.

| Zmienna | Gdzie | Co |
|---|---|---|
| `GEMINI_API_KEY` | `.env.local` i zmienne Vercela (Production) | klucz z Google AI Studio |
| `GEMINI_MODEL` | opcjonalnie | domyślnie `gemini-3.8-flash` |

- `npm run gemini -- modele` - modele dostępne na kluczu; `npm run gemini -- proba` - jedno zapytanie ze schematem i czas odpowiedzi.
- Odprawa jest w Firestore `asystent/odprawa` (czyta i pisze tylko serwer; reguły klienta jej nie wpuszczają).
  Kokpit pokazuje zapisaną od razu, a nową liczy w tle (`after()`), najwyżej raz na godzinę i tylko po zmianie danych albo dnia.
- Do Google trafia obraz projektu z imionami i nazwiskami osób z Planera - świadoma decyzja z projektu
  `docs/superpowers/specs/2026-10-02-deck-asystent-kokpit-design.md`. W EOG darmowy poziom podlega warunkom przetwarzania jak płatny.
```

- [ ] **Krok 5: Commit** `chore(asystent): skrypt sprawdzania klucza Gemini i dokumentacja`

---

## Zadanie 16: Wdrożenie i sprawdzenie na produkcji

- [ ] **Krok 1: Klucz (robi użytkownik)** - https://aistudio.google.com/apikey (konto 18+), „Create API key”. Wkleja do `.env.local` jako `GEMINI_API_KEY=...`.

- [ ] **Krok 2: Model i limity**

Run: `npm run gemini -- modele`, potem `npm run gemini -- proba`. Jeśli `gemini-3.8-flash` nie ma na liście albo `proba` zwraca błąd schematu, wybierz najnowszy „flash” z listy (`GEMINI_MODEL=...`) i powtórz. Jeśli `responseSchema` jest odrzucany, zamień w `lib/asystent/gemini.ts` pole na `responseJsonSchema` (typy małymi literami: `object`, `string`, `array`) razem z testem „ze schematem prosi o JSON” i `SCHEMAT_ODPRAWY`. Limity darmowego poziomu dla wybranego modelu użytkownik odczytuje w AI Studio (zakładka „Rate limits”) - wpisać je do notatki w pamięci.

- [ ] **Krok 3: Zmienne Vercela (robi użytkownik)** - Project → Settings → Environment Variables → `GEMINI_API_KEY` (Production), opcjonalnie `GEMINI_MODEL`.

- [ ] **Krok 4: Pełna weryfikacja przed wypchnięciem**

Run: `npx vitest run > "$TMP/vt.log" 2>&1; echo $?` (oczekiwane `0`), `npx tsc --noEmit`, `npx eslint`, `npx next build`. Dodatkowo `node -e` z `/[\u2014\u2013]/` po wszystkich zmienionych plikach `app/`, `components/`, `lib/` - zero trafień w tekstach widocznych dla użytkownika.

- [ ] **Krok 5: Wypchnięcie** - `git push origin main` (Vercel buduje sam).

- [ ] **Krok 6: Sprawdzenie na produkcji**

1. Właściciel (hasło): kokpit ładuje się bez czekania; przy pierwszym wejściu panel „Odprawa D.E.C.K.” pokazuje zachętę i fakty. Po ~30 s odśwież stronę - jest odprawa (powstała w tle). Jeśli nie: logi funkcji na Vercelu, wpis `[asystent] odprawa w tle:`.
2. „Odśwież” w panelu - nowa odprawa w kilka-kilkanaście sekund; zagrożenia prowadzą do właściwych modułów.
3. „Zapytaj D.E.C.K.”: pytanie o retencję i o najbliższe wydarzenia - odpowiedź z liczbami z danych, bez długich myślników.
4. Zarząd (kod): panel „Na teraz”, brak odprawy i czatu; `POST /api/asystent/czat` z ciasteczkiem zarządu → 403.
5. Pasek statusu: czas arkusza, Firestore ok, sposób wejścia.
6. `/login`: marka D.E.C.K., cyfry dekodują się przy wpisywaniu, poprawny kod wpuszcza.

- [ ] **Krok 7: Pamięć** - zaktualizuj notatkę projektu w pamięci: asystent na produkcji, wybrany model, limity, co zostało (Lista w Excelu, Strony, plan kadencji, kolejne partie wyglądu).

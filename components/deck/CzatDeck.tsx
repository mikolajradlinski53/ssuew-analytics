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

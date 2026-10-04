'use client'
import { useEffect, useRef, useState } from 'react'
import { RotateCcw, Send } from 'lucide-react'
import { BladKlienta, klient } from '@/lib/asystent/klient'
import { DLUGOSC_NOTATKI } from '@/lib/asystent/pamiec'
import { TekstAsystenta } from './TekstAsystenta'

type Wpis = { rola: 'ja' | 'deck'; tresc: string }

export function CzatRozmowa({ poczatkowaId, onRozmowa }: {
  poczatkowaId: string | null
  onRozmowa: (id: string | null) => void
}) {
  // Wątek z chwili montowania. Id nadane przez serwer w trakcie rozmowy nie
  // może ponownie wczytywać wątku - przy błędzie odczytu skasowałoby rozmowę.
  const [startowa] = useState(poczatkowaId)
  const [id, setId] = useState(poczatkowaId)
  const [wiadomosci, setWiadomosci] = useState<Wpis[]>([])
  const [laduje, setLaduje] = useState(poczatkowaId !== null)
  const [pytanie, setPytanie] = useState('')
  const [czeka, setCzeka] = useState(false)
  const [blad, setBlad] = useState<string | null>(null)
  const [bezOdpowiedzi, setBezOdpowiedzi] = useState(false)
  const [propozycja, setPropozycja] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const dol = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!startowa) return
    let aktualny = true
    klient
      .rozmowa(startowa)
      .then((r) => {
        if (!aktualny) return
        setWiadomosci(r.wiadomosci.map(({ rola, tresc }) => ({ rola, tresc })))
        setBezOdpowiedzi(r.wiadomosci.at(-1)?.rola === 'ja')
      })
      .catch(() => {
        // Wątek usunięty albo niedostępny - zaczynamy od czystej rozmowy.
        if (aktualny) onRozmowa(null)
      })
      .finally(() => {
        if (aktualny) setLaduje(false)
      })
    return () => {
      aktualny = false
    }
  }, [startowa, onRozmowa])

  useEffect(() => {
    dol.current?.scrollIntoView?.({ block: 'nearest' })
  }, [wiadomosci, czeka])

  function ustawId(nowe: string | null) {
    if (nowe && nowe !== id) {
      setId(nowe)
      onRozmowa(nowe)
    }
  }

  async function wyslij(ponow = false) {
    const tresc = ponow ? [...wiadomosci].reverse().find((w) => w.rola === 'ja')?.tresc ?? '' : pytanie.trim()
    if (!tresc || czeka) return
    if (!ponow) {
      setWiadomosci((w) => [...w, { rola: 'ja', tresc }])
      setPytanie('')
    }
    setBlad(null)
    setInfo(null)
    setBezOdpowiedzi(false)
    setPropozycja(null)
    setCzeka(true)
    try {
      const r = await klient.zapytaj({ rozmowaId: id, pytanie: tresc, ponow })
      ustawId(r.rozmowaId)
      setWiadomosci((w) => [...w, { rola: 'deck', tresc: r.odpowiedz }])
      setPropozycja(r.propozycja)
    } catch (e) {
      const b = e instanceof BladKlienta ? e : new BladKlienta('Coś poszło nie tak - spróbuj ponownie.')
      ustawId(b.rozmowaId)
      setBlad(b.message)
      setBezOdpowiedzi(true)
    } finally {
      setCzeka(false)
    }
  }

  async function zapiszPropozycje() {
    if (!propozycja?.trim()) return
    try {
      await klient.dodajNotatke(propozycja.trim().slice(0, DLUGOSC_NOTATKI), 'rozmowa')
      setPropozycja(null)
      setInfo('Zapisano w notatkach.')
    } catch (e) {
      setBlad(e instanceof Error ? e.message : 'Nie udało się zapisać notatki.')
    }
  }

  return (
    <div>
      <div className="max-h-[420px] space-y-3 overflow-y-auto pb-3 text-[12.5px] leading-relaxed">
        {laduje && <p className="font-mono text-[11px] text-deck-muted">Wczytuję rozmowę…</p>}
        {!laduje && wiadomosci.length === 0 && (
          <p className="text-deck-muted">
            Pytaj o wskaźniki, ryzyka, kalendarz albo poproś o tekst. D.E.C.K. widzi te same dane co kokpit, Twoje notatki i ostatnią odprawę.
          </p>
        )}
        {wiadomosci.map((w, i) =>
          w.rola === 'ja' ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-lg bg-deck-accent/10 px-3 py-2 text-deck-text">
              {w.tresc}
              {bezOdpowiedzi && i === wiadomosci.length - 1 && (
                <span className="mt-1 block font-mono text-[10px] text-deck-warn">bez odpowiedzi</span>
              )}
            </div>
          ) : (
            <div key={i} className="max-w-[92%] rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-deck-text">
              <TekstAsystenta tekst={w.tresc} />
            </div>
          ),
        )}
        {czeka && <p className="deck-caret font-mono text-[11px] text-deck-accent">D.E.C.K. analizuje dane…</p>}

        {propozycja !== null && (
          <div className="rounded-lg border border-deck-accent/30 bg-deck-accent/[0.06] p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-deck-accent">Zapamiętać?</div>
            <input
              value={propozycja}
              onChange={(e) => setPropozycja(e.target.value)}
              maxLength={DLUGOSC_NOTATKI}
              aria-label="Treść notatki"
              className="deck-input mt-2 w-full rounded-md px-2.5 py-1.5 text-[12.5px]"
            />
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={zapiszPropozycje} className="deck-button rounded-md px-3 py-1 text-[11.5px]">
                Zapisz notatkę
              </button>
              <button
                type="button"
                onClick={() => setPropozycja(null)}
                className="rounded-md border border-white/10 px-3 py-1 text-[11.5px] text-deck-muted hover:text-deck-text"
              >
                Pomiń
              </button>
            </div>
          </div>
        )}
        {info && <p className="font-mono text-[11px] text-deck-accent">{info}</p>}
        <div ref={dol} />
      </div>

      {blad && (
        <div role="alert" className="mb-2 flex items-center gap-3 rounded-md border border-deck-danger-border bg-deck-danger-bg/70 px-3 py-2 text-[11.5px] text-deck-danger">
          <span className="flex-1">{blad}</span>
          {bezOdpowiedzi && (
            <button type="button" onClick={() => wyslij(true)} className="flex items-center gap-1 font-semibold hover:underline">
              <RotateCcw size={11} aria-hidden="true" />
              Ponów
            </button>
          )}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void wyslij()
        }}
        className="flex items-end gap-2"
      >
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
    </div>
  )
}

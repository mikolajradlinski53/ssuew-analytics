'use client'
import { useEffect, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { klient } from '@/lib/asystent/klient'
import { DLUGOSC_NOTATKI, LIMIT_NOTATEK, type Notatka } from '@/lib/asystent/pamiec'

export function CzatNotatki() {
  const [lista, setLista] = useState<Notatka[] | null>(null)
  const [nowa, setNowa] = useState('')
  const [edytowana, setEdytowana] = useState<{ id: string; tresc: string } | null>(null)
  const [blad, setBlad] = useState<string | null>(null)

  useEffect(() => {
    let aktualny = true
    klient
      .notatki()
      .then((n) => {
        if (aktualny) setLista(n)
      })
      .catch((e: Error) => {
        if (aktualny) setBlad(e.message)
      })
    return () => {
      aktualny = false
    }
  }, [])

  const pelna = (lista?.length ?? 0) >= LIMIT_NOTATEK

  async function dodaj(e: React.FormEvent) {
    e.preventDefault()
    if (!nowa.trim() || pelna) return
    setBlad(null)
    try {
      const n = await klient.dodajNotatke(nowa.trim(), 'reczna')
      setLista((l) => [n, ...(l ?? [])])
      setNowa('')
    } catch (er) {
      setBlad((er as Error).message)
    }
  }

  async function zapiszEdycje() {
    if (!edytowana?.tresc.trim()) return
    setBlad(null)
    try {
      const { tresc } = await klient.zmienNotatke(edytowana.id, edytowana.tresc.trim())
      setLista((l) => l?.map((n) => (n.id === edytowana.id ? { ...n, tresc } : n)) ?? null)
      setEdytowana(null)
    } catch (er) {
      setBlad((er as Error).message)
    }
  }

  async function usun(n: Notatka) {
    setBlad(null)
    try {
      await klient.usunNotatke(n.id)
      setLista((l) => l?.filter((x) => x.id !== n.id) ?? null)
    } catch (er) {
      setBlad((er as Error).message)
    }
  }

  return (
    <div className="space-y-3 text-[12.5px]">
      <div className="flex items-center justify-between">
        <p className="text-deck-muted">Ustalenia, które D.E.C.K. zna przy każdym pytaniu i odprawie.</p>
        <span className="font-mono text-[10.5px] text-deck-muted">{lista ? `${lista.length}/${LIMIT_NOTATEK}` : ''}</span>
      </div>
      {blad && <p role="alert" className="text-[11.5px] text-deck-danger">{blad}</p>}

      <form onSubmit={dodaj} className="flex gap-2">
        <input
          value={nowa}
          onChange={(e) => setNowa(e.target.value)}
          maxLength={DLUGOSC_NOTATKI}
          disabled={pelna}
          aria-label="Nowa notatka"
          placeholder={pelna ? 'Limit 50 notatek - usuń starą' : 'Np. cel retencji kadencji: 3,5 semestru'}
          className="deck-input flex-1 rounded-md px-2.5 py-1.5 disabled:opacity-60"
        />
        <button type="submit" disabled={pelna || !nowa.trim()} className="deck-button rounded-md px-3 py-1 text-[11.5px] disabled:opacity-50">
          Dodaj notatkę
        </button>
      </form>

      {lista === null && !blad && <p className="font-mono text-[11px] text-deck-muted">Wczytuję notatki…</p>}
      <ul className="space-y-1.5">
        {lista?.map((n) => (
          <li key={n.id} className="flex items-start gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
            {edytowana?.id === n.id ? (
              <>
                <input
                  value={edytowana.tresc}
                  onChange={(e) => setEdytowana({ id: n.id, tresc: e.target.value })}
                  maxLength={DLUGOSC_NOTATKI}
                  aria-label="Popraw treść"
                  className="deck-input flex-1 rounded-md px-2 py-1"
                />
                <button type="button" onClick={zapiszEdycje} className="text-[11.5px] text-deck-accent hover:underline">
                  Zapisz
                </button>
                <button type="button" onClick={() => setEdytowana(null)} className="text-[11.5px] text-deck-muted hover:underline">
                  Anuluj
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-deck-text">{n.tresc}</span>
                <button
                  type="button"
                  onClick={() => setEdytowana({ id: n.id, tresc: n.tresc })}
                  aria-label={`Popraw notatkę „${n.tresc}”`}
                  className="text-deck-muted hover:text-deck-text"
                >
                  <Pencil size={12} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => usun(n)}
                  aria-label={`Usuń notatkę „${n.tresc}”`}
                  className="text-deck-muted hover:text-deck-danger"
                >
                  <Trash2 size={12} aria-hidden="true" />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { klient } from '@/lib/asystent/klient'
import type { SkrotRozmowy } from '@/lib/asystent/pamiec'

const kiedy = (ms: number) =>
  new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(ms)

export function CzatWatki({ aktywna, onOtworz, onUsunieto }: {
  aktywna: string | null
  onOtworz: (id: string) => void
  /** `null` - usunięto wszystkie. */
  onUsunieto: (id: string | null) => void
}) {
  const [lista, setLista] = useState<SkrotRozmowy[] | null>(null)
  const [blad, setBlad] = useState<string | null>(null)

  useEffect(() => {
    let aktualny = true
    klient
      .rozmowy()
      .then((r) => {
        if (aktualny) setLista(r)
      })
      .catch((e: Error) => {
        if (aktualny) setBlad(e.message)
      })
    return () => {
      aktualny = false
    }
  }, [])

  async function usun(id: string) {
    try {
      await klient.usunRozmowe(id)
      setLista((l) => l?.filter((r) => r.id !== id) ?? null)
      onUsunieto(id)
    } catch (e) {
      setBlad((e as Error).message)
    }
  }

  async function usunWszystkie() {
    if (!window.confirm('Usunąć wszystkie rozmowy? Notatki zostaną. Tego nie da się cofnąć.')) return
    try {
      await klient.usunRozmowy()
      setLista([])
      onUsunieto(null)
    } catch (e) {
      setBlad((e as Error).message)
    }
  }

  return (
    <div className="space-y-2 text-[12.5px]">
      {blad && <p role="alert" className="text-[11.5px] text-deck-danger">{blad}</p>}
      {lista === null && !blad && <p className="font-mono text-[11px] text-deck-muted">Wczytuję rozmowy…</p>}
      {lista?.length === 0 && <p className="text-deck-muted">Brak zapisanych rozmów.</p>}
      <ul className="space-y-1.5">
        {lista?.map((r) => (
          <li key={r.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOtworz(r.id)}
              className={`flex-1 rounded-md border px-3 py-2 text-left transition hover:border-deck-accent/40 ${
                r.id === aktywna ? 'border-deck-accent/40 bg-deck-accent/[0.06]' : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              <span className="block text-deck-text">{r.tytul}</span>
              <span className="font-mono text-[10px] text-deck-muted">{kiedy(r.zmieniono)}</span>
            </button>
            <button
              type="button"
              onClick={() => usun(r.id)}
              aria-label={`Usuń rozmowę „${r.tytul}”`}
              className="grid h-8 w-8 place-items-center rounded-md border border-white/10 text-deck-muted hover:text-deck-danger"
            >
              <Trash2 size={13} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      {!!lista?.length && (
        <button type="button" onClick={usunWszystkie} className="font-mono text-[10.5px] text-deck-muted hover:text-deck-danger">
          Wyczyść wszystkie rozmowy
        </button>
      )}
    </div>
  )
}

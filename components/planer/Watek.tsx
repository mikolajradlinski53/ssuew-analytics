'use client'
import { useState } from 'react'
import { Send } from 'lucide-react'
import type { Komentarz } from '@/lib/planer/komentarze'

type Props = {
  komentarze: Komentarz[]
  onDodaj: (tresc: string) => void
}

function godzina(ms: number): string {
  return new Date(ms).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
}

export function Watek({ komentarze, onDodaj }: Props) {
  const [tresc, setTresc] = useState('')

  function wyslij() {
    const czysta = tresc.trim()
    if (!czysta) return
    onDodaj(czysta)
    setTresc('')
  }

  return (
    <div className="mt-4 border-t border-white/8 pt-3">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-deck-muted/70">
        rozmowa
      </div>

      {komentarze.length === 0 ? (
        <p className="text-[11.5px] text-deck-muted/70">Nikt jeszcze nic nie napisał.</p>
      ) : (
        <div className="space-y-2">
          {komentarze.map((k) => (
            <div key={k.id} className="rounded-md border border-white/8 bg-white/[0.02] px-2.5 py-2">
              <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-deck-muted/70">
                {k.autor} · {godzina(k.utworzone)}
              </div>
              <div className="mt-1 text-[11.5px] leading-relaxed text-deck-text">{k.tresc}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 flex gap-2">
        <input
          value={tresc}
          onChange={(e) => setTresc(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') wyslij() }}
          placeholder="Napisz coś…"
          className="deck-input flex-1 rounded-lg px-2.5 py-1.5 text-[11.5px]"
        />
        <button
          type="button"
          onClick={wyslij}
          aria-label="Wyślij"
          className="grid h-8 w-8 place-items-center rounded-lg border border-deck-accent/40 text-deck-accent transition hover:bg-deck-accent/15"
        >
          <Send size={13} />
        </button>
      </div>
    </div>
  )
}

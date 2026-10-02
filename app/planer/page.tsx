import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ktoNaStronie } from '@/lib/auth/naStronie'
import { biezacySemestr } from '@/lib/planer/semestry'
import { obrazPlanera, type ObrazPlanera } from '@/lib/planer/obraz'
import { PlanerClient } from '@/components/planer/PlanerClient'

export default async function PlanerPage() {
  const kto = await ktoNaStronie()
  if (!kto) redirect('/login')

  const semestr = biezacySemestr(new Date())

  // Konta z hasłem subskrybują Firestore same. Osoba na kodzie nie ma konta
  // Firebase - bez obrazu z serwera widziała pusty kalendarz.
  const naZywo = !kto.uid.startsWith('kod:')
  const poczatkowy: ObrazPlanera | null = naZywo
    ? null
    : await obrazPlanera(semestr.id).catch(() => null)

  return (
    <main className="mx-auto w-full max-w-[1360px] p-[clamp(16px,2.4vw,34px)]">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/"
            className="mb-2 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-deck-muted transition hover:text-deck-text"
          >
            <ArrowLeft size={12} /> DECK
          </Link>
          <h1 className="text-lg font-semibold text-deck-text">Planer semestru</h1>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-deck-muted/70">
            {semestr.nazwa}
          </p>
        </div>
        {kto.rola !== 'owner' && (
          <span className="deck-chip rounded-lg px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-deck-muted">
            podgląd
          </span>
        )}
      </header>

      <PlanerClient
        semestr={semestr}
        rola={kto.rola}
        kto={kto.email}
        poczatkowy={poczatkowy}
        naZywo={naZywo}
      />
    </main>
  )
}

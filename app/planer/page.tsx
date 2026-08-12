import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { zweryfikujToken } from '@/lib/auth/verify'
import { odczytajSesjeKodu } from '@/lib/auth/session'
import { rolaDla } from '@/lib/auth/role'
import { opisSemestru } from '@/lib/planer/semestry'
import { PlanerClient } from '@/components/planer/PlanerClient'

/** Semestr zimowy 2026/2027 — przełączanie semestrów dochodzi w Etapie 3b. */
const BIEZACY = opisSemestru(2026, 'Z')

export default async function PlanerPage() {
  const ciasteczka = await cookies()

  const token = ciasteczka.get('deck_session')?.value ?? ''
  const tozsamosc = await zweryfikujToken(token)
  const rolaKonta = rolaDla(tozsamosc?.email)

  const bilet = ciasteczka.get('deck_kod')?.value ?? ''
  const sesjaKodu = rolaKonta ? null : await odczytajSesjeKodu(bilet)

  const rola = rolaKonta ?? sesjaKodu?.rola ?? null
  if (!rola) redirect('/login')

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
            {BIEZACY.nazwa}
          </p>
        </div>
        {rola !== 'owner' && (
          <span className="deck-chip rounded-lg px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-deck-muted">
            podgląd
          </span>
        )}
      </header>

      <PlanerClient
        semestr={BIEZACY}
        rola={rola}
        kto={tozsamosc?.email ?? sesjaKodu?.kod ?? ''}
        poczatkowe={[]}
        naZywo={rolaKonta !== null}
      />
    </main>
  )
}

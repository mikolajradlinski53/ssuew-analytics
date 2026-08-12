'use client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { LogoMark } from '@/components/ui/LogoMark'
import { useAuth } from '@/lib/auth/useAuth'
import { DeckTile } from './DeckTile'
import { MatrixRain } from './MatrixRain'
import { SekwencjaStartowa } from './SekwencjaStartowa'
import type { Rola } from '@/lib/auth/role'

export interface DaneKokpitu {
  konwersja: number
  retencja: number
  kpiWzrosty: number
  kpiRazem: number
  alerty: number
}

type Props = { rola: Rola; email: string; dane: DaneKokpitu }

export function DeckHub({ rola, email, dane }: Props) {
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
      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1360px] flex-col gap-7 p-[clamp(16px,2.4vw,34px)]">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-white/8 pb-[18px]">
        <div className="flex items-center gap-3.5">
          <LogoMark />
          <div>
            <h1
              className="deck-glitch text-[27px] font-extrabold leading-none tracking-[0.26em] text-deck-text"
              data-tekst="DECK"
            >
              DECK
            </h1>
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-deck-muted/70">
              prywatne centrum dowodzenia
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

      <main className="grid flex-1 auto-rows-[minmax(168px,auto)] grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DeckTile
          stan="zywy"
          href="/analytics"
          etykieta="moduł 01 · analityka"
          tytul="SSUEW Analytics"
          odznaka={dane.alerty > 0 ? `${dane.alerty} alerty` : undefined}
          span={2}
          rows={2}
        >
          <div className="flex h-full flex-col justify-between gap-4">
            <div className="flex items-baseline gap-2.5 tabular-nums">
              {/* AnimatedNumber renderuje własny <span> i nie przyjmuje className — styl idzie na opakowanie. */}
              <span className="text-[clamp(30px,3.4vw,46px)] font-bold leading-none tracking-[-0.035em]">
                <AnimatedNumber value={dane.konwersja} decimals={1} />
              </span>
              <span className="text-[13px] font-medium text-deck-muted">% konwersji</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5 border-t border-white/8 pt-3.5">
              <Statystyka etykieta="retencja" wartosc={dane.retencja} miejsca={2} jednostka="sem." />
              <Statystyka
                etykieta="KPI r/r"
                wartosc={dane.kpiWzrosty}
                miejsca={0}
                jednostka={`/ ${dane.kpiRazem} wzrostów`}
              />
              <Statystyka etykieta="alerty" wartosc={dane.alerty} miejsca={0} jednostka="otwarte" />
            </div>
          </div>
        </DeckTile>

        <DeckTile
          stan="zywy"
          href="/planer"
          etykieta="moduł 02 · kalendarz"
          tytul="Planer semestru"
        >
          <p className="text-[12px] leading-relaxed text-deck-muted">
            Kalendarz semestru z wykrywaniem kolizji osób i sal.
          </p>
        </DeckTile>

        {rola === 'owner' && (
          <DeckTile
            stan="zablokowany"
            href="/orbita"
            etykieta="moduł 03 · zadania"
            tytul="Orbita"
            wkrotce="etap 2"
          >
            <p className="text-[12px] leading-relaxed">Radar zadań — bliżej środka znaczy pilniej.</p>
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

      <footer className="border-t border-white/8 pt-3.5 font-mono text-[10.5px] tracking-[0.06em] text-deck-muted/70">
        <SekwencjaStartowa
          linie={[
            'arkusz podłączony',
            `sesja ${rola === 'owner' ? 'hasło' : 'kod'}, aktywna`,
            `${dane.kpiRazem} metryk w pamięci`,
            'kokpit gotowy',
          ]}
        />
      </footer>
      </div>
    </>
  )
}

function Statystyka({
  etykieta,
  wartosc,
  miejsca,
  jednostka,
}: {
  etykieta: string
  wartosc: number
  miejsca: number
  jednostka: string
}) {
  return (
    <div>
      <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-deck-muted/70">{etykieta}</div>
      <div className="mt-1.5 text-[19px] font-semibold tracking-[-0.02em] tabular-nums text-deck-text">
        <AnimatedNumber value={wartosc} decimals={miejsca} />
        <span className="ml-1 text-[11px] font-medium text-deck-muted">{jednostka}</span>
      </div>
    </div>
  )
}

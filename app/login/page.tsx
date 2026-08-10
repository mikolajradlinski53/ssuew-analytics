'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, KeyRound, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react'
import { useAuth } from '@/lib/auth/useAuth'
import { KodInput } from '@/components/deck/KodInput'
import { LiveDigits } from '@/components/ui/LiveDigits'
import { LogoMark } from '@/components/ui/LogoMark'

const logLines = [
  'sync: recruitment.signal -> ready',
  'retention.curves: calibrated',
  'kpi.yoy: live comparator online',
  'private vault: awaiting operator',
]

export default function LoginPage() {
  const router = useRouter()
  const { rola, laduje, blad, zalogujHaslem, zalogujKodem } = useAuth()
  const [droga, setDroga] = useState<'kod' | 'haslo'>('kod')
  const [email, setEmail] = useState('')
  const [haslo, setHaslo] = useState('')
  const [zajety, setZajety] = useState(false)
  const [udalo, setUdalo] = useState(false)

  useEffect(() => {
    if (rola) {
      router.push('/')
      router.refresh()
    }
  }, [rola, router])

  const stanKodu = udalo ? 'ok' : zajety ? 'sprawdzanie' : blad ? 'blad' : 'wpisywanie'

  async function sprawdzKod(wpisany: string) {
    setZajety(true)
    const ok = await zalogujKodem(wpisany)
    setZajety(false)
    setUdalo(ok)
  }

  async function wyslij(e: React.FormEvent) {
    e.preventDefault()
    setZajety(true)
    await zalogujHaslem(email, haslo)
    setZajety(false)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-deck-bg-deep">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(46,230,166,0.16),transparent_34%),radial-gradient(circle_at_80%_70%,rgba(217,176,106,0.13),transparent_32%)]" />
      <div className="absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-deck-accent/10 bg-deck-accent/5 blur-3xl" />
      <div className="relative grid min-h-screen grid-cols-[1fr_420px] gap-10 px-10 py-8">
        <section className="flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <LogoMark />
            <div>
              <div className="text-sm font-semibold text-deck-text">SSUEW Analytics</div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-deck-muted">Private strategy command</div>
            </div>
          </div>

          <div className="max-w-3xl">
            <div className="deck-chip inline-flex items-center gap-2 rounded-lg px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-deck-accent">
              <Sparkles size={13} />
              encrypted cockpit
            </div>
            <h1 className="mt-6 text-6xl font-semibold leading-[1.02] tracking-normal text-deck-text">
              Dane, które wyglądają jak centrum dowodzenia.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-deck-muted">
              Wejdź do prywatnego kokpitu strategii SSUEW. W tle już pulsują rekrutacje, retencja i KPI rok-do-roku.
            </p>

            <div className="mt-8 grid max-w-3xl grid-cols-3 gap-3">
              <LiveDigits label="conversion" value="61.1%" />
              <LiveDigits label="retention" value="3.81 sem" speed={110} />
              <LiveDigits label="kpi growth" value="20/28" speed={125} />
            </div>
          </div>

          <div className="grid max-w-3xl grid-cols-2 gap-3">
            <div className="deck-card deck-scan rounded-lg p-4">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-deck-accent">
                <ShieldCheck size={14} />
                system telemetry
              </div>
              <div className="mt-3 space-y-2 font-mono text-[11px] text-deck-muted">
                {logLines.map((line, index) => (
                  <div key={line} className="deck-caret" style={{ animationDelay: `${index * 120}ms` }}>
                    {line}
                  </div>
                ))}
              </div>
            </div>
            <div className="deck-card deck-orbit rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-deck-muted">access layer</div>
              <div className="mt-4 h-2 rounded-full bg-deck-bg-deep/70">
                <div className="deck-meter-fill h-full w-[82%] rounded-full bg-gradient-to-r from-deck-accent to-deck-warn" />
              </div>
              <p className="mt-4 text-[11px] leading-5 text-deck-muted">
                Publiczne dane są separowane od prywatnych nazwisk i edycji członków przez sesję Supabase.
              </p>
            </div>
          </div>
        </section>

        <aside className="grid place-items-center">
          <form onSubmit={wyslij} className="deck-card w-full rounded-lg p-6">
            <div className="mb-6">
              <div className="grid h-12 w-12 place-items-center rounded-lg border border-deck-accent/35 bg-deck-accent/12 text-deck-accent shadow-[0_0_28px_rgba(46,230,166,0.24)]">
                {droga === 'kod' ? <KeyRound size={22} /> : <LockKeyhole size={22} />}
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-deck-text">Autoryzacja</h2>
              <p className="mt-1 text-[11px] leading-5 text-deck-muted">
                {droga === 'kod'
                  ? 'Kod zwiąże się z tą przeglądarką przy pierwszym użyciu.'
                  : 'Konto z hasłem — tylko dla dwóch osób.'}
              </p>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
              {(['kod', 'haslo'] as const).map((opcja) => (
                <button
                  key={opcja}
                  type="button"
                  onClick={() => setDroga(opcja)}
                  className={`rounded-md px-3 py-2 text-[11px] font-medium transition ${
                    droga === opcja
                      ? 'bg-deck-accent/15 text-deck-accent shadow-[inset_0_0_0_1px_rgba(46,230,166,0.3)]'
                      : 'text-deck-muted hover:text-deck-text'
                  }`}
                >
                  {opcja === 'kod' ? 'Kod dostępu' : 'E-mail i hasło'}
                </button>
              ))}
            </div>

            {droga === 'kod' ? (
              <KodInput onKomplet={sprawdzKod} stan={stanKodu} />
            ) : (
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-[11px] text-deck-muted">E-mail</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="username"
                    className="deck-input w-full rounded-lg px-3 py-2.5 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] text-deck-muted">Hasło</span>
                  <input
                    type="password"
                    value={haslo}
                    onChange={(event) => setHaslo(event.target.value)}
                    autoComplete="current-password"
                    className="deck-input w-full rounded-lg px-3 py-2.5 text-sm"
                  />
                </label>
              </div>
            )}

            {blad && (
              <div className="mt-4 rounded-lg border border-deck-danger-border bg-deck-danger-bg/70 px-3 py-2 text-[11px] leading-5 text-deck-danger">
                {blad}
              </div>
            )}

            {droga === 'haslo' ? (
              <button
                type="submit"
                disabled={laduje || zajety}
                className="deck-button mt-5 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold disabled:opacity-50"
              >
                {laduje ? 'Sprawdzanie sesji...' : zajety ? 'Sprawdzam...' : 'Wejdź do kokpitu'}
                <ArrowRight size={16} />
              </button>
            ) : (
              // Kod nie ma przycisku: wpisanie szóstej cyfry samo go wysyła.
              <p className="mt-1 text-center text-[11px] text-deck-muted">
                {zajety ? 'Sprawdzam...' : udalo ? 'Wchodzę...' : 'Sześć cyfr — wysyła się samo'}
              </p>
            )}

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              {['KOD', 'URZĄDZENIE', 'LIVE'].map((item) => (
                <div key={item} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-2 text-[10px] text-deck-muted">
                  {item}
                </div>
              ))}
            </div>
          </form>
        </aside>
      </div>
    </main>
  )
}

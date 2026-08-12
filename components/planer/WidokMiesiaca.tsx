'use client'
import { useMemo, useState } from 'react'
import { AlertTriangle, Plus } from 'lucide-react'
import { dniWMiesiacu, dzienTygodnia, pierwszyDzienTygodnia } from '@/lib/planer/daty'
import { kolizjeWMiesiacu, type KolizjeDnia } from '@/lib/planer/kolizje'
import type { Miesiac, Wydarzenie } from '@/lib/planer/typy'
import { KartaWydarzenia } from './KartaWydarzenia'

const NAGLOWKI = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nie']
const NAZWA_MIESIACA = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
]

type Props = {
  miesiac: Miesiac
  wydarzenia: Wydarzenie[]
  onOtworz: (w: Wydarzenie) => void
  onPrzenies: (id: string, naDzien: number) => void
  onPrzesun: (id: string, oDni: number) => void
  onDodajWDniu: (dzien: number) => void
  mozeEdytowac: boolean
  /** Identyfikatory wydarzeń, przy których toczy się rozmowa. */
  zRozmowa?: Set<string>
}

/** Opis kolizji do dymka — sam trójkąt mówi „coś jest nie tak", ale nie co. */
function opiszKolizje(k: KolizjeDnia): string {
  const czesci = [
    ...k.osoby.map((o) =>
      o.twarda
        ? `${o.osoba}: ${o.ile} wydarzenia w odstępie krótszym niż 90 minut`
        : `${o.osoba}: ${o.ile} wydarzenia tego dnia`,
    ),
    ...k.sale.map((s) => `sala ${s.sala}: ${s.godziny.join(', ')}`),
  ]
  return czesci.join('\n')
}

export function WidokMiesiaca({
  miesiac, wydarzenia, onOtworz, onPrzenies, onPrzesun, onDodajWDniu, mozeEdytowac,
  zRozmowa,
}: Props) {
  const [przeciagany, setPrzeciagany] = useState<string | null>(null)
  const [nadDniem, setNadDniem] = useState<number | null>(null)

  const ile = dniWMiesiacu(miesiac.y, miesiac.m)
  const przesuniecie = pierwszyDzienTygodnia(miesiac.y, miesiac.m)
  const kolizje = useMemo(() => kolizjeWMiesiacu(wydarzenia), [wydarzenia])

  const poDniach = useMemo(() => {
    const mapa = new Map<number, Wydarzenie[]>()
    for (const w of wydarzenia) {
      const lista = mapa.get(w.dzien) ?? []
      lista.push(w)
      mapa.set(w.dzien, lista)
    }
    // Wydarzenia z godziną najpierw, w kolejności zegara — tak czyta się dzień.
    for (const lista of mapa.values()) {
      lista.sort((a, b) => (a.godzina ?? '99:99').localeCompare(b.godzina ?? '99:99'))
    }
    return mapa
  }, [wydarzenia])

  const dzis = new Date()
  const dzisiajWTymMiesiacu =
    dzis.getFullYear() === miesiac.y && dzis.getMonth() + 1 === miesiac.m ? dzis.getDate() : null

  function upusc(dzien: number) {
    const id = przeciagany
    setPrzeciagany(null)
    setNadDniem(null)
    if (id) onPrzenies(id, dzien)
  }

  const dniZWydarzeniami = Array.from({ length: ile }, (_, i) => i + 1).filter(
    (d) => (poDniach.get(d) ?? []).length > 0,
  )

  return (
    <div className="deck-card rounded-lg p-3">
      {/* Siedem kolumn po ~92 px nie miesci sie na telefonie. Zamiast sciskac
          siatke, ponizej 640 px pokazujemy liste dni, ktore cos maja. */}
      <div data-widok="lista" className="space-y-2 sm:hidden">
        {dniZWydarzeniami.length === 0 && (
          <p className="py-6 text-center text-[12px] text-deck-muted">
            W tym miesiącu nic nie zaplanowano.
          </p>
        )}
        {dniZWydarzeniami.map((dzien) => {
          const kol = kolizje.get(dzien)
          return (
            <div key={dzien} className="rounded-md border border-white/8 bg-white/[0.02] p-2">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="font-mono text-[11px] text-deck-text">
                  {dzien} {NAZWA_MIESIACA[miesiac.m - 1]}
                </span>
                <span className="font-mono text-[10px] text-deck-muted/70">
                  {dzienTygodnia(miesiac.y, miesiac.m, dzien)}
                </span>
                {kol && (
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-deck-warn">
                    <AlertTriangle size={10} /> kolizja
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {(poDniach.get(dzien) ?? []).map((w) => (
                  <KartaWydarzenia
                    key={w.id}
                    wydarzenie={w}
                    onOtworz={onOtworz}
                    przeciagalne={false}
                    maRozmowe={zRozmowa?.has(w.id)}
                  />
                ))}
              </div>
              {mozeEdytowac && (
                <button
                  type="button"
                  onClick={() => onDodajWDniu(dzien)}
                  className="mt-1.5 text-[10.5px] text-deck-accent"
                >
                  + dodaj w tym dniu
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div data-widok="siatka" className="hidden sm:block">
      <div className="mb-2 grid grid-cols-7 gap-1.5">
        {NAGLOWKI.map((n, i) => (
          <div
            key={n}
            className={`text-center font-mono text-[10px] uppercase tracking-[0.14em] ${
              i >= 5 ? 'text-deck-muted/40' : 'text-deck-muted/70'
            }`}
          >
            {n}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: przesuniecie }).map((_, i) => (
          <div key={`pusty-${i}`} />
        ))}

        {Array.from({ length: ile }, (_, i) => i + 1).map((dzien) => {
          const kol = kolizje.get(dzien)
          const twarda = kol?.osoby.some((o) => o.twarda) || (kol?.sale.length ?? 0) > 0
          const wDniu = poDniach.get(dzien) ?? []
          const weekend = (przesuniecie + dzien - 1) % 7 >= 5
          const dzisiaj = dzien === dzisiajWTymMiesiacu
          const cel = nadDniem === dzien

          return (
            <div
              key={dzien}
              onDragOver={mozeEdytowac ? (e) => { e.preventDefault(); setNadDniem(dzien) } : undefined}
              onDragLeave={mozeEdytowac ? () => setNadDniem((d) => (d === dzien ? null : d)) : undefined}
              onDrop={mozeEdytowac ? () => upusc(dzien) : undefined}
              className={`group relative min-h-[92px] rounded-md border p-1.5 transition ${
                cel
                  ? 'border-deck-accent bg-deck-accent/10'
                  : dzisiaj
                    ? 'border-deck-accent/45 bg-deck-accent/[0.06]'
                    : weekend
                      ? 'border-white/5 bg-white/[0.008]'
                      : 'border-white/8 bg-white/[0.02]'
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={`font-mono text-[10px] ${
                    dzisiaj ? 'font-bold text-deck-accent' : weekend ? 'text-deck-muted/45' : 'text-deck-muted'
                  }`}
                >
                  {dzien}
                </span>
                <div className="flex items-center gap-1">
                  {kol && (
                    // Dymek na opakowaniu, nie na ikonie — Lucide nie przyjmuje `title`.
                    <span
                      title={opiszKolizje(kol)}
                      aria-label={twarda ? 'kolizja twarda' : 'kolizja miękka'}
                      className={`flex ${twarda ? 'text-deck-danger' : 'text-deck-warn'}`}
                    >
                      <AlertTriangle size={11} />
                    </span>
                  )}
                  {mozeEdytowac && (
                    <button
                      type="button"
                      onClick={() => onDodajWDniu(dzien)}
                      aria-label={`Dodaj wydarzenie ${dzien}`}
                      title="Dodaj wydarzenie w tym dniu"
                      className="grid h-4 w-4 place-items-center rounded text-deck-muted/0 transition group-hover:text-deck-muted hover:!text-deck-accent"
                    >
                      <Plus size={11} />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                {wDniu.map((w) => (
                  <KartaWydarzenia
                    key={w.id}
                    wydarzenie={w}
                    onOtworz={onOtworz}
                    przeciagalne={mozeEdytowac}
                    onPrzeciagnij={setPrzeciagany}
                    onPrzesun={onPrzesun}
                    maRozmowe={zRozmowa?.has(w.id)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
      </div>
    </div>
  )
}

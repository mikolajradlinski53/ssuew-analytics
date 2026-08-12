'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { KLUCZE_KATEGORII, type Kategoria, type Semestr, type Wydarzenie } from '@/lib/planer/typy'
import {
  dodajWydarzenie, subskrybujWydarzenia, usunWydarzenie, zmienWydarzenie,
  type NoweWydarzenie,
} from '@/lib/planer/zapis'
import { PasekFiltrow, type Widok } from './PasekFiltrow'
import { WidokMiesiaca } from './WidokMiesiaca'
import { WidokSemestru } from './WidokSemestru'
import { PanelWydarzenia } from './PanelWydarzenia'

const NAZWY = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
]

type Props = {
  semestr: Semestr
  mozeEdytowac: boolean
  /** Dane wstępne dla osób na kodzie; konta z hasłem dostają je z subskrypcji. */
  poczatkowe: Wydarzenie[]
  /** Osoby na kodzie nie mają konta Firebase, więc nie subskrybują Firestore. */
  naZywo: boolean
}

export function PlanerClient({ semestr, mozeEdytowac, poczatkowe, naZywo }: Props) {
  const [wydarzenia, setWydarzenia] = useState<Wydarzenie[]>(poczatkowe)
  const [blad, setBlad] = useState<string | null>(null)
  const [widok, setWidok] = useState<Widok>('miesiac')
  const [indeksMiesiaca, setIndeksMiesiaca] = useState(0)
  const [aktywne, setAktywne] = useState<Set<Kategoria>>(new Set(KLUCZE_KATEGORII))
  const [osoba, setOsoba] = useState('')
  const [wybrane, setWybrane] = useState<Wydarzenie | null>(null)
  const [dodaje, setDodaje] = useState(false)

  useEffect(() => {
    if (!naZywo) return
    return subskrybujWydarzenia(semestr.id, setWydarzenia, (e) => setBlad(e.message))
  }, [semestr.id, naZywo])

  const miesiac = semestr.miesiace[indeksMiesiaca]

  const osoby = useMemo(() => {
    const zbior = new Set<string>()
    for (const w of wydarzenia) for (const o of w.osoby) if (o !== 'wszyscy') zbior.add(o)
    return [...zbior].sort((a, b) => a.localeCompare(b, 'pl'))
  }, [wydarzenia])

  const widoczne = useMemo(
    () =>
      wydarzenia.filter((w) => {
        if (!aktywne.has(w.kategoria)) return false
        // Filtr osoby pokazuje też wydarzenia oznaczone 'wszyscy' — one jej dotyczą.
        if (osoba && !w.osoby.includes(osoba) && !w.osoby.includes('wszyscy')) return false
        return true
      }),
    [wydarzenia, aktywne, osoba],
  )

  const wMiesiacu = useMemo(
    () => widoczne.filter((w) => w.miesiac === miesiac.m && w.rok === miesiac.y),
    [widoczne, miesiac],
  )

  const przelacz = useCallback((k: Kategoria) => {
    setAktywne((p) => {
      const n = new Set(p)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })
  }, [])

  async function zapisz(dane: NoweWydarzenie) {
    if (wybrane) await zmienWydarzenie(semestr.id, wybrane.id, dane)
    else await dodajWydarzenie(semestr.id, dane)
    setWybrane(null)
    setDodaje(false)
  }

  async function usun(id: string) {
    await usunWydarzenie(semestr.id, id)
    setWybrane(null)
  }

  async function przenies(id: string, naDzien: number) {
    await zmienWydarzenie(semestr.id, id, { dzien: naDzien })
  }

  const panelOtwarty = wybrane !== null || dodaje

  return (
    <div className="space-y-3">
      {blad && (
        <div className="rounded-lg border border-deck-danger-border bg-deck-danger-bg/70 px-3 py-2 text-[11px] text-deck-danger">
          Nie udało się pobrać kalendarza: {blad}
        </div>
      )}

      <PasekFiltrow
        aktywne={aktywne}
        onPrzelacz={przelacz}
        osoby={osoby}
        osoba={osoba}
        onOsoba={setOsoba}
        widok={widok}
        onWidok={setWidok}
      />

      {widok === 'miesiac' && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Poprzedni miesiąc"
            disabled={indeksMiesiaca === 0}
            onClick={() => setIndeksMiesiaca((i) => i - 1)}
            className="deck-chip grid h-8 w-8 place-items-center rounded-lg text-deck-muted disabled:opacity-40"
          >
            <ChevronLeft size={15} />
          </button>
          <div className="text-sm font-semibold text-deck-text">
            {NAZWY[miesiac.m - 1]} {miesiac.y}
          </div>
          <button
            type="button"
            aria-label="Następny miesiąc"
            disabled={indeksMiesiaca === semestr.miesiace.length - 1}
            onClick={() => setIndeksMiesiaca((i) => i + 1)}
            className="deck-chip grid h-8 w-8 place-items-center rounded-lg text-deck-muted disabled:opacity-40"
          >
            <ChevronRight size={15} />
          </button>
          {mozeEdytowac && (
            <button
              type="button"
              onClick={() => { setWybrane(null); setDodaje(true) }}
              className="deck-button ml-auto flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold"
            >
              <Plus size={14} /> Dodaj wydarzenie
            </button>
          )}
        </div>
      )}

      <div className={panelOtwarty ? 'grid gap-3 lg:grid-cols-[1fr_320px]' : ''}>
        <div>
          {widok === 'miesiac' ? (
            <WidokMiesiaca
              miesiac={miesiac}
              wydarzenia={wMiesiacu}
              onOtworz={(w) => { setDodaje(false); setWybrane(w) }}
              onPrzenies={przenies}
              mozeEdytowac={mozeEdytowac}
            />
          ) : (
            <WidokSemestru
              miesiace={semestr.miesiace}
              wydarzenia={widoczne}
              onWejdz={(m) => {
                setIndeksMiesiaca(semestr.miesiace.findIndex((x) => x.m === m.m && x.y === m.y))
                setWidok('miesiac')
              }}
            />
          )}
        </div>

        {panelOtwarty && (
          <PanelWydarzenia
            wydarzenie={wybrane}
            miesiac={miesiac}
            mozeEdytowac={mozeEdytowac}
            onZapisz={zapisz}
            onUsun={usun}
            onZamknij={() => { setWybrane(null); setDodaje(false) }}
          />
        )}
      </div>
    </div>
  )
}

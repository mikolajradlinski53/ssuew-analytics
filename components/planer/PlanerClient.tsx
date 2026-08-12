'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Inbox, Plus, Radio } from 'lucide-react'
import { KLUCZE_KATEGORII, type Kategoria, type Semestr, type Wydarzenie } from '@/lib/planer/typy'
import {
  dodajWydarzenie, odrzucPropozycje, przyjmijPropozycje, subskrybujPropozycje,
  subskrybujTrybWspolny, subskrybujWydarzenia, ustawTrybWspolny, usunWydarzenie,
  zmienWydarzenie,
  type NoweWydarzenie, type StanSesjiWspolnej,
} from '@/lib/planer/zapis'
import { przeniesPrzezSerwer, zglosNowe, zglosPrzeniesienie } from '@/lib/planer/serwer'
import type { Propozycja } from '@/lib/planer/propozycje'
import { PasekFiltrow, type Widok } from './PasekFiltrow'
import { WidokMiesiaca } from './WidokMiesiaca'
import { WidokSemestru } from './WidokSemestru'
import { PanelWydarzenia } from './PanelWydarzenia'
import { PustySemestr } from './PustySemestr'
import { BanerSesji } from './BanerSesji'
import { Skrzynka } from './Skrzynka'
import { dniWMiesiacu } from '@/lib/planer/daty'
import { terminyCoTydzien } from '@/lib/planer/powtarzanie'

const NAZWY = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
]

type Props = {
  semestr: Semestr
  /** `owner` pisze wprost do Firestore; `board` przez serwer. */
  rola: 'owner' | 'board'
  /** Adres e-mail albo etykieta kodu — trafia do propozycji jako autor. */
  kto: string
  /** Dane wstępne dla osób na kodzie; konta z hasłem dostają je z subskrypcji. */
  poczatkowe: Wydarzenie[]
  /** Osoby na kodzie nie mają konta Firebase, więc nie subskrybują Firestore. */
  naZywo: boolean
}

export function PlanerClient({ semestr, rola, kto, poczatkowe, naZywo }: Props) {
  const wlascicielem = rola === 'owner'
  const [wydarzenia, setWydarzenia] = useState<Wydarzenie[]>(poczatkowe)
  const [blad, setBlad] = useState<string | null>(null)
  const [widok, setWidok] = useState<Widok>('miesiac')
  const [indeksMiesiaca, setIndeksMiesiaca] = useState(0)
  const [aktywne, setAktywne] = useState<Set<Kategoria>>(new Set(KLUCZE_KATEGORII))
  const [osoba, setOsoba] = useState('')
  const [wybrane, setWybrane] = useState<Wydarzenie | null>(null)
  const [dodaje, setDodaje] = useState(false)
  /** Dzień wskazany przy dodawaniu z kratki — panel startuje z tą datą. */
  const [dzienDodania, setDzienDodania] = useState<number | null>(null)
  const [sesja, setSesja] = useState<StanSesjiWspolnej>({ wlaczony: false, od: null, przez: null })
  const [propozycje, setPropozycje] = useState<Propozycja[]>([])
  const [skrzynkaOtwarta, setSkrzynkaOtwarta] = useState(false)

  useEffect(() => {
    if (!naZywo) return
    return subskrybujWydarzenia(semestr.id, setWydarzenia, (e) => setBlad(e.message))
  }, [semestr.id, naZywo])

  useEffect(() => {
    if (!naZywo) return
    return subskrybujTrybWspolny(semestr.id, setSesja)
  }, [semestr.id, naZywo])

  useEffect(() => {
    if (!naZywo || !wlascicielem) return
    return subskrybujPropozycje(semestr.id, setPropozycje, (e) => setBlad(e.message))
  }, [semestr.id, naZywo, wlascicielem])

  /** Zapis wprost albo propozycja — rozstrzyga rola i stan sesji. */
  const piszeWprost = wlascicielem || sesja.wlaczony

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

  async function zapisz(dane: NoweWydarzenie, powtorzenia = 1) {
    if (!piszeWprost) {
      // Zarzad poza sesja tylko proponuje NOWE wydarzenia; edycja istniejacego
      // jest dla niego zablokowana w panelu, wiec tu tylko domykamy furtke.
      if (wybrane) return
      // Powtarzanie pomijamy celowo: kazda kopia bylaby osobna decyzja
      // do rozpatrzenia, a to zasypaloby skrzynke.
      await zglosNowe(semestr.id, dane)
      zamknijPanel()
      return
    }
    if (wybrane) {
      await zmienWydarzenie(semestr.id, wybrane.id, dane)
    } else {
      // Powtarzanie tworzy osobne wpisy, a nie powiazana serie — dzieki temu
      // nie ma pytania "edytujesz to jedno czy wszystkie", a wpisanie
      // pietnastu zebran zajmuje jeden ruch.
      const terminy = terminyCoTydzien(
        { rok: dane.rok, miesiac: dane.miesiac, dzien: dane.dzien },
        semestr.miesiace,
        powtorzenia,
      )
      for (const t of terminy) {
        await dodajWydarzenie(semestr.id, { ...dane, ...t })
      }
    }
    zamknijPanel()
  }

  async function usun(id: string) {
    // Usunięcia nie da się cofnąć, a kliknięcie kosza jest o milimetr od zapisu.
    if (!window.confirm('Usunąć to wydarzenie? Tego nie da się cofnąć.')) return
    await usunWydarzenie(semestr.id, id)
    setWybrane(null)
  }

  function dodajWDniu(dzien: number) {
    setWybrane(null)
    setDzienDodania(dzien)
    setDodaje(true)
  }

  function dodajZPaska() {
    setWybrane(null)
    setDzienDodania(null)
    setDodaje(true)
  }

  function zamknijPanel() {
    setWybrane(null)
    setDodaje(false)
    setDzienDodania(null)
  }

  async function przenies(id: string, naDzien: number) {
    const w = wydarzenia.find((x) => x.id === id)
    if (!w) return
    try {
      if (wlascicielem) {
        await zmienWydarzenie(semestr.id, id, { dzien: naDzien })
      } else if (sesja.wlaczony) {
        await przeniesPrzezSerwer(semestr.id, id, naDzien)
      } else {
        await zglosPrzeniesienie(semestr.id, id, w.dzien, naDzien, w.tytul)
      }
      setBlad(null)
    } catch (e) {
      setBlad((e as Error).message)
    }
  }

  /** Przesunięcie strzałkami. Poza miesiąc nie wychodzimy — to zmieniłoby widok pod palcami. */
  async function przesun(id: string, oDni: number) {
    const w = wydarzenia.find((x) => x.id === id)
    if (!w) return
    const nowy = w.dzien + oDni
    if (nowy < 1 || nowy > dniWMiesiacu(w.rok, w.miesiac)) return
    await zmienWydarzenie(semestr.id, id, { dzien: nowy })
  }

  const panelOtwarty = wybrane !== null || dodaje
  // Pusty jest CAŁY semestr, nie bieżący miesiąc — filtry i przełącznik widoku
  // nie mają wtedy czego filtrować, więc znikają razem z siatką.
  const semestrPusty = wydarzenia.length === 0

  const bladPaska = blad && (
    <div className="rounded-lg border border-deck-danger-border bg-deck-danger-bg/70 px-3 py-2 text-[11px] text-deck-danger">
      Nie udało się pobrać kalendarza: {blad}
    </div>
  )

  if (semestrPusty && !panelOtwarty) {
    return (
      <div className="space-y-3">
        {bladPaska}
        <PustySemestr
          nazwaSemestru={semestr.nazwa}
          mozeEdytowac={wlascicielem}
          onDodaj={dodajZPaska}
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {bladPaska}

      <BanerSesji
        stan={sesja}
        mozeWylaczyc={wlascicielem}
        onWylacz={() => ustawTrybWspolny(semestr.id, false, kto)}
      />

      {wlascicielem && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSkrzynkaOtwarta((o) => !o)}
            className="deck-chip flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11.5px] text-deck-muted transition hover:text-deck-text"
          >
            <Inbox size={13} />
            Skrzynka
            {propozycje.length > 0 && (
              <span className="rounded-full bg-deck-accent px-1.5 text-[10px] font-bold text-deck-bg-deep">
                {propozycje.length}
              </span>
            )}
          </button>
          {!sesja.wlaczony && (
            <button
              type="button"
              onClick={() => ustawTrybWspolny(semestr.id, true, kto)}
              className="deck-chip flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11.5px] text-deck-muted transition hover:text-deck-accent"
            >
              <Radio size={13} /> Włącz Sesję Operacyjną
            </button>
          )}
        </div>
      )}

      {wlascicielem && skrzynkaOtwarta && (
        <Skrzynka
          propozycje={propozycje}
          wydarzenia={wydarzenia}
          onPrzyjmij={(p) => przyjmijPropozycje(semestr.id, p)}
          onOdrzuc={(id) => odrzucPropozycje(semestr.id, id)}
        />
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
          <button
            type="button"
            onClick={dodajZPaska}
            className="deck-button ml-auto flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold"
          >
            <Plus size={14} /> {piszeWprost ? 'Dodaj wydarzenie' : 'Zgłoś wydarzenie'}
          </button>
        </div>
      )}

      <div className={panelOtwarty ? 'grid gap-3 lg:grid-cols-[1fr_320px]' : ''}>
        <div>
          {widok === 'miesiac' ? (
            <WidokMiesiaca
              miesiac={miesiac}
              wydarzenia={wMiesiacu}
              onOtworz={(w) => { setDodaje(false); setDzienDodania(null); setWybrane(w) }}
              onPrzenies={przenies}
              onPrzesun={przesun}
              onDodajWDniu={dodajWDniu}
              // Zawsze wlaczone: u zarzadu przeciagniecie tworzy propozycje,
              // wiec musi dzialac takze przy wylaczonej sesji.
              mozeEdytowac
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
            // Zmiana wybranego wydarzenia przemontowuje formularz i resetuje
            // jego pola — zalecany przez Reacta sposób zamiast synchronizacji
            // stanu efektem.
            key={wybrane?.id ?? `nowe-${dzienDodania ?? 0}`}
            wydarzenie={wybrane}
            miesiac={miesiac}
            dzienStartowy={dzienDodania}
            // Zarzad wypelnia tylko formularz nowego wydarzenia (zeby je zglosic);
            // istniejacego nie edytuje — moze jedynie proponowac przeniesienie.
            mozeEdytowac={piszeWprost || wybrane === null}
            onZapisz={zapisz}
            onUsun={usun}
            onZamknij={zamknijPanel}
          />
        )}
      </div>
    </div>
  )
}

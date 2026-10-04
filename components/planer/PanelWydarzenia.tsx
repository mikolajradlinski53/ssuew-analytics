'use client'
import { useState, type ReactNode } from 'react'
import { Trash2, X } from 'lucide-react'
import {
  KATEGORIE, KLUCZE_KATEGORII, POLA_DOMYSLNE,
  type Miesiac, type NoweWydarzenie, type Wydarzenie,
} from '@/lib/planer/typy'
import { dniWMiesiacu } from '@/lib/planer/daty'
import { BUDYNKI, MIEJSCA_SPECJALNE, miejsceSpecjalne } from '@/lib/planer/budynki'
import { dniMiedzy, koniec, naIso, poczatek, zIso } from '@/lib/planer/trwanie'
import { sprawdzWydarzenie } from '@/lib/planer/walidacja'
import { przezPolnoc } from '@/lib/planer/opis'
import { WyborOsob } from './WyborOsob'

type Props = {
  /** `null` znaczy: formularz nowego wydarzenia. */
  wydarzenie: Wydarzenie | null
  miesiac: Miesiac
  /** Dzień wskazany kliknięciem w kratce; `null` przy dodawaniu z paska. */
  dzienStartowy?: number | null
  mozeEdytowac: boolean
  /** Usuwanie jest nieodwracalne - ma je wyłącznie właściciel, także w trakcie sesji. */
  mozeUsunac?: boolean
  /** Osoby do wyboru - Skład zarządu. */
  sklad: string[]
  /** Wątek pokazujemy tylko przy istniejącym wydarzeniu - nowe nie ma jeszcze o czym rozmawiać. */
  watek?: ReactNode
  /** Dostaje dane już sprawdzone i znormalizowane. `powtorzenia` ma znaczenie tylko przy nowym. */
  onZapisz: (dane: NoweWydarzenie, powtorzenia?: number) => void
  onUsun: (id: string) => void
  onZamknij: () => void
}

function pusty(miesiac: Miesiac, dzien: number | null | undefined): NoweWydarzenie {
  return {
    tytul: '', kategoria: 'ZEBRANIA', rok: miesiac.y, miesiac: miesiac.m,
    dzien: dzien ?? 1, godzina: null, sala: null, osoby: [], ...POLA_DOMYSLNE,
  }
}

function bezId({ id: _id, ...reszta }: Wydarzenie): NoweWydarzenie {
  return reszta
}

/**
 * Formularz nie synchronizuje się z `wydarzenie` przez efekt - rodzic
 * przemontowuje go przez `key`, gdy zmienia się wybrane wydarzenie.
 */
export function PanelWydarzenia({
  wydarzenie, miesiac, dzienStartowy, mozeEdytowac, mozeUsunac = false, sklad, watek,
  onZapisz, onUsun, onZamknij,
}: Props) {
  const [dane, setDane] = useState<NoweWydarzenie>(() =>
    wydarzenie ? bezId(wydarzenie) : pusty(miesiac, dzienStartowy),
  )
  const [powtorzenia, setPowtorzenia] = useState(1)

  function zmien<K extends keyof NoweWydarzenie>(pole: K, wartosc: NoweWydarzenie[K]) {
    setDane((d) => ({ ...d, [pole]: wartosc }))
  }

  /** Wpisuje się datę końca, bo tak myśli człowiek; zapisuje liczbę dni. */
  function zmienKoniec(iso: string) {
    const d = zIso(iso)
    zmien('dni', d ? Math.max(1, dniMiedzy(poczatek(dane), d)) : 1)
  }

  function zmienCalyDzien(wlaczony: boolean) {
    setDane((d) => ({ ...d, calyDzien: wlaczony, ...(wlaczony ? { godzina: null, godzinaDo: null } : {}) }))
  }

  const wynik = sprawdzWydarzenie(dane)
  const specjalne = miejsceSpecjalne(dane.budynek)

  const etykieta = 'mb-1 block text-[11px] text-deck-muted'
  const pole = 'deck-input w-full rounded-lg px-3 py-2 text-sm disabled:opacity-60'

  return (
    <aside className="deck-card h-fit w-full rounded-lg p-4">
      <div className="mb-4 flex items-start justify-between">
        <h2 className="text-sm font-semibold text-deck-text">
          {wydarzenie ? 'Wydarzenie' : 'Nowe wydarzenie'}
        </h2>
        <button type="button" onClick={onZamknij} aria-label="Zamknij" className="text-deck-muted hover:text-deck-text">
          <X size={15} />
        </button>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className={etykieta}>Tytuł</span>
          <input
            value={dane.tytul}
            disabled={!mozeEdytowac}
            onChange={(e) => zmien('tytul', e.target.value)}
            className={pole}
          />
        </label>

        <div>
          <span className={etykieta}>Kategoria</span>
          <div role="group" aria-label="Kategoria" className="flex flex-wrap gap-1.5">
            {KLUCZE_KATEGORII.map((k) => {
              const s = KATEGORIE[k]
              const wybrana = dane.kategoria === k
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={wybrana}
                  disabled={!mozeEdytowac}
                  onClick={() => zmien('kategoria', k)}
                  style={wybrana ? { background: s.tlo, borderColor: s.obrys } : undefined}
                  className={`rounded-md border px-2 py-1 text-[11px] transition disabled:opacity-60 ${
                    wybrana ? 'text-deck-text' : 'border-white/10 text-deck-muted hover:text-deck-text'
                  }`}
                >
                  {s.etykieta}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={etykieta}>Dzień</span>
            <select
              value={dane.dzien}
              disabled={!mozeEdytowac}
              onChange={(e) => zmien('dzien', Number(e.target.value))}
              className={pole}
            >
              {Array.from({ length: dniWMiesiacu(dane.rok, dane.miesiac) }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={etykieta}>Do dnia (opcjonalnie)</span>
            <input
              type="date"
              value={dane.dni > 1 ? naIso(koniec(dane)) : ''}
              min={naIso(poczatek(dane))}
              disabled={!mozeEdytowac}
              onChange={(e) => zmienKoniec(e.target.value)}
              className={pole}
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-[12px] text-deck-text">
          <input
            type="checkbox"
            checked={dane.calyDzien}
            disabled={!mozeEdytowac}
            onChange={(e) => zmienCalyDzien(e.target.checked)}
          />
          Cały dzień
        </label>

        <label className="flex items-center gap-2 text-[12px] text-deck-text">
          <input
            type="checkbox"
            checked={dane.dzienWolny}
            disabled={!mozeEdytowac}
            onChange={(e) => zmien('dzienWolny', e.target.checked)}
          />
          Dzień wolny od zajęć
          <span className="text-[11px] text-deck-muted">- w eksporcie na zielono</span>
        </label>

        {!dane.calyDzien && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={etykieta}>Od</span>
              <input
                type="time"
                value={dane.godzina ?? ''}
                disabled={!mozeEdytowac}
                onChange={(e) => zmien('godzina', e.target.value || null)}
                className={pole}
              />
            </label>
            <label className="block">
              <span className={etykieta}>Do</span>
              <input
                type="time"
                value={dane.godzinaDo ?? ''}
                disabled={!mozeEdytowac}
                onChange={(e) => zmien('godzinaDo', e.target.value || null)}
                className={pole}
              />
            </label>
            {przezPolnoc(dane) && (
              <p className="col-span-2 -mt-1 text-[10.5px] text-deck-muted">
                Kończy się o {dane.godzinaDo} następnego dnia.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={etykieta}>Budynek</span>
            <select
              value={dane.budynek ?? ''}
              disabled={!mozeEdytowac}
              onChange={(e) => zmien('budynek', e.target.value || null)}
              className={pole}
            >
              <option value="">-</option>
              <optgroup label="Budynki UEW">
                {BUDYNKI.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </optgroup>
              <optgroup label="Inne miejsca">
                {MIEJSCA_SPECJALNE.map((m) => (
                  <option key={m.kod} value={m.kod}>{m.etykieta}</option>
                ))}
              </optgroup>
            </select>
          </label>
          <label className="block">
            <span className={etykieta}>{specjalne ? 'Szczegóły' : 'Sala'}</span>
            <input
              value={dane.sala ?? ''}
              disabled={!mozeEdytowac}
              onChange={(e) => zmien('sala', e.target.value || null)}
              placeholder={specjalne?.podpowiedz ?? '110L'}
              className={pole}
            />
          </label>
        </div>

        <div>
          <span className={etykieta}>Osoby</span>
          <WyborOsob
            sklad={sklad}
            wybrane={dane.osoby}
            onZmien={(o) => zmien('osoby', o)}
            zablokowane={!mozeEdytowac}
          />
        </div>
      </div>

      {mozeEdytowac && !wydarzenie && (
        <label className="mt-3 block">
          <span className={etykieta}>Powtórz co tydzień</span>
          <select
            value={powtorzenia}
            onChange={(e) => setPowtorzenia(Number(e.target.value))}
            className={pole}
          >
            <option value={1}>tylko raz</option>
            {[2, 3, 4, 6, 8, 10, 12, 15, 20].map((n) => (
              <option key={n} value={n}>{n} razy, co tydzień</option>
            ))}
          </select>
          {powtorzenia > 1 && (
            <span className="mt-1 block text-[10.5px] leading-relaxed text-deck-muted/70">
              Powstanie {powtorzenia} osobnych wpisów. Ciąg urwie się na końcu semestru.
            </span>
          )}
        </label>
      )}

      {mozeEdytowac && (
        <>
          {/* Pusty tytuł blokuje przycisk bez komunikatu - krzyczenie „wpisz
              tytuł”, zanim ktokolwiek zaczął pisać, byłoby szumem. */}
          {!wynik.ok && dane.tytul.trim() !== '' && (
            <p role="alert" className="mt-3 text-[11px] text-deck-danger">{wynik.blad}</p>
          )}
          <div className="mt-5 flex items-center gap-2">
            <button
              type="button"
              disabled={!wynik.ok}
              onClick={() => {
                if (wynik.ok) onZapisz(wynik.wydarzenie, powtorzenia)
              }}
              className="deck-button flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              Zapisz
            </button>
            {wydarzenie && mozeUsunac && (
              <button
                type="button"
                onClick={() => onUsun(wydarzenie.id)}
                aria-label="Usuń"
                className="grid h-10 w-10 place-items-center rounded-lg border border-deck-danger-border text-deck-danger transition hover:bg-deck-danger-bg/60"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </>
      )}
      {wydarzenie && watek}
    </aside>
  )
}

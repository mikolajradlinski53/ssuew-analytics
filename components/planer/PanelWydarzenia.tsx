'use client'
import { useState } from 'react'
import { Trash2, X } from 'lucide-react'
import { KLUCZE_KATEGORII, KATEGORIE, type Kategoria, type Miesiac, type Wydarzenie } from '@/lib/planer/typy'
import { dniWMiesiacu } from '@/lib/planer/daty'
import type { NoweWydarzenie } from '@/lib/planer/zapis'

type Props = {
  /** `null` znaczy: formularz nowego wydarzenia. */
  wydarzenie: Wydarzenie | null
  miesiac: Miesiac
  /** Dzień wskazany kliknięciem w kratce; `null` przy dodawaniu z paska. */
  dzienStartowy?: number | null
  mozeEdytowac: boolean
  onZapisz: (dane: NoweWydarzenie) => void
  onUsun: (id: string) => void
  onZamknij: () => void
}

function pusty(miesiac: Miesiac, dzien: number | null | undefined): NoweWydarzenie {
  return {
    tytul: '', kategoria: 'ZEBRANIA', rok: miesiac.y, miesiac: miesiac.m,
    dzien: dzien ?? 1, godzina: null, sala: null, osoby: [],
  }
}

/**
 * Formularz nie synchronizuje się z `wydarzenie` przez efekt — rodzic
 * przemontowuje go przez `key`, gdy zmienia się wybrane wydarzenie.
 * To zalecany przez Reacta sposób resetowania stanu i o jeden render tańszy
 * niż dopasowywanie po fakcie.
 */
export function PanelWydarzenia({
  wydarzenie, miesiac, dzienStartowy, mozeEdytowac, onZapisz, onUsun, onZamknij,
}: Props) {
  const [dane, setDane] = useState<NoweWydarzenie>(() =>
    wydarzenie ? { ...wydarzenie } : pusty(miesiac, dzienStartowy),
  )

  function zmien<K extends keyof NoweWydarzenie>(pole: K, wartosc: NoweWydarzenie[K]) {
    setDane((d) => ({ ...d, [pole]: wartosc }))
  }

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

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={etykieta}>Kategoria</span>
            <select
              value={dane.kategoria}
              disabled={!mozeEdytowac}
              onChange={(e) => zmien('kategoria', e.target.value as Kategoria)}
              className={pole}
            >
              {KLUCZE_KATEGORII.map((k) => (
                <option key={k} value={k}>{KATEGORIE[k].etykieta}</option>
              ))}
            </select>
          </label>
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
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={etykieta}>Godzina</span>
            <input
              type="time"
              value={dane.godzina ?? ''}
              disabled={!mozeEdytowac}
              onChange={(e) => zmien('godzina', e.target.value || null)}
              className={pole}
            />
          </label>
          <label className="block">
            <span className={etykieta}>Sala</span>
            <input
              value={dane.sala ?? ''}
              disabled={!mozeEdytowac}
              onChange={(e) => zmien('sala', e.target.value || null)}
              placeholder="9J"
              className={pole}
            />
          </label>
        </div>

        <label className="block">
          <span className={etykieta}>Osoby (po przecinku, „wszyscy" = cały zarząd)</span>
          <input
            value={dane.osoby.join(', ')}
            disabled={!mozeEdytowac}
            onChange={(e) => zmien('osoby', e.target.value.split(',').map((o) => o.trim()).filter(Boolean))}
            className={pole}
          />
        </label>
      </div>

      {mozeEdytowac && (
        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onZapisz(dane)}
            className="deck-button flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold"
          >
            Zapisz
          </button>
          {wydarzenie && (
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
      )}
    </aside>
  )
}

'use client'
import { useState } from 'react'
import { Download } from 'lucide-react'
import type { Workbook } from 'exceljs'
import { budujEksport, NAGLOWKI_KALENDARZA, type Eksport } from '@/lib/planer/eksport'
import type { Miesiac, Wydarzenie } from '@/lib/planer/typy'

const SZEROKOSCI_LISTY = [12, 15, 12, 10, 8, 7, 15, 36, 12, 18, 28]
const argb = (hex: string) => `FF${hex.slice(1).toUpperCase()}`

/** Eksport jako skoroszyt — osobno od pobierania, żeby dało się go sprawdzić w teście. */
export async function zbudujSkoroszyt(e: Eksport): Promise<Workbook> {
  // ExcelJS waży kilkaset kilobajtów — ładujemy go dopiero po kliknięciu,
  // nie przy wejściu do Planera.
  const ExcelJS = (await import('exceljs')).default
  const plik = new ExcelJS.Workbook()

  const kal = plik.addWorksheet('Kalendarz')
  kal.columns = NAGLOWKI_KALENDARZA.map(() => ({ width: 36 }))
  kal.addRow([e.tytul]).font = { bold: true, size: 14 }
  kal.addRow(NAGLOWKI_KALENDARZA).font = { bold: true }
  for (const tydzien of e.kalendarz) {
    const wiersz = kal.addRow(
      tydzien.map((k) =>
        k.dzien === null
          ? ''
          : {
              richText: [
                { text: String(k.dzien), font: { bold: true } },
                ...k.linie.map((l) => ({
                  text: `\n${l.tekst}`,
                  font: { color: { argb: argb(l.kolor) }, bold: l.pogrubiona },
                })),
              ],
            },
      ),
    )
    wiersz.alignment = { wrapText: true, vertical: 'top' }
    const najwiecej = Math.max(0, ...tydzien.map((k) => k.linie.length))
    wiersz.height = Math.max(48, 16 * (najwiecej + 1))
    tydzien.forEach((k, i) => {
      if (k.dzien === null) {
        wiersz.getCell(i + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
      }
    })
  }

  const lista = plik.addWorksheet('Lista')
  lista.columns = e.naglowkiListy.map((_, i) => ({ width: SZEROKOSCI_LISTY[i] ?? 14 }))
  lista.addRow(e.naglowkiListy).font = { bold: true }
  for (const w of e.lista) lista.addRow(w)
  lista.views = [{ state: 'frozen', ySplit: 1 }]
  lista.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: e.naglowkiListy.length } }

  return plik
}

type Props = {
  /** Wszystkie wydarzenia semestru — eksport sam wybiera miesiąc i pomija filtry. */
  wydarzenia: Wydarzenie[]
  miesiac: Miesiac
}

export function PobierzMiesiac({ wydarzenia, miesiac }: Props) {
  const [stan, setStan] = useState<'gotowy' | 'trwa' | 'blad'>('gotowy')

  async function pobierz() {
    setStan('trwa')
    try {
      const e = budujEksport(wydarzenia, miesiac)
      const plik = await zbudujSkoroszyt(e)
      const bufor = await plik.xlsx.writeBuffer()
      const url = URL.createObjectURL(
        new Blob([bufor], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      )
      const a = document.createElement('a')
      a.href = url
      a.download = e.nazwaPliku
      a.click()
      // Natychmiastowe zwolnienie potrafi przerwać pobieranie w części przeglądarek.
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setStan('gotowy')
    } catch {
      setStan('blad')
    }
  }

  return (
    <button
      type="button"
      onClick={pobierz}
      disabled={stan === 'trwa'}
      className="deck-chip flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-deck-muted transition hover:text-deck-text disabled:opacity-60"
    >
      <Download size={14} />
      {stan === 'trwa' ? 'Przygotowuję…' : stan === 'blad' ? 'Nie udało się — spróbuj ponownie' : 'Pobierz miesiąc'}
    </button>
  )
}

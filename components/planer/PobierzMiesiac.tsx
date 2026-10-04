'use client'
import { useState } from 'react'
import { Download } from 'lucide-react'
import type { Fill, Workbook, Worksheet } from 'exceljs'
import {
  budujEksport, KOLORY_LISTY, KOLUMNY_LISTY, NAGLOWKI_KALENDARZA, NAGLOWKI_KOLUMN_LISTY,
  type Eksport, type WierszListy,
} from '@/lib/planer/eksport'
import type { Miesiac, Wydarzenie } from '@/lib/planer/typy'
import { pobierzPlik } from '@/lib/pobierz'

const argb = (hex: string) => `FF${hex.slice(1).toUpperCase()}`
const wypelnienie = (hex: string): Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: argb(hex) } })

/** Układ karty „Lista”: dzień, dzień tygodnia, kategorie, „Kogo dotyczy?”. */
const PIERWSZA_KATEGORIA = 3
const KOLUMNA_KOGO = PIERWSZA_KATEGORIA + KOLUMNY_LISTY.length
const PIERWSZY_DZIEN = 3
/** Szerokości w znakach - przy tych proporcjach arkusz mieści się na A4 w poziomie jak wzór. */
const SZEROKOSC_KATEGORII = 20
const SZEROKOSC_KOGO = 28

const CZCIONKA = { name: 'Arial', size: 9 }
const RAMKA = { style: 'thin' as const, color: { argb: 'FFB7B7B7' } }

/** Wysokość wiersza z liczby linii po zawinięciu - ExcelJS sam jej nie policzy. */
function wysokoscWiersza(w: WierszListy): number {
  const linie = (tekst: string, szerokosc: number) =>
    tekst.split('\n').reduce((s, l) => s + Math.max(1, Math.ceil(l.length / (szerokosc + 2))), 0)
  const najwiecej = Math.max(
    1,
    ...w.komorki.filter((k) => k.wierszy === 1 && k.tekst).map((k) => linie(k.tekst, SZEROKOSC_KATEGORII)),
    linie(w.kogo, SZEROKOSC_KOGO),
  )
  return Math.max(24, 12 * najwiecej + 8)
}

/**
 * Karta „Lista” jak arkusz Sesji prowadzony ręcznie przez zarząd: wiersz na
 * dzień, kategoria w kolumnie, wielodniowe scalone w pionie, co drugi wiersz
 * szary. Ustawiona do druku na jednej stronie A4 w poziomie.
 */
function rysujListe(a: Worksheet, e: Eksport) {
  a.columns = [
    { width: 7 }, { width: 13 },
    ...KOLUMNY_LISTY.map(() => ({ width: SZEROKOSC_KATEGORII })),
    { width: SZEROKOSC_KOGO },
  ]
  a.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 1 }
  a.views = [{ state: 'frozen', ySplit: PIERWSZY_DZIEN - 1 }]

  a.getCell(1, 1).value = 'dzień'
  a.getCell(1, 2).value = 'dzień tygodnia'
  a.getCell(1, PIERWSZA_KATEGORIA).value = 'Co się dzieje ?'
  a.getCell(1, KOLUMNA_KOGO).value = 'Kogo dotyczy?'
  a.mergeCells(1, PIERWSZA_KATEGORIA, 1, KOLUMNA_KOGO - 1)
  for (let c = 1; c <= KOLUMNA_KOGO; c++) {
    a.getCell(1, c).fill = wypelnienie(KOLORY_LISTY.naglowek)
    a.getCell(1, c).font = { ...CZCIONKA, bold: true }
  }
  KOLUMNY_LISTY.forEach((k, i) => {
    const komorka = a.getCell(2, PIERWSZA_KATEGORIA + i)
    komorka.value = NAGLOWKI_KOLUMN_LISTY[k]
    komorka.fill = wypelnienie(KOLORY_LISTY.kolumny[k].naglowek)
    komorka.font = { ...CZCIONKA, bold: true }
  })

  e.lista.forEach((w, i) => {
    const r = PIERWSZY_DZIEN + i
    // Komórki pod scaleniem pomijamy: w ExcelJS ich styl trafia do komórki
    // głównej, więc pasek przemalowałby całe wielodniowe wydarzenie.
    if (w.dzien % 2 === 0) {
      for (let c = 1; c <= KOLUMNA_KOGO; c++) {
        const j = c - PIERWSZA_KATEGORIA
        if (w.komorki[j]?.wierszy === 0) continue
        a.getCell(r, c).fill = wypelnienie(KOLORY_LISTY.pasek)
      }
    }

    a.getCell(r, 1).value = w.dzien
    a.getCell(r, 2).value = w.dzienTygodnia
    a.getCell(r, 1).font = { ...CZCIONKA, bold: true }
    a.getCell(r, 2).font = { ...CZCIONKA, bold: true }

    w.komorki.forEach((k, j) => {
      if (k.wierszy === 0) return
      const c = PIERWSZA_KATEGORIA + j
      const komorka = a.getCell(r, c)
      komorka.value = k.tekst
      komorka.font = { ...CZCIONKA, bold: true }
      if (k.wierszy > 1) a.mergeCells(r, c, r + k.wierszy - 1, c)
      // Scalona komórka bez koloru kolumny jest biała - pasek pierwszego
      // wiersza rozlałby się na wszystkie dni wydarzenia.
      const kolor = k.tlo ?? (k.wierszy > 1 ? '#ffffff' : null)
      if (kolor) komorka.fill = wypelnienie(kolor)
    })

    a.getCell(r, KOLUMNA_KOGO).value = w.kogo
    a.getCell(r, KOLUMNA_KOGO).font = CZCIONKA
    a.getRow(r).height = wysokoscWiersza(w)
  })

  const ostatniWiersz = PIERWSZY_DZIEN + e.lista.length - 1
  for (let r = 1; r <= ostatniWiersz; r++) {
    for (let c = 1; c <= KOLUMNA_KOGO; c++) {
      const komorka = a.getCell(r, c)
      komorka.border = { top: RAMKA, left: RAMKA, bottom: RAMKA, right: RAMKA }
      komorka.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    }
  }
  a.getRow(1).height = 20
  a.getRow(2).height = 20
}

/** Eksport jako skoroszyt - osobno od pobierania, żeby dało się go sprawdzić w teście. */
export async function zbudujSkoroszyt(e: Eksport): Promise<Workbook> {
  // ExcelJS waży kilkaset kilobajtów - ładujemy go dopiero po kliknięciu,
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

  rysujListe(plik.addWorksheet('Lista'), e)

  return plik
}

type Props = {
  /** Wszystkie wydarzenia semestru - eksport sam wybiera miesiąc i pomija filtry. */
  wydarzenia: Wydarzenie[]
  miesiac: Miesiac
  /** Skład zarządu - kolejność osób w kolumnie „Kogo dotyczy?”. */
  sklad: string[]
}

export function PobierzMiesiac({ wydarzenia, miesiac, sklad }: Props) {
  const [stan, setStan] = useState<'gotowy' | 'trwa' | 'blad'>('gotowy')

  async function pobierz() {
    setStan('trwa')
    try {
      const e = budujEksport(wydarzenia, miesiac, sklad)
      const plik = await zbudujSkoroszyt(e)
      const bufor = await plik.xlsx.writeBuffer()
      pobierzPlik(
        new Blob([bufor], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        e.nazwaPliku,
      )
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
      {stan === 'trwa' ? 'Przygotowuję…' : stan === 'blad' ? 'Nie udało się - spróbuj ponownie' : 'Pobierz miesiąc'}
    </button>
  )
}

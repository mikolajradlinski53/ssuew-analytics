import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PobierzMiesiac, zbudujSkoroszyt } from '@/components/planer/PobierzMiesiac'
import { budujEksport } from '@/lib/planer/eksport'
import { POLA_DOMYSLNE, type Wydarzenie } from '@/lib/planer/typy'

const zebranie: Wydarzenie = {
  id: 'z', tytul: 'Zebranie', kategoria: 'ZEBRANIA', rok: 2026, miesiac: 10, dzien: 7,
  godzina: '18:00', sala: '110L', osoby: ['Jula'], ...POLA_DOMYSLNE, budynek: 'B/L',
}

describe('PobierzMiesiac', () => {
  it('ma przycisk pobrania', () => {
    render(<PobierzMiesiac wydarzenia={[]} miesiac={{ m: 10, y: 2026 }} />)
    expect(screen.getByRole('button', { name: /pobierz miesiąc/i })).toBeInTheDocument()
  })

  // Pierwsze załadowanie ExcelJS (~1 MB) w środowisku testowym trwa kilkanaście
  // sekund - domyślne 5 s to za mało, choć sama budowa skoroszytu jest natychmiastowa.
  it('buduje skoroszyt z kartami Kalendarz i Lista', { timeout: 60_000 }, async () => {
    const plik = await zbudujSkoroszyt(budujEksport([zebranie], { m: 10, y: 2026 }))
    expect(plik.worksheets.map((a) => a.name)).toEqual(['Kalendarz', 'Lista'])
    expect(plik.getWorksheet('Lista')?.getRow(2).getCell(8).value).toBe('Zebranie')
  })

  it('zapisuje poprawny plik .xlsx, który da się wczytać z powrotem', { timeout: 60_000 }, async () => {
    const plik = await zbudujSkoroszyt(budujEksport([zebranie], { m: 10, y: 2026 }))
    const bufor = await plik.xlsx.writeBuffer()
    const ExcelJS = (await import('exceljs')).default
    const ponownie = new ExcelJS.Workbook()
    await ponownie.xlsx.load(bufor)
    const kal = ponownie.getWorksheet('Kalendarz')!
    // Wiersz 1 to tytuł, 2 nagłówki dni, 3 pierwszy tydzień; 7.10.2026 to środa drugiego tygodnia.
    const komorka = kal.getRow(4).getCell(3).value as { richText: { text: string }[] }
    expect(komorka.richText.map((r) => r.text).join('')).toContain('① 18:00 Zebranie · B/L 110L · Jula')
  })
})

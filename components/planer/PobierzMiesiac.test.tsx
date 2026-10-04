import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import type { Worksheet } from 'exceljs'
import { PobierzMiesiac, zbudujSkoroszyt } from '@/components/planer/PobierzMiesiac'
import { budujEksport } from '@/lib/planer/eksport'
import { POLA_DOMYSLNE, type Wydarzenie } from '@/lib/planer/typy'

const zebranie: Wydarzenie = {
  id: 'z', tytul: 'Zebranie', kategoria: 'ZEBRANIA', rok: 2026, miesiac: 10, dzien: 7,
  godzina: '18:00', sala: '110L', osoby: ['Jula'], ...POLA_DOMYSLNE, budynek: 'B/L',
}
const rekrutacja: Wydarzenie = {
  ...zebranie, id: 'r', tytul: 'Rekrutacja', kategoria: 'SSUEW', dzien: 1, dni: 16,
  calyDzien: true, godzina: null, sala: null, budynek: null, osoby: ['Marcel'],
}

const PAZ = { m: 10, y: 2026 }
const tlo = (a: Worksheet, adres: string) => (a.getCell(adres).fill as { fgColor?: { argb?: string } } | undefined)?.fgColor?.argb

describe('PobierzMiesiac', () => {
  it('ma przycisk pobrania', () => {
    render(<PobierzMiesiac wydarzenia={[]} miesiac={PAZ} sklad={[]} />)
    expect(screen.getByRole('button', { name: /pobierz miesiąc/i })).toBeInTheDocument()
  })

  // Pierwsze załadowanie ExcelJS (~1 MB) w środowisku testowym trwa kilkanaście
  // sekund - domyślne 5 s to za mało, choć sama budowa skoroszytu jest natychmiastowa.
  it('Lista ma układ arkusza Sesji: nagłówki, dzień w wierszu, kategorie w kolumnach', { timeout: 60_000 }, async () => {
    const plik = await zbudujSkoroszyt(budujEksport([zebranie, rekrutacja], PAZ, ['Marcel', 'Jula']))
    expect(plik.worksheets.map((a) => a.name)).toEqual(['Kalendarz', 'Lista'])
    const a = plik.getWorksheet('Lista')!

    expect(a.getCell('A1').value).toBe('dzień')
    expect(a.getCell('B1').value).toBe('dzień tygodnia')
    expect(a.getCell('C1').value).toBe('Co się dzieje ?')
    expect(a.getCell('I1').isMerged).toBe(true)
    expect(a.getCell('J1').value).toBe('Kogo dotyczy?')
    expect(['C2', 'D2', 'E2', 'F2', 'G2', 'H2', 'I2'].map((c) => a.getCell(c).value))
      .toEqual(['UE', 'SSUEW', 'PROJEKTY', 'ZEBRANIA', 'KOMISJE', 'INNE', 'APLIKACJE'])

    // 7.10 to wiersz 9 (dwa wiersze nagłówka), Zebrania to kolumna F.
    expect(a.getCell('A9').value).toBe(7)
    expect(a.getCell('B9').value).toBe('środa')
    expect(a.getCell('F9').value).toBe('Zebranie - 18:00 - 110L')
    expect(tlo(a, 'F9')).toBe('FFF4CCCC')
    expect(a.getCell('J9').value).toBe('Marcel, Jula')
  })

  it('wielodniowe scala komórki w pionie, puste wiersze idą w paski', { timeout: 60_000 }, async () => {
    const a = (await zbudujSkoroszyt(budujEksport([rekrutacja], PAZ))).getWorksheet('Lista')!
    expect(a.getCell('D3').value).toBe('Rekrutacja')
    expect(a.getCell('D18').isMerged).toBe(true)
    expect(a.getCell('D18').master.address).toBe('D3')
    expect(a.getCell('D19').isMerged).toBe(false)
    // Pasek parzystych dni nie może przemalować scalonej komórki - w ExcelJS
    // styl komórki pod scaleniem trafia do komórki głównej.
    expect(tlo(a, 'D3')).toBe('FF9FC5E8')
    // Co drugi wiersz szary: 2.10 (wiersz 4) tak, 1.10 (wiersz 3) nie.
    expect(tlo(a, 'C4')).toBe('FFF3F3F3')
    expect(tlo(a, 'C3')).toBeUndefined()
  })

  it('zapisuje poprawny plik .xlsx, który da się wczytać z powrotem', { timeout: 60_000 }, async () => {
    const plik = await zbudujSkoroszyt(budujEksport([zebranie], PAZ))
    const bufor = await plik.xlsx.writeBuffer()
    const ExcelJS = (await import('exceljs')).default
    const ponownie = new ExcelJS.Workbook()
    await ponownie.xlsx.load(bufor)
    const kal = ponownie.getWorksheet('Kalendarz')!
    // Wiersz 1 to tytuł, 2 nagłówki dni, 3 pierwszy tydzień; 7.10.2026 to środa drugiego tygodnia.
    const komorka = kal.getRow(4).getCell(3).value as { richText: { text: string }[] }
    expect(komorka.richText.map((r) => r.text).join('')).toContain('① 18:00 Zebranie · B/L 110L · Jula')
    expect(ponownie.getWorksheet('Lista')!.getCell('F9').value).toBe('Zebranie - 18:00 - 110L')
  })
})

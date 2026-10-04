import { describe, it, expect } from 'vitest'
import { budujEksport, KOLORY_LISTY, KOLUMNY_LISTY } from '@/lib/planer/eksport'
import { POLA_DOMYSLNE, type Kategoria, type Wydarzenie } from '@/lib/planer/typy'

const PAZ = { m: 10, y: 2026 }

function w(nadpisz: Partial<Wydarzenie>): Wydarzenie {
  return {
    id: 'x', tytul: 'A', kategoria: 'INNE', rok: 2026, miesiac: 10, dzien: 7,
    godzina: null, sala: null, osoby: [], ...POLA_DOMYSLNE, ...nadpisz,
  }
}

const zebranie = w({
  id: 'z', tytul: 'Zebranie', kategoria: 'ZEBRANIA', godzina: '18:00', godzinaDo: '20:00',
  budynek: 'B/L', sala: '110L', osoby: ['Jula', 'Kuba'],
})
const nabor = w({ id: 'n', tytul: 'Nabór', kategoria: 'APLIKACJE', godzina: '08:00' })
const wyjazd = w({ id: 'y', tytul: 'Wyjazd', kategoria: 'PROJEKTY', dzien: 30, dni: 4, calyDzien: true })

describe('budujEksport - Kalendarz', () => {
  const e = budujEksport([nabor, zebranie, wyjazd], PAZ)

  it('nazywa plik rokiem i miesiącem', () => {
    expect(e.nazwaPliku).toBe('planer-2026-10.xlsx')
    expect(e.tytul).toBe('Październik 2026')
  })

  it('kalendarz to tygodnie od poniedziałku', () => {
    expect(e.kalendarz).toHaveLength(5)
    expect(e.kalendarz[0].map((k) => k.dzien)).toEqual([null, null, null, 1, 2, 3, 4])
  })

  it('w komórce najważniejsze na górze, z numerem rangi, miejscem i osobami', () => {
    const siodmy = e.kalendarz.flat().find((k) => k.dzien === 7)!
    expect(siodmy.linie[0]).toEqual({
      tekst: '① 18:00-20:00 Zebranie · B/L 110L · Jula, Kuba',
      kolor: '#1d4ed8',
      pogrubiona: true,
    })
    expect(siodmy.linie[1].tekst).toBe('• 08:00 Nabór')
  })

  it('wielodniowe jest w każdym dniu z numerem dnia', () => {
    const ostatni = e.kalendarz.flat().find((k) => k.dzien === 31)!
    expect(ostatni.linie[0].tekst).toBe('④ cały dzień Wyjazd (2/4)')
  })
})

/** Komórka kategorii `k` w wierszu dnia `dzien`. */
function komorka(e: ReturnType<typeof budujEksport>, dzien: number, k: Kategoria) {
  return e.lista[dzien - 1].komorki[KOLUMNY_LISTY.indexOf(k)]
}

describe('budujEksport - Lista jak arkusz Sesji', () => {
  it('kolumny w kolejności z arkusza wzorcowego', () => {
    expect(KOLUMNY_LISTY).toEqual(['UE', 'SSUEW', 'PROJEKTY', 'ZEBRANIA', 'KOMISJE', 'INNE', 'APLIKACJE'])
  })

  it('wiersz na każdy dzień miesiąca, także pusty', () => {
    const e = budujEksport([], PAZ)
    expect(e.lista).toHaveLength(31)
    expect(e.lista[0]).toMatchObject({ dzien: 1, dzienTygodnia: 'czwartek', kogo: '' })
    expect(e.lista[0].komorki).toHaveLength(7)
    expect(e.lista[0].komorki.every((k) => k.tekst === '' && k.tlo === null && k.wierszy === 1)).toBe(true)
  })

  it('tekst: tytuł - godzina - sala i po spacji budynek', () => {
    const e = budujEksport([
      w({ id: 'p', tytul: 'PROMKA', kategoria: 'KOMISJE', dzien: 6, godzina: '18:00', budynek: 'B/L', sala: '110' }),
      w({ id: 's', tytul: 'SKS', kategoria: 'ZEBRANIA', dzien: 13, godzina: '18:00', godzinaDo: '20:00', budynek: 'A', sala: '120' }),
      w({ id: 'b', tytul: 'Targi', kategoria: 'UE', dzien: 15, budynek: 'A' }),
      w({ id: 'c', tytul: 'DIJK', kategoria: 'KOMISJE', dzien: 16, sala: '9J' }),
      w({ id: 'o', tytul: 'Zjazd', kategoria: 'SSUEW', dzien: 17, budynek: 'MIASTO', sala: 'Warszawa' }),
    ], PAZ)
    expect(komorka(e, 6, 'KOMISJE').tekst).toBe('PROMKA - 18:00 - 110 B/L')
    expect(komorka(e, 13, 'ZEBRANIA').tekst).toBe('SKS - 18:00-20:00 - 120 A')
    expect(komorka(e, 15, 'UE').tekst).toBe('Targi - A')
    expect(komorka(e, 16, 'KOMISJE').tekst).toBe('DIJK - 9J')
    expect(komorka(e, 17, 'SSUEW').tekst).toBe('Zjazd - Warszawa')
  })

  it('wydarzenie wielodniowe to jedna scalona komórka w pionie', () => {
    const rekrutacja = w({ id: 'r', tytul: 'Rekrutacja', kategoria: 'SSUEW', dzien: 1, dni: 16, calyDzien: true })
    const e = budujEksport([rekrutacja], PAZ)
    expect(komorka(e, 1, 'SSUEW')).toEqual({ tekst: 'Rekrutacja', tlo: KOLORY_LISTY.kolumny.SSUEW.komorka, wierszy: 16 })
    expect(komorka(e, 2, 'SSUEW').wierszy).toBe(0)
    expect(komorka(e, 16, 'SSUEW').wierszy).toBe(0)
    expect(komorka(e, 17, 'SSUEW').wierszy).toBe(1)
  })

  it('wielodniowe z poprzedniego miesiąca zaczyna scalenie od 1.', () => {
    const e = budujEksport([w({ id: 'y', tytul: 'Wyjazd', kategoria: 'PROJEKTY', miesiac: 9, dzien: 29, dni: 4 })], PAZ)
    expect(komorka(e, 1, 'PROJEKTY')).toMatchObject({ tekst: 'Wyjazd', wierszy: 2 })
  })

  it('dwa wydarzenia tej samej kategorii w dniu - jedno pod drugim, bez scalania', () => {
    const e = budujEksport([
      w({ id: 'r', tytul: 'Rekrutacja', kategoria: 'SSUEW', dzien: 1, dni: 3 }),
      w({ id: 'f', tytul: 'Zjazd', kategoria: 'SSUEW', dzien: 2 }),
    ], PAZ)
    expect(komorka(e, 1, 'SSUEW')).toMatchObject({ tekst: 'Rekrutacja', wierszy: 1 })
    expect(komorka(e, 2, 'SSUEW')).toMatchObject({ tekst: 'Rekrutacja\nZjazd', wierszy: 1 })
    expect(komorka(e, 3, 'SSUEW')).toMatchObject({ tekst: 'Rekrutacja', wierszy: 1 })
  })

  it('tło: kolor kolumny, ciemniejsze zebranie zarządu, zielony dzień wolny, UE i komisje bez tła', () => {
    const e = budujEksport([
      w({ id: '1', tytul: 'ZEBRANIE ZARZĄDU', kategoria: 'ZEBRANIA', dzien: 7 }),
      w({ id: '2', tytul: 'ZEBRANIE REKRUTACJI', kategoria: 'ZEBRANIA', dzien: 8 }),
      w({ id: '3', tytul: 'Targi Pracy', kategoria: 'UE', dzien: 15 }),
      w({ id: '4', tytul: 'DZIEŃ REKTORSKI', kategoria: 'UE', dzien: 31, dzienWolny: true }),
      w({ id: '5', tytul: 'HR', kategoria: 'KOMISJE', dzien: 9 }),
      w({ id: '6', tytul: 'KG BALU', kategoria: 'APLIKACJE', dzien: 3 }),
    ], PAZ)
    expect(komorka(e, 7, 'ZEBRANIA').tlo).toBe(KOLORY_LISTY.zarzad)
    expect(komorka(e, 8, 'ZEBRANIA').tlo).toBe(KOLORY_LISTY.kolumny.ZEBRANIA.komorka)
    expect(komorka(e, 15, 'UE').tlo).toBeNull()
    expect(komorka(e, 31, 'UE').tlo).toBe(KOLORY_LISTY.wolny)
    expect(komorka(e, 9, 'KOMISJE').tlo).toBeNull()
    expect(komorka(e, 3, 'APLIKACJE').tlo).toBe(KOLORY_LISTY.kolumny.APLIKACJE.komorka)
  })

  it('„Kogo dotyczy?” to osoby ze wszystkich wydarzeń dnia, w kolejności Składu', () => {
    const e = budujEksport([
      w({ id: 'r', tytul: 'Rekrutacja', kategoria: 'SSUEW', dzien: 1, dni: 5, osoby: ['Madzia', 'Marcel'] }),
      w({ id: 'b', tytul: 'KG BALU', kategoria: 'APLIKACJE', dzien: 3, osoby: ['Daria', 'Marcel', 'Gość'] }),
      w({ id: 'z', tytul: 'ZEBRANIE ZARZĄDU', kategoria: 'ZEBRANIA', dzien: 4, osoby: ['wszyscy'] }),
    ], PAZ, ['Marcel', 'Jula', 'Madzia', 'Daria'])
    expect(e.lista[0].kogo).toBe('Marcel, Madzia')
    expect(e.lista[2].kogo).toBe('Marcel, Madzia, Daria, Gość')
    expect(e.lista[3].kogo).toBe('wszyscy')
    expect(e.lista[5].kogo).toBe('')
  })

  it('pomija wydarzenia spoza miesiąca', () => {
    const e = budujEksport([w({ miesiac: 11, dzien: 15, tytul: 'Listopad' })], PAZ)
    expect(e.lista.flatMap((r) => r.komorki).some((k) => k.tekst)).toBe(false)
  })
})

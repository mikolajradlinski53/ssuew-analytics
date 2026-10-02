import { describe, it, expect } from 'vitest'
import { odcinkiTygodnia, tygodnieMiesiaca } from '@/lib/planer/pasy'
import { POLA_DOMYSLNE, type Wydarzenie } from '@/lib/planer/typy'

const PAZ = { m: 10, y: 2026 }
const LIS = { m: 11, y: 2026 }

function w(dzien: number, dni: number, id = `${dzien}-${dni}`, miesiac = 10): Wydarzenie {
  return {
    id, tytul: id, kategoria: 'PROJEKTY', rok: 2026, miesiac, dzien,
    godzina: null, sala: null, osoby: [], ...POLA_DOMYSLNE, dni,
  }
}

describe('tygodnieMiesiaca', () => {
  it('układa październik 2026 od poniedziałku', () => {
    const t = tygodnieMiesiaca(PAZ)
    expect(t).toHaveLength(5)
    expect(t[0]).toEqual([null, null, null, 1, 2, 3, 4])
    expect(t[4]).toEqual([26, 27, 28, 29, 30, 31, null])
  })
})

describe('odcinkiTygodnia', () => {
  it('wydarzenie w środku tygodnia to jeden odcinek bez kontynuacji', () => {
    const [o] = odcinkiTygodnia(tygodnieMiesiaca(PAZ)[1], PAZ, [w(8, 3)])
    expect(o).toMatchObject({ kolOd: 3, kolDo: 5, ciagnieSieZLewej: false, ciagnieSieWPrawo: false, pas: 0 })
  })

  it('wydarzenie przez weekend łamie się na granicy tygodnia', () => {
    const t = tygodnieMiesiaca(PAZ)
    const [przed] = odcinkiTygodnia(t[1], PAZ, [w(10, 5)])
    const [po] = odcinkiTygodnia(t[2], PAZ, [w(10, 5)])
    expect(przed).toMatchObject({ kolOd: 5, kolDo: 6, ciagnieSieWPrawo: true })
    // 10.10 + 5 dni = 10-14: w tygodniu 12-18 to poniedziałek-środa.
    expect(po).toMatchObject({ kolOd: 0, kolDo: 2, ciagnieSieZLewej: true, ciagnieSieWPrawo: false })
  })

  it('wydarzenie przez przełom miesięcy ma strzałki na krawędziach miesiąca', () => {
    const wyjazd = w(30, 4)
    const [paz] = odcinkiTygodnia(tygodnieMiesiaca(PAZ)[4], PAZ, [wyjazd])
    const [lis] = odcinkiTygodnia(tygodnieMiesiaca(LIS)[0], LIS, [wyjazd])
    expect(paz).toMatchObject({ kolOd: 4, kolDo: 5, ciagnieSieWPrawo: true })
    expect(lis).toMatchObject({ kolOd: 6, kolDo: 6, ciagnieSieZLewej: true })
  })

  it('nachodzące na siebie trafiają do różnych pasów, rozłączne - do jednego', () => {
    const t = tygodnieMiesiaca(PAZ)[1]
    const nachodzace = odcinkiTygodnia(t, PAZ, [w(6, 3, 'a'), w(7, 3, 'b')])
    expect(new Set(nachodzace.map((o) => o.pas))).toEqual(new Set([0, 1]))
    const rozlaczne = odcinkiTygodnia(t, PAZ, [w(5, 2, 'a'), w(8, 2, 'b')])
    expect(rozlaczne.map((o) => o.pas)).toEqual([0, 0])
  })

  it('wydarzenie spoza tygodnia nie daje odcinka', () => {
    expect(odcinkiTygodnia(tygodnieMiesiaca(PAZ)[0], PAZ, [w(20, 2)])).toEqual([])
  })
})

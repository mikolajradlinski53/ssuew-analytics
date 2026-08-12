import { NextResponse, type NextRequest } from 'next/server'
import { ktoPyta } from '@/lib/auth/guard'
import { naWydarzenie } from '@/lib/planer/mapowanie'
import { propozycjeRef, semestrRef, wydarzeniaRef } from '@/lib/firebase/admin'

export const runtime = 'nodejs'

/**
 * Odczyt kalendarza dla osób wchodzących kodem: nie mają konta Firebase, więc
 * reguły Firestore ich nie wpuszczą. Konta z hasłem czytają bazę bezpośrednio
 * i tej trasy nie potrzebują.
 */
export async function GET(req: NextRequest) {
  const kto = await ktoPyta(req)
  if (!kto) return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })

  const semestrId = req.nextUrl.searchParams.get('semestr')
  if (!semestrId) return NextResponse.json({ error: 'Brak semestru' }, { status: 400 })

  try {
    const zrzut = await wydarzeniaRef(semestrId).get()
    return NextResponse.json(zrzut.docs.map((d) => naWydarzenie(d.id, d.data())))
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

/** Czy zarząd może w tej chwili zapisywać wprost. Rozstrzyga serwer, nie klient. */
async function trybWspolnyWlaczony(semestrId: string): Promise<boolean> {
  const zrzut = await semestrRef(semestrId).get()
  return zrzut.data()?.trybWspolny === true
}

/**
 * Zapisy zarządu. Osoby na kodzie nie mają konta Firebase, a konto `board`
 * z hasłem celowo też pisze tędy — jedna ścieżka zapisu to jedno miejsce,
 * w którym weryfikuje się uprawnienia.
 */
export async function POST(req: NextRequest) {
  const kto = await ktoPyta(req)
  if (!kto) return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { semestr, akcja } = body
  if (!semestr || typeof akcja !== 'string') {
    return NextResponse.json({ error: 'Brak semestru albo akcji' }, { status: 400 })
  }

  try {
    if (akcja === 'propozycja-przeniesienia') {
      await propozycjeRef(semestr).add({
        rodzaj: 'przeniesienie',
        autor: kto.email,
        utworzone: Date.now(),
        wydarzenieId: body.wydarzenieId,
        zDnia: body.zDnia,
        naDzien: body.naDzien,
        tytulWydarzenia: body.tytulWydarzenia ?? '',
      })
      return NextResponse.json({ ok: true }, { status: 201 })
    }

    if (akcja === 'propozycja-nowego') {
      await propozycjeRef(semestr).add({
        rodzaj: 'nowe',
        autor: kto.email,
        utworzone: Date.now(),
        wydarzenie: body.wydarzenie,
      })
      return NextResponse.json({ ok: true }, { status: 201 })
    }

    if (akcja === 'przenies') {
      // Właściciel pisze zawsze; zarząd tylko przy włączonej Sesji Operacyjnej.
      const wolno = kto.rola === 'owner' || (await trybWspolnyWlaczony(semestr))
      if (!wolno) {
        return NextResponse.json({ error: 'Sesja Operacyjna nie jest włączona' }, { status: 403 })
      }
      await wydarzeniaRef(semestr).doc(body.wydarzenieId).update({
        dzien: body.naDzien,
        zmienione: Date.now(),
      })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Nieznana akcja' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

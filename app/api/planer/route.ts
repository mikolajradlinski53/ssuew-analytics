import { NextResponse, type NextRequest } from 'next/server'
import { ktoPyta } from '@/lib/auth/guard'
import { obrazPlanera, stanSesji } from '@/lib/planer/obraz'
import { sprawdzWydarzenie } from '@/lib/planer/walidacja'
import type { Pytajacy } from '@/lib/auth/guard'
import {
  komentarzeRef, obecnoscRef, propozycjeRef, wydarzeniaRef,
} from '@/lib/firebase/admin'

export const runtime = 'nodejs'

/**
 * Odczyt Planera dla osób wchodzących kodem: nie mają konta Firebase, więc
 * reguły Firestore ich nie wpuszczą. `zasob=sesja` to tani odczyt jednego
 * dokumentu - odpytujemy nim poza sesją, żeby zauważyć jej start.
 */
export async function GET(req: NextRequest) {
  const kto = await ktoPyta(req)
  if (!kto) return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })

  const semestrId = req.nextUrl.searchParams.get('semestr')
  if (!semestrId) return NextResponse.json({ error: 'Brak semestru' }, { status: 400 })

  try {
    if (req.nextUrl.searchParams.get('zasob') === 'sesja') {
      return NextResponse.json({ sesja: await stanSesji(semestrId) })
    }
    return NextResponse.json(await obrazPlanera(semestrId))
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

/** Właściciel pisze zawsze; zarząd wyłącznie przy włączonej Sesji Operacyjnej. Rozstrzyga serwer. */
async function wolnoPisacWprost(kto: Pytajacy, semestrId: string): Promise<boolean> {
  return kto.rola === 'owner' || (await stanSesji(semestrId)).wlaczony
}

/**
 * Zapisy zarządu. Osoby na kodzie nie mają konta Firebase, a konto `board`
 * z hasłem celowo też pisze tędy - jedna ścieżka zapisu to jedno miejsce,
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
      const s = sprawdzWydarzenie(body.wydarzenie)
      if (!s.ok) return NextResponse.json({ error: s.blad }, { status: 400 })
      await propozycjeRef(semestr).add({
        rodzaj: 'nowe',
        autor: kto.email,
        utworzone: Date.now(),
        wydarzenie: s.wydarzenie,
      })
      return NextResponse.json({ ok: true }, { status: 201 })
    }

    if (akcja === 'dodaj' || akcja === 'zmien') {
      if (!(await wolnoPisacWprost(kto, semestr))) {
        return NextResponse.json({ error: 'Sesja Operacyjna nie jest włączona' }, { status: 403 })
      }
      const s = sprawdzWydarzenie(body.wydarzenie)
      if (!s.ok) return NextResponse.json({ error: s.blad }, { status: 400 })

      if (akcja === 'dodaj') {
        await wydarzeniaRef(semestr).add({ ...s.wydarzenie, zmienione: Date.now() })
        return NextResponse.json({ ok: true }, { status: 201 })
      }
      if (typeof body.wydarzenieId !== 'string' || !body.wydarzenieId) {
        return NextResponse.json({ error: 'Brak wydarzenia do zmiany' }, { status: 400 })
      }
      await wydarzeniaRef(semestr).doc(body.wydarzenieId).update({ ...s.wydarzenie, zmienione: Date.now() })
      return NextResponse.json({ ok: true })
    }

    if (akcja === 'przenies') {
      // Właściciel pisze zawsze; zarząd tylko przy włączonej Sesji Operacyjnej.
      const wolno = await wolnoPisacWprost(kto, semestr)
      if (!wolno) {
        return NextResponse.json({ error: 'Sesja Operacyjna nie jest włączona' }, { status: 403 })
      }
      await wydarzeniaRef(semestr).doc(body.wydarzenieId).update({
        dzien: body.naDzien,
        zmienione: Date.now(),
      })
      return NextResponse.json({ ok: true })
    }

    if (akcja === 'komentarz') {
      const tresc = typeof body.tresc === 'string' ? body.tresc.trim() : ''
      if (!tresc || !body.wydarzenieId) {
        return NextResponse.json({ error: 'Pusty komentarz' }, { status: 400 })
      }
      await komentarzeRef(semestr).add({
        wydarzenieId: body.wydarzenieId,
        tresc,
        autor: kto.email,
        utworzone: Date.now(),
      })
      return NextResponse.json({ ok: true }, { status: 201 })
    }

    if (akcja === 'obecnosc') {
      // `uid` i `kto` biorą się WYŁĄCZNIE z biletu. Wzięte z treści żądania
      // pozwoliłyby podszyć się pod dowolną osobę w pasku obecności.
      await obecnoscRef(semestr).doc(kto.uid).set({
        kto: kto.email,
        ostatniZnak: Date.now(),
        patrzyNa: typeof body.patrzyNa === 'string' ? body.patrzyNa : null,
      })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Nieznana akcja' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

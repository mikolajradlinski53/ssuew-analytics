import { NextResponse, type NextRequest } from 'next/server'
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { ktoPyta } from '@/lib/auth/guard'
import { naWydarzenie } from '@/lib/planer/mapowanie'

export const runtime = 'nodejs'

/**
 * Admin SDK omija reguły Firestore, więc ta trasa MUSI sama sprawdzić, kto pyta.
 * Bez tego byłaby otwartym oknem do bazy.
 */
function aplikacja(): App {
  if (getApps().length) return getApps()[0]
  const klucz = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!klucz) throw new Error('Brak FIREBASE_SERVICE_ACCOUNT')
  return initializeApp({ credential: cert(JSON.parse(klucz)) })
}

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
    const zrzut = await getFirestore(aplikacja())
      .collection('semestry').doc(semestrId).collection('wydarzenia').get()
    return NextResponse.json(zrzut.docs.map((d) => naWydarzenie(d.id, d.data())))
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

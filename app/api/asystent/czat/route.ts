import { NextResponse, type NextRequest } from 'next/server'
import { ktoPyta } from '@/lib/auth/guard'
import { biezacySemestr } from '@/lib/planer/semestry'
import { dzisWarszawa } from '@/lib/czas'
import { komunikatBledu, zapytajGemini } from '@/lib/asystent/gemini'
import { INSTRUKCJA_CZATU, rozmowaDlaGemini, sprawdzRozmowe } from '@/lib/asystent/czat'
import { daneProjektu, pobierzArkusz, pobierzPlaner, zbudujKontekst } from '@/lib/asystent/dane'

export const runtime = 'nodejs'
export const maxDuration = 60

/** Czat „Zapytaj D.E.C.K.” - tylko właściciel. Historia żyje w przeglądarce. */
export async function POST(req: NextRequest) {
  const kto = await ktoPyta(req)
  if (!kto) return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })
  if (kto.rola !== 'owner') return NextResponse.json({ error: 'Asystent jest tylko dla właściciela' }, { status: 403 })

  const rozmowa = sprawdzRozmowe(await req.json().catch(() => null))
  if (!rozmowa) return NextResponse.json({ error: 'Pusta albo niepoprawna rozmowa' }, { status: 400 })

  const teraz = new Date()
  const semestr = biezacySemestr(teraz)
  try {
    const [a, p] = await Promise.all([pobierzArkusz(), pobierzPlaner(semestr.id, kto.rola)])
    const k = zbudujKontekst(daneProjektu(a, p, { id: semestr.id, nazwa: semestr.nazwa }, []), dzisWarszawa(teraz))
    const { tekst: odpowiedz } = await zapytajGemini({ instrukcja: INSTRUKCJA_CZATU, wiadomosci: rozmowaDlaGemini(k, rozmowa) })
    return NextResponse.json({ odpowiedz })
  } catch (e) {
    const { status, error } = komunikatBledu(e)
    return NextResponse.json({ error }, { status })
  }
}

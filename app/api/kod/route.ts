import { NextResponse, type NextRequest } from 'next/server'
import { gasList, gasWrite } from '@/lib/gas/client'
import { isConfigured } from '@/lib/gas/config'
import { rozpatrzKod } from '@/lib/auth/kody'
import { podpiszSesjeKodu } from '@/lib/auth/session'

const TRZYDZIESCI_DNI_S = 30 * 24 * 60 * 60

const KOMUNIKAT = {
  nieznany: 'Taki kod nie istnieje',
  nieaktywny: 'Ten kod został wyłączony',
  'inne-urzadzenie': 'Ten kod jest już przypisany do innego urządzenia',
} as const

function ciasteczko(res: NextResponse, nazwa: string, wartosc: string) {
  res.cookies.set(nazwa, wartosc, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TRZYDZIESCI_DNI_S,
  })
}

export async function POST(req: NextRequest) {
  if (!isConfigured) {
    return NextResponse.json({ error: 'Arkusz z kodami nie jest skonfigurowany' }, { status: 503 })
  }

  const { kod: wpisany } = await req.json().catch(() => ({ kod: '' }))
  if (typeof wpisany !== 'string') {
    return NextResponse.json({ error: KOMUNIKAT.nieznany }, { status: 401 })
  }

  const kody = await gasList('kody')
  const urzadzenie = req.cookies.get('deck_device')?.value ?? null
  const wynik = rozpatrzKod(kody, wpisany, urzadzenie)

  if (!wynik.ok) {
    return NextResponse.json({ error: KOMUNIKAT[wynik.powod] }, { status: 401 })
  }

  // IP zapisujemy tylko po to, żeby dało się zobaczyć, kto skąd wchodził.
  // Nie bierze udziału w wpuszczaniu — patrz komentarz w lib/auth/kody.ts.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
  const teraz = new Date().toISOString()

  await gasWrite('kody', 'update', [
    {
      id: wynik.kod.id,
      urzadzenie: wynik.urzadzenie,
      ip_pierwszy: wynik.pierwszeUzycie ? ip : wynik.kod.ip_pierwszy,
      ostatnie_uzycie: teraz,
    },
  ])

  const res = NextResponse.json({ rola: 'board', etykieta: wynik.kod.etykieta })
  ciasteczko(res, 'deck_kod', await podpiszSesjeKodu({ kod: wynik.kod.kod, urzadzenie: wynik.urzadzenie }))
  ciasteczko(res, 'deck_device', wynik.urzadzenie)
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  // Identyfikator urządzenia zostaje — inaczej po wylogowaniu własny kod
  // wyglądałby jak próba wejścia z obcego sprzętu.
  res.cookies.delete('deck_kod')
  return res
}

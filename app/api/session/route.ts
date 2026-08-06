import { NextResponse, type NextRequest } from 'next/server'
import { zweryfikujToken } from '@/lib/auth/verify'
import { rolaDla } from '@/lib/auth/role'

const GODZINA_S = 60 * 60

export async function POST(req: NextRequest) {
  const { token } = await req.json().catch(() => ({ token: null }))
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Brak tokenu' }, { status: 401 })
  }

  const tozsamosc = await zweryfikujToken(token)
  if (!tozsamosc) return NextResponse.json({ error: 'Token nieważny' }, { status: 401 })

  const rola = rolaDla(tozsamosc.email)
  if (!rola) {
    // Adres w komunikacie jest celowy: to jedyny moment, w którym widać,
    // którym kontem Google faktycznie się logujesz — wystarczy je wkleić
    // do DECK_OWNER_EMAIL albo DECK_BOARD_EMAILS.
    return NextResponse.json(
      { error: `Konto ${tozsamosc.email} nie ma dostępu do DECK` },
      { status: 403 },
    )
  }

  const res = NextResponse.json({ rola, email: tozsamosc.email })
  res.cookies.set('deck_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    // Token Firebase i tak żyje godzinę; dłuższe ciasteczko dawałoby tylko
    // złudzenie sesji, którą trasy API i tak odrzucą.
    maxAge: GODZINA_S,
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('deck_session')
  return res
}

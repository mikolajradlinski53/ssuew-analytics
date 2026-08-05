import type { NextRequest } from 'next/server'
import { zweryfikujToken } from './verify'
import { rolaDla, type Rola } from './role'

export interface Pytajacy {
  uid: string
  email: string
  rola: Rola
}

/**
 * Prawdziwa weryfikacja: podpis, wystawca, odbiorca, termin ważności i lista adresów.
 * Middleware sprawdza jedynie obecność ciasteczka — bezpieczeństwo mieszka tutaj.
 */
export async function ktoPyta(req: NextRequest): Promise<Pytajacy | null> {
  const token = req.cookies.get('deck_session')?.value
  if (!token) return null

  const tozsamosc = await zweryfikujToken(token)
  if (!tozsamosc) return null

  const rola = rolaDla(tozsamosc.email)
  if (!rola) return null

  return { uid: tozsamosc.uid, email: tozsamosc.email, rola }
}

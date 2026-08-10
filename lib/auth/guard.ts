import type { NextRequest } from 'next/server'
import { zweryfikujToken } from './verify'
import { odczytajSesjeKodu } from './session'
import { rolaDla, type Rola } from './role'

export interface Pytajacy {
  /** Identyfikator konta Firebase albo `kod:<KOD>` przy wejściu na kod. */
  uid: string
  /** Adres e-mail przy koncie z hasłem; etykieta kodu przy wejściu na kod. */
  email: string
  rola: Rola
}

/**
 * Dwie drogi wejścia, jeden wynik. Konto z hasłem daje rolę z listy adresów;
 * kod daje zawsze `board`, bo pełne uprawnienia wymagają hasła.
 *
 * Prawdziwa weryfikacja: podpis, wystawca, odbiorca, termin ważności.
 * Middleware sprawdza jedynie obecność ciasteczka — bezpieczeństwo mieszka tutaj.
 */
export async function ktoPyta(req: NextRequest): Promise<Pytajacy | null> {
  const token = req.cookies.get('deck_session')?.value
  if (token) {
    const tozsamosc = await zweryfikujToken(token)
    const rola = tozsamosc ? rolaDla(tozsamosc.email) : null
    if (tozsamosc && rola) return { uid: tozsamosc.uid, email: tozsamosc.email, rola }
  }

  const bilet = req.cookies.get('deck_kod')?.value
  if (bilet) {
    const sesja = await odczytajSesjeKodu(bilet)
    if (sesja) return { uid: `kod:${sesja.kod}`, email: sesja.kod, rola: sesja.rola }
  }

  return null
}

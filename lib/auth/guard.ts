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
 *
 * Działa na samych wartościach ciasteczek, więc służy i trasom API (`ktoPyta`),
 * i stronom serwerowym (`ktoNaStronie`). Gdy strona sprawdzała tylko hasło,
 * osoba na kodzie krążyła między kokpitem a logowaniem.
 */
export async function ktoZCiasteczek(token?: string, bilet?: string): Promise<Pytajacy | null> {
  if (token) {
    const tozsamosc = await zweryfikujToken(token)
    const rola = tozsamosc ? rolaDla(tozsamosc.email) : null
    if (tozsamosc && rola) return { uid: tozsamosc.uid, email: tozsamosc.email, rola }
  }

  if (bilet) {
    const sesja = await odczytajSesjeKodu(bilet)
    if (sesja) return { uid: `kod:${sesja.kod}`, email: sesja.kod, rola: sesja.rola }
  }

  return null
}

export async function ktoPyta(req: NextRequest): Promise<Pytajacy | null> {
  return ktoZCiasteczek(req.cookies.get('deck_session')?.value, req.cookies.get('deck_kod')?.value)
}

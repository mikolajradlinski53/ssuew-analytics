import { SignJWT, jwtVerify } from 'jose'

const WYSTAWCA = 'deck'
const WAZNOSC = '30d'

export interface SesjaKodu {
  kod: string
  urzadzenie: string
  rola: 'board'
}

function sekret(): Uint8Array {
  const s = process.env.DECK_SESSION_SECRET ?? ''
  // Bez sekretu bilet dałoby się wypisać samodzielnie, więc lepiej głośno
  // odmówić niż po cichu wpuścić kogokolwiek.
  if (s.length < 32) {
    throw new Error('DECK_SESSION_SECRET musi mieć co najmniej 32 znaki')
  }
  return new TextEncoder().encode(s)
}

/**
 * Bilet wstępu dla osoby wchodzącej kodem. Podpisany po stronie serwera, więc
 * przeglądarka może go przechowywać, ale nie może w nim niczego zmienić —
 * w szczególności podnieść sobie roli.
 */
export async function podpiszSesjeKodu(dane: Omit<SesjaKodu, 'rola'>): Promise<string> {
  return new SignJWT({ kod: dane.kod, urzadzenie: dane.urzadzenie, rola: 'board' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(WYSTAWCA)
    .setIssuedAt()
    .setExpirationTime(WAZNOSC)
    .sign(sekret())
}

/** Zwraca zawartość biletu albo `null` — bez tłumaczenia, co było nie tak. */
export async function odczytajSesjeKodu(bilet: string): Promise<SesjaKodu | null> {
  if (!bilet) return null
  try {
    const { payload } = await jwtVerify(bilet, sekret(), { issuer: WYSTAWCA })
    const kod = typeof payload.kod === 'string' ? payload.kod : ''
    const urzadzenie = typeof payload.urzadzenie === 'string' ? payload.urzadzenie : ''
    if (!kod || !urzadzenie) return null
    return { kod, urzadzenie, rola: 'board' }
  } catch {
    return null
  }
}

/** Identyfikator przeglądarki, z którą wiąże się kod przy pierwszym użyciu. */
export function nowyIdentyfikatorUrzadzenia(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

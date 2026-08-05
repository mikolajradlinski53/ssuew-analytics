import { createRemoteJWKSet, jwtVerify } from 'jose'

const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'

export interface Tozsamosc {
  uid: string
  email: string
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

/**
 * Zwraca tożsamość albo `null` — bez rozróżniania, co dokładnie było nie tak.
 * Wywołujący ma odmówić dostępu, a nie tłumaczyć pytającemu, którego warunku nie spełnił.
 */
export async function zweryfikujToken(token: string): Promise<Tozsamosc | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? ''
  if (!projectId || !token) return null

  if (!jwks) jwks = createRemoteJWKSet(new URL(JWKS_URL))

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    })
    const uid = typeof payload.sub === 'string' ? payload.sub : ''
    const email = typeof payload.email === 'string' ? payload.email : ''
    if (!uid || !email) return null
    return { uid, email }
  } catch {
    return null
  }
}

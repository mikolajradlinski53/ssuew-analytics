'use client'
import { useCallback, useEffect, useState } from 'react'
import { onIdTokenChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { auth, dostawcaGoogle, firebaseSkonfigurowany } from './firebase'
import type { Rola } from './role'

export interface StanSesji {
  user: User | null
  rola: Rola | null
  laduje: boolean
  blad: string | null
}

const POCZATKOWY: StanSesji = { user: null, rola: null, laduje: true, blad: null }

export function useAuth() {
  const [stan, setStan] = useState<StanSesji>(POCZATKOWY)

  useEffect(() => {
    if (!firebaseSkonfigurowany) {
      setStan({ ...POCZATKOWY, laduje: false, blad: 'Firebase nie jest skonfigurowany' })
      return
    }

    // onIdTokenChanged, a nie onAuthStateChanged: token wygasa po godzinie i Firebase
    // odnawia go sam — ciasteczko musi jechać za nim, inaczej zapisy zaczną zwracać 401.
    return onIdTokenChanged(auth(), async (user) => {
      if (!user) {
        await fetch('/api/session', { method: 'DELETE' })
        setStan({ ...POCZATKOWY, laduje: false })
        return
      }

      const token = await user.getIdToken()
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: null }))
        await signOut(auth())
        setStan({
          ...POCZATKOWY,
          laduje: false,
          blad: error ?? 'To konto nie ma dostępu do DECK',
        })
        return
      }

      const { rola } = await res.json()
      setStan({ user, rola, laduje: false, blad: null })
    })
  }, [])

  const zaloguj = useCallback(async () => {
    setStan((s) => ({ ...s, blad: null }))
    try {
      await signInWithPopup(auth(), dostawcaGoogle())
    } catch (e) {
      // Zamknięcie okienka to nie awaria — nie strasz komunikatem o błędzie.
      const anulowane =
        e instanceof Error &&
        (e.message.includes('popup-closed-by-user') || e.message.includes('cancelled-popup-request'))
      if (!anulowane) setStan((s) => ({ ...s, blad: 'Logowanie się nie powiodło' }))
    }
  }, [])

  const wyloguj = useCallback(async () => {
    await signOut(auth())
  }, [])

  return { ...stan, zaloguj, wyloguj }
}

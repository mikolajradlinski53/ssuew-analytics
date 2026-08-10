'use client'
import { useCallback, useEffect, useState } from 'react'
import { onIdTokenChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth, firebaseSkonfigurowany } from './firebase'
import type { Rola } from './role'

export interface StanSesji {
  /** Adres e-mail przy koncie z hasłem; etykieta kodu przy wejściu na kod. */
  kto: string | null
  rola: Rola | null
  /** Skąd wzięła się sesja — decyduje, jak wygląda wylogowanie. */
  sposob: 'haslo' | 'kod' | null
  laduje: boolean
  blad: string | null
}

const PUSTA: StanSesji = { kto: null, rola: null, sposob: null, laduje: true, blad: null }

/** Pyta serwer, kto jest zalogowany — jedna odpowiedź dla obu dróg wejścia. */
async function ktoJestem(): Promise<Pick<StanSesji, 'kto' | 'rola' | 'sposob'>> {
  const res = await fetch('/api/session')
  if (!res.ok) return { kto: null, rola: null, sposob: null }
  const dane = await res.json()
  return { kto: dane.kto ?? null, rola: dane.rola ?? null, sposob: dane.sposob ?? null }
}

export function useAuth() {
  const [stan, setStan] = useState<StanSesji>(PUSTA)

  const odswiez = useCallback(async () => {
    const kim = await ktoJestem()
    setStan({ ...kim, laduje: false, blad: null })
  }, [])

  useEffect(() => {
    let zywy = true

    // Sesja kodowa nie przechodzi przez Firebase, więc pytamy serwer wprost.
    void ktoJestem().then((kim) => {
      if (zywy) setStan({ ...kim, laduje: false, blad: null })
    })

    if (!firebaseSkonfigurowany) return () => { zywy = false }

    // onIdTokenChanged, a nie onAuthStateChanged: token wygasa po godzinie
    // i Firebase odnawia go sam, więc ciasteczko musi jechać za nim — inaczej
    // zapisy zaczęłyby zwracać 401.
    const stop = onIdTokenChanged(auth(), async (user) => {
      if (!user) return
      const token = await user.getIdToken()
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (!zywy) return
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: null }))
        await signOut(auth())
        setStan({ ...PUSTA, laduje: false, blad: error ?? 'To konto nie ma dostępu do DECK' })
        return
      }
      const { rola, email } = await res.json()
      setStan({ kto: email, rola, sposob: 'haslo', laduje: false, blad: null })
    })

    return () => {
      zywy = false
      stop()
    }
  }, [])

  const zalogujHaslem = useCallback(async (email: string, haslo: string) => {
    setStan((s) => ({ ...s, blad: null }))
    try {
      await signInWithEmailAndPassword(auth(), email, haslo)
    } catch {
      // Nie zdradzamy, czy pomylono adres, czy hasło.
      setStan((s) => ({ ...s, blad: 'Nieprawidłowy e-mail lub hasło' }))
    }
  }, [])

  const zalogujKodem = useCallback(
    async (kod: string) => {
      setStan((s) => ({ ...s, blad: null }))
      const res = await fetch('/api/kod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kod }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: null }))
        setStan((s) => ({ ...s, blad: error ?? 'Kod nie zadziałał' }))
        return false
      }
      await odswiez()
      return true
    },
    [odswiez],
  )

  const wyloguj = useCallback(async () => {
    if (stan.sposob === 'haslo' && firebaseSkonfigurowany) {
      await signOut(auth())
      await fetch('/api/session', { method: 'DELETE' })
    } else {
      await fetch('/api/kod', { method: 'DELETE' })
    }
    setStan({ ...PUSTA, laduje: false })
  }, [stan.sposob])

  return { ...stan, zalogujHaslem, zalogujKodem, wyloguj }
}

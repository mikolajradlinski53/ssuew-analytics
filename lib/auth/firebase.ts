'use client'
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth'

const konfiguracja = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
}

export const firebaseSkonfigurowany = konfiguracja.apiKey !== '' && konfiguracja.projectId !== ''

/** Next odświeża moduły w trybie deweloperskim, więc inicjalizacja musi być idempotentna. */
function aplikacja(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(konfiguracja)
}

export function auth(): Auth {
  return getAuth(aplikacja())
}

export function dostawcaGoogle(): GoogleAuthProvider {
  return new GoogleAuthProvider()
}

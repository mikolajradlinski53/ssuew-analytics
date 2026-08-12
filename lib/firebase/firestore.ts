'use client'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { auth } from '@/lib/auth/firebase'

/**
 * Firestore korzysta z tej samej aplikacji Firebase co logowanie. Sięgamy po nią
 * przez `auth()`, bo tamta funkcja już pilnuje, żeby inicjalizacja była
 * idempotentna — Next odświeża moduły w trybie deweloperskim.
 */
export function baza(): Firestore {
  return getFirestore(auth().app)
}

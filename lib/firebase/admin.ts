import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

/**
 * Admin SDK omija reguły Firestore. Każde miejsce, które z niego korzysta, MUSI
 * samo sprawdzić, kto pyta — inaczej byłoby otwartym oknem do bazy.
 *
 * Inicjalizacja jest idempotentna, bo Next trzyma jeden proces dla wielu tras,
 * a dwa wywołania `initializeApp` rzucają błędem o powtórzonej aplikacji.
 */
function aplikacja(): App {
  if (getApps().length) return getApps()[0]
  const klucz = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!klucz) throw new Error('Brak FIREBASE_SERVICE_ACCOUNT')
  return initializeApp({ credential: cert(JSON.parse(klucz)) })
}

export function bazaAdmin(): Firestore {
  return getFirestore(aplikacja())
}

export function wydarzeniaRef(semestrId: string) {
  return bazaAdmin().collection('semestry').doc(semestrId).collection('wydarzenia')
}

export function propozycjeRef(semestrId: string) {
  return bazaAdmin().collection('semestry').doc(semestrId).collection('propozycje')
}

export function semestrRef(semestrId: string) {
  return bazaAdmin().collection('semestry').doc(semestrId)
}

'use client'

/** Zapisuje plik w przeglądarce - bez serwera, prosto z pamięci. */
export function pobierzPlik(dane: Blob, nazwa: string): void {
  const url = URL.createObjectURL(dane)
  const a = document.createElement('a')
  a.href = url
  a.download = nazwa
  a.click()
  // Natychmiastowe zwolnienie potrafi przerwać pobieranie w części przeglądarek.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

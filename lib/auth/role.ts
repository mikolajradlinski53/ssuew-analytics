/** `owner` zapisuje wszędzie, `board` czyta Analytics i pracuje w Plannerze, `null` nie wchodzi. */
export type Rola = 'owner' | 'board'

function normalizuj(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase()
}

/**
 * Samo konto Google nie daje niczego — dostęp mają wyłącznie adresy z listy.
 * Lista żyje w zmiennych środowiskowych, bo zmienia się raz na kadencję.
 */
export function rolaDla(email: string | null | undefined): Rola | null {
  const kto = normalizuj(email)
  if (!kto) return null

  if (kto === normalizuj(process.env.DECK_OWNER_EMAIL)) return 'owner'

  const zarzad = (process.env.DECK_BOARD_EMAILS ?? '')
    .split(',')
    .map(normalizuj)
    .filter(Boolean)

  return zarzad.includes(kto) ? 'board' : null
}

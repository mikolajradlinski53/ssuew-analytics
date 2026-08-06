import { NextResponse, type NextRequest } from 'next/server'
import { gasList, gasWrite, GasError, odswiezAnalytics } from '@/lib/gas/client'
import { isConfigured } from '@/lib/gas/config'
import { ktoPyta } from '@/lib/auth/guard'

function blad(e: unknown) {
  return NextResponse.json({ error: (e as Error).message }, { status: e instanceof GasError ? e.kod : 500 })
}

/** Zwraca odpowiedź odmowną albo `null`, gdy pytający ma prawo zapisu. */
async function odmowaZapisu(req: NextRequest) {
  const pytajacy = await ktoPyta(req)
  if (!pytajacy) return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })
  if (pytajacy.rola !== 'owner') return NextResponse.json({ error: 'Brak uprawnień do zapisu' }, { status: 403 })
  return null
}

/**
 * Jedyna trasa wymagająca logowania także do odczytu — to nazwiska, nie liczby.
 * Czytać mogą obie role; zapisywać, jak wszędzie, tylko `owner`.
 */
export async function GET(req: NextRequest) {
  if (!(await ktoPyta(req))) return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })
  // Brak arkusza to co innego niż arkusz z pustą zakładką. Przeglądarka nie widzi
  // GAS_URL, więc rozróżnienie musi przyjść stąd — inaczej pusta lista prawdziwych
  // członków byłaby nie do odróżnienia od trybu demonstracyjnego.
  if (!isConfigured) {
    return NextResponse.json({ error: 'Arkusz nie jest skonfigurowany' }, { status: 503 })
  }
  try {
    return NextResponse.json(await gasList('czlonkowie'))
  } catch (e) {
    return blad(e)
  }
}

export async function POST(req: NextRequest) {
  const nie = await odmowaZapisu(req)
  if (nie) return nie

  const { kohorta_edycja, imie_nazwisko, status, aktywnosc } = await req.json()
  if (!kohorta_edycja || !imie_nazwisko) {
    return NextResponse.json({ error: 'Brakujące pola' }, { status: 400 })
  }

  try {
    const [wiersz] = await gasWrite('czlonkowie', 'insert', [
      { kohorta_edycja, imie_nazwisko, status: status ?? 'aktywny', aktywnosc: aktywnosc ?? [] },
    ])
    odswiezAnalytics()
    return NextResponse.json(wiersz, { status: 201 })
  } catch (e) {
    return blad(e)
  }
}

export async function PATCH(req: NextRequest) {
  const nie = await odmowaZapisu(req)
  if (nie) return nie

  const body = await req.json()
  if (!body?.id) return NextResponse.json({ error: 'Brak id' }, { status: 400 })

  const zmiany: Record<string, unknown> = { id: body.id }
  ;(['imie_nazwisko', 'status', 'aktywnosc'] as const).forEach((p) => {
    if (body[p] !== undefined) zmiany[p] = body[p]
  })

  try {
    const [wiersz] = await gasWrite('czlonkowie', 'update', [zmiany])
    odswiezAnalytics()
    return NextResponse.json(wiersz)
  } catch (e) {
    return blad(e)
  }
}

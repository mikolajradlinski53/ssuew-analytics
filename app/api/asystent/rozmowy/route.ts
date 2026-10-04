import { NextResponse, type NextRequest } from 'next/server'
import { listaRozmow, usunWszystkieRozmowy } from '@/lib/asystent/pamiecDane'
import { tylkoWlasciciel } from '@/lib/asystent/tylkoWlasciciel'

export const runtime = 'nodejs'

/** 30 ostatnich rozmów - tytuł i czas ostatniej wiadomości. */
export async function GET(req: NextRequest) {
  const { odmowa } = await tylkoWlasciciel(req)
  if (odmowa) return odmowa
  return NextResponse.json(await listaRozmow())
}

/** Koniec kadencji: usuwa wszystkie rozmowy. Notatki zostają. */
export async function DELETE(req: NextRequest) {
  const { odmowa } = await tylkoWlasciciel(req)
  if (odmowa) return odmowa
  return NextResponse.json({ usuniete: await usunWszystkieRozmowy() })
}

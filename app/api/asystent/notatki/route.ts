import { NextResponse, type NextRequest } from 'next/server'
import { dodajNotatke, liczbaNotatek, listaNotatek } from '@/lib/asystent/pamiecDane'
import { LIMIT_NOTATEK, sprawdzTrescNotatki } from '@/lib/asystent/pamiec'
import { tylkoWlasciciel } from '@/lib/asystent/tylkoWlasciciel'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { odmowa } = await tylkoWlasciciel(req)
  if (odmowa) return odmowa
  return NextResponse.json(await listaNotatek())
}

export async function POST(req: NextRequest) {
  const { odmowa } = await tylkoWlasciciel(req)
  if (odmowa) return odmowa
  const body = await req.json().catch(() => null)
  const tresc = sprawdzTrescNotatki(body?.tresc)
  if (!tresc) return NextResponse.json({ error: 'Notatka jest pusta' }, { status: 400 })
  if ((await liczbaNotatek()) >= LIMIT_NOTATEK) {
    return NextResponse.json(
      { error: `Masz już ${LIMIT_NOTATEK} notatek - usuń starą, żeby dodać nową.` },
      { status: 409 },
    )
  }
  const notatka = await dodajNotatke(tresc, body?.zrodlo === 'rozmowa' ? 'rozmowa' : 'reczna')
  return NextResponse.json(notatka, { status: 201 })
}

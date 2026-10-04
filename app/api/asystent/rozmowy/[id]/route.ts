import { NextResponse, type NextRequest } from 'next/server'
import { czytajRozmowe, usunRozmowe } from '@/lib/asystent/pamiecDane'
import { tylkoWlasciciel } from '@/lib/asystent/tylkoWlasciciel'

export const runtime = 'nodejs'

type Kontekst = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Kontekst) {
  const { odmowa } = await tylkoWlasciciel(req)
  if (odmowa) return odmowa
  const rozmowa = await czytajRozmowe((await params).id)
  if (!rozmowa) return NextResponse.json({ error: 'Nie ma takiej rozmowy' }, { status: 404 })
  return NextResponse.json(rozmowa)
}

export async function DELETE(req: NextRequest, { params }: Kontekst) {
  const { odmowa } = await tylkoWlasciciel(req)
  if (odmowa) return odmowa
  await usunRozmowe((await params).id)
  return NextResponse.json({ ok: true })
}

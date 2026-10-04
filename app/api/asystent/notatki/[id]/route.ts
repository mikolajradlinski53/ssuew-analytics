import { NextResponse, type NextRequest } from 'next/server'
import { usunNotatke, zmienNotatke } from '@/lib/asystent/pamiecDane'
import { sprawdzTrescNotatki } from '@/lib/asystent/pamiec'
import { tylkoWlasciciel } from '@/lib/asystent/tylkoWlasciciel'

export const runtime = 'nodejs'

type Kontekst = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Kontekst) {
  const { odmowa } = await tylkoWlasciciel(req)
  if (odmowa) return odmowa
  const tresc = sprawdzTrescNotatki((await req.json().catch(() => null))?.tresc)
  if (!tresc) return NextResponse.json({ error: 'Notatka jest pusta' }, { status: 400 })
  if (!(await zmienNotatke((await params).id, tresc))) {
    return NextResponse.json({ error: 'Nie ma takiej notatki' }, { status: 404 })
  }
  return NextResponse.json({ ok: true, tresc })
}

export async function DELETE(req: NextRequest, { params }: Kontekst) {
  const { odmowa } = await tylkoWlasciciel(req)
  if (odmowa) return odmowa
  await usunNotatke((await params).id)
  return NextResponse.json({ ok: true })
}

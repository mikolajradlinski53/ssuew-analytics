import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isConfigured } from '@/lib/supabase/config'

export async function GET() {
  if (!isConfigured) return NextResponse.json([])
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })
  const { data, error } = await supabase
    .from('czlonkowie').select('*')
    .order('kohorta_edycja', { ascending: true }).order('imie_nazwisko', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!isConfigured) return NextResponse.json({ error: 'Supabase nie skonfigurowany' }, { status: 503 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })
  const body = await req.json()
  const { kohorta_edycja, imie_nazwisko, status, aktywnosc } = body
  if (!kohorta_edycja || !imie_nazwisko) return NextResponse.json({ error: 'Brakujące pola' }, { status: 400 })
  const { data, error } = await supabase.from('czlonkowie')
    .insert({ kohorta_edycja, imie_nazwisko, status: status ?? 'aktywny', aktywnosc: aktywnosc ?? [] })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  if (!isConfigured) return NextResponse.json({ error: 'Supabase nie skonfigurowany' }, { status: 503 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })
  const body = await req.json()
  const { id, status, aktywnosc, imie_nazwisko } = body
  if (!id) return NextResponse.json({ error: 'Brak id' }, { status: 400 })
  const patch: Record<string, unknown> = {}
  if (status !== undefined) patch.status = status
  if (aktywnosc !== undefined) patch.aktywnosc = aktywnosc
  if (imie_nazwisko !== undefined) patch.imie_nazwisko = imie_nazwisko
  const { data, error } = await supabase.from('czlonkowie').update(patch).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

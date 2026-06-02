import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isConfigured } from '@/lib/supabase/config'

export async function GET() {
  if (!isConfigured) return NextResponse.json([])
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('kpi_metrics').select('*')
    .order('kategoria', { ascending: true }).order('nazwa', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!isConfigured) return NextResponse.json({ error: 'Supabase nie skonfigurowany' }, { status: 503 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })
  const body = await req.json()
  const { kategoria, nazwa, okres_poprzedni, wartosc_poprzednia, okres_biezacy, wartosc_biezaca } = body
  if (!kategoria || !nazwa || !okres_poprzedni || wartosc_poprzednia == null || !okres_biezacy || wartosc_biezaca == null)
    return NextResponse.json({ error: 'Brakujące pola' }, { status: 400 })
  const { data, error } = await supabase.from('kpi_metrics')
    .insert({ kategoria, nazwa, okres_poprzedni, wartosc_poprzednia, okres_biezacy, wartosc_biezaca })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

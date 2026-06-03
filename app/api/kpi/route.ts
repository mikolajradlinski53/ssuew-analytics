import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isConfigured } from '@/lib/supabase/config'
import { withSupabaseTimeout } from '@/lib/supabase/timeout'

export async function GET() {
  if (!isConfigured) return NextResponse.json([])
  const supabase = await createClient()
  const { data, error } = await withSupabaseTimeout(
    supabase
      .from('kpi_metrics').select('*')
      .order('kategoria', { ascending: true }).order('nazwa', { ascending: true }),
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!isConfigured) return NextResponse.json({ error: 'Supabase nie skonfigurowany' }, { status: 503 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })
  const body = await req.json()

  // Tryb wsadowy: tablica metryk (np. cały nowy rocznik).
  if (Array.isArray(body)) {
    const valid = body.filter(
      (b) => b && b.kategoria && b.nazwa && b.okres_poprzedni && b.wartosc_poprzednia != null && b.okres_biezacy && b.wartosc_biezaca != null,
    )
    if (!valid.length) return NextResponse.json({ error: 'Brak prawidłowych wierszy' }, { status: 400 })
    const rows = valid.map((b) => ({
      kategoria: b.kategoria,
      nazwa: b.nazwa,
      okres_poprzedni: b.okres_poprzedni,
      wartosc_poprzednia: b.wartosc_poprzednia,
      okres_biezacy: b.okres_biezacy,
      wartosc_biezaca: b.wartosc_biezaca,
    }))
    const { data, error } = await supabase.from('kpi_metrics').insert(rows).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  }

  const { kategoria, nazwa, okres_poprzedni, wartosc_poprzednia, okres_biezacy, wartosc_biezaca } = body
  if (!kategoria || !nazwa || !okres_poprzedni || wartosc_poprzednia == null || !okres_biezacy || wartosc_biezaca == null)
    return NextResponse.json({ error: 'Brakujące pola' }, { status: 400 })
  const { data, error } = await supabase.from('kpi_metrics')
    .insert({ kategoria, nazwa, okres_poprzedni, wartosc_poprzednia, okres_biezacy, wartosc_biezaca })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isConfigured } from '@/lib/supabase/config'

export async function GET() {
  if (!isConfigured) return NextResponse.json([])
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('kohorty').select('*')
    .order('rok', { ascending: true }).order('sezon', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!isConfigured) return NextResponse.json({ error: 'Supabase nie skonfigurowany' }, { status: 503 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })
  const body = await req.json()
  const { edycja, sezon, rok, n_czlonkow, avg_retention_sem, max_retention_sem, in_progress } = body
  if (!edycja || !sezon || !rok || n_czlonkow == null || avg_retention_sem == null || max_retention_sem == null)
    return NextResponse.json({ error: 'Brakujące pola' }, { status: 400 })
  const { data, error } = await supabase.from('kohorty')
    .upsert({ edycja, sezon, rok, n_czlonkow, avg_retention_sem, max_retention_sem, in_progress: in_progress ?? false }, { onConflict: 'edycja' })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

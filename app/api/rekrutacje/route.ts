import { NextRequest, NextResponse } from 'next/server'
import { supabase, isConfigured } from '@/lib/supabase'

export async function GET() {
  if (!isConfigured) return NextResponse.json([])
  const { data, error } = await supabase
    .from('rekrutacje').select('*')
    .order('rok', { ascending: true }).order('sezon', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!isConfigured) return NextResponse.json({ error: 'Supabase nie skonfigurowany' }, { status: 503 })
  const body = await req.json()
  const { edycja, sezon, rok, zgloszenia, przyjeci } = body
  if (!edycja || !sezon || !rok || zgloszenia == null || przyjeci == null)
    return NextResponse.json({ error: 'Brakujące pola' }, { status: 400 })
  const { data, error } = await supabase.from('rekrutacje')
    .upsert({ edycja, sezon, rok, zgloszenia, przyjeci }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
